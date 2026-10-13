"""Options: the data-entry contract, served as written so the UI builds its forms from it."""

from typing import Any

from fastapi import APIRouter, Depends

from app.container import Services
from app.models import OptionsResponse
from app.routes.deps import get_services

router = APIRouter(tags=["options"])


@router.get(
    "/options",
    response_model=OptionsResponse,
    response_model_exclude_none=True,
    operation_id="getOptions",
    summary="Data-entry contract: option lists, field rules, and upload rules",
)
def get_options(services: Services = Depends(get_services)) -> dict[str, Any]:
    return services.config.data_entry.model_dump(exclude_none=True)
