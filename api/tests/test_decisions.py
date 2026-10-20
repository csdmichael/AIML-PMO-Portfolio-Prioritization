from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.cache import TtlCache
from app.catalog import Catalog
from app.config import load_config
from app.decisions import DecisionService
from app.lake_paths import LakePaths
from app.main import create_app
from app.project_changes import ProjectChanges
from app.routes.deps import get_services
from app.store import EntryStore, ExportReader
from tests.lake_doubles import MemoryLake

REASON = "Revisit once the identity gate is closed."


@pytest.fixture
def harness():
    config = load_config()
    lake = MemoryLake()
    paths = LakePaths(config)
    export = {"portfolios": [], "projects": [{"projectId": "GIS-0001", "projectName": "Edge Network"}]}
    lake.files[paths.portfolio_export()] = (export, "etag-export")
    entries = EntryStore(lake)
    changes = ProjectChanges(entries=entries, paths=paths, contract=config.data_entry, cache=TtlCache(0))
    exports = ExportReader(lake=lake, cache=TtlCache(0), pipeline_name="PMO pipeline")
    catalog = Catalog(
        exports=exports, entries=entries, paths=paths, statuses=config.api.projects, contract=config.data_entry, changes=changes,
    )
    decisions = DecisionService(
        entries=entries, paths=paths, catalog=catalog, settings=config.api.decisions, project_id_pattern=config.data_entry.projectIdPattern,
    )
    services = SimpleNamespace(config=config, decisions=decisions)
    app = create_app()
    app.dependency_overrides[get_services] = lambda: services
    with TestClient(app) as client:
        yield SimpleNamespace(client=client, config=config)


def test_a_decision_records_its_action_and_tier(harness):
    tier = harness.config.api.decisions.tiers[1]
    response = harness.client.post(
        "/v1/decisions",
        json={"projectId": "GIS-0001", "decision": tier, "action": "Adjust", "reason": REASON, "decidedBy": "PMO lead"},
    )
    assert response.status_code == 201
    body = response.json()
    assert (body["decision"], body["action"], body["decidedBy"]) == (tier, "Adjust", "PMO lead")
    listed = harness.client.get("/v1/decisions", params={"projectId": "GIS-0001"}).json()["items"]
    assert listed[0]["action"] == "Adjust"


def test_an_action_outside_the_list_is_rejected(harness):
    tier = harness.config.api.decisions.tiers[0]
    response = harness.client.post(
        "/v1/decisions", json={"projectId": "GIS-0001", "decision": tier, "action": "Maybe", "reason": REASON},
    )
    assert response.status_code == 422
    assert "action" in response.text


def test_a_recommendation_decision_without_an_action_is_still_recorded(harness):
    tier = harness.config.api.decisions.tiers[2]
    response = harness.client.post("/v1/decisions", json={"projectId": "GIS-0001", "decision": tier, "reason": REASON})
    assert response.status_code == 201
    assert response.json()["action"] is None
