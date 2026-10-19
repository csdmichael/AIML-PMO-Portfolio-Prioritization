"""Opt-in end-to-end test through the deployed UI proxy and APIM."""

import os

import httpx
import pytest
from app.agent import load_agent_settings

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(os.environ.get("PMO_RUN_INTEGRATION") != "1", reason="Live Azure test is opt-in"),
]


def test_deployed_chat_matches_onelake_priority_order():
    base = os.environ["PMO_AGENT_TEST_BASE_URL"].rstrip("/")
    with httpx.Client(base_url=base, timeout=120) as client:
        portfolio = client.get("/api/v1/portfolio")
        portfolio.raise_for_status()
        projects = portfolio.json()["projects"]
        expected = sorted(
            [project for project in projects if project["finalTier"] == "Must-do-now"],
            key=lambda project: project["priorityScore"], reverse=True,
        )[:5]
        assert expected, "OneLake must contain Must-do-now projects for this scenario"
        response = client.post("/api/v1/agent/chat", json={"question": (
            "Show exactly the top 5 Must-do-now projects sorted by priorityScore descending. "
            "Preserve the snapshot project order for equal scores. "
            "Table columns must be Project ID and Priority Score. Cite those project IDs."
        )})
        response.raise_for_status()
        answer = response.json()
        assert answer["provenance"]["provider"] == "azure-ai-foundry"
        assert answer["provenance"]["responseId"].startswith("resp_")
        assert answer["provenance"]["agentName"] == "pmo-portfolio-copilot"
        assert answer["provenance"]["agentVersion"] == load_agent_settings().agentVersion
        assert answer["provenance"]["groundingSource"] == "fabric-onelake-via-apim"
        assert answer["provenance"]["queryIds"]
        expected_ids = [project["projectId"] for project in expected]
        assert set(answer["sourceProjectIds"]) == set(expected_ids)
        assert answer["sourceRecordCount"] == len(expected_ids)
        assert len(answer["tableData"]["rows"]) == len(expected)
        for row, project in zip(answer["tableData"]["rows"], expected, strict=True):
            assert row[0] == project["projectId"]
            assert float(row[1]) == pytest.approx(project["priorityScore"])
