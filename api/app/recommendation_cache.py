"""Durable recommendation snapshots in OneLake, isolated by portfolio and research question."""

import hashlib
import json
from collections.abc import Callable
from typing import Any

from app.lake_paths import LakePaths
from app.onelake import OneLakeClient
from app.problems import ProblemError


class RecommendationCache:
    def __init__(self, *, lake: OneLakeClient, paths: LakePaths, state_provider: Callable[[], Any] | None = None) -> None:
        self._lake = lake
        self._paths = paths
        self._state_provider = state_provider

    def revision(self) -> str | None:
        found = self._lake.read_json(self._paths.project_resets())
        revision = None
        if found is not None:
            document = found[0]
            if not isinstance(document, dict) or not isinstance(document.get("revision"), str):
                raise ProblemError(502, "The project dataset revision is invalid.", slug="upstream-failure")
            revision = document["revision"]
        if self._state_provider is None:
            return revision
        state = json.dumps([revision, self._state_provider()], sort_keys=True, ensure_ascii=True, separators=(",", ":"))
        return hashlib.sha256(state.encode("utf-8")).hexdigest()

    def _path(self, portfolio_key: str | None, query: str | None, revision: str | None = None) -> str:
        scope_values = [self._paths.recommendation_policy_version, portfolio_key, query, revision]
        scope = json.dumps(scope_values, ensure_ascii=True)
        cache_key = hashlib.sha256(scope.encode("utf-8")).hexdigest()
        return self._paths.recommendation_report(cache_key)

    def read(self, *, portfolio_key: str | None, query: str | None) -> dict[str, Any] | None:
        path = self._path(portfolio_key, query, self.revision())
        found = self._lake.read_json(path)
        if found is None:
            return None
        report, _ = found
        if not isinstance(report, dict) or report.get("portfolioKey") != portfolio_key or report.get("query") != query:
            raise ProblemError(502, "The saved recommendation report is invalid.", slug="upstream-failure")
        return report

    def save(self, report: dict[str, Any], *, revision: str | None = None) -> None:
        if self.revision() != revision:
            raise ProblemError(409, "Projects, progress, or priority settings changed during the agent run. Refresh recommendations again.", slug="conflict")
        path = self._path(report["portfolioKey"], report["query"], revision)
        # Each snapshot replaces only the same scope; failed agent runs never reach this write.
        self._lake.write_json(path, report, overwrite=True)
