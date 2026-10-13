"""Fixtures. Each test builds its own static folder and upstream stub, so nothing is shipped."""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import replace
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import AppConfig, load_config
from app.main import create_app
from tests.support import APP_JS, INDEX_HTML, SUBSCRIPTION_KEY, UPSTREAM_BASE_URL, build_upstream_stub, upstream_transport


@pytest.fixture
def settings() -> AppConfig:
    return load_config()


@pytest.fixture
def site_root(tmp_path: Path) -> Path:
    root = tmp_path / "www"
    (root / "assets").mkdir(parents=True)
    (root / "index.html").write_text(INDEX_HTML, encoding="utf-8")
    (root / "assets" / "app.js").write_text(APP_JS, encoding="utf-8")
    (root / "assets" / "app.mjs").write_text(APP_JS, encoding="utf-8")
    return root


@pytest.fixture
def config(settings: AppConfig, site_root: Path) -> AppConfig:
    return replace(settings, server=replace(settings.server, static_path=site_root))


@pytest.fixture
def upstream() -> FastAPI:
    return build_upstream_stub()


@pytest.fixture
def env(config: AppConfig) -> dict[str, str]:
    return {
        config.proxy.upstream_base_url_env_var: UPSTREAM_BASE_URL,
        config.proxy.subscription_key_env_var: SUBSCRIPTION_KEY,
    }


@pytest.fixture
def client(config: AppConfig, env: dict[str, str], upstream: FastAPI) -> Iterator[TestClient]:
    app = create_app(config, environ=env, upstream_transport=upstream_transport(upstream))
    with TestClient(app) as test_client:
        yield test_client
