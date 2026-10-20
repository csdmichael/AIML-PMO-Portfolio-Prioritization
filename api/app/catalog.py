"""Merged views of the portfolio export (processed) and the UI entries (pending)."""

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any, TypeVar

from app.config import ProjectSettings
from app.contracts import DataEntryContract
from app.lake_paths import LakePaths
from app.problems import ProblemError
from app.project_changes import ProjectChanges
from app.store import EntryStore, ExportReader

T = TypeVar("T")
_STATIC_OPTION_SOURCE = "options."
_DYNAMIC_PORTFOLIOS = "portfolios"
_DYNAMIC_PROGRAMS = "programsOfPortfolio"


@dataclass(frozen=True)
class ProjectFilters:
    portfolio: str | None = None
    role: str | None = None
    confidence: str | None = None
    query: str | None = None


def paginate(items: Sequence[T], page: int, page_size: int) -> tuple[list[T], int]:
    total_pages = math.ceil(len(items) / page_size)
    start = (page - 1) * page_size
    return list(items[start : start + page_size]), total_pages


class CatalogOptions:
    """Option lists for validation. Static lists come from data-entry.json; portfolios come from the lake."""

    def __init__(self, *, contract: DataEntryContract, catalog: "Catalog") -> None:
        self._contract = contract
        self._catalog = catalog
        self._portfolios: list[dict[str, Any]] | None = None
        self._project_ids: frozenset[str] | None = None

    def _all_portfolios(self) -> list[dict[str, Any]]:
        if self._portfolios is None:
            self._portfolios = self._catalog.portfolios()
        return self._portfolios

    def options(self, source: str, record: Mapping[str, Any]) -> list[str]:
        if source == _DYNAMIC_PORTFOLIOS:
            return [str(item["key"]) for item in self._all_portfolios() if item.get("key")]
        if source == _DYNAMIC_PROGRAMS:
            key = record.get("portfolioKey")
            portfolio = next((item for item in self._all_portfolios() if item.get("key") == key), None)
            return [str(item["key"]) for item in (portfolio or {}).get("programs") or [] if item.get("key")]
        if source.startswith(_STATIC_OPTION_SOURCE):
            return self._static(source[len(_STATIC_OPTION_SOURCE) :])
        raise ValueError(f"unknown option source '{source}'")

    def all_values(self, source: str) -> list[str] | None:
        if source == _DYNAMIC_PORTFOLIOS:
            return [str(item["key"]) for item in self._all_portfolios() if item.get("key")]
        if source == _DYNAMIC_PROGRAMS:
            return self.all_programs()
        return None

    def key_for_name(self, source: str, name: str) -> str | None:
        """The key whose display name equals name ignoring case. Only the portfolio list has display names."""
        if source != _DYNAMIC_PORTFOLIOS:
            return None
        wanted = name.casefold()
        match = next(
            (item for item in self._all_portfolios() if item.get("key") and str(item.get("displayName", "")).casefold() == wanted),
            None,
        )
        return str(match["key"]) if match is not None else None

    def all_programs(self) -> list[str]:
        keys: list[str] = []
        for portfolio in self._all_portfolios():
            keys.extend(str(item["key"]) for item in portfolio.get("programs") or [] if item.get("key"))
        return sorted(set(keys))

    def known_project_ids(self) -> frozenset[str]:
        if self._project_ids is None:
            self._project_ids = self._catalog.project_ids()
        return self._project_ids

    def _static(self, name: str) -> list[str]:
        lists = self._contract.options
        if name == "skills":
            return [skill.key for skill in lists.skills]
        values = getattr(lists, name, None)
        if not isinstance(values, list):
            raise ValueError(f"unknown option list '{name}'")
        return list(values)


class Catalog:
    def __init__(
        self,
        *,
        exports: ExportReader,
        entries: EntryStore,
        paths: LakePaths,
        statuses: ProjectSettings,
        contract: DataEntryContract,
        changes: ProjectChanges,
    ) -> None:
        self._exports = exports
        self._entries = entries
        self._paths = paths
        self._statuses = statuses
        self._contract = contract
        self._changes = changes

    def options(self) -> CatalogOptions:
        return CatalogOptions(contract=self._contract, catalog=self)

    def portfolio_index(self) -> dict[str, dict[str, Any]]:
        return {str(item["key"]): item for item in self.portfolios() if item.get("key")}

    def _export(self) -> dict[str, Any]:
        value = self._exports.read(self._paths.portfolio_export())
        return value if isinstance(value, dict) else {}

    def _export_projects(self) -> list[dict[str, Any]]:
        return [item for item in self._export().get("projects") or [] if isinstance(item, dict)]

    def portfolios(self) -> list[dict[str, Any]]:
        merged: list[dict[str, Any]] = []
        keys: set[str] = set()
        for record in self._export().get("portfolios") or []:
            if isinstance(record, dict) and record.get("key"):
                merged.append({**record, "status": self._statuses.statusProcessed})
                keys.add(str(record["key"]))
        for _, entry in self._entries.list(self._paths.portfolio_entries_folder()):
            key = entry.get("key")
            if key and str(key) not in keys:
                merged.append({**entry, "status": self._statuses.statusPending})
                keys.add(str(key))
        return merged

    def portfolio(self, key: str) -> dict[str, Any] | None:
        return next((item for item in self.portfolios() if item.get("key") == key), None)

    def project_ids(self) -> frozenset[str]:
        processed = {str(item["projectId"]) for item in self._export_projects() if item.get("projectId")}
        pending = set(self._entries.names(self._paths.project_entries_folder()))
        return frozenset(processed | pending)

    def list_projects(self, filters: ProjectFilters) -> list[dict[str, Any]]:
        portfolios = self.portfolio_index()
        processed = self._export_projects()
        processed_ids = {item.get("projectId") for item in processed}
        items: list[dict[str, Any]] = []
        for item in processed:
            if not item.get("projectId"):
                continue
            record = self._changes.apply(item, shape="export", portfolios=self.portfolio_index)
            if record is not None:
                items.append(self._summary_from_export(record))
        for _, entry in self._entries.list(self._paths.project_entries_folder()):
            project_id = entry.get("projectId")
            if project_id and project_id not in processed_ids:
                record = self._changes.apply({**entry, "projectId": project_id}, shape="entry", portfolios=self.portfolio_index)
                if record is not None:
                    items.append(self._summary_from_entry(record, portfolios))
        matching = [item for item in items if _matches(item, filters)]
        return sorted(matching, key=lambda item: str(item["projectId"]))

    def get_project(self, project_id: str) -> dict[str, Any] | None:
        missing: ProblemError | None = None
        try:
            for record in self._export_projects():
                if record.get("projectId") == project_id:
                    applied = self._changes.apply(record, shape="export", portfolios=self.portfolio_index)
                    return None if applied is None else {**applied, "status": self._statuses.statusProcessed}
        except ProblemError as error:
            if error.slug != "lake-data-missing":
                raise
            missing = error
        entry = self._entries.get(self._paths.project_entry(project_id))
        if entry is not None:
            applied = self._changes.apply({**entry, "projectId": project_id}, shape="entry", portfolios=self.portfolio_index)
            return None if applied is None else {**applied, "projectId": project_id, "status": self._statuses.statusPending}
        if missing is not None:
            raise missing
        return None

    def _summary_from_export(self, record: dict[str, Any]) -> dict[str, Any]:
        return {
            "projectId": record.get("projectId"),
            "projectName": record.get("projectName"),
            "status": self._statuses.statusProcessed,
            "portfolioKey": record.get("portfolioKey"),
            "portfolioCode": record.get("portfolioCode"),
            "portfolio": record.get("portfolio"),
            "portfolioRole": record.get("portfolioRole"),
            "program": record.get("program"),
            "businessUnit": record.get("businessUnit"),
            "site": record.get("site"),
            "sponsor": record.get("executiveSponsor"),
            "projectManager": record.get("projectManager"),
            "projectStatus": record.get("projectStatus"),
            "goLiveDate": record.get("goLiveDate"),
            "primarySkill": record.get("primarySkill"),
            "riskRating": record.get("riskRating"),
            "confidenceLevel": record.get("confidenceLevel"),
            "confidenceScore": record.get("confidenceScore"),
            "finalTier": record.get("finalTier"),
            "priorityScore": record.get("priorityScore"),
            "recommendedAction": record.get("recommendedAction"),
            "cluster": record.get("cluster"),
            "isDeleted": bool(record.get("isDeleted", False)),
        }

    def _summary_from_entry(self, entry: dict[str, Any], portfolios: dict[str, dict[str, Any]]) -> dict[str, Any]:
        portfolio = portfolios.get(str(entry.get("portfolioKey") or ""), {})
        program = next((item for item in portfolio.get("programs") or [] if item.get("key") == entry.get("programKey")), {})
        return {
            "projectId": entry.get("projectId"),
            "projectName": entry.get("projectName"),
            "status": self._statuses.statusPending,
            "portfolioKey": entry.get("portfolioKey"),
            "portfolioCode": portfolio.get("code"),
            "portfolio": portfolio.get("displayName"),
            "portfolioRole": portfolio.get("role"),
            "program": program.get("displayName"),
            "businessUnit": entry.get("businessUnit"),
            "site": entry.get("site"),
            "sponsor": entry.get("sponsorName"),
            "projectManager": entry.get("projectManager"),
            "projectStatus": entry.get("projectStatus"),
            "goLiveDate": entry.get("goLiveDate"),
            "primarySkill": entry.get("primarySkill"),
            "riskRating": entry.get("riskRating"),
            "confidenceLevel": None,
            "confidenceScore": None,
            "finalTier": None,
            "priorityScore": None,
            "recommendedAction": None,
            "cluster": None,
            "isDeleted": bool(entry.get("isDeleted", False)),
        }


def _matches(item: dict[str, Any], filters: ProjectFilters) -> bool:
    if filters.portfolio:
        wanted = filters.portfolio.lower()
        codes = {str(item.get("portfolioKey") or "").lower(), str(item.get("portfolioCode") or "").lower()}
        if wanted not in codes:
            return False
    if filters.role and str(item.get("portfolioRole") or "").lower() != filters.role.lower():
        return False
    if filters.confidence and str(item.get("confidenceLevel") or "").lower() != filters.confidence.lower():
        return False
    if filters.query:
        text = " ".join(str(item.get(name) or "") for name in ("projectId", "projectName", "sponsor", "projectManager"))
        if filters.query.lower() not in text.lower():
            return False
    return True
