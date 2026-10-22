import copy
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.cache import TtlCache
from app.catalog import Catalog
from app.config import load_config
from app.lake_paths import LakePaths
from app.main import create_app
from app.options_store import OptionsStore
from app.priority_scoring import PRIORITY_FIELD_KEYS
from app.priority_weights import PriorityWeightsService
from app.project_changes import ProjectChanges
from app.projects import ProjectService
from app.recommendation_cache import RecommendationCache
from app.routes.deps import get_services
from app.store import EntryStore, ExportReader
from tests.lake_doubles import MemoryLake


def export_document(config):
    options = config.data_entry.options
    return {
        "portfolios": [
            {
                "key": "it-infosec",
                "displayName": "IT InfoSec",
                "code": "INFOSEC",
                "role": "main",
                "programs": [
                    {"key": "zero-trust-identity", "displayName": "Zero Trust and Identity", "code": "ZTI"},
                    {"key": "security-operations", "displayName": "Security Operations", "code": "SOC"},
                ],
            },
            {
                "key": "data-analytics",
                "displayName": "Data and Analytics",
                "code": "DATA",
                "role": "coupled",
                "programs": [{"key": "data-platform", "displayName": "Data Platform and Lakehouse", "code": "DPL"}],
            },
        ],
        "capacityBySkill": [{"skill": "UC", "supply": 4.0, "demand": 6.0}],
        "projects": [
            {
                "projectId": "GIS-0001",
                "projectName": "Edge Network Segmentation",
                "portfolioKey": "it-infosec",
                "portfolio": "IT InfoSec",
                "portfolioCode": "INFOSEC",
                "portfolioRole": "main",
                "program": "Zero Trust and Identity",
                "businessUnit": options.businessUnits[0],
                "site": options.sites[0],
                "projectManager": "Sam Rivera",
                "executiveSponsor": "Ana Lopez",
                "sponsorLevel": options.sponsorLevels[0],
                "projectStatus": options.projectStatuses[0],
                "goLiveDate": "2027-06-30",
                "businessValue": 4,
                "userBase": 1500,
                "regulatorySecurity": False,
                "dtAlignment": False,
                "primarySkill": options.skills[0].key,
                "skillDemandFte": 2.0,
                "costEstimateUsd": 1200000,
                "riskRating": options.riskRatings[0],
                "effortPersonWeeks": 26,
                "priorityScore": 60.0,
                "finalTier": "Proceed",
                "confidenceScore": 80.0,
                "confidenceLevel": "High",
                "cluster": "Core Enterprise IT",
                "recommendedAction": "Proceed",
            },
        ],
    }


def pending_entry(config):
    options = config.data_entry.options
    return {
        "projectId": "GIS-0002",
        "projectName": "Pending Identity Review",
        "portfolioKey": "it-infosec",
        "programKey": "zero-trust-identity",
        "businessUnit": options.businessUnits[0],
        "site": options.sites[0],
        "sponsorName": "Dana Park",
        "sponsorLevel": options.sponsorLevels[0],
        "projectStatus": options.projectStatuses[0],
        "goLiveDate": "2027-09-30",
        "businessValue": 3,
        "userBase": 400,
        "regulatorySecurity": True,
        "dtAlignment": False,
        "primarySkill": options.skills[0].key,
        "skillDemandFte": 1.0,
        "costEstimateUsd": 300000,
        "riskRating": options.riskRatings[0],
        "effortPersonWeeks": 10,
        "projectManager": "Lee Chen",
        "submittedAtUtc": "2026-10-01T00:00:00Z",
    }


@pytest.fixture
def harness():
    config = load_config()
    lake = MemoryLake()
    paths = LakePaths(config)
    lake.files[paths.portfolio_export()] = (export_document(config), "etag-export")
    lake.files[paths.project_entry("GIS-0002")] = (pending_entry(config), "etag-entry")
    entries = EntryStore(lake)
    changes = ProjectChanges(entries=entries, paths=paths, contract=config.data_entry, cache=TtlCache(600))
    exports = ExportReader(lake=lake, cache=TtlCache(0), pipeline_name="PMO pipeline")
    catalog = Catalog(
        exports=exports, entries=entries, paths=paths, statuses=config.api.projects, contract=config.data_entry, changes=changes,
    )
    projects = ProjectService(
        lake=lake,
        entries=entries,
        paths=paths,
        catalog=catalog,
        contract=config.data_entry,
        validation=config.api.validation,
        project_settings=config.api.projects,
        upload_settings=config.api.uploads,
        changes=changes,
    )
    services = SimpleNamespace(
        config=config,
        paths=paths,
        exports=exports,
        catalog=catalog,
        projects=projects,
        changes=changes,
        options=OptionsStore(lake=lake, contract=config.data_entry, path=config.api.oneLake.lookupsFile, ttl_seconds=0),
    )
    app = create_app()
    app.dependency_overrides[get_services] = lambda: services
    with TestClient(app) as client:
        yield SimpleNamespace(client=client, services=services, lake=lake, config=config)


def export_project(client, project_id):
    export = client.get("/v1/portfolio").json()
    return next((item for item in export["projects"] if item["projectId"] == project_id), None)

def test_agent_snapshot_does_not_read_entries_already_in_the_saved_export(harness, monkeypatch):
    saved_entry = pending_entry(harness.config)
    saved_entry["projectId"] = "GIS-0001"
    harness.lake.write_json(harness.services.paths.project_entry("GIS-0001"), saved_entry)
    reads = []
    original = harness.lake.read_json

    def read(path):
        reads.append(path)
        return original(path)

    monkeypatch.setattr(harness.lake, "read_json", read)
    snapshot = harness.services.catalog.agent_snapshot()
    assert len(snapshot["projects"]) == 2
    assert harness.services.paths.project_entry("GIS-0001") not in reads
    assert harness.services.paths.project_entry("GIS-0002") in reads


def test_analyzed_reset_export_keeps_its_new_score_instead_of_the_old_replacement(harness):
    services = harness.services
    original = export_document(harness.config)["projects"][0]
    services.changes.save_reset({
        "revision": "reset-1", "updatedAtUtc": "2026-10-22T00:00:00Z", "action": "reloadSample",
        "portfolioKey": None, "portfolios": [], "records": {
            "GIS-0001": {"projectId": "GIS-0001", "resetRevision": "reset-1", "replacement": {**original, "priorityScore": 20}},
        },
    }, None)
    fresh = {**original, "priorityScore": 88, "analysisResetRevision": "reset-1"}
    result = services.changes.apply(fresh, shape="export", portfolios=services.catalog.portfolio_index)
    assert result["priorityScore"] == 88
    before_analysis = services.changes.apply(original, shape="export", portfolios=services.catalog.portfolio_index)
    assert before_analysis["priorityScore"] == 20


def test_saved_weight_scopes_rescore_every_http_view_and_invalidate_recommendations(harness):
    services, client = harness.services, harness.client
    saved = harness.lake.files[services.paths.portfolio_export()][0]
    record = saved["projects"][0]
    record.update({
        "monthsToGoLive": 12,
        "userBase": 1000,
        "mlTier": "Proceed",
        "tierProbabilities": {"mustDoNow": 0.1, "proceed": 0.5, "canWait": 0.3, "deprioritize": 0.1},
        "ruleOverrides": [],
        "topDrivers": [{"signalKey": "business_value", "shapValue": 0.17}],
    })
    saved["projects"].extend([
        {**record, "projectId": "GIS-0003", "portfolioKey": "data-analytics"},
        {**record, "projectId": "GIS-0004"},
    ])
    original = copy.deepcopy(saved)
    services.priority_weights = PriorityWeightsService(harness.config, harness.lake)
    services.catalog = Catalog(
        exports=services.exports, entries=EntryStore(harness.lake), paths=services.paths,
        statuses=harness.config.api.projects, contract=harness.config.data_entry,
        changes=services.changes, priority_weights=services.priority_weights,
    )
    cache = RecommendationCache(lake=harness.lake, paths=services.paths, state_provider=services.catalog.agent_snapshot)

    def weights(field):
        return {key: float(key == field) for key in PRIORITY_FIELD_KEYS}

    current = client.get("/v1/admin/priority-weights").json()
    response = client.put("/v1/admin/priority-weights", json={
        "defaultWeights": weights("businessValue"), "projectOverrides": {"GIS-0001": {}}, "etag": current["etag"],
    })
    assert response.status_code == 200

    def assert_views(project_id, score, scope):
        detail = client.get(f"/v1/projects/{project_id}").json()
        listed = next(item for item in client.get("/v1/projects").json()["items"] if item["projectId"] == project_id)
        exported = export_project(client, project_id)
        for view in (detail, listed, exported):
            assert view["priorityScore"] == score
            assert view["priorityWeightScope"] == scope
            assert view["priorityScoreState"] == "weighted"
        for key in ("tierProbabilities", "mlTier", "finalTier", "confidenceScore", "confidenceLevel", "topDrivers"):
            assert detail[key] == record[key]
            assert exported[key] == record[key]

    assert_views("GIS-0001", 70.2, "global")
    revision = cache.revision()
    response = client.put("/v1/admin/priority-weights", json={
        "portfolioOverrides": {"it-infosec": weights("userBase")}, "etag": response.json()["etag"],
    })
    assert response.status_code == 200
    assert cache.revision() != revision
    assert_views("GIS-0001", 58.2, "portfolio")
    assert_views("GIS-0004", 58.2, "portfolio")
    assert_views("GIS-0003", 70.2, "global")
    revision = cache.revision()
    response = client.put("/v1/admin/priority-weights", json={
        "projectOverrides": {"GIS-0001": weights("businessValue")}, "etag": response.json()["etag"],
    })
    assert response.status_code == 200
    assert cache.revision() != revision
    assert_views("GIS-0001", 70.2, "project")
    assert_views("GIS-0004", 58.2, "portfolio")
    pending = client.get("/v1/projects/GIS-0002").json()
    assert pending["priorityScore"] is None
    assert pending["priorityScoreState"] == "awaiting-analysis"
    assert saved == original


def test_a_status_change_shows_in_the_export_at_once_and_leaves_the_rollups_alone(harness):
    status = harness.config.data_entry.options.projectStatuses[-1]
    response = harness.client.patch("/v1/projects/GIS-0001", json={"projectStatus": status})
    assert response.status_code == 200
    assert response.json()["projectStatus"] == status
    assert export_project(harness.client, "GIS-0001")["projectStatus"] == status
    export = harness.client.get("/v1/portfolio").json()
    assert export["capacityBySkill"] == [{"skill": "UC", "supply": 4.0, "demand": 6.0}]


def test_the_sponsor_is_saved_under_the_export_key_and_found_by_search(harness):
    response = harness.client.patch("/v1/projects/GIS-0001", json={"sponsorName": "Ruth Okafor"})
    assert response.status_code == 200
    assert response.json()["executiveSponsor"] == "Ruth Okafor"
    listed = harness.client.get("/v1/projects", params={"q": "Ruth Okafor"}).json()["items"]
    assert [item["projectId"] for item in listed] == ["GIS-0001"]


def test_a_skill_change_is_saved_as_its_key_and_shows_its_name_in_the_export(harness):
    skill = harness.config.data_entry.options.skills[-1]
    response = harness.client.patch("/v1/projects/GIS-0001", json={"primarySkill": skill.key})
    assert response.status_code == 200
    assert response.json()["primarySkill"] == skill.displayName
    assert export_project(harness.client, "GIS-0001")["primarySkill"] == skill.displayName


def test_a_portfolio_change_needs_its_program_and_updates_the_names(harness):
    missing_program = harness.client.patch("/v1/projects/GIS-0001", json={"portfolioKey": "data-analytics"})
    assert missing_program.status_code == 422
    response = harness.client.patch(
        "/v1/projects/GIS-0001", json={"portfolioKey": "data-analytics", "programKey": "data-platform"},
    )
    assert response.status_code == 200
    body = response.json()
    assert (body["portfolioKey"], body["portfolio"], body["program"]) == ("data-analytics", "Data and Analytics", "Data Platform and Lakehouse")


def test_a_program_must_belong_to_the_portfolio_it_is_changed_with(harness):
    response = harness.client.patch("/v1/projects/GIS-0001", json={"programKey": "data-platform"})
    assert response.status_code == 422
    assert "programKey" in response.text


def test_unknown_fields_and_bad_values_are_reported(harness):
    response = harness.client.patch("/v1/projects/GIS-0001", json={"projectStatus": "Nonsense", "notAField": 1})
    assert response.status_code == 422
    assert "projectStatus" in response.text
    assert "notAField" in response.text


def test_soft_delete_and_restore_flag_the_project_without_removing_it(harness):
    deleted = harness.client.patch("/v1/projects/GIS-0001", json={"isDeleted": True}).json()
    assert deleted["isDeleted"] is True
    assert export_project(harness.client, "GIS-0001")["isDeleted"] is True
    assert export_project(harness.client, "GIS-0001")["deletedAt"]
    listed = harness.client.get("/v1/projects").json()["items"]
    assert next(item for item in listed if item["projectId"] == "GIS-0001")["isDeleted"] is True
    restored = harness.client.patch("/v1/projects/GIS-0001", json={"isDeleted": False}).json()
    assert restored["isDeleted"] is False
    assert export_project(harness.client, "GIS-0001")["deletedAt"] is None


def test_a_soft_delete_flag_must_be_true_or_false(harness):
    assert harness.client.patch("/v1/projects/GIS-0001", json={"isDeleted": "yes"}).status_code == 422


def test_permanent_delete_removes_the_project_from_every_view(harness):
    assert harness.client.delete("/v1/projects/GIS-0001").json() == {"projectId": "GIS-0001", "deleted": True}
    assert harness.client.get("/v1/projects/GIS-0001").status_code == 404
    assert export_project(harness.client, "GIS-0001") is None
    listed = harness.client.get("/v1/projects").json()["items"]
    assert "GIS-0001" not in {item["projectId"] for item in listed}
    assert harness.client.patch("/v1/projects/GIS-0001", json={"isDeleted": True}).status_code == 404


def test_a_pending_entry_keeps_its_change_when_it_is_read(harness):
    status = harness.config.data_entry.options.projectStatuses[-1]
    assert harness.client.patch("/v1/projects/GIS-0002", json={"projectStatus": status}).status_code == 200
    body = harness.client.get("/v1/projects/GIS-0002").json()
    assert body["projectStatus"] == status
    assert body["status"] == harness.config.api.projects.statusPending


def test_a_pending_entry_can_be_removed_and_stays_in_oneLake(harness):
    assert harness.client.delete("/v1/projects/GIS-0002").status_code == 200
    assert harness.client.get("/v1/projects/GIS-0002").status_code == 404
    assert harness.lake.read_json(harness.services.paths.project_entry("GIS-0002")) is not None


def test_pending_entries_are_in_the_portfolio_export_that_every_view_reads(harness):
    export = harness.client.get("/v1/portfolio").json()
    assert [item["projectId"] for item in export["projects"]] == ["GIS-0001", "GIS-0002"]
    pending = export["projects"][1]
    assert pending["projectName"] == "Pending Identity Review"
    assert pending["executiveSponsor"] == "Dana Park"
    assert pending["projectManager"] == "Lee Chen"
    assert pending["portfolio"] == "IT InfoSec"
    assert pending["program"] == "Zero Trust and Identity"
    assert pending["status"] == harness.config.api.projects.statusPending
    assert pending.get("priorityScore") is None
    assert harness.client.delete("/v1/projects/GIS-0002").status_code == 200
    assert [item["projectId"] for item in harness.client.get("/v1/portfolio").json()["projects"]] == ["GIS-0001"]


def test_exporting_reads_only_pending_entries_that_are_not_exported_or_removed(harness, monkeypatch):
    paths = harness.services.paths
    harness.lake.files[paths.project_entry("GIS-0003")] = (
        {**pending_entry(harness.config), "projectId": "GIS-0003", "projectName": "Removed before export"},
        "etag-removed",
    )
    harness.services.changes.save("GIS-0003", deleted=True)
    reads: list[str] = []
    read_entry = EntryStore.get

    def tracked(self, lake_path):
        if lake_path.startswith(f"{paths.project_entries_folder()}/"):
            reads.append(lake_path)
        return read_entry(self, lake_path)

    monkeypatch.setattr(EntryStore, "get", tracked)
    projects = harness.client.get("/v1/portfolio").json()["projects"]
    assert [item["projectId"] for item in projects] == ["GIS-0001", "GIS-0002"]
    assert reads == [paths.project_entry("GIS-0002")]


def test_pending_projects_have_a_provisional_confidence_in_every_view(harness):
    pending = next(item for item in harness.client.get("/v1/portfolio").json()["projects"] if item["projectId"] == "GIS-0002")
    assert pending["confidenceScore"] == 75.9
    assert pending["confidenceLevel"] == "High"
    listed = next(item for item in harness.client.get("/v1/projects").json()["items"] if item["projectId"] == "GIS-0002")
    assert listed["confidenceScore"] == 75.9
    assert harness.client.get("/v1/projects/GIS-0002").json()["confidenceScore"] == 75.9


def test_changes_to_unknown_projects_are_not_found(harness):
    status = harness.config.data_entry.options.projectStatuses[-1]
    assert harness.client.patch("/v1/projects/GIS-9999", json={"projectStatus": status}).status_code == 404
    assert harness.client.delete("/v1/projects/GIS-9999").status_code == 404


def test_a_change_that_lost_a_race_is_a_conflict_and_is_not_saved(harness, monkeypatch):
    entries = harness.services.changes._entries
    original_replace = entries.replace
    harness.services.changes.save("GIS-0001", values={"projectStatus": harness.config.data_entry.options.projectStatuses[-1]})

    def another_instance_writes_first(path, value, etag):
        stored, _ = harness.lake.files[path]
        harness.lake.files[path] = (stored, "newer")
        return original_replace(path, value, etag)

    monkeypatch.setattr(entries, "replace", another_instance_writes_first)
    response = harness.client.patch("/v1/projects/GIS-0001", json={"sponsorName": "Late Change"})
    assert response.status_code == 409
    assert "executiveSponsor" not in harness.lake.files[harness.services.paths.project_change("GIS-0001")][0].get("values", {})


def test_field_provenance_can_be_saved_and_read_on_project(harness):
    provenance = {
        "businessValue": {"source": "ai", "confidenceScore": 88, "confidenceLevel": "High", "rationale": "Extracted from charter"},
        "costEstimateUsd": {"source": "human", "confidenceScore": 100, "confidenceLevel": "Human"},
    }
    response = harness.client.patch("/v1/projects/GIS-0001", json={"fieldProvenance": provenance})
    assert response.status_code == 200
    assert response.json()["fieldProvenance"] == provenance
    got = harness.client.get("/v1/projects/GIS-0001").json()
    assert got["fieldProvenance"] == provenance
    listed = harness.client.get("/v1/projects").json()["items"]
    item = next(p for p in listed if p["projectId"] == "GIS-0001")
    assert item["fieldProvenance"] == provenance


def test_recalculate_project_endpoint_returns_updated_scores(harness):
    recalc = harness.client.post("/v1/projects/GIS-0001/recalculate", json={"businessValue": 5})
    assert recalc.status_code == 200
    data = recalc.json()
    assert data["projectId"] == "GIS-0001"
    assert data["businessValue"] == 5
    assert data["priorityScore"] is not None
