"""Admin endpoints: configure dropdown lookups and project priority field weights."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.container import Services
from app.contracts import OptionLists, SkillOption
from app.problems import ProblemError
from app.routes.deps import get_services

router = APIRouter(prefix="/admin", tags=["admin"])

CONFIG_ROOT = Path(__file__).resolve().parents[2].parent / "config"
SHARED_CONFIG_ROOT = Path(__file__).resolve().parents[2] / "config" / "shared"


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


def _get_settings_path() -> Path:
    p = CONFIG_ROOT / "system-settings.json"
    if p.exists():
        return p
    return SHARED_CONFIG_ROOT / "system-settings.json"


@router.get(
    "/settings",
    response_model=AdminSettings,
    operation_id="getAdminSettings",
    summary="Get global admin settings from OneLake system_settings table",
)
def get_admin_settings(services: Services = Depends(get_services)) -> AdminSettings:
    # 1. Try reading from OneLake table Tables/system_settings
    try:
        records = services.lake.read_table("system_settings")
        if records:
            settings_dict: dict[str, Any] = {}
            for r in records:
                k = r.get("setting_key")
                v = r.get("setting_value")
                t = r.get("setting_type")
                if k and v is not None:
                    if t == "boolean":
                        settings_dict[k] = str(v).lower() in ("true", "1", "yes")
                    else:
                        settings_dict[k] = v
            if "isDemoEnvironment" in settings_dict:
                return AdminSettings(
                    isDemoEnvironment=bool(settings_dict["isDemoEnvironment"]),
                    environmentName=str(settings_dict.get("environmentName", "Demo / Sandbox")),
                )
    except Exception:
        pass

    # 2. Local config fallback
    path = _get_settings_path()
    if path.exists():
        try:
            return AdminSettings.model_validate_json(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return AdminSettings(isDemoEnvironment=True)


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
    try:
        services.lake.write_table("system_settings", table_rows)
        services.lake.write_json("Files/config/system-settings.json", settings.model_dump(), overwrite=True)
    except Exception:
        pass

    # 2. Persist local config
    serialized = settings.model_dump_json(indent=2)
    for target in (CONFIG_ROOT / "system-settings.json", SHARED_CONFIG_ROOT / "system-settings.json"):
        try:
            target.write_text(serialized, encoding="utf-8")
        except Exception:
            pass
    return settings


class PriorityWeightsUpdateRequest(BaseModel):
    defaultWeights: dict[str, float] | None = None
    projectOverrides: dict[str, dict[str, float]] | None = None


def _get_weights_path() -> Path | None:
    candidates = [
        CONFIG_ROOT / "priority-weights.json",
        SHARED_CONFIG_ROOT / "priority-weights.json",
        Path(__file__).resolve().parents[2] / "config" / "shared" / "priority-weights.json",
        Path(__file__).resolve().parents[2] / "config" / "priority-weights.json",
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def _load_weights_config() -> dict[str, Any]:
    path = _get_weights_path()
    if path is not None and path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"version": 1, "description": "Priority weights", "availableFields": [], "defaultWeights": {}, "projectOverrides": {}, "presets": []}


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
    options = services.config.data_entry.options
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

    # Persist updated options to config/data-entry.json and api/config/shared/data-entry.json
    for path in (CONFIG_ROOT / "data-entry.json", SHARED_CONFIG_ROOT / "data-entry.json"):
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                data["options"] = options.model_dump()
                path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            except Exception:
                pass

    # Save to central storage if available
    try:
        services.lake.write_json(
            "Files/config/data-entry.json",
            services.config.data_entry.model_dump(),
            etag=None,
        )
    except Exception:
        pass

    return options


@router.get(
    "/priority-weights",
    response_model=PriorityWeightsResponse,
    operation_id="getPriorityWeights",
    summary="Get configurable priority weights from OneLake priority_field_weights table",
)
def get_priority_weights(services: Services = Depends(get_services)) -> dict[str, Any]:
    # 1. Try reading directly from OneLake table Tables/priority_field_weights
    try:
        records = services.lake.read_table("priority_field_weights")
        if records:
            default_weights: dict[str, float] = {}
            project_overrides: dict[str, dict[str, float]] = {}
            for r in records:
                pid = r.get("project_id", "*")
                k = r.get("field_key")
                w = float(r.get("weight_percent", 0.0))
                if not k:
                    continue
                if pid == "*":
                    default_weights[k] = w
                else:
                    project_overrides.setdefault(pid, {})[k] = w
            if default_weights:
                res = _load_weights_config()
                res["defaultWeights"] = default_weights
                res["projectOverrides"] = project_overrides
                return res
    except Exception:
        pass

    return _load_weights_config()


@router.put(
    "/priority-weights",
    response_model=PriorityWeightsResponse,
    operation_id="updatePriorityWeights",
    summary="Update priority weights and write to OneLake priority_field_weights table",
)
def update_priority_weights(
    body: PriorityWeightsUpdateRequest, services: Services = Depends(get_services)
) -> dict[str, Any]:
    cfg = _load_weights_config()

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

    try:
        services.lake.write_table("priority_field_weights", table_rows)
        services.lake.write_json("Files/config/priority-weights.json", cfg, overwrite=True)
    except Exception:
        pass

    # 2. Persist locally
    serialized = json.dumps(cfg, indent=2, ensure_ascii=False)
    for target in (
        CONFIG_ROOT / "priority-weights.json",
        SHARED_CONFIG_ROOT / "priority-weights.json",
    ):
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(serialized, encoding="utf-8")
        except Exception:
            pass

    return cfg
