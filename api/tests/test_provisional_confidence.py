import json

from app.provisional_confidence import FEATURE_FIELDS, SHARED_MODEL_FILE, default_provisional_confidence


def complete_entry() -> dict:
    return {
        "goLiveDate": "2027-09-30",
        "businessValue": 3,
        "sponsorLevel": "Director",
        "regulatorySecurity": True,
        "userBase": 400,
        "skillDemandFte": 1.0,
        "costEstimateUsd": 300000,
        "dependencies": ["GIS-0001"],
        "riskRating": "Medium",
        "dtAlignment": False,
        "effortPersonWeeks": 10,
    }


def ai_provenance(entry: dict, score) -> dict:
    return {field: {"source": "ai", "evidence": "inferred", "confidenceScore": score} for field in entry}


def test_a_complete_entry_scores_at_most_80_until_the_pipeline_scores_it():
    assert default_provisional_confidence().score(complete_entry()) == {"confidenceScore": 80.0, "confidenceLevel": "High"}


def test_missing_features_lower_completeness_by_their_weight():
    entry = complete_entry()
    del entry["dependencies"], entry["effortPersonWeeks"]
    assert default_provisional_confidence().score(entry) == {"confidenceScore": 71.8, "confidenceLevel": "Medium"}


def test_ai_prefilled_values_count_their_evidence_score():
    entry = complete_entry()
    entry["fieldProvenance"] = ai_provenance(entry, 0.6)
    assert default_provisional_confidence().score(entry) == {"confidenceScore": 66.0, "confidenceLevel": "Medium"}


def test_evidence_stored_as_a_percentage_is_read_the_same_way():
    entry = complete_entry()
    entry["fieldProvenance"] = ai_provenance(entry, 60)
    assert default_provisional_confidence().score(entry)["confidenceScore"] == 66.0


def test_an_ai_value_without_a_score_counts_as_no_evidence():
    entry = complete_entry()
    entry["fieldProvenance"] = {"businessValue": {"source": "ai", "confidenceScore": None}}
    assert default_provisional_confidence().score(entry) == {"confidenceScore": 76.8, "confidenceLevel": "High"}


def test_an_empty_entry_scores_zero_and_low():
    assert default_provisional_confidence().score({}) == {"confidenceScore": 0.0, "confidenceLevel": "Low"}


def test_every_model_feature_maps_to_an_entry_field():
    model = json.loads(SHARED_MODEL_FILE.read_text(encoding="utf-8"))
    assert {feature["source"] for feature in model["features"]} <= set(FEATURE_FIELDS)
