"""Portfolio entries: validation against portfolioFields, then a create-only write to ui_entries/portfolios."""

from collections.abc import Mapping
from typing import Any

from app.catalog import Catalog
from app.config import ProjectSettings, ValidationSettings
from app.contracts import DataEntryContract
from app.files import utc_now
from app.lake_paths import LakePaths
from app.onelake import LakeConflict
from app.problems import FieldIssue, ProblemError
from app.store import EntryStore
from app.validation import FieldValidator


class PortfolioService:
    def __init__(
        self,
        *,
        entries: EntryStore,
        paths: LakePaths,
        catalog: Catalog,
        contract: DataEntryContract,
        validation: ValidationSettings,
        statuses: ProjectSettings,
    ) -> None:
        self._statuses = statuses
        self._entries = entries
        self._paths = paths
        self._catalog = catalog
        self._contract = contract
        self._validation = validation

    def create(self, values: Mapping[str, Any]) -> dict[str, Any]:
        validator = FieldValidator(
            settings=self._validation,
            project_id_pattern=self._contract.projectIdPattern,
            relationship_types=self._contract.options.relationshipTypes,
            options=self._catalog.options(),
        )
        result = validator.check_record(self._contract.portfolioFields, values)
        if not result.valid:
            raise ProblemError(422, "The portfolio does not match the data-entry rules.", slug="validation-failed", errors=result.issues)
        key = str(result.values["key"])
        if self._catalog.portfolio(key) is not None:
            raise ProblemError(409, f"Portfolio key '{key}' already exists.", slug="conflict", errors=[FieldIssue("key", "is already in use")])
        entry = {**result.values, "submittedAtUtc": utc_now()}
        try:
            self._entries.create(self._paths.portfolio_entry(key), entry)
        except LakeConflict as exc:
            raise ProblemError(409, f"Portfolio key '{key}' already exists.", slug="conflict") from exc
        return {**entry, "status": self._statuses.statusPending}
