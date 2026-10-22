from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.config import load_config
from app.main import create_app
from app.onelake import LakeConflict, LakeError, LakeUnavailable
from app.options_store import OptionsStore
from app.priority_scoring import PRIORITY_WEIGHTS_PATH
from app.priority_weights import PriorityWeightsService
from app.routes.deps import get_services

WEIGHT_ROWS = [
    {"project_id": "*", "field_key": "businessValue", "field_label": "Business value", "weight_percent": 20.0, "is_active": True},
    {"project_id": "*", "field_key": "userBase", "field_label": "User base", "weight_percent": 10.0, "is_active": True},
]


@pytest.fixture
def harness():
    lake = Mock()
    lake.read_table.return_value = None
    lake.read_json.return_value = None
    lake.write_table.return_value = "etag"
    lake.write_json.return_value = "etag"
    config = load_config()
    services = SimpleNamespace(config=config, lake=lake)
    services.priority_weights = PriorityWeightsService(config, lake)
    services.catalog = SimpleNamespace(
        portfolio=lambda key: {"key": key} if key in ("it-infosec", "operations") else None,
        get_project=lambda project_id: {"projectId": project_id, "portfolioKey": "it-infosec"} if project_id == "GIS-0001" else None,
    )
    services.options = OptionsStore(
        lake=lake, contract=config.data_entry, path=config.api.oneLake.lookupsFile, ttl_seconds=0
    )
    app = create_app()
    app.dependency_overrides[get_services] = lambda: services
    with TestClient(app) as client:
        yield client, services


def test_settings_come_from_the_onelake_table(harness):
    client, services = harness
    services.lake.read_table.return_value = [
        {"setting_key": "isDemoEnvironment", "setting_value": "false", "setting_type": "boolean"},
        {"setting_key": "environmentName", "setting_value": "Production", "setting_type": "string"},
    ]
    body = client.get("/v1/admin/settings").json()
    assert body["isDemoEnvironment"] is False
    assert body["environmentName"] == "Production"
    services.lake.read_table.assert_called_with("system_settings")


def test_settings_default_to_the_shared_config_before_anything_is_saved(harness):
    client, _ = harness
    body = client.get("/v1/admin/settings").json()
    assert body["isDemoEnvironment"] is True
    assert body["environmentName"] == "Demo / Sandbox"


def test_an_unreadable_onelake_is_an_error_not_a_default(harness):
    client, services = harness
    services.lake.read_table.side_effect = LakeUnavailable("capacity is paused")
    response = client.get("/v1/admin/settings")
    assert response.status_code == 503
    assert "isDemoEnvironment" not in response.json()


def test_a_failed_settings_save_is_reported(harness):
    client, services = harness
    services.lake.write_table.side_effect = LakeError("write failed")
    response = client.put("/v1/admin/settings", json={"isDemoEnvironment": False})
    assert response.status_code == 502


def test_weights_are_read_from_conditional_onelake_json_records(harness):
    client, services = harness
    services.lake.read_json.return_value = (WEIGHT_ROWS, "current-etag")
    body = client.get("/v1/admin/priority-weights").json()
    assert body["defaultWeights"]["businessValue"] == 20
    assert body["defaultWeights"]["userBase"] == 10
    assert body["defaultWeights"]["cost"] == 5
    assert body["projectOverrides"] == {}
    assert body["portfolioOverrides"] == {}
    assert body["etag"] == "current-etag"
    services.lake.read_json.assert_called_with(PRIORITY_WEIGHTS_PATH)


def test_a_weight_update_starts_from_the_current_onelake_defaults(harness):
    client, services = harness
    services.lake.read_json.return_value = (WEIGHT_ROWS, "current-etag")
    response = client.put(
        "/v1/admin/priority-weights",
        json={"projectOverrides": {"GIS-0001": {"businessValue": 30.0}}},
    )
    assert response.status_code == 200
    assert response.json()["defaultWeights"]["businessValue"] == 20
    assert response.json()["defaultWeights"]["userBase"] == 10
    rows = services.lake.write_json.call_args.args[1]
    defaults = {row["field_key"]: row["weight_percent"] for row in rows if row["scope"] == "global"}
    assert defaults["businessValue"] == 20
    assert defaults["userBase"] == 10
    assert any(
        row["project_id"] == "GIS-0001" and row["field_key"] == "businessValue" and row["weight_percent"] == 30.0
        for row in rows
    )
    assert services.lake.write_json.call_args.args[0] == PRIORITY_WEIGHTS_PATH
    assert services.lake.write_json.call_args.kwargs == {"etag": "current-etag"}
    services.lake.write_table.assert_not_called()


def test_a_failed_weights_save_is_reported(harness):
    client, services = harness
    services.lake.write_json.side_effect = LakeError("write failed")
    response = client.put("/v1/admin/priority-weights", json={"projectOverrides": {}})
    assert response.status_code == 502


def test_portfolio_weight_route_patches_one_scope_without_dropping_the_other(harness):
    client, services = harness
    services.lake.read_json.return_value = ([
        *WEIGHT_ROWS,
        {"scope": "portfolio", "portfolio_key": "operations", "field_key": "userBase", "weight_percent": 80},
    ], "weights-v1")
    response = client.put("/v1/admin/priority-weights", json={
        "portfolioOverrides": {"it-infosec": {"userBase": 50}},
        "etag": "weights-v1",
    })
    assert response.status_code == 200
    assert response.json()["portfolioOverrides"] == {"operations": {"userBase": 80}, "it-infosec": {"userBase": 50}}
    assert response.json()["etag"] == "etag"
    rows = services.lake.write_json.call_args.args[1]
    assert any(row.get("portfolio_key") == "operations" and row["weight_percent"] == 80 for row in rows)


@pytest.mark.parametrize("body", [
    {"portfolioOverrides": {"it-infosec": {"unknown": 5}}},
    {"portfolioOverrides": {"it-infosec": {"userBase": -1}}},
    {"projectOverrides": {"GIS-0001": {"userBase": True}}},
    {"portfolioOverrides": {"not-a-portfolio": {"userBase": 10}}},
])
def test_invalid_weight_requests_return_standard_problem_documents(harness, body):
    client, services = harness
    response = client.put("/v1/admin/priority-weights", json=body)
    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["detail"]
    services.lake.write_json.assert_not_called()


def test_a_conflicting_weight_save_returns_an_explicit_conflict(harness):
    client, services = harness
    services.lake.write_json.side_effect = LakeConflict("concurrent edit")
    response = client.put("/v1/admin/priority-weights", json={"portfolioOverrides": {"it-infosec": {"userBase": 50}}})
    assert response.status_code == 409
    assert "Reload" in response.json()["detail"]


def test_an_unreadable_weight_store_is_not_replaced_with_shipped_defaults(harness):
    client, services = harness
    services.lake.read_json.side_effect = LakeUnavailable("capacity is paused")
    response = client.get("/v1/admin/priority-weights")
    assert response.status_code == 503
    assert "defaultWeights" not in response.json()


def test_lookups_are_saved_to_onelake_on_every_save(harness):
    client, services = harness
    assert client.put("/v1/admin/lookups", json={"sites": ["Fremont", "Austin Tech Center"]}).status_code == 200
    second = client.put("/v1/admin/lookups", json={"sites": ["Fremont"]})
    assert second.status_code == 200
    assert second.json()["sites"] == ["Fremont"]
    calls = services.lake.write_json.call_args_list
    assert len(calls) == 2
    assert all(call.kwargs == {"etag": None} for call in calls)


def test_a_failed_lookups_save_leaves_the_options_unchanged(harness):
    client, services = harness
    before = list(services.config.data_entry.options.sites)
    services.lake.write_json.side_effect = LakeError("write failed")
    response = client.put("/v1/admin/lookups", json={"sites": ["Nowhere"]})
    assert response.status_code == 502
    assert services.config.data_entry.options.sites == before
