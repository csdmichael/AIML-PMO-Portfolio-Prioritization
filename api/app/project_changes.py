"""Lifecycle changes to projects: status, edits, soft delete and restore, and permanent removal.

Each project has at most one change record, ui_entries/project_changes/<projectId>.json. The API applies the record on
every read, so a change shows at once. The Fabric pipeline does not read these records yet, so scores and Power BI keep
the values the pipeline computed until it does.
"""

from collections.abc import Callable, Mapping
from typing import Any, Literal

from app.cache import TtlCache
from app.contracts import DataEntryContract
from app.files import utc_now
from app.lake_paths import LakePaths
from app.onelake import LakeConflict
from app.problems import ProblemError
from app.store import EntryStore

CACHE_KEY = "changes"

PortfolioIndex = Callable[[], Mapping[str, Mapping[str, Any]]]


class ProjectChanges:
    def __init__(
        self,
        *,
        entries: EntryStore,
        paths: LakePaths,
        contract: DataEntryContract,
        cache: TtlCache[dict[str, dict[str, Any]]],
    ) -> None:
        self._entries = entries
        self._paths = paths
        self._cache = cache
        self._export_keys = {rule.key: rule.exportKey or rule.key for rule in contract.projectFields}
        self._skill_names = {skill.key: skill.displayName for skill in contract.options.skills}

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
    ) -> dict[str, Any]:
        path = self._paths.project_change(project_id)
        found = self._entries.get_with_etag(path)
        record: dict[str, Any] = dict(found[0]) if found is not None else {"projectId": project_id, "values": {}}
        if values:
            record["values"] = {**record.get("values", {}), **values}
        if is_deleted is not None:
            record["isDeleted"] = is_deleted
        if deleted:
            record["deleted"] = True
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
        if change is None:
            return dict(record)
        if change.get("deleted"):
            return None
        values: Mapping[str, Any] = change.get("values") or {}
        applied = dict(record)
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
        return applied

    def apply_export(self, export: Mapping[str, Any], *, portfolios: PortfolioIndex) -> dict[str, Any]:
        """The portfolio export with the project changes applied. The rollups stay as the pipeline computed them."""
        projects = export.get("projects")
        if not self.all() or not isinstance(projects, list):
            return dict(export)
        applied: list[Any] = []
        for item in projects:
            if isinstance(item, Mapping) and item.get("projectId"):
                record = self.apply(item, shape="export", portfolios=portfolios)
                if record is not None:
                    applied.append(record)
            else:
                applied.append(item)
        return {**export, "projects": applied}

    def _load_all(self) -> dict[str, dict[str, Any]]:
        changes: dict[str, dict[str, Any]] = {}
        for _, record in self._entries.list(self._paths.project_changes_folder()):
            project_id = record.get("projectId")
            if isinstance(project_id, str):
                changes[project_id] = record
        return changes
