"""Static files, SPA fallback, the health probe, and the answer given before the UI is built."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import AppConfig
from app.main import create_app
from tests.support import INDEX_HTML, upstream_transport


def test_root_serves_the_index_with_the_configured_cache_policy(client: TestClient, config: AppConfig) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.text == INDEX_HTML
    assert response.headers["cache-control"] == config.server.index_cache_control


def test_client_side_routes_fall_back_to_the_index(client: TestClient) -> None:
    response = client.get("/projects/GIS-0001")
    assert response.status_code == 200
    assert response.text == INDEX_HTML


def test_existing_files_are_served_with_a_media_type(client: TestClient) -> None:
    response = client.get("/assets/app.js")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/javascript")


def test_module_scripts_get_a_javascript_media_type_on_every_platform(client: TestClient) -> None:
    response = client.get("/assets/app.mjs")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/javascript")


def test_spa_fallback_can_be_switched_off(config: AppConfig, env: dict[str, str], upstream: FastAPI) -> None:
    strict = replace(config, server=replace(config.server, spa_fallback=False))
    with TestClient(create_app(strict, environ=env, upstream_transport=upstream_transport(upstream))) as client:
        response = client.get("/projects/GIS-0001")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["detail"] == config.messages.not_found


@pytest.mark.parametrize("target", ["/%2e%2e/secret.txt", "/..%5Csecret.txt"])
def test_paths_that_escape_the_static_folder_are_never_read(client: TestClient, site_root: Path, target: str) -> None:
    (site_root.parent / "secret.txt").write_text("test-only secret", encoding="utf-8")
    response = client.get(target)
    assert "test-only secret" not in response.text


def test_missing_build_answers_503_naming_the_configured_folder(
    config: AppConfig,
    env: dict[str, str],
    upstream: FastAPI,
    tmp_path: Path,
) -> None:
    unbuilt = replace(config, server=replace(config.server, static_path=tmp_path / "not-built"))
    with TestClient(create_app(unbuilt, environ=env, upstream_transport=upstream_transport(upstream))) as client:
        response = client.get("/")
    assert response.status_code == 503
    assert response.headers["content-type"].startswith("application/problem+json")
    expected = config.messages.ui_not_built.format(staticDirectory=config.server.static_directory)
    assert response.json()["detail"] == expected


def test_healthz_reports_whether_the_static_folder_exists(
    client: TestClient,
    config: AppConfig,
    env: dict[str, str],
    upstream: FastAPI,
    tmp_path: Path,
) -> None:
    present = client.get(config.server.healthz_path)
    assert present.status_code == 200
    assert present.json() == {"status": "ok", "staticFolderExists": True}

    unbuilt = replace(config, server=replace(config.server, static_path=tmp_path / "not-built"))
    with TestClient(create_app(unbuilt, environ=env, upstream_transport=upstream_transport(upstream))) as other:
        response = other.get(config.server.healthz_path)
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "staticFolderExists": False}


def test_the_ui_route_accepts_reads_only(client: TestClient) -> None:
    assert client.post("/projects").status_code == 405
