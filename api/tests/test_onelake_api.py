import dataclasses
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import load_config
from app.contracts import OneLakeDataset
from app.main import create_app
from app.onelake import LakeConflict
from app.routes.deps import get_services

SETTINGS = "system-settings"
WEIGHTS = "priority-field-weights"
SETTINGS_PATH = "Tables/system_settings/records.json"
WEIGHTS_PATH = "Tables/priority_field_weights/records.json"
SETTINGS_ROWS = [
    {"setting_key": "isDemoEnvironment", "setting_value": "true", "setting_type": "boolean"},
]
WEIGHT_ROWS = [
    {"project_id": "*", "field_key": "businessValue", "weight_percent": 20.0},
]


@pytest.fixture
def harness():
    lake = Mock()
    lake.read_json.return_value = None
    lake.write_json.return_value = "etag-new"
    services = SimpleNamespace(config=load_config(), lake=lake)
    app = create_app()
    app.dependency_overrides[get_services] = lambda: services
    with TestClient(app) as client:
        yield client, services


def change_datasets(services, **changes):
    """Return the loaded config with some datasets changed, to test access and size limits."""
    datasets = [
        dataset.model_copy(update=changes.get(dataset.key, {})) for dataset in services.config.onelake_datasets.datasets
    ]
    onelake = services.config.onelake_datasets.model_copy(update={"datasets": datasets})
    services.config = dataclasses.replace(services.config, onelake_datasets=onelake)


def test_lists_only_the_configured_datasets(harness):
    client, _ = harness
    body = client.get("/v1/onelake/datasets").json()
    assert [item["key"] for item in body["items"]] == [SETTINGS, WEIGHTS]
    assert body["count"] == 2
    assert all(item["path"].startswith("Tables/") for item in body["items"])


@pytest.mark.parametrize("key", ["..%2Fsecret", "Files%2Fexports%2Fportfolio.json", "unlisted"])
def test_clients_cannot_name_a_path_or_an_unlisted_dataset(harness, key):
    client, services = harness
    assert client.get(f"/v1/onelake/datasets/{key}").status_code == 404
    assert client.put(f"/v1/onelake/datasets/{key}", json=[]).status_code == 404
    services.lake.read_json.assert_not_called()
    services.lake.write_json.assert_not_called()


def test_read_returns_the_data_and_its_etag(harness):
    client, services = harness
    services.lake.read_json.return_value = (SETTINGS_ROWS, "etag-1")
    response = client.get(f"/v1/onelake/datasets/{SETTINGS}")
    assert response.status_code == 200
    body = response.json()
    assert body["exists"] is True
    assert body["etag"] == "etag-1"
    assert body["data"] == SETTINGS_ROWS
    assert response.headers["ETag"] == '"etag-1"'
    services.lake.read_json.assert_called_once_with(SETTINGS_PATH)


def test_a_dataset_that_is_not_written_yet_reads_as_not_existing(harness):
    client, _ = harness
    body = client.get(f"/v1/onelake/datasets/{WEIGHTS}").json()
    assert body["exists"] is False
    assert body["etag"] is None
    assert body["data"] is None


def test_updating_an_existing_dataset_requires_the_etag_it_read(harness):
    client, services = harness
    services.lake.read_json.return_value = (WEIGHT_ROWS, "etag-1")
    response = client.put(f"/v1/onelake/datasets/{WEIGHTS}", json=WEIGHT_ROWS)
    assert response.status_code == 428
    services.lake.write_json.assert_not_called()


def test_an_update_writes_only_while_the_etag_still_matches(harness):
    client, services = harness
    services.lake.read_json.return_value = (WEIGHT_ROWS, "etag-1")
    response = client.put(
        f"/v1/onelake/datasets/{WEIGHTS}", json=WEIGHT_ROWS, headers={"If-Match": '"etag-1"'}
    )
    assert response.status_code == 200
    assert response.json()["etag"] == "etag-new"
    assert response.headers["ETag"] == '"etag-new"'
    args, kwargs = services.lake.write_json.call_args
    assert args == (WEIGHTS_PATH, WEIGHT_ROWS)
    assert kwargs == {"etag": "etag-1"}


def test_the_first_write_is_create_only(harness):
    client, services = harness
    response = client.put(f"/v1/onelake/datasets/{SETTINGS}", json=SETTINGS_ROWS)
    assert response.status_code == 200
    args, kwargs = services.lake.write_json.call_args
    assert args == (SETTINGS_PATH, SETTINGS_ROWS)
    assert kwargs == {}


def test_a_concurrent_change_is_reported_as_a_conflict(harness):
    client, services = harness
    services.lake.read_json.return_value = (WEIGHT_ROWS, "etag-1")
    services.lake.write_json.side_effect = LakeConflict("changed since it was read")
    response = client.put(
        f"/v1/onelake/datasets/{WEIGHTS}", json=WEIGHT_ROWS, headers={"If-Match": '"etag-1"'}
    )
    assert response.status_code == 409


@pytest.mark.parametrize(
    "body,message",
    [
        ({"setting_key": "isDemoEnvironment"}, "must be a JSON array"),
        (["not a record"], "must be a JSON array of objects"),
        ([{"setting_key": "isDemoEnvironment", "setting_value": "true"}], "missing required fields"),
    ],
)
def test_a_body_must_match_the_dataset_shape_and_required_fields(harness, body, message):
    client, services = harness
    response = client.put(f"/v1/onelake/datasets/{SETTINGS}", json=body)
    assert response.status_code == 422
    assert message in response.json()["detail"]
    services.lake.write_json.assert_not_called()


def test_the_size_limit_is_enforced(harness):
    client, services = harness
    change_datasets(services, **{SETTINGS: {"maxBytes": 20}})
    response = client.put(f"/v1/onelake/datasets/{SETTINGS}", json=SETTINGS_ROWS)
    assert response.status_code == 413
    services.lake.write_json.assert_not_called()


def test_a_read_only_dataset_refuses_writes(harness):
    client, services = harness
    change_datasets(services, **{SETTINGS: {"access": "read"}})
    response = client.put(f"/v1/onelake/datasets/{SETTINGS}", json=SETTINGS_ROWS)
    assert response.status_code == 403
    services.lake.write_json.assert_not_called()


@pytest.mark.parametrize("path", ["Other/records.json", "Tables/../secrets.json", "/Tables/x/records.json"])
def test_dataset_paths_stay_inside_the_lakehouse_roots(path):
    with pytest.raises(ValidationError):
        OneLakeDataset(
            key="k", label="L", description="d", path=path, shape="array", access="read", maxBytes=10,
        )
