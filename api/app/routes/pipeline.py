"""Pipeline control: start the Fabric data pipeline and read the status of a run."""

from fastapi import APIRouter, Depends

from app.container import Services
from app.models import PipelineRunStarted, PipelineRunStatus
from app.routes.deps import get_services, require_guid

router = APIRouter(tags=["pipeline"])


@router.post(
    "/pipeline/runs",
    status_code=202,
    response_model=PipelineRunStarted,
    operation_id="startPipelineRun",
    summary="Start the Fabric data pipeline",
)
def start_pipeline_run(services: Services = Depends(get_services)) -> PipelineRunStarted:
    return PipelineRunStarted.model_validate(services.pipeline.start())


@router.get(
    "/pipeline/runs/{runId}",
    response_model=PipelineRunStatus,
    operation_id="getPipelineRun",
    summary="Status of a pipeline run, read from Fabric",
)
def get_pipeline_run(runId: str, services: Services = Depends(get_services)) -> PipelineRunStatus:
    require_guid(runId, "runId")
    result = PipelineRunStatus.model_validate(services.pipeline.status(runId))
    if result.status == "Completed":
        services.exports.invalidate()
        services.changes.invalidate()
    return result
