"""Option lists for the Data Entry form and the agents: data-entry.json, plus values users added.

The full data-entry document is one OneLake file, so an added option survives restarts and reaches every instance
after the cache expires. If a refresh fails, the copy loaded earlier stays in use. A save reads the document again and
writes only if it has not changed since that read (ETag), so two instances cannot drop each other's options.
"""

import logging
import threading
import time
from collections.abc import Callable

from pydantic import ValidationError

from app.contracts import DataEntryContract, OptionLists
from app.onelake import LakeConflict, LakeError, OneLakeClient
from app.problems import ProblemError

logger = logging.getLogger("pmo.api.options")


class OptionsStore:
    def __init__(
        self,
        *,
        lake: OneLakeClient,
        contract: DataEntryContract,
        path: str,
        ttl_seconds: float,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._lake = lake
        self._contract = contract
        self._path = path
        self._ttl = ttl_seconds
        self._clock = clock
        self._loaded_at: float | None = None
        self._etag: str | None = None
        self._lock = threading.RLock()

    def current(self) -> OptionLists:
        with self._lock:
            if self._loaded_at is None or self._clock() - self._loaded_at >= self._ttl:
                try:
                    self._load()
                except (LakeError, ProblemError):
                    if self._loaded_at is None:
                        raise
                    logger.warning("Option lists could not be refreshed from OneLake; using the copy loaded earlier.")
            return self._contract.options

    def add_option(self, list_name: str, value: str) -> str:
        """Add a value to a static list. An existing value that matches ignoring case is returned instead."""
        with self._lock:
            self._load()
            options = self._contract.options
            values: list[str] = getattr(options, list_name)
            existing = next((item for item in values if item.casefold() == value.casefold()), None)
            if existing is not None:
                return existing
            updated = options.model_copy(deep=True)
            setattr(updated, list_name, [*values, value])
            self._save(updated)
            return value

    def replace(self, options: OptionLists) -> None:
        with self._lock:
            self._load()
            self._save(options)

    def _load(self) -> None:
        found = self._lake.read_json(self._path)
        self._etag = found[1] if found is not None else None
        if found is not None:
            document, _ = found
            stored = document.get("options") if isinstance(document, dict) else None
            if not isinstance(stored, dict):
                raise ProblemError(502, f"{self._path} does not hold an options object.", slug="upstream-failure")
            try:
                self._contract.options = OptionLists.model_validate(stored)
            except ValidationError as error:
                raise ProblemError(
                    502, f"{self._path} holds option lists that do not match the contract.", slug="upstream-failure",
                ) from error
        self._loaded_at = self._clock()

    def _save(self, options: OptionLists) -> None:
        document = {**self._contract.model_dump(), "options": options.model_dump()}
        try:
            etag = self._lake.write_json(self._path, document, etag=self._etag)
        except LakeConflict as error:
            raise ProblemError(
                409, "The option lists changed while this change was being saved. Try again.", slug="conflict",
            ) from error
        self._contract.options = options
        self._etag = etag
        self._loaded_at = self._clock()
