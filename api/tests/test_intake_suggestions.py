import copy
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.agent import FoundryAgentClient, load_agent_settings
from app.catalog import Catalog
from app.cache import TtlCache
from app.project_changes import ProjectChanges
from app.config import ConfigError, _check_contract, load_config
from app.contracts import CreatableField
from app.lake_paths import LakePaths
from app.main import create_app
from app.onelake import LakeError
from app.options_store import OptionsStore
from app.portfolios import PortfolioService
from app.projects import ProjectService
from app.routes.deps import get_services
from tests.agent_doubles import agent_reply

DRAFT_ID = "DRF-TEST0002"
UNLISTED_UNIT = "Zeta Exploration Unit"
PORTFOLIOS = [
    {"key": "it-infosec", "displayName": "IT - InfoSec", "programs": [{"key": "cloud-program", "displayName": "Cloud", "code": "CLD"}]},
]


def draft_document():
    return {
        "draftId": DRAFT_ID,
        "status": "draft",
        "projectName": "HR Policies Website",
        "description": "A public website that publishes HR policies to all staff for self-service.",
        "documents": [],
        "fields": {},
        "missingRequired": [],
        "model": None,
        "createdAtUtc": "2026-10-17T00:00:00Z",
        "updatedAtUtc": "2026-10-17T00:00:00Z",
        "projectId": None,
    }


def answer(value, rationale="Inferred from the description."):
    return {"value": value, "evidence": "inferred", "evidenceQuote": None, "rationale": rationale, "sourceUrl": None}


def prefill_reply(**overrides):
    fields = {
        "businessUnit": answer(UNLISTED_UNIT, "The description names no existing unit."),
        "portfolioKey": answer("HR Projects", "An HR policies website belongs in an HR portfolio."),
    }
    fields.update(overrides)
    return {"fields": fields, "sourceUrls": []}


@pytest.fixture
def harness(monkeypatch):
    config = load_config()
    paths = LakePaths(config)
    stored = {"draft": draft_document()}
    entries = Mock()
    entries.get_with_etag.side_effect = lambda path: (
        (copy.deepcopy(stored["draft"]), "etag-1") if path == paths.draft(DRAFT_ID) else None
    )
    entries.replace.side_effect = lambda path, document, etag: stored.update(draft=copy.deepcopy(document))
    entries.list.return_value = []
    entries.names.return_value = []
    lake = Mock()
    lake.read_json.return_value = None
    lake.write_json.return_value = "etag-2"
    exports = Mock()
    exports.read.return_value = {"portfolios": PORTFOLIOS, "projects": []}
    changes = ProjectChanges(entries=entries, paths=paths, contract=config.data_entry, cache=TtlCache(0))
    catalog = Catalog(
        exports=exports, entries=entries, paths=paths, statuses=config.api.projects, contract=config.data_entry, changes=changes,
    )
    credentials = Mock()
    credentials.bearer_token.return_value = "test-token"
    services = SimpleNamespace(
        config=config,
        entries=entries,
        paths=paths,
        catalog=catalog,
        projects=ProjectService(
            lake=lake,
            entries=entries,
            paths=paths,
            catalog=catalog,
            contract=config.data_entry,
            validation=config.api.validation,
            project_settings=config.api.projects,
            upload_settings=config.api.uploads,
            changes=changes,
        ),
        portfolios=PortfolioService(
            entries=entries,
            paths=paths,
            catalog=catalog,
            contract=config.data_entry,
            validation=config.api.validation,
            statuses=config.api.projects,
        ),
        options=OptionsStore(lake=lake, contract=config.data_entry, path=config.api.oneLake.lookupsFile, ttl_seconds=0),
        intake_agent=FoundryAgentClient(load_agent_settings("intake-agent.json"), credentials),
    )
    post = Mock(return_value=agent_reply(prefill_reply(), onelake=False))
    monkeypatch.setattr("app.agent.httpx.post", post)
    app = create_app()
    app.dependency_overrides[get_services] = lambda: services
    with TestClient(app) as client:
        yield SimpleNamespace(client=client, config=config, entries=entries, lake=lake, post=post, stored=stored)


def prefill(h, reply=None):
    if reply is not None:
        h.post.return_value = agent_reply(reply, onelake=False)
    return h.client.post(f"/v1/intake/drafts/{DRAFT_ID}/prefill")


def test_a_value_outside_the_list_is_not_set_and_becomes_a_suggestion(harness):
    response = prefill(harness)
    assert response.status_code == 200
    body = response.json()
    assert body["fields"]["businessUnit"]["value"] is None
    suggestion = body["suggestions"]["businessUnit"]
    assert suggestion["kind"] == "option"
    assert suggestion["proposedValue"] == UNLISTED_UNIT
    assert f'"{UNLISTED_UNIT}"' in suggestion["label"]


def test_a_new_portfolio_suggestion_says_what_will_be_created(harness):
    body = prefill(harness).json()
    assert body["fields"]["portfolioKey"]["value"] is None
    assert body["suggestions"]["portfolioKey"] == {
        "field": "portfolioKey",
        "kind": "portfolio",
        "proposedValue": "HR Projects",
        "label": 'Create the portfolio "HR Projects" with a program of the same name',
        "rationale": "An HR policies website belongs in an HR portfolio.",
    }


def test_the_name_of_an_existing_portfolio_is_used_without_a_suggestion(harness):
    body = prefill(harness, prefill_reply(portfolioKey=answer("it - infosec"))).json()
    assert body["fields"]["portfolioKey"]["value"] == "it-infosec"
    assert "portfolioKey" not in body["suggestions"]


def test_an_allowed_value_sets_the_field_and_needs_no_suggestion(harness):
    unit = harness.config.data_entry.options.businessUnits[0]
    body = prefill(harness, prefill_reply(businessUnit=answer(unit))).json()
    assert body["fields"]["businessUnit"]["value"] == unit
    assert "businessUnit" not in body["suggestions"]


def test_a_proposal_that_is_too_short_or_too_long_gets_no_suggestion(harness):
    body = prefill(harness, prefill_reply(businessUnit=answer("X"), site=answer("Y" * 81))).json()
    assert "businessUnit" not in body["suggestions"]
    assert "site" not in body["suggestions"]


def test_a_portfolio_name_that_cannot_become_a_portfolio_gets_no_suggestion(harness):
    assert "portfolioKey" not in prefill(harness, prefill_reply(portfolioKey=answer("HR"))).json()["suggestions"]
    assert "portfolioKey" not in prefill(harness, prefill_reply(portfolioKey=answer("!!!"))).json()["suggestions"]


def test_applying_an_option_suggestion_saves_it_to_onelake_and_sets_the_field(harness):
    prefill(harness)
    response = harness.client.post(f"/v1/intake/drafts/{DRAFT_ID}/suggestions/businessUnit/apply")
    assert response.status_code == 200
    body = response.json()
    field = body["fields"]["businessUnit"]
    assert field["value"] == UNLISTED_UNIT
    assert (field["source"], field["evidence"]) == ("ai", "inferred")
    assert "businessUnit" not in body["suggestions"]
    args, kwargs = harness.lake.write_json.call_args
    assert args[0] == "Files/config/data-entry.json"
    assert UNLISTED_UNIT in args[1]["options"]["businessUnits"]
    assert kwargs == {"etag": None}
    assert UNLISTED_UNIT in harness.config.data_entry.options.businessUnits


def test_applying_a_portfolio_suggestion_creates_the_portfolio_and_its_program(harness):
    prefill(harness)
    body = harness.client.post(f"/v1/intake/drafts/{DRAFT_ID}/suggestions/portfolioKey/apply").json()
    assert body["fields"]["portfolioKey"]["value"] == "hr-projects"
    assert body["fields"]["programKey"]["value"] == "hr-projects"
    assert "portfolioKey" not in body["suggestions"]
    path, entry = harness.entries.create.call_args.args
    assert path.endswith("/hr-projects.json")
    assert entry["programs"] == [{"key": "hr-projects", "displayName": "HR Projects", "code": "HP"}]


def test_a_failed_option_save_leaves_the_suggestion_in_place(harness):
    prefill(harness)
    harness.lake.write_json.side_effect = LakeError("write failed")
    response = harness.client.post(f"/v1/intake/drafts/{DRAFT_ID}/suggestions/businessUnit/apply")
    assert response.status_code == 502
    assert "businessUnit" in harness.stored["draft"]["suggestions"]
    assert harness.stored["draft"]["fields"]["businessUnit"]["value"] is None


def test_dismissing_a_suggestion_removes_it_and_leaves_the_field_empty(harness):
    prefill(harness)
    response = harness.client.delete(f"/v1/intake/drafts/{DRAFT_ID}/suggestions/businessUnit")
    assert response.status_code == 200
    body = response.json()
    assert "businessUnit" not in body["suggestions"]
    assert body["fields"]["businessUnit"]["value"] is None
    harness.lake.write_json.assert_not_called()


def test_a_suggestion_that_does_not_exist_is_not_found(harness):
    assert harness.client.post(f"/v1/intake/drafts/{DRAFT_ID}/suggestions/businessUnit/apply").status_code == 404
    assert harness.client.delete(f"/v1/intake/drafts/{DRAFT_ID}/suggestions/businessUnit").status_code == 404


def test_a_submitted_draft_cannot_apply_a_suggestion(harness):
    prefill(harness)
    harness.stored["draft"]["status"] = "submitted"
    response = harness.client.post(f"/v1/intake/drafts/{DRAFT_ID}/suggestions/businessUnit/apply")
    assert response.status_code == 409


def test_the_shipped_creatable_fields_pass_the_config_check():
    config = load_config()
    _check_contract(config.api, config.data_entry, config.ai_prefill, config.data_sources)


@pytest.mark.parametrize(
    "creatable",
    [
        {"userBase": CreatableField(kind="option")},
        {"skills": CreatableField(kind="option")},
        {"businessUnit": CreatableField(kind="portfolio", role="main")},
        {"portfolioKey": CreatableField(kind="portfolio", role="unknown")},
        {"notAField": CreatableField(kind="option")},
    ],
)
def test_a_creatable_field_must_point_at_a_list_that_can_grow(creatable):
    config = load_config()
    ai = config.ai_prefill.model_copy(update={"creatableFields": creatable})
    with pytest.raises(ConfigError):
        _check_contract(config.api, config.data_entry, ai, config.data_sources)
