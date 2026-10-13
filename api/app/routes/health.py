"""Health: process status and whether the lake exports exist. Never fails because data is missing."""

from fastapi import APIRouter, Depends

from app.container import Services
from app.files import utc_now
from app.models import HealthLake, HealthResponse, LakeFileStatus
from app.onelake import LakeError
from app.routes.deps import get_services

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    operation_id="getHealth",
    summary="Process status and lake data availability",
)
def get_health(services: Services = Depends(get_services)) -> HealthResponse:
    api = services.config.api.api
    lake_paths = {
        "portfolioExport": services.paths.portfolio_export(),
        "capacityScenarios": services.paths.capacity_export(),
    }
    lake_ok = True
    files: dict[str, LakeFileStatus] = {}
    for name, lake_path in lake_paths.items():
        try:
            found = services.lake.properties(lake_path)
            files[name] = LakeFileStatus(path=lake_path, available=found is not None)
        except LakeError as error:
            lake_ok = False
            files[name] = LakeFileStatus(path=lake_path, reason=str(error))
    return HealthResponse(
        status="ok",
        title=api.title,
        version=api.version,
        checkedAtUtc=utc_now(),
        lake=HealthLake(
            status="ok" if lake_ok else "unavailable",
            portfolioExport=files["portfolioExport"],
            capacityScenarios=files["capacityScenarios"],
        ),
    )
