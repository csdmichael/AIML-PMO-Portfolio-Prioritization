"""OneLake (ADLS Gen2) access to the Fabric lakehouse Files area.

Callers pass lakehouse-relative paths such as Files/exports/portfolio.json. Writes are create-only unless an
ETag is given, in which case the write succeeds only while the stored file still has that ETag.
"""

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from azure.core.credentials import TokenCredential
from azure.core.exceptions import (
    AzureError,
    ClientAuthenticationError,
    HttpResponseError,
    ResourceExistsError,
    ResourceModifiedError,
    ResourceNotFoundError,
    ServiceRequestError,
    ServiceResponseError,
)
from azure.core import MatchConditions
from azure.storage.filedatalake import DataLakeServiceClient

_FILES_ROOT = "Files/"
_PRECONDITION_FAILED = 412


class LakeError(RuntimeError):
    def __init__(self, message: str, *, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


class LakeUnavailable(LakeError):
    """Identity or network failure. The lake may be fine; this request could not reach it."""


class LakeConflict(LakeError):
    """The file already exists, or its ETag changed since it was read."""


@dataclass(frozen=True)
class LakeEntry:
    name: str
    path: str
    size_bytes: int
    last_modified: datetime | None
    etag: str | None = None


def _map_error(error: Exception, lake_path: str) -> LakeError:
    if isinstance(error, ClientAuthenticationError):
        return LakeUnavailable("the API identity could not get a token for OneLake")
    if isinstance(error, (ServiceRequestError, ServiceResponseError)):
        return LakeUnavailable("OneLake could not be reached")
    status = error.status_code if isinstance(error, HttpResponseError) else None
    return LakeError(f"OneLake request failed for {lake_path} (HTTP {status})", status=status)


class OneLakeClient:
    def __init__(
        self,
        *,
        dfs_endpoint: str,
        workspace_name: str,
        lakehouse_name: str,
        item_suffix: str,
        credential: TokenCredential,
    ) -> None:
        self._service = DataLakeServiceClient(account_url=dfs_endpoint, credential=credential)
        self._file_system = self._service.get_file_system_client(workspace_name)
        self._item_root = f"{lakehouse_name}{item_suffix}"

    def _adls_path(self, lake_path: str) -> str:
        cleaned = lake_path.strip("/")
        if not cleaned.startswith(_FILES_ROOT):
            raise ValueError(f"lake paths must start with {_FILES_ROOT}: {lake_path}")
        return f"{self._item_root}/{cleaned}"

    def _file(self, lake_path: str) -> Any:
        return self._file_system.get_file_client(self._adls_path(lake_path))

    def properties(self, lake_path: str) -> LakeEntry | None:
        try:
            props = self._file(lake_path).get_file_properties()
        except ResourceNotFoundError:
            return None
        except AzureError as exc:
            raise _map_error(exc, lake_path) from exc
        name = lake_path.rsplit("/", 1)[-1]
        return LakeEntry(name=name, path=lake_path, size_bytes=props.size, last_modified=props.last_modified, etag=props.etag)

    def read_with_etag(self, lake_path: str) -> tuple[bytes, str] | None:
        try:
            downloader = self._file(lake_path).download_file()
            data = downloader.readall()
            etag = downloader.properties.etag
        except ResourceNotFoundError:
            return None
        except AzureError as exc:
            raise _map_error(exc, lake_path) from exc
        return data, etag

    def read_bytes(self, lake_path: str) -> bytes | None:
        found = self.read_with_etag(lake_path)
        return found[0] if found else None

    def read_json(self, lake_path: str) -> tuple[Any, str] | None:
        found = self.read_with_etag(lake_path)
        if found is None:
            return None
        data, etag = found
        try:
            return json.loads(data.decode("utf-8")), etag
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise LakeError(f"{lake_path} is not valid JSON") from exc

    def _ensure_parent(self, lake_path: str) -> None:
        parts = self._adls_path(lake_path).split("/")
        for depth in range(3, len(parts)):
            try:
                self._file_system.create_directory("/".join(parts[:depth]))
            except ResourceExistsError:
                pass

    def write_bytes(self, lake_path: str, data: bytes, *, etag: str | None = None) -> str:
        client = self._file(lake_path)
        try:
            if etag is None:
                if self.properties(lake_path) is not None:
                    raise LakeConflict(f"{lake_path} already exists")
                self._ensure_parent(lake_path)
                response = client.upload_data(data, overwrite=True)
            else:
                response = client.upload_data(
                    data,
                    overwrite=True,
                    etag=etag,
                    match_condition=MatchConditions.IfNotModified,
                )
        except (ResourceExistsError, ResourceModifiedError, ResourceNotFoundError) as exc:
            raise LakeConflict(f"{lake_path} already exists or changed") from exc
        except HttpResponseError as exc:
            if exc.status_code == _PRECONDITION_FAILED:
                raise LakeConflict(f"{lake_path} changed since it was read") from exc
            raise _map_error(exc, lake_path) from exc
        except AzureError as exc:
            raise _map_error(exc, lake_path) from exc
        return str(response["etag"])

    def write_json(self, lake_path: str, value: Any, *, etag: str | None = None) -> str:
        payload = json.dumps(value, indent=2, ensure_ascii=False).encode("utf-8")
        return self.write_bytes(lake_path, payload, etag=etag)

    def delete(self, lake_path: str) -> None:
        try:
            self._file(lake_path).delete_file()
        except ResourceNotFoundError:
            return
        except AzureError as exc:
            raise _map_error(exc, lake_path) from exc

    def list_files(self, lake_folder: str) -> list[LakeEntry]:
        folder = self._adls_path(lake_folder)
        entries: list[LakeEntry] = []
        try:
            for item in self._file_system.get_paths(path=folder, recursive=False):
                if item.is_directory:
                    continue
                name = item.name.rsplit("/", 1)[-1]
                path = f"{lake_folder.strip('/')}/{name}"
                entries.append(
                    LakeEntry(
                        name=name,
                        path=path,
                        size_bytes=int(item.content_length or 0),
                        last_modified=item.last_modified,
                        etag=item.etag,
                    )
                )
        except ResourceNotFoundError:
            return []
        except AzureError as exc:
            raise _map_error(exc, lake_folder) from exc
        return entries
