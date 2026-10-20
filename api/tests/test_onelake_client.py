from unittest.mock import Mock

import pytest
from azure.core import MatchConditions
from azure.core.exceptions import ResourceExistsError
from azure.identity import AzureCliCredential

from app.onelake import LakeConflict, OneLakeClient


@pytest.fixture
def client(monkeypatch):
    lake = OneLakeClient(
        dfs_endpoint="https://onelake.dfs.fabric.microsoft.com",
        workspace_name="workspace", lakehouse_name="lakehouse", item_suffix=".Lakehouse",
        credential=AzureCliCredential(),
    )
    file = Mock()
    file.upload_data.return_value = {"etag": '"new-version"'}
    parents = Mock()
    monkeypatch.setattr(lake, "_file", lambda _: file)
    monkeypatch.setattr(lake, "_ensure_parent", parents)
    return lake, file, parents


def test_create_only_upload_creates_the_file_with_an_atomic_missing_condition(client):
    lake, file, parents = client
    assert lake.write_bytes("Files/demo/portfolio.json", b"{}") == '"new-version"'
    parents.assert_called_once_with("Files/demo/portfolio.json")
    file.upload_data.assert_called_once_with(
        b"{}", overwrite=True, match_condition=MatchConditions.IfMissing,
    )


def test_conditional_replacement_preserves_the_read_record_version(client):
    lake, file, parents = client
    lake.write_bytes("Files/demo/portfolio.json", b"{}", etag='"old-version"')
    parents.assert_not_called()
    file.upload_data.assert_called_once_with(
        b"{}", overwrite=True, etag='"old-version"', match_condition=MatchConditions.IfNotModified,
    )


def test_explicit_overwrite_and_create_conflicts_remain_distinct(client):
    lake, file, _ = client
    lake.write_bytes("Files/demo/portfolio.json", b"{}", overwrite=True)
    file.upload_data.assert_called_once_with(b"{}", overwrite=True)
    file.upload_data.side_effect = ResourceExistsError("already exists")
    with pytest.raises(LakeConflict):
        lake.write_bytes("Files/demo/portfolio.json", b"{}")
