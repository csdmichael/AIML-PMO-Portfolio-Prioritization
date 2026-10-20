"""Portfolio entries: validation against portfolioFields, then a create-only write to ui_entries/portfolios."""

import re
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

    def ensure_named(self, name: str, role: str) -> tuple[str, str | None]:
        """The portfolio for a name the agent suggested: the existing one with that name, or a new one.

        A new portfolio gets one program with the same name, so a project can always select a program.
        """
        existing = next(
            (item for item in self._catalog.portfolios() if str(item.get("displayName", "")).casefold() == name.casefold()),
            None,
        )
        if existing is not None:
            return str(existing["key"]), None
        rules = {rule.key: rule for rule in self._contract.portfolioFields}
        key = _slug(name, rules["key"].maxLength)
        code = _code(name, rules["code"].minLength, rules["code"].maxLength)
        self.create({
            "key": key, "displayName": name, "code": code, "role": role,
            "programs": [{"key": key, "displayName": name, "code": code}],
        })
        return key, key

    def can_create(self, name: str) -> bool:
        """Whether ensure_named can create a portfolio from this name: the display name, key, and code all fit the rules."""
        rules = {rule.key: rule for rule in self._contract.portfolioFields}
        display, key, code = rules.get("displayName"), rules.get("key"), rules.get("code")
        if display and not (display.minLength or 0) <= len(name) <= (display.maxLength or len(name)):
            return False
        if key and len(_slug(name, key.maxLength)) < (key.minLength or 0):
            return False
        return not (code and len(_code(name, code.minLength, code.maxLength)) < (code.minLength or 0))


def _slug(name: str, max_length: int | None) -> str:
    slug = "-".join(re.findall(r"[a-z0-9]+", name.lower()))
    return slug[:max_length].strip("-") if max_length else slug


def _code(name: str, min_length: int | None, max_length: int | None) -> str:
    initials = "".join(word[0] for word in re.findall(r"[A-Za-z0-9]+", name)).upper()
    if min_length and len(initials) < min_length:
        initials = re.sub(r"[^A-Za-z0-9]", "", name).upper()
    return initials[:max_length] if max_length else initials

