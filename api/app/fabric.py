"""Fabric REST calls for the pipeline: resolve a DataPipeline item by name, start a job, and read a job instance."""

import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import httpx

_GUID = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")


class FabricError(RuntimeError):
    def __init__(self, message: str, *, status: int, code: str | None = None) -> None:
        super().__init__(message)
        self.status = status
        self.code = code


@dataclass(frozen=True)
class FabricItem:
    id: str
    display_name: str
    item_type: str


@dataclass(frozen=True)
class StartedJob:
    job_instance_id: str
    retry_after_seconds: int | None


def _error_from(response: httpx.Response) -> FabricError:
    code: str | None = None
    message: str | None = None
    try:
        body = response.json()
        if isinstance(body, dict):
            code = body.get("errorCode")
            message = body.get("message")
    except ValueError:
        pass
    text = message or f"Fabric REST returned HTTP {response.status_code}"
    return FabricError(text, status=response.status_code, code=code)


class FabricClient:
    def __init__(
        self,
        *,
        base_url: str,
        workspace_id: str,
        token_provider: Callable[[], str],
        timeout_seconds: float,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._workspace_url = f"{base_url.rstrip('/')}/workspaces/{workspace_id}"
        self._token_provider = token_provider
        self._http = httpx.Client(timeout=timeout_seconds, transport=transport)

    def close(self) -> None:
        self._http.close()

    def _send(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        headers = {"Authorization": f"Bearer {self._token_provider()}"}
        try:
            response = self._http.request(method, url, headers=headers, **kwargs)
        except httpx.HTTPError as exc:
            raise FabricError("Fabric REST could not be reached", status=502) from exc
        if response.status_code >= 400:
            raise _error_from(response)
        return response

    def find_item(self, item_type: str, display_name: str) -> FabricItem | None:
        token: str | None = None
        while True:
            params: dict[str, str] = {"type": item_type}
            if token:
                params["continuationToken"] = token
            payload = self._send("GET", f"{self._workspace_url}/items", params=params).json()
            for item in payload.get("value", []):
                if item.get("displayName") == display_name:
                    return FabricItem(id=str(item["id"]), display_name=display_name, item_type=item_type)
            token = payload.get("continuationToken")
            if not token:
                return None

    def start_job(self, item_id: str, job_type: str) -> StartedJob:
        url = f"{self._workspace_url}/items/{item_id}/jobs/{job_type}/instances"
        response = self._send("POST", url)
        job_instance_id = response.headers.get("Location", "").rstrip("/").rsplit("/", 1)[-1]
        if not _GUID.fullmatch(job_instance_id):
            raise FabricError("Fabric did not return a job instance ID", status=502)
        retry = response.headers.get("Retry-After", "")
        return StartedJob(job_instance_id=job_instance_id, retry_after_seconds=int(retry) if retry.isdigit() else None)

    def get_job_instance(self, item_id: str, job_instance_id: str) -> dict[str, Any]:
        url = f"{self._workspace_url}/items/{item_id}/jobs/instances/{job_instance_id}"
        payload = self._send("GET", url).json()
        if not isinstance(payload, dict):
            raise FabricError("Fabric returned an unexpected job payload", status=502)
        return payload
