"""FastAPI host for the PMO UI.

Serves the built Ionic app from the configured static folder with SPA fallback, answers the
health probe, and proxies the configured mount path to the API behind APIM.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator, Mapping
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, Request
from starlette.responses import FileResponse, JSONResponse, Response

from app.config import AppConfig, load_config
from app.problems import problem_response
from app.proxy import PROXIED_METHODS, ApiProxy

STATIC_METHODS = ("GET", "HEAD")


def resolve_static_file(root: Path, url_path: str) -> Path | None:
    """The file that url_path names under root, or None. Paths that resolve outside root are refused."""
    relative = url_path.lstrip("/")
    if not relative:
        return None
    try:
        candidate = (root / relative).resolve()
        found = candidate.is_relative_to(root) and candidate.is_file()
    except (OSError, ValueError):
        return None
    return candidate if found else None


def ui_not_built(settings: AppConfig, instance: str) -> Response:
    detail = settings.messages.ui_not_built.format(staticDirectory=settings.server.static_directory)
    return problem_response(503, detail, instance)


def create_app(
    config: AppConfig | None = None,
    *,
    environ: Mapping[str, str] | None = None,
    upstream_transport: httpx.AsyncBaseTransport | None = None,
) -> FastAPI:
    settings = config if config is not None else load_config()
    server = settings.server
    messages = settings.messages
    env: Mapping[str, str] = os.environ if environ is None else environ

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        client = httpx.AsyncClient(
            transport=upstream_transport,
            timeout=httpx.Timeout(settings.proxy.timeout_seconds),
        )
        app.state.proxy = ApiProxy(proxy=settings.proxy, messages=messages, environ=env, client=client)
        try:
            yield
        finally:
            await client.aclose()

    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)

    async def healthz() -> JSONResponse:
        return JSONResponse({"status": "ok", "staticFolderExists": server.static_path.is_dir()})

    async def api(request: Request) -> Response:
        return await request.app.state.proxy.forward(request)

    async def ui(request: Request) -> Response:
        url_path = request.url.path
        if not server.static_path.is_dir():
            return ui_not_built(settings, url_path)
        file_path = resolve_static_file(server.static_path, url_path)
        if file_path is not None:
            return FileResponse(file_path, media_type=server.mime_types.get(file_path.suffix.lower()))
        if not server.spa_fallback:
            return problem_response(404, messages.not_found, url_path)
        if not server.index_path.is_file():
            return ui_not_built(settings, url_path)
        return FileResponse(server.index_path, headers={"cache-control": server.index_cache_control})

    app.add_api_route(server.healthz_path, healthz, methods=["GET", "HEAD"], include_in_schema=False)
    app.add_api_route(settings.proxy.mount_path, api, methods=list(PROXIED_METHODS), include_in_schema=False)
    app.add_api_route(
        f"{settings.proxy.mount_path}/{{path:path}}",
        api,
        methods=list(PROXIED_METHODS),
        include_in_schema=False,
    )
    app.add_api_route("/{path:path}", ui, methods=list(STATIC_METHODS), include_in_schema=False)
    return app


app = create_app()
