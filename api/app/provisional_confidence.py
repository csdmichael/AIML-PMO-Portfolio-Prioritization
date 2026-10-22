"""Provisional confidence for data-entry projects that the pipeline has not scored yet.

The pipeline scores a project as 100 x (0.45 completeness + 0.35 quality + 0.20 model certainty), using the weights and
level thresholds in config/ml-model.json. A saved entry has no model output, so its model certainty is zero, the value the
pipeline uses for any missing component. Completeness is the share of the model's features that have a value. Quality is
the mean confidence of those values: an entered value counts 100%, and an AI-prefilled value counts its evidence score,
as the Edit Project screen shows it.
"""

import json
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from app.config import AppConfig

SHARED_MODEL_FILE = Path(__file__).resolve().parents[1] / "config" / "shared" / "ml-model.json"

# Feature source in config/ml-model.json -> the data-entry field that supplies it.
FEATURE_FIELDS: dict[str, str] = {
    "go_live_date": "goLiveDate",
    "business_value": "businessValue",
    "sponsor_priority": "sponsorLevel",
    "regulatory_security": "regulatorySecurity",
    "user_base": "userBase",
    "skill_demand": "skillDemandFte",
    "cost_usd": "costEstimateUsd",
    "dependencies": "dependencies",
    "risk": "riskRating",
    "dt_alignment": "dtAlignment",
    "effort_person_weeks": "effortPersonWeeks",
}


class ProvisionalConfidence:
    def __init__(self, model: Mapping[str, Any]) -> None:
        confidence = model["confidence"]
        self._weights: Mapping[str, float] = confidence["weights"]
        self._decimals = int(confidence["decimals"])
        self._levels = sorted(
            ((level["name"], float(level["minScore"])) for level in confidence["levels"]),
            key=lambda level: level[1],
            reverse=True,
        )
        self._fields = [FEATURE_FIELDS.get(feature["source"]) for feature in model["features"]]

    def score(self, record: Mapping[str, Any]) -> dict[str, Any]:
        provenance = record.get("fieldProvenance")
        if not isinstance(provenance, Mapping):
            provenance = {}
        filled = [field for field in self._fields if field is not None and _has_value(record.get(field))]
        completeness = len(filled) / len(self._fields) if self._fields else 0.0
        quality = sum(_field_confidence(field, provenance) for field in filled) / len(filled) if filled else 0.0
        # Model certainty is zero until the pipeline scores the project.
        value = 100 * (self._weights["completeness"] * completeness + self._weights["quality"] * quality)
        score = round(value, self._decimals)
        level = next((name for name, minimum in self._levels if score >= minimum), self._levels[-1][0])
        return {"confidenceScore": score, "confidenceLevel": level}


def default_provisional_confidence() -> ProvisionalConfidence:
    return ProvisionalConfidence(json.loads(SHARED_MODEL_FILE.read_text(encoding="utf-8")))


def load_ml_model(config: AppConfig) -> dict[str, Any]:
    spec = config.api.sharedConfig.files.get("mlModel")
    path = config.shared_dir / (spec.fileName if spec is not None else "ml-model.json")
    return json.loads(path.read_text(encoding="utf-8"))


def _has_value(value: Any) -> bool:
    return value is not None and value != "" and value != []


def _field_confidence(field: str, provenance: Mapping[str, Any]) -> float:
    item = provenance.get(field)
    if not isinstance(item, Mapping) or item.get("source") != "ai":
        return 1.0
    score = item.get("confidenceScore")
    if isinstance(score, bool) or not isinstance(score, (int, float)):
        return 0.0
    fraction = score / 100 if score > 1 else score
    return min(max(float(fraction), 0.0), 1.0)
