import copy
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.cache import TtlCache
from app.catalog import Catalog
from app.config import load_config
from app.demo_data import DemoDataService
from app.lake_paths import LakePaths
from app.main import create_app
from app.onelake import LakeUnavailable
from app.options_store import OptionsStore
from app.project_changes import ProjectChanges
from app.projects import ProjectService
from app.routes.deps import get_services
from app.store import EntryStore, ExportReader
from tests.lake_doubles import MemoryLake
from tests.test_project_changes import export_document, pending_entry
from tools.publish_demo_snapshot import verify_demo_names


@pytest.fixture
def harness():
    config = load_config()
    lake = MemoryLake()
    paths = LakePaths(config)
    baseline = export_document(config)
    baseline.update(asOfDate="2026-10-12", source="Synthetic Fabric test export")
    baseline["projects"][0]["topDrivers"] = []
    other = {**baseline["projects"][0], "projectId": "GIS-0080", "projectName": "Keep other portfolio unchanged",
             "portfolioKey": "data-analytics", "portfolio": "Data and Analytics", "programKey": "data-platform"}
    baseline["projects"].append(other)
    lake.write_json(paths.portfolio_export(), baseline)
    lake.write_json(paths.project_entry("GIS-0101"), {**pending_entry(config), "projectId": "GIS-0101"})
    lake.write_json(paths.project_entry("GIS-0102"), {
        **pending_entry(config), "projectId": "GIS-0102", "portfolioKey": "data-analytics", "programKey": "data-platform",
    })
    demo_export = copy.deepcopy(baseline)
    demo_export["projects"] = [
        {
            **baseline["projects"][0], "projectId": f"GIS-{number:04d}", "projectName": f"Synthetic project {number}",
            "portfolioKey": "it-infosec" if number <= 40 else "data-analytics",
            "portfolio": "IT InfoSec" if number <= 40 else "Data and Analytics",
        }
        for number in range(1, 101)
    ]
    snapshot = {
        "isSynthetic": True, "capturedAtUtc": "2026-10-12T00:00:00Z",
        "sourceExportPath": paths.portfolio_export(), "sourceExportEtag": "original-export",
        "export": demo_export,
    }
    lake.write_json(paths.demo_source(), snapshot)
    entries = EntryStore(lake)
    changes = ProjectChanges(entries=entries, paths=paths, contract=config.data_entry, cache=TtlCache(600))
    exports = ExportReader(lake=lake, cache=TtlCache(600), pipeline_name="PMO pipeline")
    catalog = Catalog(
        exports=exports, entries=entries, paths=paths, statuses=config.api.projects,
        contract=config.data_entry, changes=changes,
    )
    services = SimpleNamespace(
        config=config, lake=lake, paths=paths, exports=exports, entries=entries, changes=changes, catalog=catalog,
        options=OptionsStore(lake=lake, contract=config.data_entry, path=config.api.oneLake.lookupsFile, ttl_seconds=0),
        tool_tokens=Mock(),
    )
    services.projects = ProjectService(
        lake=lake, entries=entries, paths=paths, catalog=catalog, contract=config.data_entry,
        validation=config.api.validation, project_settings=config.api.projects, upload_settings=config.api.uploads,
        changes=changes,
    )
    services.demo = DemoDataService(config=config, lake=lake, paths=paths, catalog=catalog, changes=changes)
    app = create_app()
    app.dependency_overrides[get_services] = lambda: services
    with TestClient(app) as client:
        yield SimpleNamespace(client=client, services=services, config=config, lake=lake, paths=paths)


def load(harness, portfolio_key=None):
    return harness.client.post("/v1/demo/projects/load", json={"confirmReplace": True, "portfolioKey": portfolio_key})


def projects(harness):
    response = harness.client.get("/v1/projects", params={"pageSize": 100})
    assert response.status_code == 200, response.json()
    return response.json()


def test_catalog_reports_the_exact_100_project_snapshot_without_modifying_data(harness):
    before = copy.deepcopy(harness.lake.files)
    response = harness.client.get("/v1/demo/projects")
    assert response.status_code == 200
    body = response.json()
    assert body["projectCount"] == 100
    assert {item["key"]: item["projectCount"] for item in body["portfolios"]} == {"it-infosec": 40, "data-analytics": 60}
    assert harness.lake.files == before


def test_full_load_replaces_processed_and_pending_projects_with_exactly_100_and_does_not_duplicate(harness):
    original = copy.deepcopy(harness.lake.files[harness.paths.demo_source()])
    for _ in range(2):
        response = load(harness)
        assert response.status_code == 200
        assert response.json()["loadedProjects"] == response.json()["totalProjects"] == 100
        export = harness.client.get("/v1/portfolio").json()
        assert len(export["projects"]) == 100
        assert {item["projectId"] for item in export["projects"]} == {f"GIS-{number:04d}" for number in range(1, 101)}
        assert projects(harness)["totalItems"] == 100
        assert harness.client.get("/v1/projects/GIS-0101").status_code == 404
    assert harness.lake.files[harness.paths.demo_source()] == original
    assert harness.client.get("/v1/projects/GIS-0100").json()["projectName"] == "Synthetic project 100"


def test_portfolio_load_replaces_only_the_selected_scope_including_pending_projects(harness):
    response = load(harness, "it-infosec")
    assert response.status_code == 200
    assert response.json()["loadedProjects"] == 40
    assert response.json()["totalProjects"] == 42
    assert projects(harness)["totalItems"] == 42
    assert harness.client.get("/v1/projects/GIS-0101").status_code == 404
    assert harness.client.get("/v1/projects/GIS-0102").status_code == 200
    other = harness.client.get("/v1/projects/GIS-0080").json()
    assert other["projectName"] == "Keep other portfolio unchanged"
    assert len(harness.client.get("/v1/portfolio").json()["projects"]) == 42
    assert load(harness, "it-infosec").json()["totalProjects"] == 42


def test_clear_hides_every_project_and_survives_rebuilding_services(harness):
    assert harness.client.post("/v1/demo/projects/clear", json={"confirmClear": True}).status_code == 200
    assert projects(harness)["totalItems"] == 0
    assert harness.client.get("/v1/portfolio").json()["projects"] == []
    rebuilt = ProjectChanges(
        entries=harness.services.entries, paths=harness.paths, contract=harness.config.data_entry, cache=TtlCache(0),
    )
    baseline = harness.services.exports.read(harness.paths.portfolio_export())
    assert rebuilt.apply_export(baseline, portfolios=harness.services.catalog.portfolio_index)["projects"] == []
    # Resetting application visibility never destroys the original sources or pending entries.
    assert harness.lake.read_json(harness.paths.portfolio_export()) is not None
    assert harness.lake.read_json(harness.paths.project_entry("GIS-0101")) is not None


def test_new_projects_can_be_created_after_clearing(harness):
    harness.client.post("/v1/demo/projects/clear", json={"confirmClear": True})
    values = pending_entry(harness.config)
    for key in ("projectId", "submittedAtUtc"):
        values.pop(key)
    response = harness.client.post("/v1/projects", params={"runPipeline": False}, json=values)
    assert response.status_code == 201
    assert projects(harness)["totalItems"] == 1


def test_reloading_restores_removed_records_and_discards_older_edits_but_allows_new_edits(harness):
    harness.services.changes.save("GIS-0001", values={"projectName": "Old edit"}, deleted=True)
    harness.services.changes.save("GIS-0080", is_deleted=True)
    assert load(harness).status_code == 200
    record = harness.client.get("/v1/projects/GIS-0001").json()
    assert record["projectName"] == "Synthetic project 1"
    assert record["isDeleted"] is False
    assert harness.client.patch("/v1/projects/GIS-0001", json={"projectName": "New edit after loading"}).status_code == 200
    assert harness.client.get("/v1/projects/GIS-0001").json()["projectName"] == "New edit after loading"
    assert load(harness).status_code == 200
    assert harness.client.get("/v1/projects/GIS-0001").json()["projectName"] == "Synthetic project 1"
    assert harness.client.post("/v1/demo/projects/clear", json={"confirmClear": True}).status_code == 200
    assert load(harness).json()["totalProjects"] == 100


@pytest.mark.parametrize("url,body", [
    ("/v1/demo/projects/load", {"confirmReplace": True}),
    ("/v1/demo/projects/clear", {"confirmClear": True}),
])
def test_global_demo_setting_is_rechecked_for_every_action(harness, url, body):
    assert harness.client.get("/v1/demo/projects").status_code == 200
    harness.lake.write_table(harness.config.api.oneLake.systemSettingsTable, [
        {"setting_key": "isDemoEnvironment", "setting_value": "false", "setting_type": "boolean"},
    ])
    before = copy.deepcopy(harness.lake.files)
    assert harness.client.post(url, json=body).status_code == 403
    assert harness.client.get("/v1/demo/projects").status_code == 403
    assert harness.lake.files == before


@pytest.mark.parametrize("url,body", [
    ("/v1/demo/projects/load", {}),
    ("/v1/demo/projects/load", {"confirmReplace": False}),
    ("/v1/demo/projects/clear", {}),
    ("/v1/demo/projects/clear", {"confirmClear": False}),
    ("/v1/demo/projects/clear", {"confirmClear": True, "portfolioKey": "it-infosec"}),
])
def test_confirmation_is_required_and_clear_all_cannot_silently_become_a_scoped_clear(harness, url, body):
    assert harness.client.post(url, json=body).status_code == 422
    assert harness.lake.read_json(harness.paths.project_resets()) is None


def test_failed_bulk_write_never_partially_removes_projects(harness, monkeypatch):
    before = copy.deepcopy(harness.lake.files)
    original_write = harness.lake.write_json

    def unavailable(path, *args, **kwargs):
        if path == harness.paths.project_resets():
            raise LakeUnavailable("OneLake write unavailable")
        return original_write(path, *args, **kwargs)

    monkeypatch.setattr(harness.lake, "write_json", unavailable)
    assert load(harness).status_code == 503
    assert harness.lake.files == before
    assert projects(harness)["totalItems"] == 4


def test_bulk_resets_use_etags_and_report_concurrent_changes(harness, monkeypatch):
    load(harness)
    path = harness.paths.project_resets()
    original_write = harness.lake.write_json

    def conflicting_write(lake_path, *args, **kwargs):
        if lake_path == path:
            value, _ = harness.lake.files[path]
            harness.lake.files[path] = ({**value, "revision": "other-writer"}, "other-etag")
        return original_write(lake_path, *args, **kwargs)

    monkeypatch.setattr(harness.lake, "write_json", conflicting_write)
    assert harness.client.post("/v1/demo/projects/clear", json={"confirmClear": True}).status_code == 409
    assert harness.lake.files[path][0]["revision"] == "other-writer"


@pytest.mark.parametrize("corruption", ["not-synthetic", "duplicate-id", "wrong-count", "invalid-portfolio"])
def test_corrupt_or_unapproved_snapshots_cannot_replace_projects(harness, corruption):
    source, etag = harness.lake.files[harness.paths.demo_source()]
    document = copy.deepcopy(source)
    if corruption == "not-synthetic":
        document["isSynthetic"] = False
    elif corruption == "duplicate-id":
        document["export"]["projects"][1]["projectId"] = document["export"]["projects"][0]["projectId"]
    elif corruption == "wrong-count":
        document["export"]["projects"].pop()
    else:
        document["export"]["projects"][0]["portfolioKey"] = "not-a-portfolio"
    harness.lake.files[harness.paths.demo_source()] = (document, etag)
    assert load(harness).status_code == 502
    assert harness.lake.read_json(harness.paths.project_resets()) is None


def test_a_missing_snapshot_is_an_error_not_an_implicit_copy_of_current_projects(harness):
    harness.lake.delete(harness.paths.demo_source())
    assert load(harness).status_code == 404
    assert harness.lake.read_json(harness.paths.project_resets()) is None
    assert harness.client.post("/v1/demo/projects/clear", json={"confirmClear": True}).status_code == 200


def test_a_subset_never_steals_an_id_that_moved_to_another_portfolio(harness):
    response = harness.client.patch("/v1/projects/GIS-0001", json={
        "portfolioKey": "data-analytics", "programKey": "data-platform",
    })
    assert response.status_code == 200
    assert load(harness, "it-infosec").status_code == 409
    assert harness.lake.read_json(harness.paths.project_resets()) is None
    assert load(harness, "not-a-portfolio").status_code == 422


def test_unavailable_or_invalid_global_settings_fail_closed(harness, monkeypatch):
    harness.lake.write_json(f"Tables/{harness.config.api.oneLake.systemSettingsTable}/records.json", {"corrupt": True})
    assert load(harness).status_code == 502
    assert harness.lake.read_json(harness.paths.project_resets()) is None
    monkeypatch.setattr(harness.lake, "read_table", Mock(side_effect=LakeUnavailable("Settings unavailable")))
    assert load(harness).status_code == 503
    assert harness.lake.read_json(harness.paths.project_resets()) is None


def test_demo_resets_hide_outdated_pipeline_rollups_and_capacity_scenarios(harness):
    load(harness, "it-infosec")
    export = harness.client.get("/v1/portfolio").json()
    assert export["capacityBySkill"] == export["clusters"] == []
    assert export["datasetReset"]["isSynthetic"] is True
    assert harness.client.get("/v1/capacity/scenarios").status_code == 409


def test_agent_tools_use_the_same_reset_project_set_as_the_application(harness):
    harness.client.post("/v1/demo/projects/clear", json={"confirmClear": True})
    response = harness.client.post("/v1/agent/tools/query", json={
        "kind": "projects", "projectIds": [], "tier": "", "businessUnit": "", "limit": 5, "includeDetails": False,
    }, headers={"Authorization": "Bearer workload-token"})
    assert response.status_code == 200
    assert response.json()["sourceProjectIds"] == []


def test_snapshot_publication_verifies_names_and_recovers_only_missing_names_from_the_generator():
    export = {"projects": [
        {"projectId": "GIS-0001", "projectName": "Known synthetic project", "priorityScore": 75.0},
        {"projectId": "GIS-0002", "projectName": None, "priorityScore": 45.0},
    ]}
    expected = {"GIS-0001": "Known synthetic project", "GIS-0002": "Generated project title"}
    restored = verify_demo_names(export, expected)
    assert restored == {"GIS-0002": "Generated project title"}
    assert export["projects"][1]["projectName"] == "Generated project title"
    assert export["projects"][1]["priorityScore"] == 45.0


def test_snapshot_publication_rejects_unknown_or_changed_project_names():
    with pytest.raises(RuntimeError, match="IDs"):
        verify_demo_names({"projects": []}, {"GIS-0001": "Synthetic project"})
    with pytest.raises(RuntimeError, match="names"):
        verify_demo_names({"projects": [{"projectId": "GIS-0001", "projectName": "Unverified name"}]},
                          {"GIS-0001": "Synthetic project"})
