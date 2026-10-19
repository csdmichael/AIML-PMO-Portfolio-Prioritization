import time
from types import SimpleNamespace
from unittest.mock import Mock

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.agent_tools import ToolTokenVerifier
from app.problems import ProblemError


@pytest.fixture
def identity(monkeypatch):
    monkeypatch.setenv("PMO_TOOL_TENANT_ID", "test-tenant")
    monkeypatch.setenv("PMO_TOOL_AUDIENCE", "test-audience")
    monkeypatch.setenv("PMO_TOOL_CALLER_OBJECT_ID", "test-caller")
    verifier = ToolTokenVerifier()
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    verifier.jwks = Mock()
    verifier.jwks.get_signing_key_from_jwt.return_value = SimpleNamespace(key=key.public_key())
    claims = {
        "exp": int(time.time()) + 300, "iat": int(time.time()), "aud": "test-audience",
        "iss": "https://login.microsoftonline.com/test-tenant/v2.0", "tid": "test-tenant",
        "oid": "test-caller", "roles": ["Portfolio.Query"],
    }
    return verifier, key, claims


def test_valid_workload(identity):
    verifier, key, claims = identity
    verifier.verify("Bearer " + jwt.encode(claims, key, algorithm="RS256"))


def test_explicitly_allowed_project_managed_identity(identity, monkeypatch):
    _, key, claims = identity
    monkeypatch.setenv("PMO_TOOL_CALLER_OBJECT_ID", "test-caller,project-caller")
    verifier = ToolTokenVerifier()
    verifier.jwks = Mock()
    verifier.jwks.get_signing_key_from_jwt.return_value = SimpleNamespace(key=key.public_key())
    verifier.verify("Bearer " + jwt.encode({**claims, "oid": "project-caller"}, key, algorithm="RS256"))


@pytest.mark.parametrize("patch", [
    {"aud": "another-api"}, {"tid": "another-tenant"}, {"oid": "another-workload"},
    {"roles": []}, {"iss": "https://attacker.test"}, {"exp": 1},
])
def test_signed_but_unauthorized_workload_rejected(identity, patch):
    verifier, key, claims = identity
    with pytest.raises(ProblemError):
        verifier.verify("Bearer " + jwt.encode({**claims, **patch}, key, algorithm="RS256"))


def test_forged_signature_and_missing_token_rejected(identity):
    verifier, _, claims = identity
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    for authorization in ("", "Bearer " + jwt.encode(claims, other_key, algorithm="RS256")):
        with pytest.raises(ProblemError):
            verifier.verify(authorization)


def test_unconfigured_tool_is_fail_closed(monkeypatch):
    monkeypatch.delenv("PMO_TOOL_TENANT_ID", raising=False)
    with pytest.raises(ProblemError):
        ToolTokenVerifier().verify("Bearer anything")
