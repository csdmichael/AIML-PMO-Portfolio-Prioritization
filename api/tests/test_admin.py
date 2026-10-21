import json
from unittest.mock import Mock
from fastapi.testclient import TestClient
from app.main import create_app
from app.container import build_services
from app.options_store import OptionsStore
from app.priority_weights import PriorityWeightsService
from app.routes.deps import get_services


def get_test_services():
    services = build_services()
    mock_lake = Mock()
    mock_lake.read_table.return_value = None
    mock_lake.write_table.return_value = "etag"
    mock_lake.write_json.return_value = "etag"
    mock_lake.write_json.return_value = "etag"
    mock_lake.read_json.return_value = None
    services.lake = mock_lake
    services.options = OptionsStore(
        lake=mock_lake, contract=services.config.data_entry, path=services.config.api.oneLake.lookupsFile, ttl_seconds=0,
    )
    services.priority_weights = PriorityWeightsService(services.config, mock_lake)
    services.catalog = Mock()
    services.catalog.get_project.return_value = {"projectId": "GIS-0001", "portfolioKey": "it-infosec"}
    return services


def test_admin_get_and_update_lookups():
    app = create_app()
    app.dependency_overrides[get_services] = get_test_services
    client = TestClient(app)
    resp = client.get("/v1/admin/lookups")
    assert resp.status_code == 200
    lookups = resp.json()
    assert "sites" in lookups
    assert "businessUnits" in lookups

    # Test update sites
    original_sites = lookups["sites"]
    updated_sites = original_sites + ["Austin Tech Center"]
    put_resp = client.put("/v1/admin/lookups", json={"sites": updated_sites})
    assert put_resp.status_code == 200
    assert "Austin Tech Center" in put_resp.json()["sites"]

    # Revert
    client.put("/v1/admin/lookups", json={"sites": original_sites})


def test_admin_get_and_update_priority_weights():
    app = create_app()
    app.dependency_overrides[get_services] = get_test_services
    client = TestClient(app)
    resp = client.get("/v1/admin/priority-weights")
    assert resp.status_code == 200
    data = resp.json()
    assert "availableFields" in data
    assert "defaultWeights" in data
    assert data["defaultWeights"]["businessValue"] > 0
    assert "userBase" in data["defaultWeights"]
    assert data["portfolioOverrides"] == {}
    assert data["etag"] is None

    # Update default weights and a project override
    weights = data["defaultWeights"]
    put_resp = client.put(
        "/v1/admin/priority-weights",
        json={
            "defaultWeights": weights,
            "projectOverrides": {"GIS-0001": {"businessValue": 30.0, "userBase": 25.0}},
        },
    )
    assert put_resp.status_code == 200
    res = put_resp.json()
    assert "GIS-0001" in res["projectOverrides"]


def test_admin_settings():
    app = create_app()
    app.dependency_overrides[get_services] = get_test_services
    client = TestClient(app)
    resp = client.get("/v1/admin/settings")
    assert resp.status_code == 200
    assert "isDemoEnvironment" in resp.json()

    put_resp = client.put("/v1/admin/settings", json={"isDemoEnvironment": False})
    assert put_resp.status_code == 200
    assert put_resp.json()["isDemoEnvironment"] is False

    # Revert to true
    client.put("/v1/admin/settings", json={"isDemoEnvironment": True})

