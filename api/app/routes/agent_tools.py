"""Dedicated workload-only endpoint, published separately from browser APIs."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header

from app.agent_tools import PortfolioQuery, query_portfolio
from app.container import Services
from app.routes.deps import get_services

router = APIRouter(tags=["agent"])


@router.post("/agent/tools/query", operation_id="queryFabricPortfolio", summary="Read-only bounded Fabric portfolio query")
def query(
    body: PortfolioQuery,
    authorization: Annotated[str, Header()] = "",
    services: Services = Depends(get_services),
) -> dict[str, Any]:
    services.tool_tokens.verify(authorization)
    snapshot = services.catalog.agent_snapshot()
    return query_portfolio(snapshot, body)
