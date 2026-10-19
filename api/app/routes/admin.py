"""Admin endpoints: configure dropdown lookups and project priority field weights."""

import json
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
SHARED_CONFIG_ROOT = Path(__file__).resolve().parents[1] / "config" / "shared"


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
    summary="Get global admin settings including demo environment flag",
)
def get_admin_settings(services: Services = Depends(get_services)) -> AdminSettings:
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
    summary="Update global admin settings including demo environment flag",
)
def update_admin_settings(
    body: AdminSettingsUpdateRequest, services: Services = Depends(get_services)
) -> AdminSettings:
    settings = AdminSettings(
        isDemoEnvironment=body.isDemoEnvironment,
        environmentName=body.environmentName
        or ("Demo / Sandbox" if body.isDemoEnvironment else "Production"),
    )
    serialized = settings.model_dump_json(indent=2)
    for target in (CONFIG_ROOT / "system-settings.json", SHARED_CONFIG_ROOT / "system-settings.json"):
        try:
            target.write_text(serialized, encoding="utf-8")
        except Exception:
            pass
    try:
        services.lake.write_json("Files/config/system-settings.json", settings.model_dump(), etag=None)
    except Exception:
        pass
    return settings


class PriorityWeightsUpdateRequest(BaseModel):
    defaultWeights: dict[str, float] | None = None
    projectOverrides: dict[str, dict[str, float]] | None = None


def _get_weights_path() -> Path:
    p = CONFIG_ROOT / "priority-weights.json"
    if p.exists():
        return p
    return SHARED_CONFIG_ROOT / "priority-weights.json"


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
    summary="Get configurable priority weights and per-project overrides",
)
def get_priority_weights(services: Services = Depends(get_services)) -> dict[str, Any]:
    path = _get_weights_path()
    if not path.exists():
        raise ProblemError(404, "Priority weights configuration not found", slug="not-found")
    return json.loads(path.read_text(encoding="utf-8"))


@router.put(
    "/priority-weights",
    response_model=PriorityWeightsResponse,
    operation_id="updatePriorityWeights",
    summary="Update configurable priority weights and per-project overrides",
)
def update_priority_weights(
    body: PriorityWeightsUpdateRequest, services: Services = Depends(get_services)
) -> dict[str, Any]:
    path = _get_weights_path()
    if not path.exists():
        raise ProblemError(404, "Priority weights configuration not found", slug="not-found")

    cfg = json.loads(path.read_text(encoding="utf-8"))
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

    # Persist locally
    serialized = json.dumps(cfg, indent=2, ensure_ascii=False)
    for target in (CONFIG_ROOT / "priority-weights.json", SHARED_CONFIG_ROOT / "priority-weights.json"):
        try:
            target.write_text(serialized, encoding="utf-8")
        except Exception:
            pass

    # Write to enterprise storage
    try:
        services.lake.write_json("Files/config/priority-weights.json", cfg, etag=None)
    except Exception:
        pass

    return cfg
