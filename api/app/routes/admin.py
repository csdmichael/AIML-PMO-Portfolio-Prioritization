"""Admin endpoints: configure dropdown lookups and project priority field weights."""

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.container import Services
from app.contracts import OptionLists, SkillOption
from app.priority_weights import PriorityWeightsResponse, PriorityWeightsUpdateRequest
from app.routes.deps import get_fresh_services, get_services
from app.system_settings import AdminSettings, read_settings

router = APIRouter(prefix="/admin", tags=["admin"])


class LookupUpdateRequest(BaseModel):
    sites: list[str] | None = None
    businessUnits: list[str] | None = None
    projectStatuses: list[str] | None = None
    sponsorLevels: list[str] | None = None
    riskRatings: list[str] | None = None
    skills: list[SkillOption] | None = None
    relationshipTypes: list[str] | None = None


class AdminSettingsUpdateRequest(BaseModel):
    isDemoEnvironment: bool
    environmentName: str | None = None


def _shared_json(services: Services, key: str) -> dict[str, Any]:
    """Defaults from the shared config named by key in api.json (the copy shipped with this app)."""
    spec = services.config.api.sharedConfig.files[key]
    return json.loads((services.config.shared_dir / spec.fileName).read_text(encoding="utf-8"))


@router.get(
    "/settings",
    response_model=AdminSettings,
    operation_id="getAdminSettings",
    summary="Get global admin settings from OneLake system_settings table",
)
def get_admin_settings(services: Services = Depends(get_services)) -> AdminSettings:
    return read_settings(services.config, services.lake)


@router.put(
    "/settings",
    response_model=AdminSettings,
    operation_id="updateAdminSettings",
    summary="Update global admin settings and write to OneLake system_settings table",
)
def update_admin_settings(
    body: AdminSettingsUpdateRequest, services: Services = Depends(get_services)
) -> AdminSettings:
    current = read_settings(services.config, services.lake)
    names = _shared_json(services, "systemSettings")["environmentNames"]
    settings = current.model_copy(update={
        "isDemoEnvironment": body.isDemoEnvironment,
        "environmentName": body.environmentName or names["demo" if body.isDemoEnvironment else "production"],
    })
    now = datetime.now(timezone.utc).isoformat()
    # 1. Write directly to OneLake table Tables/system_settings
    table_rows = [
        {
            "setting_key": "isDemoEnvironment",
            "setting_value": str(settings.isDemoEnvironment).lower(),
            "setting_type": "boolean",
            "description": "Controls whether demo actions like sample dataset loading and clearing portfolio data are permitted.",
            "updated_at": now,
        },
        {
            "setting_key": "environmentName",
            "setting_value": settings.environmentName,
            "setting_type": "string",
            "description": "Enterprise environment classification label.",
            "updated_at": now,
        },
    ]
    services.lake.write_table(services.config.api.oneLake.systemSettingsTable, table_rows)
    return settings


@router.get(
    "/lookups",
    response_model=OptionLists,
    operation_id="getLookups",
    summary="Get all configurable dropdown lookup lists",
)
def get_lookups(services: Services = Depends(get_fresh_services)) -> OptionLists:
    return services.config.data_entry.options


@router.put(
    "/lookups",
    response_model=OptionLists,
    operation_id="updateLookups",
    summary="Update configurable dropdown lookup lists",
)
def update_lookups(
    body: LookupUpdateRequest, services: Services = Depends(get_fresh_services)
) -> OptionLists:
    current = services.config.data_entry.model_copy(deep=True)
    options = current.options
    if body.sites is not None:
        options.sites = [s.strip() for s in body.sites if s.strip()]
    if body.businessUnits is not None:
        options.businessUnits = [b.strip() for b in body.businessUnits if b.strip()]
    if body.projectStatuses is not None:
        options.projectStatuses = [s.strip() for s in body.projectStatuses if s.strip()]
    if body.sponsorLevels is not None:
        options.sponsorLevels = [s.strip() for s in body.sponsorLevels if s.strip()]
    if body.riskRatings is not None:
        options.riskRatings = [r.strip() for r in body.riskRatings if r.strip()]
    if body.skills is not None:
        options.skills = body.skills
    if body.relationshipTypes is not None:
        options.relationshipTypes = [r.strip() for r in body.relationshipTypes if r.strip()]

    services.lake.write_json("Files/config/data-entry.json", current.model_dump(), overwrite=True)
    services.config.data_entry.options = options
    return options


@router.get(
    "/priority-weights",
    response_model=PriorityWeightsResponse,
    operation_id="getPriorityWeights",
    summary="Get global, portfolio and project priority weights from OneLake JSON records",
)
def get_priority_weights(services: Services = Depends(get_services)) -> PriorityWeightsResponse:
    return services.priority_weights.get()


@router.put(
    "/priority-weights",
    response_model=PriorityWeightsResponse,
    operation_id="updatePriorityWeights",
    summary="Patch scoped priority weights with a conditional OneLake JSON write",
)
def update_priority_weights(
    body: PriorityWeightsUpdateRequest, services: Services = Depends(get_services)
) -> PriorityWeightsResponse:
    return services.priority_weights.update(body, services.catalog)
