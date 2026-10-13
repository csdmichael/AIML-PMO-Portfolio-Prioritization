"""Shared helpers for route modules: service access and identifier checks."""

import re

from fastapi import Request

from app.container import Services
from app.problems import FieldIssue, ProblemError

GUID_PATTERN = r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"


def get_services(request: Request) -> Services:
    services: Services = request.app.state.services
    return services


def require_project_id(value: str, pattern: str) -> str:
    if not re.fullmatch(pattern, value):
        raise ProblemError(422, "The project ID is not valid.", slug="validation-failed", errors=[FieldIssue("projectId", "must be a valid project ID")])
    return value


def require_guid(value: str, field: str) -> str:
    if not re.fullmatch(GUID_PATTERN, value):
        raise ProblemError(422, f"{field} must be a GUID.", slug="validation-failed", errors=[FieldIssue(field, "must be a GUID")])
    return value
