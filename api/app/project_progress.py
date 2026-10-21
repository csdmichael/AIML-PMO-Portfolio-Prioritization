"""Authoritative project commitments, including legacy records without recorded dates."""

from collections.abc import Mapping
from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, StrictBool

from app.contracts import ProjectProgressRules
from app.problems import FieldIssue, ProblemError

PROGRESS_FIELDS = ("progressStatus", "hasStarted", "completed", "startDate", "estimatedFinishDate", "completionDate", "changeRevision")


class ProjectProgressUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hasStarted: StrictBool
    startDate: date | None = None
    estimatedFinishDate: date | None = None
    completed: StrictBool = False
    completionDate: date | None = None
    expectedRevision: str | None


def progress_fields(record: Mapping[str, Any], rules: ProjectProgressRules) -> dict[str, Any]:
    status = record.get("projectStatus")
    completed = record.get("completed") is True or status == rules.completedStatus
    started = (
        True if completed or record.get("hasStarted") is True or status in rules.startedStatuses
        else False if record.get("hasStarted") is False or status in rules.notStartedStatuses
        else None
    )
    progress: Literal["completed", "started", "notStarted", "unconfirmed"] = (
        "completed" if completed else "started" if started else "notStarted" if started is False else "unconfirmed"
    )
    return {
        "progressStatus": progress,
        "hasStarted": started,
        "completed": completed,
        "startDate": record.get("startDate"),
        "estimatedFinishDate": record.get("estimatedFinishDate"),
        "completionDate": record.get("completionDate"),
        "changeRevision": record.get("changeRevision"),
    }


def validate_progress(body: ProjectProgressUpdate, current: Mapping[str, Any]) -> dict[str, Any]:
    if current.get("hasStarted") is True and not body.hasStarted:
        raise ProblemError(409, "Started projects cannot be returned to the not-started queue.", slug="conflict")
    if current.get("completed") is True and not body.completed:
        raise ProblemError(409, "A completed project cannot be reopened.", slug="conflict")
    issues: list[FieldIssue] = []
    today = date.today()
    if body.completed and not body.hasStarted:
        issues.append(FieldIssue("hasStarted", "must be true for a completed project"))
    if body.hasStarted:
        if body.startDate is None:
            issues.append(FieldIssue("startDate", "is required when the project has started"))
        elif body.startDate > today:
            issues.append(FieldIssue("startDate", "cannot be in the future"))
        if body.estimatedFinishDate is None and not (body.completed and current.get("hasStarted") is True):
            issues.append(FieldIssue("estimatedFinishDate", "is required when the project starts"))
        if body.startDate and body.estimatedFinishDate and body.estimatedFinishDate < body.startDate:
            issues.append(FieldIssue("estimatedFinishDate", "cannot be before the start date"))
    elif body.startDate or body.estimatedFinishDate or body.completionDate:
        issues.append(FieldIssue("hasStarted", "must be true before recording project dates"))
    if body.completed:
        if body.completionDate is None:
            issues.append(FieldIssue("completionDate", "is required when completing a project"))
        elif body.completionDate > today or (body.startDate and body.completionDate < body.startDate):
            issues.append(FieldIssue("completionDate", "must be between the start date and today"))
    elif body.completionDate is not None:
        issues.append(FieldIssue("completionDate", "is only recorded for completed projects"))
    if issues:
        raise ProblemError(422, "Some progress fields are not valid.", slug="validation-failed", errors=issues)
    return body.model_dump(mode="json", exclude={"expectedRevision"})
