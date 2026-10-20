from unittest.mock import Mock

import pytest

from app.config import load_config
from app.onelake import LakeConflict, LakeError
from app.options_store import OptionsStore
from app.problems import ProblemError

PATH = "Files/config/data-entry.json"


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


@pytest.fixture
def contract():
    return load_config().data_entry


def store_for(contract, lake, clock=None, ttl=60.0):
    return OptionsStore(lake=lake, contract=contract, path=PATH, ttl_seconds=ttl, clock=clock or Clock())


def saved_document(contract, **lists):
    return ({"options": {**contract.options.model_dump(), **lists}}, "etag-1")


def test_options_come_from_the_saved_document(contract):
    lake = Mock()
    lake.read_json.return_value = saved_document(contract, sites=["Lisbon"])
    assert store_for(contract, lake).current().sites == ["Lisbon"]
    lake.read_json.assert_called_once_with(PATH)


def test_without_a_saved_document_the_repo_options_are_used(contract):
    lake = Mock()
    lake.read_json.return_value = None
    expected = list(contract.options.sites)
    assert store_for(contract, lake).current().sites == expected


def test_options_are_reread_once_the_cache_expires(contract):
    lake = Mock()
    lake.read_json.return_value = None
    clock = Clock()
    store = store_for(contract, lake, clock, ttl=60)
    store.current()
    store.current()
    assert lake.read_json.call_count == 1
    clock.now += 60
    store.current()
    assert lake.read_json.call_count == 2


def test_a_failed_refresh_keeps_the_copy_loaded_earlier(contract):
    lake = Mock()
    lake.read_json.side_effect = [saved_document(contract, sites=["Lisbon"]), LakeError("unavailable")]
    clock = Clock()
    store = store_for(contract, lake, clock, ttl=60)
    assert store.current().sites == ["Lisbon"]
    clock.now += 61
    assert store.current().sites == ["Lisbon"]
    assert lake.read_json.call_count == 2


def test_the_first_load_failure_is_raised(contract):
    lake = Mock()
    lake.read_json.side_effect = LakeError("unavailable")
    with pytest.raises(LakeError):
        store_for(contract, lake).current()


def test_a_document_without_an_options_object_is_an_upstream_failure(contract):
    lake = Mock()
    lake.read_json.return_value = ({"options": "not an object"}, "etag-1")
    with pytest.raises(ProblemError) as caught:
        store_for(contract, lake).current()
    assert caught.value.status == 502


def test_a_new_option_is_saved_to_onelake_and_used_at_once(contract):
    lake = Mock()
    lake.read_json.return_value = None
    store = store_for(contract, lake)
    assert store.add_option("sites", "Austin Tech Center") == "Austin Tech Center"
    args, kwargs = lake.write_json.call_args
    assert args[0] == PATH
    assert args[1]["options"]["sites"][-1] == "Austin Tech Center"
    assert kwargs == {"etag": None}
    assert store.current().sites[-1] == "Austin Tech Center"


def test_an_existing_option_matched_ignoring_case_is_returned_and_nothing_is_written(contract):
    lake = Mock()
    lake.read_json.return_value = None
    store = store_for(contract, lake)
    existing = contract.options.sites[0]
    assert store.add_option("sites", existing.upper()) == existing
    lake.write_json.assert_not_called()


def test_a_failed_save_leaves_the_options_unchanged(contract):
    lake = Mock()
    lake.read_json.return_value = None
    lake.write_json.side_effect = LakeError("write failed")
    store = store_for(contract, lake)
    before = list(contract.options.sites)
    with pytest.raises(LakeError):
        store.add_option("sites", "Nowhere")
    assert contract.options.sites == before


def test_replace_saves_the_given_options(contract):
    lake = Mock()
    lake.read_json.return_value = None
    store = store_for(contract, lake)
    store.replace(contract.options.model_copy(update={"sites": ["Lisbon"]}))
    assert lake.write_json.call_args.args[1]["options"]["sites"] == ["Lisbon"]
    assert store.current().sites == ["Lisbon"]


def test_a_save_sends_the_etag_it_read(contract):
    lake = Mock()
    lake.read_json.return_value = saved_document(contract, sites=["Lisbon"])
    store_for(contract, lake).add_option("sites", "Austin")
    assert lake.write_json.call_args.kwargs == {"etag": "etag-1"}


def test_options_added_by_another_instance_are_kept(contract):
    lake = Mock()
    lake.read_json.return_value = saved_document(contract, sites=["Lisbon"])
    store_for(contract, lake).add_option("sites", "Austin")
    assert lake.write_json.call_args.args[1]["options"]["sites"] == ["Lisbon", "Austin"]


def test_a_save_that_loses_a_race_is_a_conflict(contract):
    lake = Mock()
    lake.read_json.return_value = saved_document(contract, sites=["Lisbon"])
    lake.write_json.side_effect = LakeConflict("changed")
    with pytest.raises(ProblemError) as caught:
        store_for(contract, lake).add_option("sites", "Austin")
    assert caught.value.status == 409


def test_nothing_is_saved_when_the_current_copy_cannot_be_read(contract):
    lake = Mock()
    lake.read_json.side_effect = LakeError("unavailable")
    with pytest.raises(LakeError):
        store_for(contract, lake).add_option("sites", "Austin")
    lake.write_json.assert_not_called()


def test_a_malformed_refresh_keeps_the_copy_loaded_earlier(contract):
    lake = Mock()
    lake.read_json.side_effect = [saved_document(contract, sites=["Lisbon"]), ({"options": "bad"}, "etag-2")]
    clock = Clock()
    store = store_for(contract, lake, clock, ttl=60)
    assert store.current().sites == ["Lisbon"]
    clock.now += 61
    assert store.current().sites == ["Lisbon"]
