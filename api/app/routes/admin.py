"""Admin endpoints: configure dropdown lookups and project priority field weights."""

import json
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, ValidationError

from app.container import Services
from app.contracts import OptionLists, SkillOption
from app.priority_weights import PriorityWeightsResponse, PriorityWeightsUpdateRequest
from app.routes.deps import get_fresh_services, get_services
from app.system_settings import AdminSettings, read_settings
from app.problems import ProblemError

router = APIRouter(prefix="/admin", tags=["admin"])


class LookupUpdateRequest(BaseModel):
    sites: list[str] | None = None
    businessUnits: list[str] | None = None
    projectStatuses: list[str] | None = None
    sponsorLevels: list[str] | None = None
    sponsorLevelScores: dict[str, Annotated[float, Field(strict=True, gt=0, allow_inf_nan=False)]] | None = None
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
    options = services.config.data_entry.options.model_copy(deep=True)
    scores = {**_shared_json(services, "mlModel")["mappings"]["sponsorLevel"], **options.sponsorLevelScores}
    options.sponsorLevelScores = {level: scores[level] for level in options.sponsorLevels if level in scores}
    return options


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
    if body.sponsorLevelScores is not None:
        unknown = set(body.sponsorLevelScores) - set(options.sponsorLevels)
        if unknown:
            raise ProblemError(422, f"Scores reference unregistered sponsor levels: {', '.join(sorted(unknown))}.", slug="validation-failed")
        options.sponsorLevelScores = {**options.sponsorLevelScores, **body.sponsorLevelScores}
    known_scores = _shared_json(services, "mlModel")["mappings"]["sponsorLevel"]
    scores = {**known_scores, **options.sponsorLevelScores}
    if len({level.casefold() for level in options.sponsorLevels}) != len(options.sponsorLevels):
        raise ProblemError(422, "Sponsor level names must be unique, ignoring case.", slug="validation-failed")
    missing = [level for level in options.sponsorLevels if level not in scores]
    if missing:
        raise ProblemError(422, f"Choose a positive score for each new sponsor level: {', '.join(missing)}.", slug="validation-failed")
    options.sponsorLevelScores = {level: scores[level] for level in options.sponsorLevels}
    try:
        options = OptionLists.model_validate(options.model_dump())
    except ValidationError as error:
        raise ProblemError(422, "Sponsor scores must be finite positive numbers.", slug="validation-failed") from error
    if body.riskRatings is not None:
        options.riskRatings = [r.strip() for r in body.riskRatings if r.strip()]
    if body.skills is not None:
        options.skills = body.skills
    if body.relationshipTypes is not None:
        options.relationshipTypes = [r.strip() for r in body.relationshipTypes if r.strip()]

    services.options.replace(options)
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
