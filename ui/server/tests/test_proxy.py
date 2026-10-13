"""The API proxy: forwarding, header hygiene, streaming, and the errors the host answers itself."""

from __future__ import annotations

import hashlib
from collections.abc import Iterator
from contextlib import contextmanager

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import AppConfig
from app.main import create_app
from tests.support import (
    BROWSER_KEY,
    INDEX_HTML,
    STREAM_CHUNKS,
    SUBSCRIPTION_KEY,
    UPSTREAM_BASE_URL,
    UPSTREAM_HOST,
    UPSTREAM_PATH,
    FailingUpstream,
    upstream_transport,
)


@contextmanager
def open_gateway(
    config: AppConfig,
    environ: dict[str, str],
    transport: httpx.AsyncBaseTransport,
) -> Iterator[TestClient]:
    with TestClient(create_app(config, environ=environ, upstream_transport=transport)) as client:
        yield client


def received_values(upstream: FastAPI, name: str) -> list[str]:
    return [value for key, value in upstream.state.received[-1]["headers"] if key == name]


def test_forwards_method_path_query_and_base_path(client: TestClient, upstream: FastAPI) -> None:
    response = client.get("/api/v1/items/first%20item?page=2&q=a%20b")
    assert response.status_code == 200
    received = upstream.state.received[-1]
    assert received["method"] == "GET"
    assert received["path"] == f"{UPSTREAM_PATH}/v1/items/first item"
    assert received["query"] == "page=2&q=a%20b"


def test_adds_the_subscription_key_on_the_server_side(
    client: TestClient,
    upstream: FastAPI,
    config: AppConfig,
) -> None:
    header = config.proxy.subscription_header_name.lower()
    response = client.get("/api/v1/items", headers={header: BROWSER_KEY})
    assert response.status_code == 200
    assert received_values(upstream, header) == [SUBSCRIPTION_KEY]
    assert SUBSCRIPTION_KEY not in response.text
    assert all(SUBSCRIPTION_KEY not in value for value in response.headers.values())


def test_hop_by_hop_request_headers_are_not_forwarded(client: TestClient, upstream: FastAPI) -> None:
    response = client.get(
        "/api/v1/items",
        headers={
            "connection": "keep-alive, x-private-hop",
            "keep-alive": "timeout=5",
            "proxy-authorization": "test-only-proxy-credential",
            "te": "trailers",
            "x-private-hop": "1",
            "x-forwarded-note": "visible",
        },
    )
    assert response.status_code == 200
    received = upstream.state.received[-1]
    names = {key for key, _ in received["headers"]}
    assert {"keep-alive", "proxy-authorization", "te", "x-private-hop"}.isdisjoint(names)
    assert ("connection", "keep-alive, x-private-hop") not in received["headers"]
    assert ("x-forwarded-note", "visible") in received["headers"]
    assert ("host", UPSTREAM_HOST) in received["headers"]


def test_hop_by_hop_response_headers_are_not_returned(client: TestClient) -> None:
    response = client.get("/api/v1/hop")
    assert response.status_code == 200
    assert response.headers["x-visible"] == "yes"
    for name in ("keep-alive", "proxy-authenticate", "x-upstream-private"):
        assert name not in response.headers


def test_response_body_is_streamed_through(client: TestClient) -> None:
    response = client.get("/api/v1/stream")
    assert response.status_code == 200
    assert response.text == "".join(STREAM_CHUNKS)


def test_request_body_is_forwarded_intact(client: TestClient, upstream: FastAPI) -> None:
    payload = bytes(range(256)) * 4096
    response = client.post(
        "/api/v1/uploads",
        content=payload,
        headers={"content-type": "application/octet-stream"},
    )
    assert response.status_code == 200
    echoed = response.json()
    assert echoed["bodyLength"] == len(payload)
    assert echoed["bodySha256"] == hashlib.sha256(payload).hexdigest()
    assert upstream.state.received[-1]["body"] == payload


def test_upstream_status_and_body_pass_through(client: TestClient) -> None:
    response = client.get("/api/v1/status/404")
    assert response.status_code == 404
    assert response.json() == {"status": 404}


def test_bare_mount_path_maps_to_the_gateway_root(client: TestClient, upstream: FastAPI) -> None:
    assert client.get("/api").status_code == 200
    assert upstream.state.received[-1]["path"] == f"{UPSTREAM_PATH}/"


def test_paths_outside_the_mount_point_are_not_proxied(client: TestClient, upstream: FastAPI) -> None:
    response = client.get("/apiary")
    assert response.status_code == 200
    assert response.text == INDEX_HTML
    assert upstream.state.received == []


def test_missing_base_url_answers_503(config: AppConfig, upstream: FastAPI) -> None:
    environ = {config.proxy.subscription_key_env_var: SUBSCRIPTION_KEY}
    with open_gateway(config, environ, upstream_transport(upstream)) as client:
        response = client.get("/api/v1/items")
    assert response.status_code == 503
    assert response.headers["content-type"].startswith("application/problem+json")
    expected = config.messages.upstream_base_url_missing.format(envVar=config.proxy.upstream_base_url_env_var)
    assert response.json()["detail"] == expected
    assert upstream.state.received == []


def test_missing_subscription_key_answers_503(config: AppConfig, upstream: FastAPI) -> None:
    environ = {config.proxy.upstream_base_url_env_var: UPSTREAM_BASE_URL}
    with open_gateway(config, environ, upstream_transport(upstream)) as client:
        response = client.get("/api/v1/items")
    assert response.status_code == 503
    expected = config.messages.subscription_key_missing.format(envVar=config.proxy.subscription_key_env_var)
    assert response.json()["detail"] == expected
    assert upstream.state.received == []


def test_invalid_base_url_answers_503(config: AppConfig, upstream: FastAPI) -> None:
    environ = {
        config.proxy.upstream_base_url_env_var: "not a url",
        config.proxy.subscription_key_env_var: SUBSCRIPTION_KEY,
    }
    with open_gateway(config, environ, upstream_transport(upstream)) as client:
        response = client.get("/api/v1/items")
    assert response.status_code == 503
    expected = config.messages.upstream_base_url_invalid.format(envVar=config.proxy.upstream_base_url_env_var)
    assert response.json()["detail"] == expected


def test_unreachable_gateway_answers_502(config: AppConfig, env: dict[str, str]) -> None:
    transport = FailingUpstream(httpx.ConnectError("test-only refusal"))
    with open_gateway(config, env, transport) as client:
        response = client.get("/api/v1/items")
    assert response.status_code == 502
    assert response.json()["detail"] == config.messages.upstream_unavailable


def test_slow_gateway_answers_504(config: AppConfig, env: dict[str, str]) -> None:
    transport = FailingUpstream(httpx.ReadTimeout("test-only timeout"))
    with open_gateway(config, env, transport) as client:
        response = client.get("/api/v1/items")
    assert response.status_code == 504
    expected = config.messages.upstream_timeout.format(timeoutSeconds=config.proxy.timeout_seconds)
    assert response.json()["detail"] == expected


def test_environment_is_read_on_every_request(config: AppConfig, upstream: FastAPI) -> None:
    environ: dict[str, str] = {}
    with open_gateway(config, environ, upstream_transport(upstream)) as client:
        assert client.get("/api/v1/items").status_code == 503
        environ[config.proxy.upstream_base_url_env_var] = UPSTREAM_BASE_URL
        environ[config.proxy.subscription_key_env_var] = SUBSCRIPTION_KEY
        assert client.get("/api/v1/items").status_code == 200
    assert received_values(upstream, config.proxy.subscription_header_name.lower()) == [SUBSCRIPTION_KEY]


def test_defaults_to_the_process_environment(
    config: AppConfig,
    upstream: FastAPI,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(config.proxy.upstream_base_url_env_var, UPSTREAM_BASE_URL)
    monkeypatch.setenv(config.proxy.subscription_key_env_var, SUBSCRIPTION_KEY)
    with TestClient(create_app(config, upstream_transport=upstream_transport(upstream))) as client:
        assert client.get("/api/v1/items").status_code == 200
    assert received_values(upstream, config.proxy.subscription_header_name.lower()) == [SUBSCRIPTION_KEY]
