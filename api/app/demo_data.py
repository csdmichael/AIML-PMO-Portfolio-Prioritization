"""Explicit synthetic snapshots and atomic, demo-only replacements of project scopes."""

import logging
import re
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.catalog import Catalog, ProjectFilters
from app.config import AppConfig
from app.files import utc_now
from app.lake_paths import LakePaths
from app.onelake import OneLakeClient
from app.problems import FieldIssue, ProblemError
from app.project_changes import ProjectChanges
from app.system_settings import read_settings

logger = logging.getLogger(__name__)


class DemoProject(BaseModel):
    model_config = ConfigDict(extra="allow")

    projectId: str
    projectName: str
    portfolioKey: str
    priorityScore: float = Field(ge=0, le=100)
    confidenceScore: float = Field(ge=0, le=100)
    topDrivers: list[dict[str, Any]]


class DemoPortfolio(BaseModel):
    model_config = ConfigDict(extra="allow")

    key: str
    displayName: str
    code: str
    role: Literal["main", "coupled"]
    programs: list[dict[str, Any]]


class DemoExport(BaseModel):
    model_config = ConfigDict(extra="allow")

    projects: list[DemoProject]
    portfolios: list[DemoPortfolio]
    asOfDate: str
    source: str


class DemoSnapshot(BaseModel):
    isSynthetic: Literal[True]
    capturedAtUtc: str
    sourceExportPath: str
    sourceExportEtag: str
    restoredProjectNames: dict[str, str] = Field(default_factory=dict)
    export: DemoExport


class DemoPortfolioCount(BaseModel):
    key: str
    displayName: str
    projectCount: int


class DemoCatalog(BaseModel):
    projectCount: int
    portfolios: list[DemoPortfolioCount]
    capturedAtUtc: str
    asOfDate: str
    oneLakePath: str


class DemoResetResult(BaseModel):
    action: Literal["load", "clear"]
    portfolioKey: str | None
    loadedProjects: int
    replacedProjects: int
    totalProjects: int
    revision: str
    updatedAtUtc: str


def validate_snapshot(document: Any, config: AppConfig) -> DemoSnapshot:
    try:
        snapshot = DemoSnapshot.model_validate(document)
    except ValidationError as error:
        logger.error("The dedicated demo snapshot does not match the snapshot contract")
        raise ProblemError(502, "The demo snapshot is invalid.", slug="upstream-failure") from error
    projects = snapshot.export.projects
    ids = {project.projectId for project in projects}
    keys = {portfolio.key for portfolio in snapshot.export.portfolios}
    if (
        len(projects) != config.api.demo.expectedProjectCount
        or len(ids) != len(projects)
        or len(keys) != len(snapshot.export.portfolios)
        or any(not re.fullmatch(config.data_entry.projectIdPattern, project.projectId) for project in projects)
        or any(project.portfolioKey not in keys for project in projects)
    ):
        raise ProblemError(502, "The demo snapshot has invalid project counts, IDs, or portfolio keys.", slug="upstream-failure")
    return snapshot


class DemoDataService:
    def __init__(
        self, *, config: AppConfig, lake: OneLakeClient, paths: LakePaths, catalog: Catalog, changes: ProjectChanges,
    ) -> None:
        self._config = config
        self._lake = lake
        self._paths = paths
        self._catalog = catalog
        self._changes = changes

    def _require_demo(self) -> None:
        if not read_settings(self._config, self._lake).isDemoEnvironment:
            raise ProblemError(403, "Demo project loading and clearing are disabled in production mode.", slug="forbidden")

    def _snapshot(self) -> DemoSnapshot:
        found = self._lake.read_json(self._paths.demo_source())
        if found is None:
            raise ProblemError(
                404,
                f"The approved demo snapshot is missing at {self._paths.demo_source()}. "
                "Publish the verified synthetic snapshot before loading demo projects.",
                slug="lake-data-missing",
            )
        return validate_snapshot(found[0], self._config)

    def catalog(self) -> DemoCatalog:
        self._require_demo()
        snapshot = self._snapshot()
        return DemoCatalog(
            projectCount=len(snapshot.export.projects),
            portfolios=[
                DemoPortfolioCount(
                    key=portfolio.key, displayName=portfolio.displayName,
                    projectCount=sum(project.portfolioKey == portfolio.key for project in snapshot.export.projects),
                )
                for portfolio in snapshot.export.portfolios
            ],
            capturedAtUtc=snapshot.capturedAtUtc,
            asOfDate=snapshot.export.asOfDate,
            oneLakePath=self._paths.demo_source(),
        )

    def reset(self, *, action: Literal["load", "clear"], portfolio_key: str | None = None) -> DemoResetResult:
        self._require_demo()
        previous, etag = self._changes.reset_snapshot()
        self._changes.invalidate()
        replacements: list[dict[str, Any]] = []
        portfolios = list(previous["portfolios"]) if previous is not None else []
        if action == "load":
            snapshot = self._snapshot()
            if portfolio_key is not None and not any(item.key == portfolio_key for item in snapshot.export.portfolios):
                raise ProblemError(
                    422, "Choose a portfolio in the demo snapshot.", slug="validation-failed",
                    errors=[FieldIssue("portfolioKey", "is not a demo portfolio")],
                )
            replacements = [
                project.model_dump() for project in snapshot.export.projects
                if portfolio_key is None or project.portfolioKey == portfolio_key
            ]
            known = {item["key"] for item in portfolios}
            portfolios.extend(item.model_dump() for item in snapshot.export.portfolios if item.key not in known)
        current = self._catalog.list_projects(ProjectFilters())
        replacement_ids = {item["projectId"] for item in replacements}
        if portfolio_key is None:
            targets = set(self._catalog.project_ids()) | set(self._changes.all())
        else:
            moved = [
                item["projectId"] for item in current
                if item["projectId"] in replacement_ids and item.get("portfolioKey") != portfolio_key
            ]
            if moved:
                raise ProblemError(
                    409,
                    "Some demo project IDs now belong to another portfolio: " + ", ".join(sorted(moved))
                    + ". Move them back or load the full demo dataset; no projects were changed.",
                    slug="conflict",
                )
            targets = {item["projectId"] for item in current if item.get("portfolioKey") == portfolio_key}
        targets |= replacement_ids
        now = utc_now()
        revision = str(uuid4())
        records = dict(previous["records"]) if previous is not None else {}
        for project_id in targets:
            records[project_id] = {
                "projectId": project_id, "values": {}, "deleted": True,
                "updatedAtUtc": now, "resetRevision": revision,
            }
        for project in replacements:
            records[project["projectId"]] = {
                "projectId": project["projectId"], "values": {}, "replacement": project,
                "deleted": False, "isDeleted": False, "updatedAtUtc": now,
                "resetRevision": revision,
            }
        document = {
            "revision": revision, "updatedAtUtc": now, "action": action, "portfolioKey": portfolio_key,
            "records": records, "portfolios": portfolios, "sourcePath": self._paths.demo_source(),
        }
        # Recheck immediately before the only active-dataset write, not just when rendering the buttons.
        self._require_demo()
        self._changes.save_reset(document, etag)
        current_ids = {item["projectId"] for item in current}
        return DemoResetResult(
            action=action, portfolioKey=portfolio_key, loadedProjects=len(replacements),
            replacedProjects=len(current_ids & targets), totalProjects=len((current_ids - targets) | replacement_ids),
            revision=revision, updatedAtUtc=now,
        )
