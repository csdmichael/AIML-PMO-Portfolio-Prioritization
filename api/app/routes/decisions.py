"""PMO decisions: record a decision for a project and list decisions, newest first."""

from fastapi import APIRouter, Depends, Query

from app.container import Services
from app.models import DecisionCreate, DecisionList, DecisionView
from app.routes.deps import get_services, require_project_id

router = APIRouter(tags=["decisions"])


@router.get("/decisions", response_model=DecisionList, operation_id="listDecisions", summary="PMO decisions, newest first")
def list_decisions(
    projectId: str | None = Query(None, description="Only decisions for this project"),
    services: Services = Depends(get_services),
) -> DecisionList:
    if projectId is not None:
        require_project_id(projectId, services.config.data_entry.projectIdPattern)
    items = [DecisionView.model_validate(item) for item in services.decisions.list_decisions(projectId)]
    return DecisionList(items=items, count=len(items))


@router.post(
    "/decisions",
    status_code=201,
    response_model=DecisionView,
    operation_id="createDecision",
    summary="Record a PMO decision for a project",
)
def create_decision(body: DecisionCreate, services: Services = Depends(get_services)) -> DecisionView:
    return DecisionView.model_validate(services.decisions.create(body.model_dump()))
