"""Admin endpoints: configure dropdown lookups and project priority field weights."""

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.container import Services
from app.contracts import OptionLists, SkillOption
from app.problems import ProblemError
from app.routes.deps import get_services

router = APIRouter(prefix="/admin", tags=["admin"])


class LookupUpdateRequest(BaseModel):
    sites: list[str] | None = None
    businessUnits: list[str] | None = None
    projectStatuses: list[str] | None = None
    sponsorLevels: list[str] | None = None
    riskRatings: list[str] | None = None
    skills: list[SkillOption] | None = None
    relationshipTypes: list[str] | None = None


class PriorityFieldWeight(BaseModel):
    key: str
    label: str
    category: str
    description: str
    min: float
    max: float
    higherIsBetter: bool = True
    defaultWeight: float


class PriorityWeightsResponse(BaseModel):
    version: int = 1
    description: str
    availableFields: list[dict[str, Any]]
    defaultWeights: dict[str, float]
    projectOverrides: dict[str, dict[str, float]]
    presets: list[dict[str, Any]] = Field(default_factory=list)


class AdminSettings(BaseModel):
    isDemoEnvironment: bool = True
    environmentName: str = "Demo / Sandbox"
    description: str = (
        "Controls whether demo actions like sample dataset loading and clearing portfolio data are permitted."
    )


class AdminSettingsUpdateRequest(BaseModel):
    isDemoEnvironment: bool
    environmentName: str | None = None


def _shared_json(services: Services, key: str) -> dict[str, Any]:
    """Defaults from the shared config named by key in api.json (the copy shipped with this app)."""
    spec = services.config.api.sharedConfig.files[key]
    return json.loads((services.config.shared_dir / spec.fileName).read_text(encoding="utf-8"))


def _settings_from_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    values: dict[str, Any] = {}
    for row in rows:
        key = row.get("setting_key")
        raw = row.get("setting_value")
        if key not in AdminSettings.model_fields or raw is None:
            continue
        values[key] = str(raw).lower() in ("true", "1", "yes") if row.get("setting_type") == "boolean" else raw
    return values


@router.get(
    "/settings",
    response_model=AdminSettings,
    operation_id="getAdminSettings",
    summary="Get global admin settings from OneLake system_settings table",
)
def get_admin_settings(services: Services = Depends(get_services)) -> AdminSettings:
    stored = _settings_from_rows(services.lake.read_table("system_settings") or [])
    return AdminSettings.model_validate({**_shared_json(services, "systemSettings"), **stored})


@router.put(
    "/settings",
    response_model=AdminSettings,
    operation_id="updateAdminSettings",
    summary="Update global admin settings and write to OneLake system_settings table",
)
def update_admin_settings(
    body: AdminSettingsUpdateRequest, services: Services = Depends(get_services)
) -> AdminSettings:
    settings = AdminSettings(
        isDemoEnvironment=body.isDemoEnvironment,
        environmentName=body.environmentName
        or ("Demo / Sandbox" if body.isDemoEnvironment else "Production"),
    )
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
    services.lake.write_table("system_settings", table_rows)
    return settings


class PriorityWeightsUpdateRequest(BaseModel):
    defaultWeights: dict[str, float] | None = None
    projectOverrides: dict[str, dict[str, float]] | None = None


def _weights_from_rows(rows: list[dict[str, Any]]) -> tuple[dict[str, float], dict[str, dict[str, float]]]:
    defaults: dict[str, float] = {}
    overrides: dict[str, dict[str, float]] = {}
    for row in rows:
        field = row.get("field_key")
        project = row.get("project_id", "*")
        if not field:
            continue
        try:
            weight = float(row.get("weight_percent"))
        except (TypeError, ValueError) as error:
            raise ProblemError(502, f"The OneLake priority weight for {field} is not a number.", slug="upstream-failure") from error
        if project == "*":
            defaults[field] = weight
        else:
            overrides.setdefault(project, {})[field] = weight
    return defaults, overrides


@router.get(
    "/lookups",
    response_model=OptionLists,
    operation_id="getLookups",
    summary="Get all configurable dropdown lookup lists",
)
def get_lookups(services: Services = Depends(get_services)) -> OptionLists:
    return services.config.data_entry.options


@router.put(
    "/lookups",
    response_model=OptionLists,
    operation_id="updateLookups",
    summary="Update configurable dropdown lookup lists",
)
def update_lookups(
    body: LookupUpdateRequest, services: Services = Depends(get_services)
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
    summary="Get configurable priority weights from OneLake priority_field_weights table",
)
def get_priority_weights(services: Services = Depends(get_services)) -> dict[str, Any]:
    base = _shared_json(services, "priorityWeights")
    rows = services.lake.read_table("priority_field_weights") or []
    if not rows:
        return base
    defaults, overrides = _weights_from_rows(rows)
    return {**base, "defaultWeights": defaults or base.get("defaultWeights", {}), "projectOverrides": overrides}


@router.put(
    "/priority-weights",
    response_model=PriorityWeightsResponse,
    operation_id="updatePriorityWeights",
    summary="Update priority weights and write to OneLake priority_field_weights table",
)
def update_priority_weights(
    body: PriorityWeightsUpdateRequest, services: Services = Depends(get_services)
) -> dict[str, Any]:
    cfg = get_priority_weights(services)

    if body.defaultWeights is not None:
        total = sum(body.defaultWeights.values())
        if total <= 0:
            raise ProblemError(422, "Total weight must be greater than zero", slug="validation-failed")
        cfg["defaultWeights"] = {k: round(float(v), 2) for k, v in body.defaultWeights.items()}

    if body.projectOverrides is not None:
        cfg["projectOverrides"] = {
            pid: {k: round(float(v), 2) for k, v in weights.items()}
            for pid, weights in body.projectOverrides.items()
        }

    now = datetime.now(timezone.utc).isoformat()
    # 1. Write directly to OneLake table Tables/priority_field_weights
    table_rows = []
    for k, v in cfg["defaultWeights"].items():
        table_rows.append({
            "project_id": "*",
            "field_key": k,
            "field_label": k,
            "weight_percent": float(v),
            "is_active": True,
            "updated_at": now,
        })
    for pid, overrides in cfg["projectOverrides"].items():
        for k, v in overrides.items():
            table_rows.append({
                "project_id": pid,
                "field_key": k,
                "field_label": k,
                "weight_percent": float(v),
                "is_active": True,
                "updated_at": now,
            })

    services.lake.write_table("priority_field_weights", table_rows)
    return cfg
