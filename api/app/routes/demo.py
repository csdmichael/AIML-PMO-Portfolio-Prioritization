"""The server rechecks demo mode for every catalog read and confirmed destructive action."""

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.container import Services
from app.demo_data import DemoCatalog, DemoResetResult
from app.routes.deps import get_services

router = APIRouter(prefix="/demo/projects", tags=["demo"])


class DemoLoadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confirmReplace: Literal[True]
    portfolioKey: str | None = Field(default=None, min_length=1)


class DemoClearRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confirmClear: Literal[True]


@router.get("", response_model=DemoCatalog, operation_id="getDemoProjectCatalog", summary="Approved synthetic demo counts by portfolio (demo mode only)")
def catalog(services: Services = Depends(get_services)) -> DemoCatalog:
    return services.demo.catalog()


@router.post("/load", response_model=DemoResetResult, operation_id="loadDemoProjects", summary="Replace all projects or one portfolio with approved demo projects")
def load(body: DemoLoadRequest, services: Services = Depends(get_services)) -> DemoResetResult:
    return services.demo.reset(action="load", portfolio_key=body.portfolioKey)


@router.post("/clear", response_model=DemoResetResult, operation_id="clearDemoProjects", summary="Clear every project from application views, preserving source and audit files")
def clear(body: DemoClearRequest, services: Services = Depends(get_services)) -> DemoResetResult:
    return services.demo.reset(action="clear")
