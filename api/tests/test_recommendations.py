import copy
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.agent import FoundryAgentClient, load_agent_settings
from app.config import load_config
from app.main import create_app
from app.routes.deps import get_services
from tests.agent_doubles import agent_reply

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


@pytest.fixture
def harness(monkeypatch):
    credentials = Mock()
    credentials.bearer_token.return_value = "test-token"
    catalog = Mock()
    catalog.portfolios.return_value = [
        {"key": "it-infosec", "displayName": "IT - InfoSec", "programs": [{"key": "cloud-program", "displayName": "Cloud"}]},
    ]
    services = SimpleNamespace(
        config=load_config(),
        catalog=catalog,
        recommendation_agent=FoundryAgentClient(load_agent_settings("recommendation-agent.json"), credentials),
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
