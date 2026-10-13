"""Portfolio export (passthrough), portfolio list, and portfolio creation."""

from typing import Any

from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse

from app.container import Services
from app.models import PortfolioList, PortfolioView
from app.routes.deps import get_services

router = APIRouter(tags=["portfolio"])


@router.get(
    "/portfolio",
    operation_id="getPortfolioExport",
    summary="Portfolio export (contract v2), unchanged",
    responses={404: {"description": "The export is missing. The problem names the OneLake path and the pipeline."}},
)
def get_portfolio(services: Services = Depends(get_services)) -> JSONResponse:
    return JSONResponse(content=services.exports.read(services.paths.portfolio_export()))


@router.get("/portfolios", response_model=PortfolioList, operation_id="listPortfolios", summary="Portfolios from the export plus pending entries")
def list_portfolios(services: Services = Depends(get_services)) -> PortfolioList:
    items = [PortfolioView.model_validate(item) for item in services.catalog.portfolios()]
    return PortfolioList(items=items, count=len(items))


@router.post(
    "/portfolios",
    status_code=201,
    response_model=PortfolioView,
    operation_id="createPortfolio",
    summary="Create a portfolio entry (pending until the pipeline runs)",
)
def create_portfolio(payload: dict[str, Any] = Body(...), services: Services = Depends(get_services)) -> PortfolioView:
    return PortfolioView.model_validate(services.portfolios.create(payload))
