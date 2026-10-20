"""Projects: list with filters and paging, one project, creation, Excel import, lifecycle changes, and pipeline start."""

from typing import Any

from fastapi import APIRouter, Body, Depends, File, Query, UploadFile

from app.catalog import ProjectFilters, paginate
from app.container import Services
from app.models import ImportedProject, Page, ProjectCreated, ProjectImportResult, ProjectListItem, ProjectRecord, ProjectRemoved
from app.problems import FieldIssue, ProblemError
from app.routes.deps import get_fresh_services, get_services, require_project_id

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
    "/projects/import",
    status_code=201,
    response_model=ProjectImportResult,
    operation_id="importProjects",
    summary="Create projects from an Excel register; every row is checked before any project is saved",
)
def import_projects(
    file: UploadFile = File(...),
    runPipeline: bool = Query(True, description="Start the pipeline after the projects are written"),
    services: Services = Depends(get_fresh_services),
) -> ProjectImportResult:
    limit = services.config.data_entry.uploads.maxFileBytes
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise ProblemError(413, "The file is larger than the upload limit.", slug="payload-too-large", extensions={"maxFileBytes": limit})
    created = services.imports.import_workbook(data)
    run_id: str | None = None
    warnings: list[str] = []
    if runPipeline:
        run_id, warnings = services.pipeline.start_optional()
    return ProjectImportResult(
        created=[ImportedProject.model_validate(item) for item in created],
        count=len(created),
        pipelineRunId=run_id,
        warnings=warnings,
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
    services: Services = Depends(get_fresh_services),
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


@router.patch(
    "/projects/{projectId}",
    response_model=ProjectRecord,
    operation_id="updateProject",
    summary="Change a project's fields, or soft delete and restore it",
)
def update_project(projectId: str, body: dict[str, Any] = Body(...), services: Services = Depends(get_fresh_services)) -> ProjectRecord:
    require_project_id(projectId, services.config.data_entry.projectIdPattern)
    return ProjectRecord.model_validate(services.projects.update_fields(projectId, body))


@router.delete(
    "/projects/{projectId}",
    response_model=ProjectRemoved,
    operation_id="deleteProject",
    summary="Remove a project from every view; its entry stays in OneLake for audit",
)
def delete_project(projectId: str, services: Services = Depends(get_fresh_services)) -> ProjectRemoved:
    require_project_id(projectId, services.config.data_entry.projectIdPattern)
    return ProjectRemoved.model_validate(services.projects.remove(projectId))
