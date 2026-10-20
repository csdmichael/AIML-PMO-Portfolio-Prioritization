"""Foundry replies for tests. Each reply carries a real OneLake tool result, so the evidence checks run as in production."""

import json
from typing import Any

import httpx

from app.agent_tools import PortfolioQuery, query_portfolio

SNAPSHOT = {
    "generatedAtUtc": "2026-10-17T18:42:14Z",
    "projects": [
        {
            "projectId": "GIS-0001", "projectName": "Edge Network Segmentation", "portfolio": "IT - InfoSec",
            "businessUnit": "A", "finalTier": "Must-do-now", "priorityScore": 92, "costEstimateUsd": 100,
        },
        {
            "projectId": "GIS-0002", "projectName": "Cleanroom IoT", "portfolio": "IT - InfoSec",
            "businessUnit": "A", "finalTier": "Can wait", "priorityScore": 60, "costEstimateUsd": 200,
        },
    ],
    "capacityBySkill": [{"skill": "CLOUD", "capacityFte": 4, "demandFte": 6}],
}
QUERY = {"kind": "projects", "projectIds": [], "tier": "", "businessUnit": "", "limit": 5, "includeDetails": False}


def tool_call() -> dict[str, Any]:
    return {
        "type": "mcp_call", "id": "mcp_test", "name": "query_portfolio", "server_label": "onelake",
        "status": "completed", "error": None,
        "arguments": json.dumps({"body": QUERY}),
        "output": json.dumps(query_portfolio(SNAPSHOT, PortfolioQuery.model_validate(QUERY))),
    }


def bing_call() -> dict[str, Any]:
    return {
        "type": "bing_grounding_call", "id": "fc_test", "call_id": "call_bing", "status": "completed",
        "arguments": json.dumps({"query": "edge network segmentation"}),
    }


def agent_reply(payload: dict[str, Any], *, onelake: bool = True, web: bool = True) -> httpx.Response:
    """A completed Foundry response: the tool calls the agent made, then its JSON reply."""
    output = [*([tool_call()] if onelake else []), *([bing_call()] if web else [])]
    output.append({"type": "message", "content": [{"type": "output_text", "text": json.dumps(payload)}]})
    return httpx.Response(200, request=httpx.Request("POST", "https://example.test"), json={
        "id": "resp_test", "status": "completed", "output": output,
    })
