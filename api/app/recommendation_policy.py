"""Deterministic safeguards shared by generated reports and their later approved actions."""

import unicodedata
from collections.abc import Mapping, Sequence
from typing import Any

from app.problems import ProblemError


def normalized_project_name(value: str) -> str:
    return "".join(char for char in unicodedata.normalize("NFKC", value).casefold() if char.isalnum())


def candidate_project(
    project_id: str, projects: Sequence[Mapping[str, Any]], *, portfolio_key: str | None = None, status: int = 409,
) -> Mapping[str, Any]:
    project = next((item for item in projects if item.get("projectId") == project_id), None)
    if (
        project is None or project.get("progressStatus") != "notStarted"
        or project.get("hasStarted") is not False or project.get("completed") or project.get("isDeleted")
        or (portfolio_key is not None and project.get("portfolioKey") != portfolio_key)
    ):
        raise ProblemError(
            status, f"Project {project_id} is not eligible for recommendations. Only confirmed not-started projects can be prioritized.",
            slug="conflict" if status == 409 else "upstream-failure",
        )
    return project


def new_project(
    values: Mapping[str, Any], projects: Sequence[Mapping[str, Any]], *, planning_status: str, status: int = 409,
) -> str:
    name = values.get("projectName")
    normalized = normalized_project_name(name) if isinstance(name, str) else ""
    if not normalized or values.get("projectStatus") != planning_status:
        raise ProblemError(
            status, "A recommended new project needs a name and must be in Planning, not already started.",
            slug="validation-failed" if status == 409 else "upstream-failure",
        )
    existing = next(
        (item for item in projects if normalized_project_name(str(item.get("projectName") or "")) == normalized), None,
    )
    if existing is not None:
        raise ProblemError(
            status, f"This project already exists as {existing['projectId']}. Refresh recommendations instead of creating a duplicate.",
            slug="conflict" if status == 409 else "upstream-failure",
        )
    return normalized
