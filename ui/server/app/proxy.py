"""Streaming reverse proxy from the UI mount path to the APIM gateway.

Request and response bodies are streamed, not buffered. The subscription key is added on the
server side from the environment, and any subscription header the browser sends is dropped.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Final
from urllib.parse import quote, quote_from_bytes

import httpx
from starlette.background import BackgroundTask
from starlette.datastructures import Headers
from starlette.requests import Request
from starlette.responses import Response, StreamingResponse
from starlette.types import Scope

from app.config import Messages, ProxySettings, UpstreamNotConfigured, read_subscription_key, read_upstream_base_url
from app.problems import problem_response

logger = logging.getLogger(__name__)

PROXIED_METHODS: Final = ("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")

# Connection-specific fields that a proxy must not forward (RFC 9110 sections 7.6.1 and 11.7).
HOP_BY_HOP_HEADERS: Final = frozenset(
    {
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "proxy-connection",
        "te",
        "trailer",
        "trailers",
        "transfer-encoding",
        "upgrade",
    }
)

# RFC 3986 characters that may stay as they are in a path or query. Existing %XX escapes are kept.
URL_SAFE_CHARACTERS: Final = "/?%:@!$&'()*+,;=-._~"


def request_path(scope: Scope) -> str:
    """The path as the client sent it (percent-encoded), without the query string."""
    raw = scope.get("raw_path")
    if raw is None:
        return quote(scope["path"], safe=URL_SAFE_CHARACTERS)
    return quote_from_bytes(raw.split(b"?", 1)[0], safe=URL_SAFE_CHARACTERS)


def request_query(scope: Scope) -> str:
    return quote_from_bytes(scope.get("query_string", b""), safe=URL_SAFE_CHARACTERS)


def mount_remainder(path: str, mount_path: str) -> str | None:
    """The part of path below the mount point ('' or starting with '/'), or None when path is outside it."""
    if path == mount_path:
        return ""
    if path.startswith(f"{mount_path}/"):
        return path[len(mount_path):]
    return None


def build_upstream_url(base_url: str, remainder: str, query: str) -> httpx.URL:
    target = f"{base_url}{remainder or '/'}"
    if query:
        target = f"{target}?{query}"
    return httpx.URL(target)


def connection_listed_fields(headers: Headers | httpx.Headers) -> frozenset[str]:
    """Header names that the Connection header marks as specific to this hop."""
    return frozenset(token.strip().lower() for token in headers.get("connection", "").split(",") if token.strip())


def forwarded_request_headers(
    incoming: Headers,
    subscription_header: str,
    subscription_key: str,
) -> list[tuple[str, str]]:
    excluded = HOP_BY_HOP_HEADERS | connection_listed_fields(incoming) | {"host", subscription_header.lower()}
    forwarded = [(name, value) for name, value in incoming.items() if name.lower() not in excluded]
    if "accept-encoding" not in incoming:
        # httpx would otherwise offer gzip on the client's behalf, and the client may not decode it.
        forwarded.append(("accept-encoding", "identity"))
    forwarded.append((subscription_header, subscription_key))
    return forwarded


def forwarded_response_headers(upstream: httpx.Headers) -> list[tuple[str, str]]:
    excluded = HOP_BY_HOP_HEADERS | connection_listed_fields(upstream)
    return [(name, value) for name, value in upstream.multi_items() if name.lower() not in excluded]


def request_has_body(headers: Headers) -> bool:
    return "content-length" in headers or "transfer-encoding" in headers


class ApiProxy:
    def __init__(
        self,
        *,
        proxy: ProxySettings,
        messages: Messages,
        environ: Mapping[str, str],
        client: httpx.AsyncClient,
    ) -> None:
        self._proxy = proxy
        self._messages = messages
        self._environ = environ
        self._client = client

    async def forward(self, request: Request) -> Response:
        instance = request.url.path
        remainder = mount_remainder(request_path(request.scope), self._proxy.mount_path)
        if remainder is None:
            return problem_response(404, self._messages.not_found, instance)
        try:
            base_url = read_upstream_base_url(self._proxy, self._messages, self._environ)
            subscription_key = read_subscription_key(self._proxy, self._messages, self._environ)
        except UpstreamNotConfigured as exc:
            return problem_response(503, exc.detail, instance)

        upstream_request = self._client.build_request(
            request.method,
            build_upstream_url(base_url, remainder, request_query(request.scope)),
            headers=forwarded_request_headers(request.headers, self._proxy.subscription_header_name, subscription_key),
            content=request.stream() if request_has_body(request.headers) else None,
        )
        try:
            upstream = await self._client.send(upstream_request, stream=True)
        except httpx.TimeoutException as exc:
            logger.warning("API gateway timed out for %s %s (%s)", request.method, instance, type(exc).__name__)
            detail = self._messages.upstream_timeout.format(timeoutSeconds=self._proxy.timeout_seconds)
            return problem_response(504, detail, instance)
        except httpx.RequestError as exc:
            logger.warning("API gateway unreachable for %s %s (%s)", request.method, instance, type(exc).__name__)
            return problem_response(502, self._messages.upstream_unavailable, instance)

        response = StreamingResponse(
            upstream.aiter_raw(),
            status_code=upstream.status_code,
            background=BackgroundTask(upstream.aclose),
        )
        for name, value in forwarded_response_headers(upstream.headers):
            response.headers.append(name, value)
        return response
