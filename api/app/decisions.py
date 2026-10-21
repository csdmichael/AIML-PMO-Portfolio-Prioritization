"""PMO decisions: validated against api.json, one file per decision under ui_entries/decisions."""

import re
from collections.abc import Mapping
from typing import Any

from app.catalog import Catalog
from app.config import DecisionSettings
from app.files import utc_now
from app.ids import new_identifier
from app.lake_paths import LakePaths
from app.problems import FieldIssue, ProblemError
from app.recommendation_policy import candidate_project
from app.store import EntryStore


def _as_text(value: Any, name: str, issues: list[FieldIssue]) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        issues.append(FieldIssue(name, "must be text"))
        return ""
    return value.strip()


class DecisionService:
    def __init__(
        self,
        *,
        entries: EntryStore,
        paths: LakePaths,
        catalog: Catalog,
        settings: DecisionSettings,
        project_id_pattern: str,
    ) -> None:
        self._entries = entries
        self._paths = paths
        self._catalog = catalog
        self._settings = settings
        self._project_id = re.compile(project_id_pattern)

    def create(self, body: Mapping[str, Any]) -> dict[str, Any]:
        issues: list[FieldIssue] = []
        project_id = _as_text(body.get("projectId"), "projectId", issues)
        decision = _as_text(body.get("decision"), "decision", issues)
        reason = _as_text(body.get("reason"), "reason", issues)
        decided_by = _as_text(body.get("decidedBy"), "decidedBy", issues)
        action = _as_text(body.get("action"), "action", issues)
        if not self._project_id.fullmatch(project_id):
            issues.append(FieldIssue("projectId", "must be a valid project ID"))
        elif project_id not in self._catalog.project_ids():
            issues.append(FieldIssue("projectId", "does not match a known project"))
        if decision not in self._settings.tiers:
            issues.append(FieldIssue("decision", "must be one of: " + ", ".join(self._settings.tiers)))
        if action and action not in self._settings.actions:
            issues.append(FieldIssue("action", "must be one of: " + ", ".join(self._settings.actions)))
        if not self._settings.reasonMinLength <= len(reason) <= self._settings.reasonMaxLength:
            issues.append(FieldIssue("reason", f"must be {self._settings.reasonMinLength} to {self._settings.reasonMaxLength} characters"))
        if len(decided_by) > self._settings.decidedByMaxLength:
            issues.append(FieldIssue("decidedBy", f"must be at most {self._settings.decidedByMaxLength} characters"))
        if issues:
            raise ProblemError(422, "The decision does not match the decision rules.", slug="validation-failed", errors=issues)
        if body.get("recommendation"):
            candidate_project(project_id, self._catalog.agent_snapshot()["projects"])
        decision_id = new_identifier(self._settings.idPrefix)
        entry = {
            "decisionId": decision_id,
            "projectId": project_id,
            "decision": decision,
            "action": action or None,
            "reason": reason,
            "decidedBy": decided_by or None,
            "recordedAtUtc": utc_now(),
        }
        path = self._paths.decision(decision_id)
        self._entries.create(path, entry)
        return {**entry, "oneLakePath": path}

    def list_decisions(self, project_id: str | None = None) -> list[dict[str, Any]]:
        items = [
            entry
            for _, entry in self._entries.list(self._paths.decisions_folder())
            if project_id is None or entry.get("projectId") == project_id
        ]
        return sorted(items, key=lambda entry: str(entry.get("recordedAtUtc") or ""), reverse=True)
