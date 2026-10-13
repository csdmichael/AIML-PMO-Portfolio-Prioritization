"""Project uploads: multipart source files stored under each source's ui_uploads folder for the project."""

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.container import Services
from app.models import UploadList, UploadMeta
from app.problems import ProblemError
from app.routes.deps import get_services, require_project_id

router = APIRouter(tags=["projects"])


@router.post(
    "/projects/{projectId}/uploads",
    status_code=201,
    response_model=UploadMeta,
    operation_id="uploadProjectFile",
    summary="Upload a source file for a project",
)
def upload_project_file(
    projectId: str,
    sourceKey: str = Form(...),
    file: UploadFile = File(...),
    services: Services = Depends(get_services),
) -> UploadMeta:
    require_project_id(projectId, services.config.data_entry.projectIdPattern)
    limit = services.config.data_entry.uploads.maxFileBytes
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise ProblemError(413, "The file is larger than the upload limit.", slug="payload-too-large", extensions={"maxFileBytes": limit})
    return UploadMeta.model_validate(services.projects.add_upload(projectId, sourceKey, file.filename or "", data))


@router.get(
    "/projects/{projectId}/uploads",
    response_model=UploadList,
    operation_id="listProjectUploads",
    summary="Uploads recorded for a project, across all sources",
)
def list_project_uploads(projectId: str, services: Services = Depends(get_services)) -> UploadList:
    require_project_id(projectId, services.config.data_entry.projectIdPattern)
    items = [UploadMeta.model_validate(item) for item in services.projects.list_uploads(projectId)]
    return UploadList(projectId=projectId, items=items, count=len(items))
