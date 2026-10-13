"""config.json contract, and the environment values it names."""

from __future__ import annotations

from urllib.parse import urlunsplit

import pytest

from app.config import (
    SERVER_DIR,
    ConfigError,
    UpstreamNotConfigured,
    load_config,
    read_subscription_key,
    read_upstream_base_url,
    resolve_port,
)
from tests.support import SUBSCRIPTION_KEY, UPSTREAM_BASE_URL, UPSTREAM_HOST


def test_static_folder_resolves_relative_to_the_server_folder() -> None:
    server = load_config().server
    assert server.static_path == (SERVER_DIR / server.static_directory).resolve()
    assert server.static_path.is_absolute()


def test_startup_command_binds_the_port_variable() -> None:
    assert load_config().startup_command.endswith("--port $PORT")


def test_port_comes_from_config_unless_the_port_variable_is_set() -> None:
    server = load_config().server
    assert resolve_port(server, {}) == server.port
    assert resolve_port(server, {server.port_env_var: "9123"}) == 9123


@pytest.mark.parametrize("raw", ["not-a-port", "0", "70000"])
def test_invalid_port_variable_is_rejected(raw: str) -> None:
    server = load_config().server
    with pytest.raises(ConfigError):
        resolve_port(server, {server.port_env_var: raw})


def test_upstream_base_url_is_read_without_a_trailing_slash() -> None:
    settings = load_config()
    name = settings.proxy.upstream_base_url_env_var
    assert read_upstream_base_url(settings.proxy, settings.messages, {name: f"{UPSTREAM_BASE_URL}/"}) == UPSTREAM_BASE_URL


def test_missing_upstream_base_url_uses_the_configured_message() -> None:
    settings = load_config()
    name = settings.proxy.upstream_base_url_env_var
    with pytest.raises(UpstreamNotConfigured) as caught:
        read_upstream_base_url(settings.proxy, settings.messages, {})
    assert caught.value.detail == settings.messages.upstream_base_url_missing.format(envVar=name)


@pytest.mark.parametrize(
    "value",
    [
        urlunsplit(("ftp", UPSTREAM_HOST, "", "", "")),
        urlunsplit(("http", "", "", "", "")),
        urlunsplit(("http", UPSTREAM_HOST, "", "query=1", "")),
        "not a url",
    ],
)
def test_invalid_upstream_base_url_is_rejected(value: str) -> None:
    settings = load_config()
    name = settings.proxy.upstream_base_url_env_var
    with pytest.raises(UpstreamNotConfigured) as caught:
        read_upstream_base_url(settings.proxy, settings.messages, {name: value})
    assert caught.value.detail == settings.messages.upstream_base_url_invalid.format(envVar=name)


def test_subscription_key_is_read_from_the_environment_and_trimmed() -> None:
    settings = load_config()
    name = settings.proxy.subscription_key_env_var
    value = read_subscription_key(settings.proxy, settings.messages, {name: f"  {SUBSCRIPTION_KEY}\n"})
    assert value == SUBSCRIPTION_KEY


def test_missing_subscription_key_uses_the_configured_message() -> None:
    settings = load_config()
    name = settings.proxy.subscription_key_env_var
    with pytest.raises(UpstreamNotConfigured) as caught:
        read_subscription_key(settings.proxy, settings.messages, {name: "   "})
    assert caught.value.detail == settings.messages.subscription_key_missing.format(envVar=name)


def test_config_file_with_a_missing_section_is_rejected(tmp_path) -> None:
    broken = tmp_path / "config.json"
    broken.write_text('{"server": {}}', encoding="utf-8")
    with pytest.raises(ConfigError):
        load_config(broken)
