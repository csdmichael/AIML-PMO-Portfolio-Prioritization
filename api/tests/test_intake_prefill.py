import copy
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.agent import FoundryAgentClient, load_agent_settings
from app.config import load_config
from app.main import create_app
from app.routes.deps import get_services
from tests.agent_doubles import agent_reply

DRAFT_ID = "DRF-TEST0001"
DRAFT = {
    "draftId": DRAFT_ID,
    "status": "draft",
    "projectName": "Edge Network Segmentation",
    "description": "Segment the edge network for cleanroom IoT devices to support audit evidence for 3000 users.",
    "documents": [],
    "fields": {
        "projectManager": {
            "value": "Sam Rivera", "source": "human", "evidence": "human", "confidenceLevel": "Human", "confidenceScore": None,
        },
    },
    "missingRequired": [],
    "model": None,
    "createdAtUtc": "2026-10-17T00:00:00Z",
    "updatedAtUtc": "2026-10-17T00:00:00Z",
    "projectId": None,
}
REPLY = {
    "fields": {
        "businessUnit": {
            "value": "A", "evidence": "inferred", "evidenceQuote": None,
            "rationale": "Matches public guidance on OT segmentation.", "sourceUrl": "https://example.org/segmentation",
        },
        "userBase": {
            "value": 3000, "evidence": "explicit", "evidenceQuote": "3000 users",
            "rationale": "Stated in the description.", "sourceUrl": None,
        },
        "sponsorName": {
            "value": "Ana Lopez", "evidence": "confirmed", "evidenceQuote": None,
            "rationale": "Unknown evidence level.", "sourceUrl": "not a url",
        },
        "projectManager": {
            "value": "Other Person", "evidence": "explicit", "evidenceQuote": None,
            "rationale": "Must not replace a human edit.", "sourceUrl": None,
        },
    },
    "sourceUrls": ["https://example.org/segmentation", "javascript:alert(1)"],
}


@pytest.fixture
def harness(monkeypatch):
    credentials = Mock()
    credentials.bearer_token.return_value = "test-token"
    catalog = Mock()
    catalog.portfolios.return_value = [
        {"key": "it-infosec", "displayName": "IT - InfoSec", "programs": [{"key": "cloud-program", "displayName": "Cloud"}]},
    ]
    entries = Mock()
    entries.get_with_etag.return_value = (copy.deepcopy(DRAFT), "etag-1")
    services = SimpleNamespace(
        config=load_config(),
        catalog=catalog,
        intake_agent=FoundryAgentClient(load_agent_settings("intake-agent.json"), credentials),
        entries=entries,
        paths=SimpleNamespace(draft=lambda draft_id: f"Files/drafts/{draft_id}.json"),
        projects=SimpleNamespace(validate=lambda values, partial: SimpleNamespace(values=values, issues=[])),
    )
    post = Mock(return_value=agent_reply(copy.deepcopy(REPLY), onelake=False))
    monkeypatch.setattr("app.agent.httpx.post", post)
    app = create_app()
    app.dependency_overrides[get_services] = lambda: services
    with TestClient(app) as client:
        yield client, post, entries


def test_prefill_asks_the_intake_agent_and_maps_evidence(harness):
    client, post, entries = harness
    response = client.post(f"/v1/intake/drafts/{DRAFT_ID}/prefill")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "prefilled"
    fields = body["fields"]
    assert fields["businessUnit"]["value"] == "A"
    assert (fields["businessUnit"]["confidenceLevel"], fields["businessUnit"]["confidenceScore"]) == ("Medium", 0.6)
    assert fields["userBase"]["confidenceLevel"] == "High"
    assert fields["projectName"]["value"] == DRAFT["projectName"]
    assert fields["businessUnit"]["sourceUrl"] == "https://example.org/segmentation"
    assert fields["userBase"]["sourceUrl"] is None
    assert body["model"]["agentName"] == "pmo-intake-agent"
    assert body["model"]["responseId"] == "resp_test"
    assert body["model"]["webSearches"] == 1
    assert body["model"]["sourceUrls"] == ["https://example.org/segmentation"]
    sent = post.call_args.kwargs["json"]["input"]
    assert [item["role"] for item in sent] == ["system", "user"]
    assert all(item["type"] == "message" for item in sent)
    assert f"Project name: {DRAFT['projectName']}" in sent[1]["content"]
    assert '"fieldGuidance"' in sent[1]["content"] and '"projectFields"' in sent[1]["content"]
    assert entries.replace.call_args.args[1]["status"] == "prefilled"


def test_unknown_evidence_levels_map_to_not_provided(harness):
    client, _, _ = harness
    fields = client.post(f"/v1/intake/drafts/{DRAFT_ID}/prefill").json()["fields"]
    assert fields["sponsorName"]["evidence"] == "notProvided"
    assert fields["sponsorName"]["confidenceLevel"] == "None"
    assert fields["sponsorName"]["sourceUrl"] is None


def test_human_edits_survive_a_new_prefill(harness):
    client, _, _ = harness
    fields = client.post(f"/v1/intake/drafts/{DRAFT_ID}/prefill").json()["fields"]
    assert fields["projectManager"]["value"] == "Sam Rivera"
    assert fields["projectManager"]["source"] == "human"


def test_prefill_must_search_the_web(harness):
    client, post, _ = harness
    post.return_value = agent_reply(copy.deepcopy(REPLY), onelake=False, web=False)
    assert client.post(f"/v1/intake/drafts/{DRAFT_ID}/prefill").status_code == 502
