"""Token credentials. Every token request uses the scope named in config, never a scope a library chooses."""

import os
from collections.abc import Callable
from threading import Lock
from typing import Any

from azure.core.credentials import AccessToken, TokenCredential
from azure.identity import DefaultAzureCredential


def _default_factory() -> TokenCredential:
    client_id = os.environ.get("AZURE_CLIENT_ID")
    if client_id:
        return DefaultAzureCredential(managed_identity_client_id=client_id)
    return DefaultAzureCredential()


class ScopedCredential(TokenCredential):
    """Sends every token request to the wrapped credential with one configured scope."""

    def __init__(self, credential: TokenCredential, scope: str) -> None:
        self._credential = credential
        self._scope = scope

    def get_token(self, *scopes: str, **kwargs: Any) -> AccessToken:
        return self._credential.get_token(self._scope, **kwargs)


class CredentialProvider:
    """Creates DefaultAzureCredential on first use, so importing the app makes no Azure calls."""

    def __init__(self, factory: Callable[[], TokenCredential] = _default_factory) -> None:
        self._factory = factory
        self._credential: TokenCredential | None = None
        self._lock = Lock()

    @property
    def credential(self) -> TokenCredential:
        with self._lock:
            if self._credential is None:
                self._credential = self._factory()
            return self._credential

    def scoped(self, scope: str) -> ScopedCredential:
        return ScopedCredential(self.credential, scope)

    def bearer_token(self, scope: str) -> str:
        return self.credential.get_token(scope).token
