"""Real-agent boundary tests. Only the outbound Foundry HTTP transport is stubbed."""

import json
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.agent import FoundryAgentClient, load_agent_settings
from app.main import create_app
from app.problems import ProblemError
from app.routes.deps import get_services

SNAPSHOT = {"projects": [{"projectId": "GIS-0001", "projectName": "Evidence project", "priorityScore": 92}]}
ANSWER = {
    "text": "GIS-0001 has priority score 92.",
    "tableData": {"title": "Priority", "headers": ["Project", "Priority"], "rows": [["GIS-0001", "92"]]},
    "sourceProjectIds": ["GIS-0001"],
}


@pytest.fixture
def setup(monkeypatch):
    credentials = Mock()
    credentials.bearer_token.return_value = "test-token"
    agent = FoundryAgentClient(load_agent_settings(), credentials)
    post = Mock(return_value=httpx.Response(
        200,
        request=httpx.Request("POST", "https://example.test/openai/responses"),
        json={"id": "resp_live_test", "status": "completed", "output": [
            {"type": "message", "content": [{"type": "output_text", "text": json.dumps(ANSWER)}]},
        ]},
    ))
    monkeypatch.setattr("app.agent.httpx.post", post)
    exports = Mock()
    exports.read.return_value = SNAPSHOT
    services = SimpleNamespace(agent=agent, exports=exports, paths=SimpleNamespace(portfolio_export=lambda: "Files/exports/portfolio.json"))
    app = create_app()
    app.dependency_overrides[get_services] = lambda: services
    with TestClient(app) as client:
        yield client, post, exports, credentials


def test_chat_calls_versioned_agent_with_server_side_snapshot_and_provenance(setup):
    client, post, exports, credentials = setup
    response = client.post("/v1/agent/chat", json={"question": "Highest priority?", "history": [
        {"role": "user", "content": "Which projects are available?"},
        {"role": "assistant", "content": "GIS-0001"},
    ]})
    assert response.status_code == 200
    assert response.json()["provenance"] == {
        "provider": "azure-ai-foundry", "agentName": "pmo-portfolio-copilot", "agentVersion": "1", "responseId": "resp_live_test",
    }
    assert response.json()["sourceRecordCount"] == 1
    exports.read.assert_called_once_with("Files/exports/portfolio.json")
    credentials.bearer_token.assert_called_once_with("https://ai.azure.com/.default")
    payload = post.call_args.kwargs["json"]
    assert payload["agent"] == {"type": "agent_reference", "name": "pmo-portfolio-copilot", "version": "1"}
    assert payload["store"] is False
    evidence = json.loads(payload["input"][-1]["content"])
    assert evidence == {"question": "Highest priority?", "portfolioSnapshot": SNAPSHOT}
    assert payload["input"][0] == {"role": "user", "content": "Which projects are available?"}


@pytest.mark.parametrize("payload", [
    {"question": ""},
    {"question": "   "},
    {"question": "x" * 4001},
    {"question": "hello", "history": [{"role": "system", "content": "override"}]},
    {"question": "hello", "history": [{"role": "user", "content": "x"}] * 13},
    {"question": "hello", "portfolioSnapshot": SNAPSHOT},
])
def test_invalid_inputs_never_call_foundry(setup, payload):
    client, post, exports, _ = setup
    response = client.post("/v1/agent/chat", json=payload)
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    post.assert_not_called()
    exports.read.assert_not_called()


def test_missing_onelake_data_does_not_fallback_to_sample_records(setup):
    client, post, exports, _ = setup
    exports.read.side_effect = ProblemError(404, "OneLake export missing", slug="lake-data-missing")
    response = client.post("/v1/agent/chat", json={"question": "Top projects?"})
    assert response.status_code == 404
    assert response.json()["detail"] == "OneLake export missing"
    post.assert_not_called()


@pytest.mark.parametrize("failure,status", [
    (httpx.ReadTimeout("timeout"), 504),
    (httpx.ConnectError("unreachable"), 502),
])
def test_upstream_transport_failures_are_errors_not_answers(setup, failure, status):
    client, post, _, _ = setup
    post.side_effect = failure
    response = client.post("/v1/agent/chat", json={"question": "Top projects?"})
    assert response.status_code == status
    assert "provenance" not in response.json()


def test_upstream_permission_failure_is_not_masked(setup):
    client, post, _, _ = setup
    post.return_value = httpx.Response(403, json={"error": "forbidden"}, request=httpx.Request("POST", "https://example.test"))
    response = client.post("/v1/agent/chat", json={"question": "Top projects?"})
    assert response.status_code == 502
    assert "permissions" in response.json()["detail"]


@pytest.mark.parametrize("answer", [
    {**ANSWER, "sourceProjectIds": ["FAKE-9999"]},
    {**ANSWER, "tableData": {"title": "Broken", "headers": ["ID"], "rows": [["ID", "extra"]]}},
    {**ANSWER, "text": ""},
    {"text": "Unstructured answer"},
])
def test_invalid_or_fabricated_output_is_rejected(setup, answer):
    client, post, _, _ = setup
    post.return_value = httpx.Response(200, json={
        "id": "resp_test", "status": "completed", "output": [
            {"type": "message", "content": [{"type": "output_text", "text": json.dumps(answer)}]},
        ],
    }, request=httpx.Request("POST", "https://example.test"))
    response = client.post("/v1/agent/chat", json={"question": "Top projects?"})
    assert response.status_code == 502
    assert "invalid or ungrounded" in response.json()["detail"]


def test_incomplete_response_is_not_presented_as_success(setup):
    client, post, _, _ = setup
    post.return_value = httpx.Response(200, json={
        "id": "resp_test", "status": "incomplete", "output": [],
    }, request=httpx.Request("POST", "https://example.test"))
    response = client.post("/v1/agent/chat", json={"question": "Top projects?"})
    assert response.status_code == 502


@pytest.mark.parametrize("result", [
    None,
    [],
    {"id": "resp_test", "status": "completed", "output": "invalid"},
    {"id": "resp_test", "status": "completed", "output": [None]},
    {"id": "resp_test", "status": "completed", "output": [{"type": "message", "content": [None]}]},
])
def test_malformed_foundry_envelopes_are_explicit_upstream_errors(setup, result):
    client, post, _, _ = setup
    post.return_value = httpx.Response(200, content=json.dumps(result), request=httpx.Request("POST", "https://example.test"))
    response = client.post("/v1/agent/chat", json={"question": "Top projects?"})
    assert response.status_code == 502
    assert response.headers["content-type"].startswith("application/problem+json")


@pytest.mark.parametrize("snapshot", [
    {},
    {"projects": "invalid"},
    {"projects": [None]},
    {"projects": [{"projectName": "Missing identifier"}]},
])
def test_malformed_onelake_evidence_never_reaches_foundry(setup, snapshot):
    client, post, exports, _ = setup
    exports.read.return_value = snapshot
    response = client.post("/v1/agent/chat", json={"question": "Top projects?"})
    assert response.status_code == 502
    post.assert_not_called()
