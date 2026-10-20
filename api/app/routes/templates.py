"""Intake and import workbook templates: headers and dropdown lists built from config, with no data rows."""

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.container import Services
from app.intake_template import build_intake_template
from app.routes.deps import get_services

router = APIRouter(tags=["templates"])


@router.get(
    "/templates/project-import.xlsx",
    operation_id="getProjectImportTemplate",
    summary="Project import workbook (header row and allowed values, no data rows)",
    responses={200: {"content": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {}}}},
)
def get_project_import_template(services: Services = Depends(get_services)) -> Response:
    settings = services.config.api.projectImport
    return Response(
        content=services.imports.template(),
        media_type=settings.contentType,
        headers={"Content-Disposition": f'attachment; filename="{settings.fileName}"'},
    )


@router.get(
    "/templates/intake.xlsx",
    operation_id="getIntakeTemplate",
    summary="Intake workbook template (headers and dropdowns, no data rows)",
    responses={200: {"content": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {}}}},
)
def get_intake_template(services: Services = Depends(get_services)) -> Response:
    settings = services.config.api.templates.intakeWorkbook
    return Response(
        content=build_intake_template(services.config),
        media_type=settings.contentType,
        headers={"Content-Disposition": f'attachment; filename="{settings.fileName}"'},
    )
