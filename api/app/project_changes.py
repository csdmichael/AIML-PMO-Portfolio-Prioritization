"""Lifecycle changes to projects: status, edits, soft delete and restore, and permanent removal.

Each project has at most one change record, ui_entries/project_changes/<projectId>.json. The API applies the record on
every read, so a change shows at once. The Fabric pipeline does not read these records yet, so scores and Power BI keep
the values the pipeline computed until it does.
"""

from collections.abc import Callable, Mapping
from typing import Any, Literal
from uuid import uuid4

from app.cache import TtlCache
from app.contracts import DataEntryContract
from app.files import utc_now
from app.lake_paths import LakePaths
from app.onelake import LakeConflict
from app.problems import ProblemError
from app.project_progress import progress_fields
from app.store import EntryStore

CACHE_KEY = "changes"
_UNSET = object()

PortfolioIndex = Callable[[], Mapping[str, Mapping[str, Any]]]


class ProjectChanges:
    def __init__(
        self,
        *,
        entries: EntryStore,
        paths: LakePaths,
        contract: DataEntryContract,
        cache: TtlCache[dict[str, dict[str, Any]]],
        reset_cache: TtlCache[dict[str, Any] | None] | None = None,
    ) -> None:
        self._entries = entries
        self._paths = paths
        self._cache = cache
        self._reset_cache = reset_cache or TtlCache(0)
        self._export_keys = {rule.key: rule.exportKey or rule.key for rule in contract.projectFields}
        self._skill_names = {skill.key: skill.displayName for skill in contract.options.skills}
        self._progress_rules = contract.progress

    def all(self) -> dict[str, dict[str, Any]]:
        return self._cache.get_or_load(CACHE_KEY, self._load_all)

    def get(self, project_id: str) -> dict[str, Any] | None:
        return self.all().get(project_id)

    def save(
        self,
        project_id: str,
        *,
        values: Mapping[str, Any] | None = None,
        is_deleted: bool | None = None,
        deleted: bool = False,
        progress: Mapping[str, Any] | None = None,
        expected_revision: str | None | object = _UNSET,
    ) -> dict[str, Any]:
        path = self._paths.project_change(project_id)
        found = self._entries.get_with_etag(path)
        reset, _ = self.reset_snapshot()
        current = reset["records"].get(project_id) if reset is not None else None
        if found is not None and (current is None or found[0].get("resetRevision") == current.get("resetRevision")):
            current = found[0]
        record: dict[str, Any] = dict(current) if current is not None else {"projectId": project_id, "values": {}}
        if expected_revision is not _UNSET and record.get("revision") != expected_revision:
            raise ProblemError(409, "The project changed. Reload its current details before saving.", slug="conflict")
        if values:
            record["values"] = {**record.get("values", {}), **values}
        if is_deleted is not None:
            record["isDeleted"] = is_deleted
        if deleted:
            record["deleted"] = True
        if progress is not None:
            record["progress"] = dict(progress)
        record["revision"] = str(uuid4())
        record["updatedAtUtc"] = utc_now()
        try:
            if found is None:
                self._entries.create(path, record)
            else:
                self._entries.replace(path, record, found[1])
        except LakeConflict as error:
            raise ProblemError(409, "The project changed while this change was saved. Try again.", slug="conflict") from error
        self._cache.invalidate(CACHE_KEY)
        return record

    def apply(
        self,
        record: Mapping[str, Any],
        *,
        shape: Literal["export", "entry"],
        portfolios: PortfolioIndex,
    ) -> dict[str, Any] | None:
        """The record with its change applied, or None when the project was permanently removed.

        Export records use the export's key names; pending entries use the contract's key names.
        """
        change = self.get(str(record.get("projectId")))
        change = change or {}
        if change.get("deleted"):
            return None
        values: Mapping[str, Any] = change.get("values") or {}
        replacement = change.get("replacement")
        applied = dict(replacement if isinstance(replacement, Mapping) else record)
        for key, value in values.items():
            if shape == "export" and key == "primarySkill":
                value = self._skill_names.get(str(value), value)
            applied[self._export_keys.get(key, key) if shape == "export" else key] = value
        if shape == "export" and ("portfolioKey" in values or "programKey" in values):
            index = portfolios()
            portfolio = index.get(str(values.get("portfolioKey") or applied.get("portfolioKey") or "")) or {}
            if "portfolioKey" in values:
                applied.update(portfolio=portfolio.get("displayName"), portfolioCode=portfolio.get("code"), portfolioRole=portfolio.get("role"))
            if "programKey" in values:
                program = next((item for item in portfolio.get("programs") or [] if item.get("key") == values["programKey"]), {})
                applied["program"] = program.get("displayName")
        if "isDeleted" in change:
            is_deleted = bool(change["isDeleted"])
            applied["isDeleted"] = is_deleted
            applied["deletedAt"] = change.get("updatedAtUtc") if is_deleted else None
        applied.update(change.get("progress") or {})
        applied["changeRevision"] = change.get("revision")
        applied.update(progress_fields(applied, self._progress_rules))
        return applied

    def apply_export(self, export: Mapping[str, Any], *, portfolios: PortfolioIndex) -> dict[str, Any]:
        """The portfolio export with the project changes applied. The rollups stay as the pipeline computed them."""
        export = self.extend_export(export)
        projects = export.get("projects")
        if not isinstance(projects, list):
            return dict(export)
        applied: list[Any] = []
        for item in projects:
            if isinstance(item, Mapping) and item.get("projectId"):
                record = self.apply(item, shape="export", portfolios=portfolios)
                if record is not None:
                    applied.append(record)
            else:
                applied.append(item)
        result = {**export, "projects": applied}
        if self.dataset_reset() is not None:
            # The original pipeline aggregates do not describe a replaced demo scope.
            result.update(capacityBySkill=[], clusters=[])
        return result

    def dataset_reset(self) -> dict[str, Any] | None:
        return self._reset_cache.get_or_load("reset", lambda: self.reset_snapshot()[0])

    def reset_snapshot(self) -> tuple[dict[str, Any] | None, str | None]:
        found = self._entries.get_with_etag(self._paths.project_resets())
        if found is None:
            return None, None
        document, etag = found
        records = document.get("records")
        if (
            not isinstance(document.get("revision"), str)
            or not isinstance(records, dict)
            or not all(
                isinstance(record, dict) and record.get("projectId") == key and isinstance(record.get("resetRevision"), str)
                for key, record in records.items()
            )
            or not isinstance(document.get("portfolios"), list)
        ):
            raise ProblemError(502, "The saved project reset is invalid.", slug="upstream-failure")
        return document, etag

    def save_reset(self, document: dict[str, Any], etag: str | None) -> None:
        """Commit a complete reset in one conditional write, never a partially applied per-project loop."""
        if etag is None:
            self._entries.create(self._paths.project_resets(), document)
        else:
            self._entries.replace(self._paths.project_resets(), document, etag)
        self.invalidate()

    def invalidate(self) -> None:
        self._cache.invalidate()
        self._reset_cache.invalidate()

    def extend_export(self, export: Mapping[str, Any]) -> dict[str, Any]:
        projects = list(export.get("projects") or [])
        known = {record.get("projectId") for record in projects if isinstance(record, Mapping)}
        for project_id, change in self.all().items():
            if project_id not in known and isinstance(change.get("replacement"), dict) and not change.get("deleted"):
                projects.append(dict(change["replacement"]))
                known.add(project_id)
        portfolios = list(export.get("portfolios") or [])
        reset = self.dataset_reset()
        if reset is not None:
            keys = {record.get("key") for record in portfolios if isinstance(record, Mapping)}
            portfolios.extend(record for record in reset["portfolios"] if record.get("key") not in keys)
        result = {**export, "projects": projects, "portfolios": portfolios}
        if reset is not None:
            result["datasetReset"] = {
                "revision": reset["revision"],
                "updatedAtUtc": reset["updatedAtUtc"],
                "action": reset["action"],
                "portfolioKey": reset.get("portfolioKey"),
                "isSynthetic": True,
            }
        return result

    def _load_all(self) -> dict[str, dict[str, Any]]:
        reset = self.dataset_reset()
        changes: dict[str, dict[str, Any]] = dict(reset["records"]) if reset is not None else {}
        for _, record in self._entries.list(self._paths.project_changes_folder()):
            project_id = record.get("projectId")
            if isinstance(project_id, str):
                previous = changes.get(project_id)
                if previous is None or record.get("resetRevision") == previous.get("resetRevision"):
                    changes[project_id] = record
        return changes
