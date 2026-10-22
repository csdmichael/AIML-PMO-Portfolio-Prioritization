import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.config import load_config
from app.main import create_app
from app.options_store import OptionsStore
from app.priority_scoring import compute_field_weighted_score
from app.priority_weights import PriorityWeightsService
from app.routes.deps import get_services
from tests.lake_doubles import MemoryLake
from tests.test_priority_weights import project

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def harness():
    config = load_config()
    lake = MemoryLake()
    options = OptionsStore(lake=lake, contract=config.data_entry, path=config.api.oneLake.lookupsFile, ttl_seconds=0)
    weights = PriorityWeightsService(config, lake, options)
    services = SimpleNamespace(config=config, lake=lake, options=options, priority_weights=weights)
    app = create_app()
    app.dependency_overrides[get_services] = lambda: services
    with TestClient(app) as client:
        yield client, services


def test_new_level_score_is_persisted_and_reweights_above_executive_without_exceeding_100(harness):
    client, services = harness
    old = client.get("/v1/admin/lookups").json()
    assert old["sponsorLevelScores"]["Executive"] == 4
    response = client.put("/v1/admin/lookups", json={
        "sponsorLevels": [*old["sponsorLevels"], "CEO"], "sponsorLevelScores": {**old["sponsorLevelScores"], "CEO": 5},
    })
    assert response.status_code == 200
    saved = services.lake.read_json(services.config.api.oneLake.lookupsFile)[0]
    assert saved["options"]["sponsorLevelScores"]["CEO"] == 5
    assert client.get("/v1/admin/lookups").json()["sponsorLevelScores"]["CEO"] == 5
    model = services.priority_weights._model_config()
    assert compute_field_weighted_score({"sponsorLevel": "CEO"}, {"sponsorPriority": 1}, model) == 100
    assert compute_field_weighted_score({"sponsorLevel": "Executive"}, {"sponsorPriority": 1}, model) == 80
    settings = services.priority_weights.get().model_copy(update={
        "defaultWeights": {"sponsorPriority": 1}, "projectOverrides": {}, "portfolioOverrides": {},
    })
    ceo = services.priority_weights.apply_project(project(sponsorLevel="CEO"), settings)
    executive = services.priority_weights.apply_project(project(sponsorLevel="Executive"), settings)
    assert ceo["priorityScoreState"] == "weighted"
    assert ceo["priorityScore"] > executive["priorityScore"]
    assert ceo["priorityScore"] <= 100


@pytest.mark.parametrize("score", [-1, 0, True, "5"])
def test_invalid_scores_are_rejected_without_writing(harness, score):
    client, services = harness
    levels = services.config.data_entry.options.sponsorLevels
    response = client.put("/v1/admin/lookups", json={
        "sponsorLevels": [*levels, "CEO"], "sponsorLevelScores": {"CEO": score},
    })
    assert response.status_code == 422
    assert services.lake.files == {}


def test_new_levels_require_a_score_and_duplicate_labels_are_rejected(harness):
    client, services = harness
    levels = services.config.data_entry.options.sponsorLevels
    for body in ({"sponsorLevels": [*levels, "CEO"]}, {"sponsorLevels": [*levels, "executive"]}):
        assert client.put("/v1/admin/lookups", json=body).status_code == 422
    assert services.lake.files == {}


def test_fractional_scores_are_preserved(harness):
    client, services = harness
    levels = services.config.data_entry.options.sponsorLevels
    response = client.put("/v1/admin/lookups", json={
        "sponsorLevels": [*levels, "CEO"], "sponsorLevelScores": {"CEO": 4.5},
    })
    assert response.status_code == 200
    model = services.priority_weights._model_config()
    assert model["mappings"]["sponsorLevel"]["CEO"] == 4.5
