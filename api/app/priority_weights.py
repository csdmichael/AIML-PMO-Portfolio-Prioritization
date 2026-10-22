"""JSON-backed global, portfolio, and project priority weights.

Updates patch only named scopes; an empty/null override removes that scope.
Scores are read-time projections of saved analysis, never edits to ML predictions.
"""

import json
from collections.abc import Mapping
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.config import AppConfig
from app.onelake import LakeConflict, OneLakeClient
from app.options_store import OptionsStore
from app.priority_scoring import (
    PRIORITY_WEIGHTS_PATH,
    PriorityWeightError,
    ScoringEvidenceError,
    blend_priority_score,
    compute_field_weighted_score,
    priority_weight_settings,
    require_positive_weights,
    resolve_priority_weights,
    saved_ml_base_score,
    saved_priority_floor,
    validate_weight_map,
)
from app.problems import ProblemError

if TYPE_CHECKING:
    from app.catalog import Catalog

Weight = Annotated[float, Field(strict=True, ge=0, allow_inf_nan=False)]
WeightMap = dict[str, Weight]
PriorityWeightScope = Literal["project", "portfolio", "global"]
PriorityScoreState = Literal["weighted", "awaiting-analysis", "requires-analysis"]


class PriorityFieldWeight(BaseModel):
    key: str
    label: str
    category: str
    description: str
    min: float
    max: float
    higherIsBetter: bool = True
    defaultWeight: Weight


class PriorityWeightPreset(BaseModel):
    id: str
    name: str
    description: str
    weights: WeightMap


class PriorityWeightsResponse(BaseModel):
    version: int = 2
    description: str
    availableFields: list[PriorityFieldWeight]
    defaultWeights: WeightMap
    portfolioOverrides: dict[str, WeightMap] = Field(default_factory=dict)
    projectOverrides: dict[str, WeightMap] = Field(default_factory=dict)
    presets: list[PriorityWeightPreset] = Field(default_factory=list)
    etag: str | None = None


class PriorityWeightsUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    defaultWeights: WeightMap | None = None
    portfolioOverrides: dict[str, WeightMap | None] | None = None
    projectOverrides: dict[str, WeightMap | None] | None = None
    etag: str | None = Field(default=None, min_length=1)


class PriorityWeightsService:
    def refresh_options(self) -> None:
        if self._options is not None:
            self._options.current()

    def __init__(self, config: AppConfig, lake: OneLakeClient, options: OptionsStore | None = None) -> None:
        self._config = config
        self._lake = lake
        self._model: dict[str, Any] | None = None
        self._options = options
        spec = config.api.sharedConfig.files["priorityWeights"]
        self._base = json.loads((config.shared_dir / spec.fileName).read_text(encoding="utf-8"))

    def _read(self) -> PriorityWeightsResponse:
        found = self._lake.read_json(PRIORITY_WEIGHTS_PATH)
        rows, etag = found if found is not None else (None, None)
        try:
            defaults, portfolios, projects = priority_weight_settings(self._base, rows)
        except PriorityWeightError as error:
            raise ProblemError(502, str(error), slug="upstream-failure") from error
        return PriorityWeightsResponse.model_validate({
            **self._base,
            "version": 2,
            "defaultWeights": defaults,
            "portfolioOverrides": portfolios,
            "projectOverrides": projects,
            "etag": etag,
        })

    def get(self) -> PriorityWeightsResponse:
        # Deliberately uncached: the caller takes one snapshot per list/export.
        return self._read()

    def update(self, body: PriorityWeightsUpdateRequest, catalog: "Catalog") -> PriorityWeightsResponse:
        current = self._read()
        if "etag" in body.model_fields_set and body.etag != current.etag:
            raise ProblemError(
                409, "Priority weights changed since you loaded them. Reload the weights before saving.", slug="conflict",
            )
        defaults = dict(current.defaultWeights)
        portfolios = {key: dict(weights) for key, weights in current.portfolioOverrides.items()}
        projects = {key: dict(weights) for key, weights in current.projectOverrides.items()}
        project_records: dict[str, Mapping[str, Any] | None] = {}
        try:
            if body.defaultWeights is not None:
                defaults.update(validate_weight_map(body.defaultWeights, name="defaultWeights"))
            require_positive_weights(defaults, name="Global default weights")
            for name, changes, target in (
                ("portfolioOverrides", body.portfolioOverrides, portfolios),
                ("projectOverrides", body.projectOverrides, projects),
            ):
                for key, weights in (changes or {}).items():
                    if not key.strip() or key != key.strip() or key == "*":
                        raise PriorityWeightError(f"{name} needs a valid identifier.")
                    if not weights:
                        target.pop(key, None)
                        continue
                    checked = validate_weight_map(weights, name=f"{name}.{key}")
                    if name == "portfolioOverrides":
                        if catalog.portfolio(key) is None:
                            raise PriorityWeightError(f"Portfolio {key} does not exist.")
                    else:
                        project_records[key] = catalog.get_project(key)
                        if project_records[key] is None:
                            raise PriorityWeightError(f"Project {key} does not exist.")
                    target[key] = checked
            for key, weights in portfolios.items():
                require_positive_weights({**defaults, **weights}, name=f"Portfolio {key} effective weights")
            for project_id in projects:
                if project_id not in project_records:
                    project_records[project_id] = catalog.get_project(project_id)
                record = project_records[project_id] or {}
                resolve_priority_weights(
                    defaults, portfolios, projects,
                    project_id=project_id, portfolio_key=record.get("portfolioKey"),
                )
        except PriorityWeightError as error:
            raise ProblemError(422, str(error), slug="validation-failed") from error

        updated = current.model_copy(update={
            "defaultWeights": defaults, "portfolioOverrides": portfolios, "projectOverrides": projects,
        })
        now = datetime.now(timezone.utc).isoformat()
        labels = {field.key: field.label for field in updated.availableFields}
        rows: list[dict[str, Any]] = []
        for scope, key, weights in [
            ("global", "*", defaults),
            *(("portfolio", key, weights) for key, weights in portfolios.items()),
            *(("project", key, weights) for key, weights in projects.items()),
        ]:
            for field, weight in weights.items():
                rows.append({
                    "scope": scope,
                    "project_id": key if scope == "project" else "*",
                    "portfolio_key": key if scope == "portfolio" else None,
                    "field_key": field,
                    "field_label": labels[field],
                    "weight_percent": weight,
                    "is_active": True,
                    "updated_at": now,
                })
        try:
            etag = self._lake.write_json(PRIORITY_WEIGHTS_PATH, rows, etag=current.etag)
        except LakeConflict as error:
            raise ProblemError(
                409, "Priority weights changed while saving. Reload the weights before trying again.", slug="conflict",
            ) from error
        return updated.model_copy(update={"etag": etag})

    def _model_config(self) -> dict[str, Any]:
        self.refresh_options()
        if self._model is None:
            spec = self._config.api.sharedConfig.files.get("mlModel")
            path: Path = self._config.shared_dir / (spec.fileName if spec is not None else "ml-model.json")
            if path.is_file():
                model = json.loads(path.read_text(encoding="utf-8"))
            else:
                # The deployed notebook configuration is also available in OneLake.
                found = self._lake.read_json("Files/config/ml-model.json")
                model = found[0] if found is not None else None
            if not isinstance(model, dict):
                raise ScoringEvidenceError("The saved analysis scoring configuration is unavailable.")
            self._model = model
        contract = getattr(self._config, "data_entry", None)
        scores = contract.options.sponsorLevelScores if contract is not None else {}
        return {**self._model, "mappings": {
            **self._model["mappings"],
            "sponsorLevel": {**self._model["mappings"]["sponsorLevel"], **scores},
        }}

    def apply_project(
        self, record: Mapping[str, Any], settings: PriorityWeightsResponse | None = None,
    ) -> dict[str, Any]:
        settings = settings if settings is not None else self.get()
        result = dict(record)
        scope, weights = resolve_priority_weights(
            settings.defaultWeights, settings.portfolioOverrides, settings.projectOverrides,
            project_id=record.get("projectId"), portfolio_key=record.get("portfolioKey"),
        )
        result["priorityWeightScope"] = scope
        result["effectivePriorityWeights"] = weights
        result.setdefault("recordedPriorityScore", record.get("priorityScore"))
        result.setdefault("recordedFieldWeightedScore", record.get("fieldWeightedScore"))
        result["priorityScore"] = None
        result["fieldWeightedScore"] = None
        pending = record.get("status") == self._config.api.projects.statusPending
        has_analysis = any(record.get(key) is not None for key in ("tierProbabilities", "mlTier", "confidenceScore"))
        if pending or not has_analysis:
            result["priorityScoreState"] = "awaiting-analysis"
            result["priorityScoreReason"] = "Awaiting saved project analysis. Weights will apply when analysis is available."
            return result
        try:
            model = self._model_config()
            ml_base = saved_ml_base_score(record, model)
            floor = saved_priority_floor(record, model)
            field_score = compute_field_weighted_score(record, weights, model)
        except ScoringEvidenceError as error:
            result["priorityScoreState"] = "requires-analysis"
            result["priorityScoreReason"] = str(error)
            return result
        except (KeyError, TypeError, json.JSONDecodeError) as error:
            result["priorityScoreState"] = "requires-analysis"
            result["priorityScoreReason"] = "The scoring configuration does not match the saved analysis. Run analysis again."
            return result
        result.update({
            "mlBaseScore": ml_base,
            "priorityFloor": floor,
            "fieldWeightedScore": field_score,
            "priorityScore": blend_priority_score(ml_base, field_score, floor),
            "priorityScoreState": "weighted",
            "priorityScoreReason": None,
        })
        return result

    def apply_export(self, export: Mapping[str, Any]) -> dict[str, Any]:
        settings = self.get()
        return {
            **export,
            "projects": [
                self.apply_project(record, settings)
                for record in export.get("projects", []) if isinstance(record, Mapping)
            ],
            "priorityWeights": {
                "defaultWeights": dict(settings.defaultWeights),
                "portfolioOverrides": {key: dict(value) for key, value in settings.portfolioOverrides.items()},
                "projectOverrides": {key: dict(value) for key, value in settings.projectOverrides.items()},
                "etag": settings.etag,
            },
        }
