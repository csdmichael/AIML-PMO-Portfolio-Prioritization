from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.config import load_config
from app.main import create_app
from app.onelake import LakeError, LakeUnavailable
from app.options_store import OptionsStore
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


def test_weights_are_read_from_the_onelake_table(harness):
    client, services = harness
    services.lake.read_table.return_value = WEIGHT_ROWS
    body = client.get("/v1/admin/priority-weights").json()
    assert body["defaultWeights"] == {"businessValue": 20.0, "userBase": 10.0}
    assert body["projectOverrides"] == {}


def test_a_weight_update_starts_from_the_current_onelake_defaults(harness):
    client, services = harness
    services.lake.read_table.return_value = WEIGHT_ROWS
    response = client.put(
        "/v1/admin/priority-weights",
        json={"projectOverrides": {"GIS-0001": {"businessValue": 30.0}}},
    )
    assert response.status_code == 200
    assert response.json()["defaultWeights"] == {"businessValue": 20.0, "userBase": 10.0}
    rows = services.lake.write_table.call_args.args[1]
    defaults = {row["field_key"]: row["weight_percent"] for row in rows if row["project_id"] == "*"}
    assert defaults == {"businessValue": 20.0, "userBase": 10.0}
    assert any(
        row["project_id"] == "GIS-0001" and row["field_key"] == "businessValue" and row["weight_percent"] == 30.0
        for row in rows
    )


def test_a_failed_weights_save_is_reported(harness):
    client, services = harness
    services.lake.write_table.side_effect = LakeError("write failed")
    response = client.put("/v1/admin/priority-weights", json={"projectOverrides": {}})
    assert response.status_code == 502


def test_lookups_are_saved_to_onelake_on_every_save(harness):
    client, services = harness
    assert client.put("/v1/admin/lookups", json={"sites": ["Fremont", "Austin Tech Center"]}).status_code == 200
    second = client.put("/v1/admin/lookups", json={"sites": ["Fremont"]})
    assert second.status_code == 200
    assert second.json()["sites"] == ["Fremont"]
    calls = services.lake.write_json.call_args_list
    assert len(calls) == 2
    assert all(call.kwargs.get("overwrite") is True for call in calls)


def test_a_failed_lookups_save_leaves_the_options_unchanged(harness):
    client, services = harness
    before = list(services.config.data_entry.options.sites)
    services.lake.write_json.side_effect = LakeError("write failed")
    response = client.put("/v1/admin/lookups", json={"sites": ["Nowhere"]})
    assert response.status_code == 502
    assert services.config.data_entry.options.sites == before
