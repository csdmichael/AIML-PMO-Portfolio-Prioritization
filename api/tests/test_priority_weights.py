import copy
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from pydantic import ValidationError

from app.onelake import LakeConflict
from app.priority_scoring import (
    PRIORITY_FIELD_KEYS,
    PRIORITY_WEIGHTS_PATH,
    compute_field_weighted_score,
    priority_weight_settings,
)
from app.priority_weights import PriorityWeightsService, PriorityWeightsUpdateRequest
from app.problems import ProblemError
from tests.lake_doubles import MemoryLake

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def harness():
    config = SimpleNamespace(
        shared_dir=ROOT / "config",
        api=SimpleNamespace(
            sharedConfig=SimpleNamespace(files={"priorityWeights": SimpleNamespace(fileName="priority-weights.json")}),
            projects=SimpleNamespace(statusPending="pending"),
        ),
    )
    lake = MemoryLake()
    service = PriorityWeightsService(config, lake)
    records = {
        "A-1": {"projectId": "A-1", "portfolioKey": "alpha"},
        "A-2": {"projectId": "A-2", "portfolioKey": "alpha"},
        "B-1": {"projectId": "B-1", "portfolioKey": "beta"},
    }
    catalog = SimpleNamespace(
        portfolio=lambda key: {"key": key} if key in ("alpha", "beta") else None,
        get_project=lambda project_id: records.get(project_id),
    )
    return service, lake, catalog


def project(project_id="A-1", portfolio="alpha", **changes):
    return {
        "projectId": project_id,
        "portfolioKey": portfolio,
        "projectName": "Saved analysis",
        "projectStatus": "Active",
        "status": "processed",
        "monthsToGoLive": 12,
        "businessValue": 4,
        "userBase": 1000,
        "regulatorySecurity": False,
        "dtAlignment": True,
        "sponsorLevel": "Director",
        "riskRating": "High",
        "costEstimateUsd": 100000,
        "dependencyCount": 2,
        "effortPersonWeeks": 12,
        "skillDemandFte": 3,
        "tierProbabilities": {"mustDoNow": 0.1, "proceed": 0.5, "canWait": 0.3, "deprioritize": 0.1},
        "priorityScore": 59.4,
        "fieldWeightedScore": 62.0,
        "mlTier": "Proceed",
        "finalTier": "Proceed",
        "confidenceScore": 87.3,
        "confidenceLevel": "High",
        "modelCertainty": 0.5,
        "ruleOverrides": [],
        "topDrivers": [{"signalKey": "business_value", "shapValue": 0.17}],
        "recommendedAction": "Proceed",
        "projectProgress": 35,
        **changes,
    }


def update(service, catalog, **changes):
    return service.update(PriorityWeightsUpdateRequest.model_validate(changes), catalog)


def only_weights(**weights):
    return {key: float(weights.get(key, 0)) for key in PRIORITY_FIELD_KEYS}


def test_missing_runtime_file_reuses_shipped_customizations_but_empty_file_clears_overrides(harness):
    service, lake, _ = harness
    initial = service.get()
    assert initial.projectOverrides["GIS-0001"] == {"businessValue": 30.0, "userBase": 25.0}
    assert initial.portfolioOverrides == {}
    assert initial.etag is None
    lake.write_json(PRIORITY_WEIGHTS_PATH, [])
    saved = service.get()
    assert saved.defaultWeights == initial.defaultWeights
    assert saved.projectOverrides == {}
    assert saved.etag == "etag-1"


def test_legacy_rows_are_preserved_and_missing_global_fields_inherit_defaults(harness):
    service, lake, _ = harness
    lake.write_json(PRIORITY_WEIGHTS_PATH, [
        {"project_id": "*", "field_key": "businessValue", "weight_percent": "40"},
        {"project_id": "A-1", "field_key": "userBase", "weight_percent": "80.125"},
        {"project_id": "B-1", "field_key": "risk", "weight_percent": 77, "is_active": False},
    ])
    settings = service.get()
    assert settings.defaultWeights["businessValue"] == 40
    assert settings.defaultWeights["cost"] == 5
    assert settings.projectOverrides == {"A-1": {"userBase": 80.125}}
    assert "GIS-0001" not in settings.projectOverrides


def test_partial_project_over_portfolio_over_global_and_other_portfolio_isolation(harness):
    service, _, catalog = harness
    settings = update(
        service, catalog,
        portfolioOverrides={"alpha": {"businessValue": 50, "risk": 10}, "beta": {"businessValue": 15}},
        projectOverrides={"A-1": {"businessValue": 90, "userBase": 0}},
    )
    first = service.apply_project(project(), settings)
    sibling = service.apply_project(project("A-2"), settings)
    other = service.apply_project(project("B-1", "beta"), settings)
    future = service.apply_project({"projectId": "A-new", "portfolioKey": "alpha", "status": "pending"}, settings)
    assert first["priorityWeightScope"] == "project"
    assert first["effectivePriorityWeights"]["businessValue"] == 90
    assert first["effectivePriorityWeights"]["risk"] == 10
    assert first["effectivePriorityWeights"]["userBase"] == 0
    assert sibling["priorityWeightScope"] == "portfolio"
    assert sibling["effectivePriorityWeights"]["businessValue"] == 50
    assert sibling["effectivePriorityWeights"]["userBase"] == 20
    assert other["effectivePriorityWeights"]["businessValue"] == 15
    assert other["effectivePriorityWeights"]["risk"] == 5
    assert future["effectivePriorityWeights"] == sibling["effectivePriorityWeights"]
    assert future["priorityScoreState"] == "awaiting-analysis"


@pytest.mark.parametrize("clear", [{}, None])
def test_clearing_one_portfolio_reveals_global_and_keeps_other_portfolios_and_projects(harness, clear):
    service, _, catalog = harness
    original = update(
        service, catalog,
        portfolioOverrides={"alpha": {"businessValue": 70}, "beta": {"risk": 80}},
        projectOverrides={"A-1": {"businessValue": 90}},
    )
    cleared = update(service, catalog, portfolioOverrides={"alpha": clear}, etag=original.etag)
    assert cleared.portfolioOverrides == {"beta": {"risk": 80}}
    assert cleared.projectOverrides == original.projectOverrides
    assert service.apply_project(project("A-2"), cleared)["priorityWeightScope"] == "global"
    assert service.apply_project(project(), cleared)["effectivePriorityWeights"]["businessValue"] == 90
    assert service.get() == cleared


def test_clearing_a_project_inherits_its_portfolio_and_omitted_keys_are_untouched(harness):
    service, _, catalog = harness
    update(service, catalog, portfolioOverrides={"alpha": {"cost": 45}}, projectOverrides={"A-1": {"cost": 85}})
    updated = update(service, catalog, projectOverrides={"A-1": {}})
    assert "A-1" not in updated.projectOverrides
    assert updated.portfolioOverrides["alpha"] == {"cost": 45}
    result = service.apply_project(project(), updated)
    assert result["priorityWeightScope"] == "portfolio"
    assert result["effectivePriorityWeights"]["cost"] == 45
    assert update(service, catalog, portfolioOverrides={}).portfolioOverrides == updated.portfolioOverrides


def test_scores_change_immediately_without_modifying_any_saved_prediction_or_progress(harness):
    service, lake, catalog = harness
    original = {"generatedAtUtc": "2026-10-20T00:00:00Z", "projects": [project(), project("B-1", "beta")]}
    before = copy.deepcopy(original)
    baseline = service.apply_export(original)
    update(service, catalog, portfolioOverrides={"alpha": {"businessValue": 500}})
    result = service.apply_export(original)
    assert result["projects"][0]["priorityScore"] != baseline["projects"][0]["priorityScore"]
    assert result["projects"][1]["priorityScore"] == baseline["projects"][1]["priorityScore"]
    for saved, changed in zip(original["projects"], result["projects"]):
        for key in ("tierProbabilities", "mlTier", "finalTier", "confidenceScore", "confidenceLevel",
                    "modelCertainty", "topDrivers", "ruleOverrides", "recommendedAction", "projectStatus", "projectProgress"):
            assert changed[key] == saved[key]
        assert changed["recordedPriorityScore"] == saved["priorityScore"]
        assert changed["recordedFieldWeightedScore"] == saved["fieldWeightedScore"]
    assert original == before
    assert set(lake.files) == {PRIORITY_WEIGHTS_PATH}
    assert result["priorityWeights"]["portfolioOverrides"] == {"alpha": {"businessValue": 500}}


def test_exact_ml_base_rounding_then_40_60_blend_and_recorded_floor(harness):
    service, _, catalog = harness
    settings = update(service, catalog, defaultWeights=only_weights(businessValue=2, userBase=1))
    saved = project()
    result = service.apply_project(saved, settings)
    # ML = round(100 * (.1*1 + .5*.7 + .3*.35 + .1*0), 1) = 55.5.
    # Field score = round((80*2 + 60*1)/3, 1) = 73.3, not an arbitrary UI formula.
    assert result["mlBaseScore"] == 55.5
    assert result["fieldWeightedScore"] == 73.3
    assert result["priorityScore"] == round(0.4 * 55.5 + 0.6 * 73.3, 1) == 66.2
    assert result["priorityScoreState"] == "weighted"
    floored = service.apply_project(project(
        priorityScore=90, ruleOverrides=["R1_REGULATORY_FIRST"], regulatorySecurity=True,
    ), settings)
    assert floored["priorityScore"] == 90
    assert floored["priorityFloor"] == 90
    assert floored["recordedPriorityScore"] == 90
    assert floored["mlBaseScore"] == 55.5  # Never reverse the floored score to guess the ML base.
    assert service.apply_project({**saved, "priorityFloor": 95}, settings)["priorityScore"] == 95


def test_reapplying_a_projection_is_idempotent_and_retains_the_original_recorded_score(harness):
    service, _, _ = harness
    first = service.apply_project(project())
    second = service.apply_project(first)
    assert second == first
    assert second["recordedPriorityScore"] == 59.4


@pytest.mark.parametrize(("field", "expected"), [
    ("businessValue", 80.0), ("userBase", 60.0), ("regulatorySecurity", 0.0),
    ("timingUrgency", 66.7), ("sponsorPriority", 75.0), ("dtAlignment", 100.0),
    ("risk", 75.0), ("cost", 33.3), ("dependencies", 40.0), ("effort", 30.0), ("skillDemand", 30.0),
])
def test_each_factor_uses_the_published_normalization(field, expected):
    model = json.loads((ROOT / "config" / "ml-model.json").read_text(encoding="utf-8"))
    assert compute_field_weighted_score(project(), {field: 17}, model) == expected


def test_zero_users_and_zero_months_are_real_evidence_and_not_fabricated_defaults():
    model = json.loads((ROOT / "config" / "ml-model.json").read_text(encoding="utf-8"))
    assert compute_field_weighted_score(project(userBase=0), {"userBase": 1}, model) == 0
    assert compute_field_weighted_score(project(monthsToGoLive=0), {"timingUrgency": 1}, model) == 100
    assert compute_field_weighted_score(project(costEstimateUsd=100000000), {"cost": 1}, model) == 100
    assert compute_field_weighted_score(project(dependencyCount=100), {"dependencies": 1}, model) == 100


def test_model_mappings_and_urgency_horizon_are_not_hard_coded(harness):
    service, _, catalog = harness
    model = copy.deepcopy(service._model_config())
    model["mappings"]["sponsorLevel"]["Director"] = 2
    model["mappings"]["riskRating"]["High"] = 2
    model["urgency"]["horizonMonths"] = 24
    model["tiers"]["priorityWeight"]["Proceed"] = 0.6
    service._model = model
    settings = update(service, catalog, defaultWeights=only_weights(sponsorPriority=1, risk=1, timingUrgency=1))
    result = service.apply_project(project(), settings)
    assert result["fieldWeightedScore"] == 50
    assert result["mlBaseScore"] == 50.5


@pytest.mark.parametrize("change", [
    {"tierProbabilities": None},
    {"tierProbabilities": {"mustDoNow": 1}},
    {"tierProbabilities": {"mustDoNow": 0.1, "proceed": 0.1, "canWait": 0.1, "deprioritize": 0.1}},
    {"businessValue": None},
    {"userBase": float("nan")},
    {"sponsorLevel": "Unknown"},
    {"riskRating": "Unknown"},
    {"ruleOverrides": None},
    {"ruleOverrides": ["missing-rule"]},
])
def test_insufficient_saved_evidence_does_not_invent_or_reverse_scores(harness, change):
    service, _, _ = harness
    result = service.apply_project(project(priorityScore=90, **change))
    assert result["priorityScoreState"] == "requires-analysis"
    assert result["priorityScore"] is None
    assert result["fieldWeightedScore"] is None
    assert result["recordedPriorityScore"] == 90
    assert result["priorityScoreReason"]
    assert result["mlTier"] == "Proceed"


def test_unweighted_missing_factors_do_not_block_a_valid_score(harness):
    service, _, catalog = harness
    settings = update(service, catalog, defaultWeights=only_weights(businessValue=1))
    result = service.apply_project(project(userBase=None, riskRating=None, costEstimateUsd=None), settings)
    assert result["priorityScoreState"] == "weighted"
    assert result["fieldWeightedScore"] == 80


def test_pending_projects_never_gain_a_score_even_if_placeholder_probabilities_exist(harness):
    service, _, _ = harness
    result = service.apply_project(project(status="pending"))
    assert result["priorityScoreState"] == "awaiting-analysis"
    assert result["priorityScore"] is None
    assert result["fieldWeightedScore"] is None
    assert result["tierProbabilities"] == project()["tierProbabilities"]


def test_export_uses_one_weight_snapshot_for_all_projects(harness):
    service, _, _ = harness
    service.get = Mock(wraps=service.get)
    result = service.apply_export({"projects": [project(), project("A-2"), project("B-1", "beta")]})
    assert len(result["projects"]) == 3
    service.get.assert_called_once()


@pytest.mark.parametrize("number", [-1, float("nan"), float("inf"), float("-inf"), True, "20"])
def test_request_rejects_negative_nonfinite_boolean_and_string_weights(number):
    with pytest.raises(ValidationError):
        PriorityWeightsUpdateRequest.model_validate({"portfolioOverrides": {"alpha": {"userBase": number}}})


@pytest.mark.parametrize("body", [
    {"defaultWeights": {"notAField": 10}},
    {"portfolioOverrides": {"alpha": {"notAField": 10}}},
    {"projectOverrides": {"A-1": {"notAField": 10}}},
    {"defaultWeights": only_weights()},
    {"portfolioOverrides": {"alpha": only_weights()}},
    {"projectOverrides": {"A-1": only_weights()}},
    {"portfolioOverrides": {"does-not-exist": {"userBase": 1}}},
    {"projectOverrides": {"does-not-exist": {"userBase": 1}}},
    {"portfolioOverrides": {"*": {"userBase": 1}}},
])
def test_invalid_update_is_rejected_without_writing(harness, body):
    service, lake, catalog = harness
    with pytest.raises(ProblemError) as raised:
        update(service, catalog, **body)
    assert raised.value.status == 422
    assert lake.files == {}


def test_invalid_or_duplicate_stored_weights_are_not_silently_replaced(harness):
    service, lake, _ = harness
    row = {"project_id": "*", "field_key": "businessValue", "weight_percent": 25}
    for records in ([{**row, "weight_percent": float("nan")}], [row, row], [{"scope": "portfolio", **row}]):
        lake.write_json(PRIORITY_WEIGHTS_PATH, records, overwrite=True)
        with pytest.raises(ProblemError) as raised:
            service.get()
        assert raised.value.status == 502


def test_writes_use_the_current_etag_and_stale_editors_cannot_drop_another_portfolio(harness):
    service, lake, catalog = harness
    write = Mock(wraps=lake.write_json)
    lake.write_json = write
    first = update(service, catalog, etag=None, portfolioOverrides={"alpha": {"userBase": 45}})
    assert write.call_args.kwargs == {"etag": None}
    second = update(service, catalog, etag=first.etag, portfolioOverrides={"beta": {"userBase": 55}})
    assert write.call_args.kwargs == {"etag": first.etag}
    with pytest.raises(ProblemError) as raised:
        update(service, catalog, etag=first.etag, portfolioOverrides={"alpha": {}})
    assert raised.value.status == 409
    with pytest.raises(ProblemError) as raised:
        update(service, catalog, etag=None, portfolioOverrides={"alpha": {}})
    assert raised.value.status == 409
    assert service.get().portfolioOverrides == second.portfolioOverrides


def test_storage_conflict_during_the_conditional_write_is_explicit(harness):
    service, lake, catalog = harness
    original = update(service, catalog, portfolioOverrides={"alpha": {"userBase": 45}})
    lake.write_json = Mock(side_effect=LakeConflict("concurrent edit"))
    with pytest.raises(ProblemError) as raised:
        update(service, catalog, etag=original.etag, portfolioOverrides={"beta": {"userBase": 55}})
    assert raised.value.status == 409
    assert service.get().portfolioOverrides == original.portfolioOverrides
    assert lake.write_json.call_args.kwargs == {"etag": original.etag}


def test_zero_override_is_explicit_and_weight_vectors_need_not_total_100(harness):
    service, _, catalog = harness
    settings = update(service, catalog, portfolioOverrides={"alpha": {"regulatorySecurity": 0, "businessValue": 400}})
    assert settings.portfolioOverrides["alpha"]["regulatorySecurity"] == 0
    result = service.apply_project(project(), settings)
    weights = result["effectivePriorityWeights"]
    assert sum(weights.values()) != 100
    assert result["fieldWeightedScore"] == compute_field_weighted_score(project(), weights, service._model_config())


def test_nonfinite_total_and_zero_inherited_project_total_are_rejected(harness):
    service, lake, catalog = harness
    with pytest.raises(ProblemError) as raised:
        update(service, catalog, defaultWeights={"businessValue": 1e308, "userBase": 1e308})
    assert raised.value.status == 422
    update(service, catalog, defaultWeights=only_weights(userBase=1), projectOverrides={"A-1": {"businessValue": 0}})
    # This change would zero every inherited positive factor for A-1.
    with pytest.raises(ProblemError) as raised:
        update(service, catalog, defaultWeights=only_weights(businessValue=1))
    assert raised.value.status == 422
    assert service.get().defaultWeights["userBase"] == 1
    assert len(lake.files) == 1


def test_json_setting_parser_is_shared_with_notebook_and_resolves_portfolio_rows():
    base = json.loads((ROOT / "config" / "priority-weights.json").read_text(encoding="utf-8"))
    defaults, portfolios, projects = priority_weight_settings(base, [
        {"scope": "portfolio", "portfolio_key": "alpha", "project_id": "*", "field_key": "risk", "weight_percent": 50},
    ])
    assert defaults == base["defaultWeights"]
    assert portfolios == {"alpha": {"risk": 50}}
    assert projects == {}
