"""The current global settings, read directly from OneLake for each guarded action."""

import json
import logging
from typing import Any

from pydantic import BaseModel, ValidationError

from app.config import AppConfig
from app.onelake import OneLakeClient
from app.problems import ProblemError

logger = logging.getLogger(__name__)


class AdminSettings(BaseModel):
    isDemoEnvironment: bool
    environmentName: str
    description: str


def settings_from_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    values: dict[str, Any] = {}
    for row in rows:
        key = row.get("setting_key")
        raw = row.get("setting_value")
        if key not in AdminSettings.model_fields or raw is None:
            continue
        values[key] = str(raw).lower() in ("true", "1", "yes") if row.get("setting_type") == "boolean" else raw
    return values


def read_settings(config: AppConfig, lake: OneLakeClient) -> AdminSettings:
    spec = config.api.sharedConfig.files["systemSettings"]
    defaults = json.loads((config.shared_dir / spec.fileName).read_text(encoding="utf-8"))
    stored = settings_from_rows(lake.read_table(config.api.oneLake.systemSettingsTable) or [])
    try:
        return AdminSettings.model_validate({**defaults, **stored})
    except ValidationError as error:
        logger.error("The global OneLake settings do not match the settings contract")
        raise ProblemError(502, "The global settings are invalid. Demo actions are blocked.", slug="upstream-failure") from error
