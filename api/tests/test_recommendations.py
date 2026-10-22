import copy
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.agent import FoundryAgentClient, load_agent_settings
from app.config import load_config
from app.container import build_services
from app.lake_paths import LakePaths
from app.main import create_app
from app.onelake import LakeUnavailable
from app.recommendation_cache import RecommendationCache
from app.routes.deps import get_services
from tests.agent_doubles import agent_reply
from tests.lake_doubles import MemoryLake

REPORT = {
    "title": "Portfolio recommendations",
    "summary": "GIS-0002 ranks below the evidence for its cloud skill demand.",
    "sections": [
        {
            "id": "existing-priority",
            "title": "Priority changes",
            "description": "Existing projects whose ranking the evidence questions.",
            "items": [
                {
                    "id": "rec-1",
                    "title": "Review GIS-0002",
                    "summary": "Priority score 60 in the Can wait tier.",
                    "badges": ["Can wait"],
                    "metrics": [{"label": "Priority score", "value": "60"}],
                    "sourceProjectIds": ["GIS-0002"],
                    "sourceUrls": ["https://example.org/segmentation"],
                    "actions": [
                        {
                            "id": "decide-1",
                            "label": "Record decision",
                            "type": "recordDecision",
                            "payload": {
                                "projectId": "GIS-0002",
                                "decision": "Can wait",
                                "reason": "Keep the ranking; the evidence shows priority score 60.",
                            },
                        }
                    ],
                }
            ],
        }
    ],
    "sourceProjectIds": ["GIS-0002"],
    "sourceUrls": ["https://example.org/segmentation"],
}

INVENTORY = {"projects": [
    {"projectId": "GIS-0002", "projectName": "Cloud Segmentation", "portfolioKey": "it-infosec",
     "progressStatus": "notStarted", "hasStarted": False, "completed": False},
    {"projectId": "GIS-0003", "projectName": "HR Policies Website", "portfolioKey": "it-infosec",
     "progressStatus": "started", "hasStarted": True, "completed": False},
]}


@pytest.fixture
def lake():
    return MemoryLake()


@pytest.fixture
def harness(monkeypatch, lake):
    credentials = Mock()
    credentials.bearer_token.return_value = "test-token"
    catalog = Mock()
    catalog.agent_snapshot.return_value = copy.deepcopy(INVENTORY)
    catalog.export.side_effect = lambda: catalog.agent_snapshot.return_value
    catalog.portfolios.return_value = [
        {"key": "it-infosec", "displayName": "IT - InfoSec", "programs": [{"key": "cloud-program", "displayName": "Cloud"}]},
    ]
    config = load_config()
    services = SimpleNamespace(
        config=config,
        catalog=catalog,
        recommendation_agent=FoundryAgentClient(load_agent_settings("recommendation-agent.json"), credentials),
        recommendation_cache=RecommendationCache(lake=lake, paths=LakePaths(config), state_provider=catalog.export),
    )
    post = Mock(return_value=agent_reply(copy.deepcopy(REPORT)))
    monkeypatch.setattr("app.agent.httpx.post", post)
    app = create_app()
    app.dependency_overrides[get_services] = lambda: services
    with TestClient(app) as client:
        yield client, post


def sent_messages(post):
    return post.call_args.kwargs["json"]["input"]


def test_report_is_the_agent_output_with_provenance(harness):
    client, post = harness
    response = client.get("/v1/recommendations")
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == REPORT["title"]
    assert [section["id"] for section in body["sections"]] == ["existing-priority"]
    assert body["sections"][0]["items"][0]["title"] == "Review GIS-0002"
    assert body["sourceProjectIds"] == ["GIS-0002"]
    assert body["sourceUrls"] == ["https://example.org/segmentation"]
    assert body["sections"][0]["items"][0]["sourceUrls"] == ["https://example.org/segmentation"]
    assert body["portfolioKey"] is None
    assert body["provenance"]["agentName"] == "pmo-recommendation-agent"
    assert body["provenance"]["responseId"] == "resp_test"
    assert body["provenance"]["webSearches"] == 1
    assert len(body["provenance"]["queryIds"]) == 1
    assert "insights" not in body and "newProjectSuggestions" not in body
    system, user = sent_messages(post)
    assert system["role"] == "system" and "query_portfolio" in system["content"]
    assert "Portfolio filter: All portfolios" in user["content"]
    assert "Research focus: Review every portfolio." in user["content"]
    assert '"decisionTiers"' in user["content"]


def test_portfolio_filter_and_research_question_reach_the_agent(harness):
    client, post = harness
    response = client.post(
        "/v1/recommendations/research",
        json={"query": "Where are the cloud skill gaps?", "portfolioKey": "it-infosec"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["query"] == "Where are the cloud skill gaps?"
    assert body["portfolioKey"] == "it-infosec"
    _, user = sent_messages(post)
    assert "Portfolio filter: it-infosec" in user["content"]
    assert "Research focus: Where are the cloud skill gaps?" in user["content"]


def test_cited_projects_must_come_from_the_tool(harness):
    client, post = harness
    post.return_value = agent_reply({**copy.deepcopy(REPORT), "sourceProjectIds": ["GIS-9999"]})
    response = client.get("/v1/recommendations")
    assert response.status_code == 502
    assert "did not return" in response.json()["detail"]


def test_decision_actions_must_target_a_retrieved_project(harness):
    client, post = harness
    report = copy.deepcopy(REPORT)
    report["sections"][0]["items"][0]["actions"][0]["payload"]["projectId"] = "GIS-9999"
    post.return_value = agent_reply(report)
    assert client.get("/v1/recommendations").status_code == 502


def test_recommendations_must_search_the_web(harness):
    client, post = harness
    post.return_value = agent_reply(copy.deepcopy(REPORT), web=False)
    assert client.get("/v1/recommendations").status_code == 502


def test_malformed_web_sources_are_dropped(harness):
    client, post = harness
    report = copy.deepcopy(REPORT)
    report["sourceUrls"] = ["javascript:alert(1)", "https://example.org/segmentation"]
    report["sections"][0]["items"][0]["sourceUrls"] = ["ftp://files.example.org/x"]
    post.return_value = agent_reply(report)
    body = client.get("/v1/recommendations").json()
    assert body["sourceUrls"] == ["https://example.org/segmentation"]
    assert body["sections"][0]["items"][0]["sourceUrls"] == []


def test_agent_outage_is_an_error_not_canned_text(harness):
    client, post = harness
    post.side_effect = httpx.ConnectError("offline")
    response = client.post("/v1/recommendations/research", json={"query": "Which projects should move up?"})
    assert response.status_code == 502
    assert "answer" not in response.json()
    assert "4.4" not in response.text


def test_report_is_trimmed_to_configured_limits(harness):
    client, post = harness
    limits = load_config().recommendations.limits
    item = REPORT["sections"][0]["items"][0]
    sections = [
        {"id": f"section-{index}", "title": f"Section {index}", "items": [item] * (limits.maxItemsPerSection + 3)}
        for index in range(limits.maxSections + 2)
    ]
    post.return_value = agent_reply({**REPORT, "sections": sections})
    body = client.get("/v1/recommendations").json()
    assert len(body["sections"]) == limits.maxSections
    assert all(len(section["items"]) == limits.maxItemsPerSection for section in body["sections"])


def test_cache_miss_returns_null_without_running_the_agent(harness):
    client, post = harness
    response = client.get("/v1/recommendations/cached")
    assert response.status_code == 200
    assert response.json() is None
    post.assert_not_called()


def test_cached_lookup_reads_the_register_once_without_rechecking_policy(harness):
    client, _ = harness
    client.get("/v1/recommendations")
    catalog = client.app.dependency_overrides[get_services]().catalog
    catalog.agent_snapshot.reset_mock()
    catalog.export.reset_mock()
    assert client.get("/v1/recommendations/cached").json() is not None
    catalog.agent_snapshot.assert_not_called()
    assert catalog.export.call_count == 1


def test_report_is_persisted_and_can_be_read_after_rebuilding_the_cache(harness, lake):
    client, post = harness
    fresh = client.get("/v1/recommendations").json()
    post.reset_mock()
    response = client.get("/v1/recommendations/cached")
    assert response.status_code == 200
    assert response.json() == fresh
    post.assert_not_called()

    config = load_config()
    rebuilt = RecommendationCache(lake=lake, paths=LakePaths(config), state_provider=lambda: INVENTORY)
    assert rebuilt.read(portfolio_key=None, query=None) == fresh
    assert all(path.startswith(config.recommendations.cache.oneLakeFolder + "/") for path in lake.files)


def test_caches_are_separate_for_portfolios_and_research_questions(harness, lake):
    client, _ = harness
    default = client.get("/v1/recommendations").json()
    scoped = client.get("/v1/recommendations", params={"portfolioKey": "it-infosec"}).json()
    researched = client.post(
        "/v1/recommendations/research",
        json={"query": "  Which cloud projects need attention?  ", "portfolioKey": "it-infosec"},
    ).json()
    assert len(lake.files) == 3
    assert client.get("/v1/recommendations/cached").json() == default
    assert client.get("/v1/recommendations/cached", params={"portfolioKey": "it-infosec"}).json() == scoped
    assert client.get(
        "/v1/recommendations/cached",
        params={"portfolioKey": "it-infosec", "query": "Which cloud projects need attention?"},
    ).json() == researched
    assert client.get("/v1/recommendations/cached", params={"portfolioKey": "other-portfolio"}).json() is None
    assert client.get(
        "/v1/recommendations/cached", params={"query": "Which cloud projects need attention?"},
    ).json() is None


def test_refresh_always_runs_the_agent_and_replaces_the_saved_report(harness, lake):
    client, post = harness
    client.get("/v1/recommendations")
    post.return_value = agent_reply({**copy.deepcopy(REPORT), "summary": "Updated evidence supports a new review."})
    fresh = client.get("/v1/recommendations").json()
    assert post.call_count == 2
    assert fresh["summary"] == "Updated evidence supports a new review."
    assert client.get("/v1/recommendations/cached").json() == fresh
    assert len(lake.files) == 1


@pytest.mark.parametrize("failure", ["outage", "ungrounded"])
def test_failed_refresh_never_replaces_the_saved_report(harness, failure):
    client, post = harness
    saved = client.get("/v1/recommendations").json()
    if failure == "outage":
        post.side_effect = httpx.ConnectError("offline")
    else:
        post.return_value = agent_reply({**copy.deepcopy(REPORT), "sourceProjectIds": ["GIS-9999"]})
    assert client.get("/v1/recommendations").status_code == 502
    assert client.get("/v1/recommendations/cached").json() == saved


def test_invalid_saved_report_is_an_error_not_a_cache_miss(harness, lake):
    client, _ = harness
    client.get("/v1/recommendations")
    path = next(iter(lake.files))
    record, etag = lake.files[path]
    lake.files[path] = ({**record, "sections": "corrupt"}, etag)
    response = client.get("/v1/recommendations/cached")
    assert response.status_code == 502
    assert "saved recommendation report is invalid" in response.json()["detail"]


def test_saved_report_cannot_leak_from_another_scope(harness, lake):
    client, _ = harness
    client.get("/v1/recommendations")
    path = next(iter(lake.files))
    record, etag = lake.files[path]
    lake.files[path] = ({**record, "portfolioKey": "other-portfolio"}, etag)
    assert client.get("/v1/recommendations/cached").status_code == 502


def test_lake_read_and_write_failures_are_reported(harness, lake, monkeypatch):
    client, post = harness

    def unavailable(*args, **kwargs):
        raise LakeUnavailable("OneLake could not be reached")

    monkeypatch.setattr(lake, "read_json", unavailable)
    assert client.get("/v1/recommendations/cached").status_code == 503
    post.assert_not_called()
    monkeypatch.setattr(lake, "write_json", unavailable)
    assert client.get("/v1/recommendations").status_code == 503


def test_a_dataset_reset_invalidates_every_old_scope_without_deleting_snapshots(harness, lake):
    client, _ = harness
    client.get("/v1/recommendations")
    client.get("/v1/recommendations", params={"portfolioKey": "it-infosec"})
    path = LakePaths(load_config()).project_resets()
    lake.write_json(path, {"revision": "new-dataset"})
    assert client.get("/v1/recommendations/cached").json() is None
    assert client.get("/v1/recommendations/cached", params={"portfolioKey": "it-infosec"}).json() is None
    fresh = client.get("/v1/recommendations").json()
    assert client.get("/v1/recommendations/cached").json() == fresh
    assert len(lake.files) == 4


def test_an_agent_run_started_before_a_reset_cannot_publish_to_the_new_dataset_cache(harness, lake):
    client, post = harness
    path = LakePaths(load_config()).project_resets()

    def reset_during_agent_run(*args, **kwargs):
        lake.write_json(path, {"revision": "new-dataset"})
        return agent_reply(copy.deepcopy(REPORT))

    post.side_effect = reset_during_agent_run
    response = client.get("/v1/recommendations")
    assert response.status_code == 409
    assert client.get("/v1/recommendations/cached").json() is None


def inventory_for(client):
    return client.app.dependency_overrides[get_services]().catalog.agent_snapshot.return_value


@pytest.mark.parametrize("state", ["started", "completed", "unconfirmed"])
def test_existing_recommendations_never_target_committed_or_unconfirmed_work(harness, state):
    client, _ = harness
    project = inventory_for(client)["projects"][0]
    project.update(progressStatus=state, hasStarted=True if state != "unconfirmed" else None, completed=state == "completed")
    response = client.get("/v1/recommendations")
    assert response.status_code == 502
    assert "Only confirmed not-started" in response.json()["detail"]
    assert client.get("/v1/recommendations/cached").json() is None


def test_started_context_is_not_allowed_as_an_actionless_existing_project_recommendation(harness):
    client, post = harness
    report = copy.deepcopy(REPORT)
    report["sections"][0]["items"][0]["actions"] = []
    inventory_for(client)["projects"][0].update(progressStatus="started", hasStarted=True)
    post.return_value = agent_reply(report)
    assert client.get("/v1/recommendations").status_code == 502


def test_new_project_duplicates_are_rejected_across_started_work_and_punctuation(harness):
    client, post = harness
    report = copy.deepcopy(REPORT)
    report["sections"][0]["items"][0]["actions"] = [{
        "id": "add", "label": "Add project", "type": "addProject",
        "payload": {"projectName": " HR  Policies - Website! ", "projectStatus": "Planning"},
    }]
    post.return_value = agent_reply(report)
    response = client.get("/v1/recommendations")
    assert response.status_code == 502
    assert "already exists as GIS-0003" in response.json()["detail"]


def test_progress_and_inventory_changes_invalidate_saved_reports(harness):
    client, _ = harness
    assert client.get("/v1/recommendations").status_code == 200
    inventory_for(client)["projects"][0].update(progressStatus="started", hasStarted=True)
    assert client.get("/v1/recommendations/cached").json() is None


def test_a_start_during_generation_cannot_publish_a_report(harness):
    client, post = harness

    def start_during_run(*args, **kwargs):
        inventory_for(client)["projects"][1]["estimatedFinishDate"] = "2027-01-01"
        return agent_reply(copy.deepcopy(REPORT))

    post.side_effect = start_during_run
    assert client.get("/v1/recommendations").status_code == 409
    assert client.get("/v1/recommendations/cached").json() is None


def test_the_production_cache_reads_the_cached_register_view():
    services = build_services()
    assert services.recommendation_cache._state_provider == services.catalog.export
