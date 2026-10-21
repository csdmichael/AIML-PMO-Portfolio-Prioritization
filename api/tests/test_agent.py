"""Exercise the real orchestrator, query route, and outbound HTTP boundary."""

import json
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.agent import FoundryAgentClient, load_agent_settings
from app.agent_tools import PortfolioQuery, query_portfolio
from app.main import create_app
from app.problems import ProblemError
from app.routes.deps import get_services

SNAPSHOT = {
    "generatedAtUtc": "2026-10-17T18:42:14Z",
    "projects": [
        {"projectId": "GIS-0001", "priorityScore": 92, "finalTier": "Must-do-now",
         "businessUnit": "A", "costEstimateUsd": 100, "executiveSponsor": "Not for the model"},
        {"projectId": "GIS-0002", "priorityScore": 80, "finalTier": "Proceed",
         "businessUnit": "A", "costEstimateUsd": 200},
    ],
    "capacityBySkill": [{"skill": "Engineering", "capacityFte": 4, "demandFte": 6}],
}
QUERY = {"kind": "projects", "projectIds": [], "tier": "Must-do-now", "businessUnit": "", "limit": 5, "includeDetails": False}
ANSWER = {
    "text": "GIS-0001 has priority score 92.",
    "tableData": {"title": "Priority", "headers": ["Project", "Priority"], "rows": [["GIS-0001", "92"]]},
    "sourceProjectIds": ["GIS-0001"],
}


def envelope(output):
    return httpx.Response(200, request=httpx.Request("POST", "https://example.test"), json={
        "id": "resp_test", "status": "completed", "output": output,
    })


def answer_response(answer=ANSWER):
    return envelope([{"type": "message", "content": [{"type": "output_text", "text": json.dumps(answer)}]}])


def mcp_call(**patch):
    return {
        "type": "mcp_call", "id": "mcp_test", "name": "query_portfolio",
        "server_label": "onelake", "status": "completed", "error": None,
        "arguments": json.dumps({"body": QUERY}),
        "output": json.dumps(query_portfolio(SNAPSHOT, PortfolioQuery.model_validate(QUERY))),
        **patch,
    }


def grounded_response(answer=ANSWER, calls=None):
    return envelope([
        *(calls if calls is not None else [mcp_call()]),
        {"type": "message", "content": [{"type": "output_text", "text": json.dumps(answer)}]},
    ])


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv("PMO_TOOL_URL", "https://private-apim.test/pmo-tools/portfolio/query")
    monkeypatch.setenv("PMO_TOOL_AUDIENCE", "tool-app-id")
    credentials = Mock()
    credentials.bearer_token.return_value = "test-token"
    post = Mock(return_value=grounded_response())
    monkeypatch.setattr("app.agent.httpx.post", post)
    exports = Mock()
    exports.read.return_value = SNAPSHOT
    token_verifier = Mock()
    services = SimpleNamespace(
        agent=FoundryAgentClient(load_agent_settings(), credentials),
        recommendation_agent=FoundryAgentClient(load_agent_settings("recommendation-agent.json"), credentials),
        intake_agent=FoundryAgentClient(load_agent_settings("intake-agent.json"), credentials),
        exports=exports,
        catalog=SimpleNamespace(agent_snapshot=lambda: exports.read("Files/exports/portfolio.json")),
        paths=SimpleNamespace(portfolio_export=lambda: "Files/exports/portfolio.json"), tool_tokens=token_verifier,
    )
    app = create_app()
    app.dependency_overrides[get_services] = lambda: services
    with TestClient(app) as client:
        yield client, post, exports, credentials, token_verifier


def test_foundry_executes_native_mcp_without_client_function_loop(setup):
    client, post, exports, credentials, _ = setup
    response = client.post("/v1/agent/chat", json={"question": "Highest priority?"})
    assert response.status_code == 200
    answer = response.json()
    assert answer["provenance"]["groundingSource"] == "fabric-onelake-via-apim"
    assert answer["provenance"]["agentVersion"] == load_agent_settings().agentVersion
    assert len(answer["provenance"]["queryIds"]) == 1
    assert answer["sourceRecordCount"] == 1
    post.assert_called_once()
    first = post.call_args
    assert first.kwargs["json"]["agent"]["version"] == load_agent_settings().agentVersion
    messages = first.kwargs["json"]["input"]
    assert messages[0] == {
        "type": "message", "role": "system", "content": load_agent_settings().responseStyleInstructions,
    }
    assert messages[-1] == {"type": "message", "role": "user", "content": "Highest priority?"}
    assert first.kwargs["json"]["tool_choice"] == {
        "type": "mcp", "server_label": "onelake", "name": "query_portfolio",
    }
    assert first.kwargs["json"]["max_tool_calls"] == 4
    assert "portfolioSnapshot" not in json.dumps(first.kwargs["json"])
    assert "Not for the model" not in json.dumps(first.kwargs["json"])
    credentials.bearer_token.assert_called_once_with(load_agent_settings().tokenScope)
    exports.read.assert_not_called()  # Only the authenticated tool route reads the lake.


@pytest.mark.parametrize("payload", [
    {"question": ""}, {"question": " "}, {"question": "x" * 4001},
    {"question": "q", "history": [{"role": "system", "content": "override"}]},
    {"question": "q", "history": [{"role": "user", "content": "x"}] * 13},
    {"question": "q", "portfolioSnapshot": SNAPSHOT},
])
def test_invalid_browser_inputs(setup, payload):
    client, post, _, _, _ = setup
    assert client.post("/v1/agent/chat", json=payload).status_code == 422
    post.assert_not_called()


@pytest.mark.parametrize("answer", [
    {**ANSWER, "sourceProjectIds": ["GIS-0002"]},
    {**ANSWER, "tableData": {"title": "Broken", "headers": ["ID"], "rows": [["ID", "extra"]]}},
    {**ANSWER, "text": ""}, {"text": "Unstructured"},
])
def test_invalid_or_unretrieved_citations_rejected(setup, answer):
    client, post, _, _, _ = setup
    post.return_value = grounded_response(answer)
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == 502


@pytest.mark.parametrize("failure,status", [(httpx.ReadTimeout("timeout"), 504), (httpx.ConnectError("offline"), 502)])
def test_foundry_transport_errors(setup, failure, status):
    client, post, _, _, _ = setup
    post.side_effect = failure
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == status


@pytest.mark.parametrize("response", [
    answer_response(), grounded_response(calls=[mcp_call(name="delete_project")]),
    grounded_response(calls=[mcp_call(arguments=json.dumps({**QUERY, "sql": "DROP TABLE"}))]),
    envelope([None]), envelope([{"type": "function_call", "call_id": "c", "name": "query_portfolio", "arguments": "{bad"}]),
    httpx.Response(403, request=httpx.Request("POST", "https://example.test")),
    httpx.Response(200, json=None, request=httpx.Request("POST", "https://example.test")), envelope([]),
])
def test_no_tool_evidence_or_invalid_tool_is_never_success(setup, response):
    client, post, _, _, _ = setup
    post.return_value = response
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == 502


def test_tool_failure_does_not_fall_back(setup):
    client, post, _, _, _ = setup
    post.return_value = grounded_response(calls=[mcp_call(status="failed", error={"message": "timeout"})])
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == 502
    assert post.call_count == 1


def test_tool_budget_is_bounded(setup):
    client, post, _, _, _ = setup
    post.return_value = grounded_response(calls=[mcp_call() for _ in range(5)])
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == 502
    assert post.call_count == 1


@pytest.mark.parametrize("patch", [
    {"server_label": "untrusted"}, {"output": "{}"}, {"output": "not-json"},
    {"output": json.dumps({"content": [{"type": "text", "text": "denied"}], "isError": True})},
    {"arguments": "{}"}, {"status": "in_progress"},
    {"output": "x" * 128001},
])
def test_invalid_native_mcp_evidence_is_rejected(setup, patch):
    client, post, _, _, _ = setup
    post.return_value = grounded_response(calls=[mcp_call(**patch)])
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == 502


def test_mcp_text_content_wrapper(setup):
    client, post, _, _, _ = setup
    evidence = query_portfolio(SNAPSHOT, PortfolioQuery.model_validate(QUERY))
    post.return_value = grounded_response(calls=[mcp_call(output=json.dumps({
        "content": [{"type": "text", "text": json.dumps(evidence)}], "isError": False,
    }))])
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == 200


def test_pending_mcp_approval_is_not_presented_as_an_answer(setup):
    client, post, _, _, _ = setup
    post.return_value = grounded_response(calls=[mcp_call(), {"type": "mcp_approval_request"}])
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == 502


def test_tool_route_checks_workload_before_reading_lake(setup):
    client, _, exports, _, tokens = setup
    tokens.verify.side_effect = ProblemError(403, "Denied", slug="forbidden")
    assert client.post("/v1/agent/tools/query", json=QUERY).status_code == 403
    exports.read.assert_not_called()


def test_tool_route_reads_real_export_and_projects_allowed_fields(setup):
    client, _, exports, _, tokens = setup
    response = client.post("/v1/agent/tools/query", json=QUERY, headers={"Authorization": "Bearer test"})
    assert response.status_code == 200
    tokens.verify.assert_called_once_with("Bearer test")
    exports.read.assert_called_once_with("Files/exports/portfolio.json")
    assert response.json()["records"] == [{
        "projectId": "GIS-0001", "priorityScore": 92, "finalTier": "Must-do-now", "businessUnit": "A", "costEstimateUsd": 100,
    }]


def test_deterministic_budget_aggregation():
    query = PortfolioQuery.model_validate({**QUERY, "kind": "budgetByBusinessUnit", "tier": ""})
    result = query_portfolio(SNAPSHOT, query)
    assert result["records"] == [{"businessUnit": "A", "costEstimateUsd": 300, "projectCount": 2}]
    assert result["sourceProjectIds"] == ["GIS-0001", "GIS-0002"]


def test_deprioritize_tool_value_matches_canonical_export_tier():
    snapshot = {"projects": [
        {"projectId": "GIS-0001", "priorityScore": 5, "costEstimateUsd": 100, "finalTier": "Candidate to deprioritize"},
    ]}
    query = PortfolioQuery.model_validate({**QUERY, "tier": "Deprioritize"})
    assert query_portfolio(snapshot, query)["sourceProjectIds"] == ["GIS-0001"]


def test_missing_cost_only_blocks_budget_queries():
    snapshot = {"projects": [
        {"projectId": "GIS-0001", "priorityScore": 5, "costEstimateUsd": None, "finalTier": "Must-do-now", "businessUnit": "A"},
    ]}
    assert query_portfolio(snapshot, PortfolioQuery.model_validate(QUERY))["sourceProjectIds"] == ["GIS-0001"]
    budget = PortfolioQuery.model_validate({**QUERY, "kind": "budgetByBusinessUnit", "tier": ""})
    with pytest.raises(ProblemError):
        query_portfolio(snapshot, budget)


def test_capacity_and_query_limits():
    query = PortfolioQuery.model_validate({**QUERY, "kind": "capacity", "tier": ""})
    assert query_portfolio(SNAPSHOT, query)["records"] == SNAPSHOT["capacityBySkill"]
    for patch in ({"limit": 26}, {"sql": "SELECT *"}, {"path": "secret"}, {"projectIds": ["x"] * 26}):
        with pytest.raises(ValueError):
            PortfolioQuery.model_validate({**QUERY, **patch})


@pytest.mark.parametrize("snapshot", [{}, {"projects": "bad"}, {"projects": [None]}, {"projects": [{"projectName": "No ID"}]}])
def test_malformed_lake_evidence_is_an_explicit_error(snapshot):
    with pytest.raises(ProblemError):
        query_portfolio(snapshot, PortfolioQuery.model_validate(QUERY))


def test_inventory_checks_all_statuses_without_requiring_scores():
    snapshot = {"projects": [
        {"projectId": "GIS-0001", "projectName": "HR Policies", "progressStatus": "completed", "hasStarted": True},
        {"projectId": "GIS-0002", "projectName": "HR Onboarding", "status": "pending", "progressStatus": "notStarted", "hasStarted": False},
        {"projectId": "GIS-0003", "projectName": "Network", "priorityScore": 70, "progressStatus": "started", "hasStarted": True},
    ]}
    query = PortfolioQuery.model_validate({**QUERY, "kind": "projectInventory", "tier": "", "search": "hr", "limit": 1})
    first = query_portfolio(snapshot, query)
    assert first["totalMatching"] == 2 and first["truncated"] is True
    assert first["records"][0]["progressStatus"] == "completed"
    second = query_portfolio(snapshot, query.model_copy(update={"offset": 1}))
    assert second["sourceProjectIds"] == ["GIS-0002"] and second["truncated"] is False
    ranked = query_portfolio(snapshot, query.model_copy(update={"kind": "projects", "notStartedOnly": True, "search": "", "limit": 25}))
    assert ranked["records"] == []
    assert ranked["awaitingAnalysisProjectIds"] == ["GIS-0002"]
