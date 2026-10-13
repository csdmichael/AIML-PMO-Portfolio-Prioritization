"""UI host configuration.

config.json holds names and defaults only. The APIM base URL and the subscription key are read
from the environment on every proxied request, so no secret is ever written to a file.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

SERVER_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = SERVER_DIR / "config.json"

_UPSTREAM_SCHEMES = frozenset({"http", "https"})
_MAX_PORT = 65535


class ConfigError(ValueError):
    """config.json is unreadable, or a value in it or in the environment is invalid."""


class UpstreamNotConfigured(Exception):
    """An APIM setting is missing or invalid. ``detail`` is the message returned to the browser."""

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


@dataclass(frozen=True)
class ServerSettings:
    host: str
    port: int
    port_env_var: str
    static_directory: str
    static_path: Path
    index_file: str
    spa_fallback: bool
    index_cache_control: str
    healthz_path: str
    mime_types: Mapping[str, str]

    @property
    def index_path(self) -> Path:
        return self.static_path / self.index_file


@dataclass(frozen=True)
class ProxySettings:
    mount_path: str
    upstream_base_url_env_var: str
    subscription_key_env_var: str
    subscription_header_name: str
    timeout_seconds: float


@dataclass(frozen=True)
class Messages:
    ui_not_built: str
    not_found: str
    upstream_base_url_missing: str
    upstream_base_url_invalid: str
    subscription_key_missing: str
    upstream_unavailable: str
    upstream_timeout: str


@dataclass(frozen=True)
class AppConfig:
    server: ServerSettings
    proxy: ProxySettings
    startup_command: str
    messages: Messages


def load_config(path: Path = CONFIG_PATH) -> AppConfig:
    data = _read_object(path)
    return AppConfig(
        server=_server_settings(_section(data, "server")),
        proxy=_proxy_settings(_section(data, "proxy")),
        startup_command=_value(_section(data, "hosting"), "hosting", "startupCommand", str),
        messages=_messages(_section(data, "messages")),
    )


def resolve_port(server: ServerSettings, environ: Mapping[str, str]) -> int:
    raw = environ.get(server.port_env_var, "").strip()
    if not raw:
        return server.port
    try:
        port = int(raw)
    except ValueError:
        raise ConfigError(f"Environment variable {server.port_env_var} must be a whole number") from None
    if not 1 <= port <= _MAX_PORT:
        raise ConfigError(f"Environment variable {server.port_env_var} must be between 1 and {_MAX_PORT}")
    return port


def read_upstream_base_url(proxy: ProxySettings, messages: Messages, environ: Mapping[str, str]) -> str:
    name = proxy.upstream_base_url_env_var
    value = environ.get(name, "").strip()
    if not value:
        raise UpstreamNotConfigured(messages.upstream_base_url_missing.format(envVar=name))
    if not _is_absolute_upstream_url(value):
        raise UpstreamNotConfigured(messages.upstream_base_url_invalid.format(envVar=name))
    return value.rstrip("/")


def read_subscription_key(proxy: ProxySettings, messages: Messages, environ: Mapping[str, str]) -> str:
    name = proxy.subscription_key_env_var
    value = environ.get(name, "").strip()
    if not value:
        raise UpstreamNotConfigured(messages.subscription_key_missing.format(envVar=name))
    return value


def _is_absolute_upstream_url(value: str) -> bool:
    try:
        parts = urlsplit(value)
    except ValueError:
        return False
    return parts.scheme in _UPSTREAM_SCHEMES and bool(parts.netloc) and not parts.query and not parts.fragment


def _read_object(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise ConfigError(f"Cannot read {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ConfigError(f"{path} must contain a JSON object")
    return data


def _section(data: Mapping[str, Any], name: str) -> Mapping[str, Any]:
    return _value(data, "", name, dict)


def _value(section: Mapping[str, Any], where: str, key: str, kind: type) -> Any:
    name = f"{where}.{key}" if where else key
    if key not in section:
        raise ConfigError(f"config.json is missing '{name}'")
    value = section[key]
    if kind is int:
        valid = type(value) is int
    elif kind is float:
        valid = type(value) in (int, float)
    else:
        valid = isinstance(value, kind)
    if not valid:
        raise ConfigError(f"config.json '{name}' must be a {kind.__name__}")
    return value


def _server_settings(data: Mapping[str, Any]) -> ServerSettings:
    port = _value(data, "server", "port", int)
    if not 1 <= port <= _MAX_PORT:
        raise ConfigError(f"config.json 'server.port' must be between 1 and {_MAX_PORT}")
    static_directory = _value(data, "server", "staticDirectory", str)
    mime_types: dict[str, str] = {}
    for suffix, media_type in _value(data, "server", "mimeTypes", dict).items():
        if not isinstance(suffix, str) or not suffix.startswith(".") or not isinstance(media_type, str):
            raise ConfigError("config.json 'server.mimeTypes' maps extensions such as '.js' to media types")
        mime_types[suffix.lower()] = media_type
    return ServerSettings(
        host=_value(data, "server", "host", str),
        port=port,
        port_env_var=_value(data, "server", "portEnvVar", str),
        static_directory=static_directory,
        static_path=(SERVER_DIR / static_directory).resolve(),
        index_file=_value(data, "server", "indexFile", str),
        spa_fallback=_value(data, "server", "spaFallback", bool),
        index_cache_control=_value(data, "server", "indexCacheControl", str),
        healthz_path=_route_path(_value(data, "server", "healthzPath", str), "server.healthzPath"),
        mime_types=mime_types,
    )


def _proxy_settings(data: Mapping[str, Any]) -> ProxySettings:
    timeout = float(_value(data, "proxy", "timeoutSeconds", float))
    if timeout <= 0:
        raise ConfigError("config.json 'proxy.timeoutSeconds' must be greater than zero")
    return ProxySettings(
        mount_path=_route_path(_value(data, "proxy", "mountPath", str), "proxy.mountPath"),
        upstream_base_url_env_var=_value(data, "proxy", "upstreamBaseUrlEnvVar", str),
        subscription_key_env_var=_value(data, "proxy", "subscriptionKeyEnvVar", str),
        subscription_header_name=_value(data, "proxy", "subscriptionHeaderName", str),
        timeout_seconds=timeout,
    )


def _messages(data: Mapping[str, Any]) -> Messages:
    return Messages(
        ui_not_built=_value(data, "messages", "uiNotBuilt", str),
        not_found=_value(data, "messages", "notFound", str),
        upstream_base_url_missing=_value(data, "messages", "upstreamBaseUrlMissing", str),
        upstream_base_url_invalid=_value(data, "messages", "upstreamBaseUrlInvalid", str),
        subscription_key_missing=_value(data, "messages", "subscriptionKeyMissing", str),
        upstream_unavailable=_value(data, "messages", "upstreamUnavailable", str),
        upstream_timeout=_value(data, "messages", "upstreamTimeout", str),
    )


def _route_path(value: str, name: str) -> str:
    path = value.rstrip("/")
    if not path.startswith("/"):
        raise ConfigError(f"config.json '{name}' must be a route path such as '/api'")
    return path
