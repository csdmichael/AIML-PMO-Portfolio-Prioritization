from datetime import date, timedelta

import pytest

from tests.test_project_changes import export_project, harness
from tests.test_project_changes import pending_entry
from app.decisions import DecisionService


def progress_body(**changes):
    return {
        "hasStarted": True,
        "startDate": "2020-01-01",
        "estimatedFinishDate": "2020-12-31",
        "completed": False,
        "completionDate": None,
        "expectedRevision": None,
        **changes,
    }


def test_starting_a_project_persists_dates_and_updates_all_project_views(harness):
    client = harness.client
    before = client.get("/v1/projects/GIS-0001").json()
    assert before["progressStatus"] == "notStarted"
    response = client.patch("/v1/projects/GIS-0001/progress", json=progress_body())
    assert response.status_code == 200
    saved = response.json()
    assert saved["hasStarted"] is True
    assert saved["progressStatus"] == "started"
    assert saved["projectStatus"] == "Active"
    assert saved["startDate"] == "2020-01-01"
    assert saved["estimatedFinishDate"] == "2020-12-31"
    assert saved["changeRevision"]
    assert export_project(client, "GIS-0001")["hasStarted"] is True
    listed = client.get("/v1/projects").json()["items"]
    assert next(item for item in listed if item["projectId"] == "GIS-0001")["startDate"] == "2020-01-01"


def test_started_work_cannot_be_reset_to_not_started_or_backlog(harness):
    client = harness.client
    started = client.patch("/v1/projects/GIS-0001/progress", json=progress_body()).json()
    response = client.patch(
        "/v1/projects/GIS-0001/progress",
        json=progress_body(hasStarted=False, expectedRevision=started["changeRevision"]),
    )
    assert response.status_code == 409
    assert client.patch("/v1/projects/GIS-0001", json={"projectStatus": "Backlog"}).status_code == 409
    assert client.get("/v1/projects/GIS-0001").json()["hasStarted"] is True


@pytest.mark.parametrize("changes", [
    {"startDate": None},
    {"estimatedFinishDate": None},
    {"estimatedFinishDate": "2019-12-31"},
    {"startDate": (date.today() + timedelta(days=1)).isoformat()},
    {"completed": True, "hasStarted": False},
    {"completed": True, "completionDate": "2019-12-31"},
])
def test_invalid_progress_is_rejected_without_a_write(harness, changes):
    before = dict(harness.lake.files)
    response = harness.client.patch("/v1/projects/GIS-0001/progress", json=progress_body(**changes))
    assert response.status_code == 422
    assert harness.lake.files == before


def test_a_stale_progress_editor_cannot_overwrite_a_new_start(harness):
    client = harness.client
    assert client.patch("/v1/projects/GIS-0001/progress", json=progress_body()).status_code == 200
    stale = client.patch(
        "/v1/projects/GIS-0001/progress",
        json=progress_body(estimatedFinishDate="2021-01-31"),
    )
    assert stale.status_code == 409
    assert client.get("/v1/projects/GIS-0001").json()["estimatedFinishDate"] == "2020-12-31"


def test_a_started_project_can_be_completed_but_not_reopened(harness):
    client = harness.client
    started = client.patch("/v1/projects/GIS-0001/progress", json=progress_body()).json()
    response = client.patch(
        "/v1/projects/GIS-0001/progress",
        json=progress_body(completed=True, completionDate="2020-10-01", expectedRevision=started["changeRevision"]),
    )
    assert response.status_code == 200
    completed = response.json()
    assert completed["completed"] is True
    assert completed["hasStarted"] is True
    assert completed["projectStatus"] == "Completed"
    assert completed["progressStatus"] == "completed"
    assert completed["completionDate"] == "2020-10-01"
    response = client.patch(
        "/v1/projects/GIS-0001/progress",
        json=progress_body(expectedRevision=completed["changeRevision"]),
    )
    assert response.status_code == 409


def test_pending_projects_have_the_same_progress_actions(harness):
    response = harness.client.patch("/v1/projects/GIS-0002/progress", json=progress_body())
    assert response.status_code == 200
    assert response.json()["status"] == harness.config.api.projects.statusPending
    assert response.json()["progressStatus"] == "started"


@pytest.mark.parametrize("status,progress,started", [
    ("Active", "started", True), ("On Hold", "started", True), ("Completed", "completed", True),
    ("Planning", "notStarted", False), ("Backlog", "notStarted", False), ("Unknown", "unconfirmed", None),
])
def test_legacy_statuses_are_normalized_without_inventing_dates(harness, status, progress, started):
    path = harness.services.paths.portfolio_export()
    harness.lake.files[path][0]["projects"][0]["projectStatus"] = status
    saved = harness.client.get("/v1/projects/GIS-0001").json()
    assert saved["progressStatus"] == progress
    assert saved["hasStarted"] is started
    assert saved["startDate"] is None
    assert saved["completionDate"] is None


def test_a_generic_edit_cannot_start_or_complete_work_without_dates(harness):
    for status in ["Active", "Completed"]:
        response = harness.client.patch("/v1/projects/GIS-0001", json={"projectStatus": status})
        assert response.status_code == 422
    assert harness.client.get("/v1/projects/GIS-0001").json()["progressStatus"] == "notStarted"


def test_progress_survives_other_field_changes(harness):
    client = harness.client
    started = client.patch("/v1/projects/GIS-0001/progress", json=progress_body()).json()
    changed = client.patch("/v1/projects/GIS-0001", json={"projectManager": "Another Owner"}).json()
    assert changed["hasStarted"] is True
    assert changed["startDate"] == started["startDate"]
    assert changed["changeRevision"] != started["changeRevision"]


def test_a_stale_recommendation_decision_is_blocked_after_work_starts(harness):
    services = harness.services
    services.decisions = DecisionService(
        entries=services.changes._entries, paths=services.paths, catalog=services.catalog,
        settings=harness.config.api.decisions, project_id_pattern=harness.config.data_entry.projectIdPattern,
    )
    assert harness.client.patch("/v1/projects/GIS-0001/progress", json=progress_body()).status_code == 200
    response = harness.client.post("/v1/decisions", json={
        "projectId": "GIS-0001", "decision": "Can wait", "reason": "Old recommendation to reprioritize this work.",
        "recommendation": True,
    })
    assert response.status_code == 409
    assert not services.decisions.list_decisions()


def test_a_stale_add_project_action_is_checked_against_pending_entries(harness):
    payload = {key: value for key, value in pending_entry(harness.config).items() if key not in {"projectId", "submittedAtUtc"}}
    payload["projectName"] = "pending identity - review"
    response = harness.client.post("/v1/projects?runPipeline=false&recommendation=true", json=payload)
    assert response.status_code == 409
    assert "GIS-0002" in response.json()["detail"]


def test_agent_inventory_includes_pending_and_started_records(harness):
    assert harness.client.patch("/v1/projects/GIS-0001/progress", json=progress_body()).status_code == 200
    inventory = {item["projectId"]: item for item in harness.services.catalog.agent_snapshot()["projects"]}
    assert inventory["GIS-0001"]["hasStarted"] is True
    assert inventory["GIS-0002"]["progressStatus"] == "notStarted"
    assert inventory["GIS-0002"]["priorityScore"] is None
