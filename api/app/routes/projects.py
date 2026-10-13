"""Projects: list with filters and paging, one project, and project creation with an optional pipeline run."""

from typing import Any

from fastapi import APIRouter, Body, Depends, Query

from app.catalog import ProjectFilters, paginate
from app.container import Services
from app.models import Page, ProjectCreated, ProjectListItem, ProjectRecord
from app.problems import FieldIssue, ProblemError
from app.routes.deps import get_services, require_project_id

router = APIRouter(tags=["projects"])


@router.get("/projects", response_model=Page[ProjectListItem], operation_id="listProjects", summary="Processed and pending projects")
def list_projects(
    portfolio: str | None = Query(None, description="Portfolio key or code"),
    role: str | None = Query(None, description="main or coupled"),
    confidence: str | None = Query(None, description="High, Medium, or Low"),
    q: str | None = Query(None, description="Text match on ID, name, sponsor, or project manager"),
    page: int = Query(1, ge=1),
    pageSize: int | None = Query(None, ge=1),
    services: Services = Depends(get_services),
) -> Page[ProjectListItem]:
    paging = services.config.api.paging
    size = pageSize or paging.defaultPageSize
    if size > paging.maxPageSize:
        raise ProblemError(422, "The page size is larger than the maximum.", slug="validation-failed", errors=[FieldIssue("pageSize", f"must be at most {paging.maxPageSize}")])
    filters = ProjectFilters(portfolio=portfolio, role=role, confidence=confidence, query=q)
    matching = services.catalog.list_projects(filters)
    page_items, total_pages = paginate(matching, page, size)
    return Page[ProjectListItem](
        items=[ProjectListItem.model_validate(item) for item in page_items],
        page=page,
        pageSize=size,
        totalItems=len(matching),
        totalPages=total_pages,
    )


@router.post(
    "/projects",
    status_code=201,
    response_model=ProjectCreated,
    operation_id="createProject",
    summary="Create a project entry, assign its GIS number, and start the pipeline",
)
def create_project(
    payload: dict[str, Any] = Body(...),
    runPipeline: bool = Query(True, description="Start the pipeline after the entry is written"),
    services: Services = Depends(get_services),
) -> ProjectCreated:
    entry = services.projects.create(payload)
    run_id: str | None = None
    warnings: list[str] = []
    if runPipeline:
        run_id, warnings = services.pipeline.start_optional()
    return ProjectCreated(
        projectId=str(entry["projectId"]),
        status=services.config.api.projects.statusPending,
        pipelineRunId=run_id,
        warnings=warnings,
        entry=entry,
    )


@router.get("/projects/{projectId}", response_model=ProjectRecord, operation_id="getProject", summary="One processed or pending project")
def get_project(projectId: str, services: Services = Depends(get_services)) -> ProjectRecord:
    require_project_id(projectId, services.config.data_entry.projectIdPattern)
    found = services.catalog.get_project(projectId)
    if found is None:
        raise ProblemError(404, f"Project {projectId} was not found.", slug="not-found")
    return ProjectRecord.model_validate(found)
