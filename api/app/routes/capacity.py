"""Capacity what-if scenarios, served as written by notebook 02."""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.container import Services
from app.routes.deps import get_services

router = APIRouter(tags=["capacity"])


@router.get(
    "/capacity/scenarios",
    operation_id="getCapacityScenarios",
    summary="Capacity what-if scenarios (capacity_scenarios.json), unchanged",
    responses={404: {"description": "The export is missing. The problem names the OneLake path and the pipeline."}},
)
def get_capacity_scenarios(services: Services = Depends(get_services)) -> JSONResponse:
    return JSONResponse(content=services.exports.read(services.paths.capacity_export()))
