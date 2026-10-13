"""Shared test values and the in-process upstream stub.

The stub stands in for the APIM gateway. It records each request so that a test can inspect what
the proxy sent, and it returns only what the test asks for. It holds no data.
"""

from __future__ import annotations

import hashlib
from collections.abc import AsyncIterator
from urllib.parse import urlunsplit

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.responses import Response

from app.proxy import PROXIED_METHODS

UPSTREAM_HOST = "upstream.test"
UPSTREAM_PATH = "/pmo"
UPSTREAM_BASE_URL = urlunsplit(("http", UPSTREAM_HOST, UPSTREAM_PATH, "", ""))
SUBSCRIPTION_KEY = "server-side-test-key"
BROWSER_KEY = "browser-supplied-value"
STREAM_CHUNKS = ("chunk-0;", "chunk-1;", "chunk-2;")
INDEX_HTML = "<!doctype html><p>test-only index</p>"
APP_JS = "export const testOnly = true;\n"


def build_upstream_stub() -> FastAPI:
    stub = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    stub.state.received = []

    @stub.get(f"{UPSTREAM_PATH}/v1/stream")
    async def stream() -> StreamingResponse:
        async def chunks() -> AsyncIterator[bytes]:
            for chunk in STREAM_CHUNKS:
                yield chunk.encode()

        return StreamingResponse(chunks(), media_type="text/plain")

    @stub.get(f"{UPSTREAM_PATH}/v1/hop")
    async def hop() -> Response:
        response = Response("hop", media_type="text/plain")
        response.headers.append("keep-alive", "timeout=5")
        response.headers.append("proxy-authenticate", "test-only-challenge")
        response.headers.append("connection", "x-upstream-private")
        response.headers.append("x-upstream-private", "1")
        response.headers.append("x-visible", "yes")
        return response

    @stub.api_route(f"{UPSTREAM_PATH}/v1/status/{{code}}", methods=list(PROXIED_METHODS))
    async def status(code: int) -> JSONResponse:
        return JSONResponse({"status": code}, status_code=code)

    @stub.api_route("/{path:path}", methods=list(PROXIED_METHODS))
    async def echo(request: Request) -> JSONResponse:
        body = await request.body()
        stub.state.received.append(
            {
                "method": request.method,
                "path": request.url.path,
                "query": request.url.query,
                "headers": request.headers.items(),
                "body": body,
            }
        )
        return JSONResponse(
            {
                "method": request.method,
                "path": request.url.path,
                "query": request.url.query,
                "bodyLength": len(body),
                "bodySha256": hashlib.sha256(body).hexdigest(),
            }
        )

    return stub


def upstream_transport(stub: FastAPI) -> httpx.ASGITransport:
    return httpx.ASGITransport(app=stub)


class FailingUpstream(httpx.AsyncBaseTransport):
    """Stands in for a gateway that cannot be reached, or that does not answer in time."""

    def __init__(self, error: httpx.RequestError) -> None:
        self._error = error

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        raise self._error
