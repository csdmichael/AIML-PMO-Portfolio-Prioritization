import json
from fastapi.testclient import TestClient
from app.main import create_app


def test_admin_get_and_update_lookups():
    client = TestClient(create_app())
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
    client = TestClient(create_app())
    resp = client.get("/v1/admin/priority-weights")
    assert resp.status_code == 200
    data = resp.json()
    assert "availableFields" in data
    assert "defaultWeights" in data
    assert data["defaultWeights"]["businessValue"] > 0
    assert "userBase" in data["defaultWeights"]

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
    client = TestClient(create_app())
    resp = client.get("/v1/admin/settings")
    assert resp.status_code == 200
    assert "isDemoEnvironment" in resp.json()

    put_resp = client.put("/v1/admin/settings", json={"isDemoEnvironment": False})
    assert put_resp.status_code == 200
    assert put_resp.json()["isDemoEnvironment"] is False

    # Revert to true
    client.put("/v1/admin/settings", json={"isDemoEnvironment": True})

