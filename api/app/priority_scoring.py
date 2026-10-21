"""Pure priority-weight resolution and the notebook's field/ML blend.

The notebook builder includes this module in the inference notebook so API reads and
future pipeline runs use the same factors, rounding, inheritance, and rule floors.
"""

import math
from collections.abc import Mapping, Sequence
from typing import Any

PRIORITY_FIELD_KEYS = (
    "businessValue", "userBase", "regulatorySecurity", "timingUrgency",
    "sponsorPriority", "dtAlignment", "risk", "cost", "dependencies", "effort", "skillDemand",
)
TIER_PROBABILITY_KEYS = ("mustDoNow", "proceed", "canWait", "deprioritize")
PRIORITY_WEIGHTS_PATH = "Tables/priority_field_weights/records.json"


class PriorityWeightError(ValueError):
    """A stored or requested weight configuration is not usable."""


class ScoringEvidenceError(ValueError):
    """A priority cannot be recomputed without inventing missing analysis evidence."""


def validate_weight_map(value: Any, *, name: str) -> dict[str, float]:
    if not isinstance(value, Mapping):
        raise PriorityWeightError(f"{name} must be a field-weight object.")
    result: dict[str, float] = {}
    for field, raw in value.items():
        if field not in PRIORITY_FIELD_KEYS:
            raise PriorityWeightError(f"{name} contains an unknown priority field: {field}.")
        try:
            number = float(raw)
        except (TypeError, ValueError, OverflowError) as error:
            raise PriorityWeightError(f"{name}.{field} must be a finite, nonnegative number.") from error
        if isinstance(raw, bool) or not math.isfinite(number) or number < 0:
            raise PriorityWeightError(f"{name}.{field} must be a finite, nonnegative number.")
        result[field] = number
    if not math.isfinite(sum(result.values())):
        raise PriorityWeightError(f"{name} has a non-finite total.")
    return result


def require_positive_weights(weights: Mapping[str, float], *, name: str) -> None:
    if not math.isfinite(sum(weights.values())) or sum(weights.values()) <= 0:
        raise PriorityWeightError(f"{name} must have a finite total greater than zero.")


def priority_weight_settings(
    base: Mapping[str, Any], rows: Sequence[Mapping[str, Any]] | None,
) -> tuple[dict[str, float], dict[str, dict[str, float]], dict[str, dict[str, float]]]:
    """Read the JSON records format, including the original project_id='*' rows.

    A missing runtime file uses shipped overrides; a present (even empty) file is
    authoritative for overrides. Missing global factors inherit shipped defaults.
    """
    defaults = validate_weight_map(base.get("defaultWeights"), name="defaultWeights")
    portfolios: dict[str, dict[str, float]] = {}
    projects: dict[str, dict[str, float]] = {}
    if rows is None:
        for name, target in (("portfolioOverrides", portfolios), ("projectOverrides", projects)):
            scopes = base.get(name, {})
            if not isinstance(scopes, Mapping):
                raise PriorityWeightError(f"{name} must be an object.")
            for key, weights in scopes.items():
                checked = validate_weight_map(weights, name=f"{name}.{key}")
                if checked:
                    target[str(key)] = checked
    else:
        if not isinstance(rows, list) or not all(isinstance(row, Mapping) for row in rows):
            raise PriorityWeightError("Priority weight records must be a JSON array of objects.")
        seen: set[tuple[str, str, str]] = set()
        for row in rows:
            if str(row.get("is_active", True)).casefold() in ("false", "0", "no"):
                continue
            project = row.get("project_id", "*")
            portfolio = row.get("portfolio_key")
            scope = row.get("scope") or (
                "project" if project != "*" else "portfolio" if portfolio and portfolio != "*" else "global"
            )
            if scope not in ("global", "portfolio", "project"):
                raise PriorityWeightError("A priority weight record has an invalid scope.")
            key = project if scope == "project" else portfolio if scope == "portfolio" else "*"
            if not isinstance(key, str) or not key.strip() or (scope != "global" and key == "*"):
                raise PriorityWeightError(f"A {scope} priority weight record is missing its identifier.")
            field = row.get("field_key")
            checked = validate_weight_map({field: row.get("weight_percent")}, name=f"{scope}.{key}")
            identity = (scope, key, str(field))
            if identity in seen:
                raise PriorityWeightError(f"Duplicate priority weight record for {scope}.{key}.{field}.")
            seen.add(identity)
            target = defaults if scope == "global" else (portfolios if scope == "portfolio" else projects).setdefault(key, {})
            target.update(checked)
    require_positive_weights(defaults, name="Global default weights")
    for key, weights in portfolios.items():
        require_positive_weights({**defaults, **weights}, name=f"Portfolio {key} effective weights")
    return defaults, portfolios, projects


def resolve_priority_weights(
    defaults: Mapping[str, float],
    portfolios: Mapping[str, Mapping[str, float]],
    projects: Mapping[str, Mapping[str, float]],
    *,
    project_id: str | None,
    portfolio_key: str | None,
) -> tuple[str, dict[str, float]]:
    portfolio = portfolios.get(portfolio_key or "", {})
    project = projects.get(project_id or "", {})
    effective = {**defaults, **portfolio, **project}
    require_positive_weights(effective, name="Effective priority weights")
    return "project" if project else "portfolio" if portfolio else "global", effective


def _number(value: Any, field: str) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError, OverflowError) as error:
        raise ScoringEvidenceError(f"Saved analysis is missing a valid {field}.") from error
    if isinstance(value, bool) or not math.isfinite(result):
        raise ScoringEvidenceError(f"Saved analysis is missing a valid {field}.")
    return result


def _value(row: Mapping[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in row:
            return row[key]
    return None


def _mapped_number(value: Any, mapping: Mapping[str, Any], field: str) -> float:
    if isinstance(value, str) and value in mapping:
        value = mapping[value]
    return _number(value, field)


def _boolean(value: Any, config: Mapping[str, Any], field: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        value = config["mappings"]["yesNo"].get(value.strip().upper())
    if value not in (0, 1) or value is None:
        raise ScoringEvidenceError(f"Saved analysis is missing a valid {field}.")
    return bool(value)


def compute_field_weighted_score(
    row: Mapping[str, Any], weights: Mapping[str, float], config: Mapping[str, Any],
) -> float:
    """Compute the published factors, requiring real evidence for positive weights.

    Legitimate zero values stay zero; absent evidence is never replaced with demo
    counts, default sponsor/risk levels, or a guessed delivery date.
    """
    require_positive_weights(weights, name="Effective priority weights")
    mappings = config["mappings"]
    factors: dict[str, float] = {}
    for field, weight in weights.items():
        if weight <= 0:
            continue
        if field == "businessValue":
            factors[field] = _mapped_number(
                _value(row, "businessValue", "business_value_num", "business_value"),
                mappings["businessValueText"], field,
            ) / 5.0 * 100.0
        elif field == "userBase":
            number = _number(_value(row, "userBase", "user_base"), field)
            factors[field] = min(100.0, max(0.0, math.log10(max(1.0, number)) / 5.0 * 100.0))
        elif field == "regulatorySecurity":
            factors[field] = 100.0 if _boolean(_value(row, "regulatorySecurity", "regulatory", "regulatory_security"), config, field) else 0.0
        elif field == "timingUrgency":
            horizon = _number(config["urgency"]["horizonMonths"], "urgency horizon")
            if horizon <= 0:
                raise ScoringEvidenceError("The configured urgency horizon must be positive.")
            months = _number(_value(row, "monthsToGoLive", "months", "months_to_go_live"), field)
            factors[field] = min(1.0, max(0.0, (horizon - months) / horizon)) * 100.0
        elif field == "sponsorPriority":
            factors[field] = _mapped_number(
                _value(row, "sponsorLevel", "sponsor_priority"), mappings["sponsorLevel"], field,
            ) / 4.0 * 100.0
        elif field == "dtAlignment":
            factors[field] = 100.0 if _boolean(_value(row, "dtAlignment", "dt_alignment"), config, field) else 0.0
        elif field == "risk":
            factors[field] = _mapped_number(
                _value(row, "riskRating", "risk"), mappings["riskRating"], field,
            ) / 4.0 * 100.0
        elif field == "cost":
            number = _number(_value(row, "costEstimateUsd", "cost_usd"), field)
            factors[field] = min(100.0, max(0.0, (math.log10(max(1000.0, number)) - 4.0) / 3.0 * 100.0))
        elif field == "dependencies":
            factors[field] = min(100.0, _number(_value(row, "dependencyCount", "dependencies"), field) * 20.0)
        elif field == "effort":
            factors[field] = min(100.0, _number(_value(row, "effortPersonWeeks", "effort_person_weeks"), field) * 2.5)
        elif field == "skillDemand":
            factors[field] = min(100.0, _number(_value(row, "skillDemandFte", "skill_demand_fte"), field) * 10.0)
        else:
            raise PriorityWeightError(f"Unknown priority field: {field}.")
    total = sum(weights.values())
    score = sum(factors.get(field, 0.0) * weight for field, weight in weights.items()) / total
    if not math.isfinite(score):
        score = sum(factors.get(field, 0.0) * (weight / total) for field, weight in weights.items())
    if not math.isfinite(score):
        raise ScoringEvidenceError("Saved analysis contains a non-finite priority factor.")
    return round(score, 1)


def saved_ml_base_score(record: Mapping[str, Any], config: Mapping[str, Any]) -> float:
    probabilities = record.get("tierProbabilities")
    if not isinstance(probabilities, Mapping):
        raise ScoringEvidenceError("Saved tier probabilities are missing. Run project analysis before reweighting.")
    values = [_number(probabilities.get(key), f"tierProbabilities.{key}") for key in TIER_PROBABILITY_KEYS]
    if any(value < 0 or value > 1 for value in values) or not math.isclose(sum(values), 1.0, abs_tol=0.001):
        raise ScoringEvidenceError("Saved tier probabilities are not a complete probability distribution.")
    tiers = config["tiers"]["order"]
    if len(tiers) != len(values):
        raise ScoringEvidenceError("The saved tier probabilities do not match the configured tiers.")
    priority = config["priority"]
    return round(
        priority["scale"] * sum(value * config["tiers"]["priorityWeight"][tier] for value, tier in zip(values, tiers)),
        priority["decimals"],
    )


def saved_priority_floor(record: Mapping[str, Any], config: Mapping[str, Any]) -> float | None:
    if "priorityFloor" in record:
        if record["priorityFloor"] is None:
            return None
        floor = _number(record["priorityFloor"], "priorityFloor")
        if floor < 0:
            raise ScoringEvidenceError("The saved priority floor is invalid.")
        return floor
    overrides = record.get("ruleOverrides")
    if not isinstance(overrides, list):
        raise ScoringEvidenceError("Saved priority-rule evidence is missing. Run project analysis before reweighting.")
    rules = {rule["id"]: rule for rule in config["rules"]}
    floors: list[float] = []
    for rule_id in overrides:
        if not isinstance(rule_id, str) or rule_id not in rules:
            raise ScoringEvidenceError("A saved priority rule is not in the scoring configuration.")
        floor = rules[rule_id]["then"].get("priorityFloor")
        if floor is not None:
            floors.append(_number(floor, f"{rule_id} priorityFloor"))
    return max(floors) if floors else None


def blend_priority_score(ml_base: float, field_weighted: float, floor: float | None) -> float:
    score = round(0.4 * ml_base + 0.6 * field_weighted, 1)
    return max(score, floor) if floor is not None else score
