from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from app.catalog import CatalogOptions
from app.config import load_config
from app.portfolios import PortfolioService, _code, _slug
from app.problems import ProblemError


class FakeCatalog:
    def __init__(self, contract, portfolios) -> None:
        self._portfolios = portfolios
        self._options = CatalogOptions(contract=contract, catalog=self)

    def portfolios(self):
        return list(self._portfolios)

    def portfolio(self, key):
        return next((item for item in self._portfolios if item.get("key") == key), None)

    def options(self):
        return self._options


def make_service(existing=()):
    config = load_config()
    entries = Mock()
    service = PortfolioService(
        entries=entries,
        paths=SimpleNamespace(portfolio_entry=lambda key: f"Files/ui_entries/portfolios/{key}.json"),
        catalog=FakeCatalog(config.data_entry, list(existing)),
        contract=config.data_entry,
        validation=config.api.validation,
        statuses=config.api.projects,
    )
    return service, entries


def test_slug_is_lower_case_and_hyphenated():
    assert _slug("HR Projects", 40) == "hr-projects"


def test_slug_is_cut_to_the_key_limit():
    assert _slug("Information Technology Services Group Operations", 40) == "information-technology-services-group-op"


def test_code_uses_initials_when_there_are_enough_letters():
    assert _code("HR Projects", 2, 8) == "HP"


def test_code_falls_back_to_the_name_when_the_initials_are_too_short():
    assert _code("Finance", 2, 8) == "FINANCE"


def test_code_is_cut_to_the_code_limit():
    assert _code("A B C D E F G H I J", 2, 8) == "ABCDEFGH"


def test_an_existing_portfolio_with_the_same_name_is_reused_ignoring_case():
    service, entries = make_service([{"key": "it-infosec", "displayName": "IT - InfoSec", "programs": []}])
    assert service.ensure_named("it - infosec", "main") == ("it-infosec", None)
    entries.create.assert_not_called()


def test_a_new_portfolio_gets_one_program_with_the_same_name():
    service, entries = make_service()
    assert service.ensure_named("HR Projects", "main") == ("hr-projects", "hr-projects")
    path, entry = entries.create.call_args.args
    assert path == "Files/ui_entries/portfolios/hr-projects.json"
    assert entry["displayName"] == "HR Projects"
    assert entry["code"] == "HP"
    assert entry["role"] == "main"
    assert entry["programs"] == [{"key": "hr-projects", "displayName": "HR Projects", "code": "HP"}]


def test_a_new_portfolio_whose_key_is_taken_is_a_conflict():
    service, entries = make_service([{"key": "hr-projects", "displayName": "HR", "programs": []}])
    with pytest.raises(ProblemError) as caught:
        service.ensure_named("HR Projects", "main")
    assert caught.value.status == 409
    entries.create.assert_not_called()
