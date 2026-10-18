"""Exercise the real orchestrator, query route, and outbound HTTP boundary."""

import json
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.agent import FoundryAgentClient, load_agent_settings
from app.agent_tools import ApimPortfolioTool, PortfolioQuery, query_portfolio
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


def evidence_response():
    return httpx.Response(200, json=query_portfolio(SNAPSHOT, PortfolioQuery.model_validate(QUERY)),
                          request=httpx.Request("POST", "https://private-apim.test"))


def tool_response(name="query_portfolio", arguments=None):
    return envelope([{"type": "function_call", "call_id": "call_test", "name": name,
                      "arguments": json.dumps(arguments if arguments is not None else QUERY)}])


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.setenv("PMO_TOOL_URL", "https://private-apim.test/pmo-tools/portfolio/query")
    monkeypatch.setenv("PMO_TOOL_AUDIENCE", "tool-app-id")
    credentials = Mock()
    credentials.bearer_token.return_value = "test-token"
    tools = ApimPortfolioTool(credentials)
    evidence = query_portfolio(SNAPSHOT, PortfolioQuery.model_validate(QUERY))
    post = Mock(side_effect=[
        tool_response(),
        httpx.Response(200, json=evidence, request=httpx.Request("POST", tools.url)),
        answer_response(),
    ])
    monkeypatch.setattr("app.agent.httpx.post", post)
    exports = Mock()
    exports.read.return_value = SNAPSHOT
    token_verifier = Mock()
    services = SimpleNamespace(
        agent=FoundryAgentClient(load_agent_settings(), credentials, tools), exports=exports,
        paths=SimpleNamespace(portfolio_export=lambda: "Files/exports/portfolio.json"), tool_tokens=token_verifier,
    )
    app = create_app()
    app.dependency_overrides[get_services] = lambda: services
    with TestClient(app) as client:
        yield client, post, exports, credentials, token_verifier


def test_foundry_tool_loop_uses_apim_and_never_injects_full_snapshot(setup):
    client, post, exports, credentials, _ = setup
    response = client.post("/v1/agent/chat", json={"question": "Highest priority?"})
    assert response.status_code == 200
    answer = response.json()
    assert answer["provenance"]["groundingSource"] == "fabric-onelake-via-apim"
    assert answer["provenance"]["agentVersion"] == "2"
    assert len(answer["provenance"]["queryIds"]) == 1
    assert answer["sourceRecordCount"] == 1
    first, query, final = post.call_args_list
    assert first.kwargs["json"]["agent"]["version"] == "2"
    assert first.kwargs["json"]["input"][0] == {"role": "user", "content": "Highest priority?"}
    assert first.kwargs["json"]["tool_choice"]["name"] == "query_portfolio"
    assert query.args[0] == "https://private-apim.test/pmo-tools/portfolio/query"
    assert query.kwargs["follow_redirects"] is False
    assert query.kwargs["json"] == QUERY
    assert "portfolioSnapshot" not in json.dumps(final.kwargs["json"])
    assert "Not for the model" not in json.dumps(final.kwargs["json"])
    assert "GIS-0002" not in json.dumps(final.kwargs["json"])
    credentials.bearer_token.assert_any_call("api://tool-app-id/.default")
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
    post.side_effect = [tool_response(), evidence_response(),
                        answer_response(answer)]
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == 502


@pytest.mark.parametrize("failure,status", [(httpx.ReadTimeout("timeout"), 504), (httpx.ConnectError("offline"), 502)])
def test_foundry_transport_errors(setup, failure, status):
    client, post, _, _, _ = setup
    post.side_effect = failure
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == status


@pytest.mark.parametrize("response", [
    answer_response(), tool_response("delete_project"), tool_response(arguments={**QUERY, "sql": "DROP TABLE"}),
    envelope([None]), envelope([{"type": "function_call", "call_id": "c", "name": "query_portfolio", "arguments": "{bad"}]),
    httpx.Response(403, request=httpx.Request("POST", "https://example.test")),
    httpx.Response(200, json=None, request=httpx.Request("POST", "https://example.test")), envelope([]),
])
def test_no_tool_evidence_or_invalid_tool_is_never_success(setup, response):
    client, post, _, _, _ = setup
    post.side_effect = [response]
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == 502


def test_tool_failure_does_not_fall_back(setup):
    client, post, _, _, _ = setup
    post.side_effect = [tool_response(), httpx.ReadTimeout("tool timeout")]
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == 504
    assert post.call_count == 2


def test_tool_budget_is_bounded(setup):
    client, post, _, _, _ = setup
    tool_result = evidence_response()
    post.side_effect = [tool_response(), tool_result] * 3 + [tool_response()]
    assert client.post("/v1/agent/chat", json={"question": "Top?"}).status_code == 502
    assert post.call_count == 7


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
