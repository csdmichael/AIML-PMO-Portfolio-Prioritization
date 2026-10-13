"""Thread-safe TTL cache for lake exports. Only successful loads are stored, so a missing file is never cached."""

import time
from collections.abc import Callable
from threading import Lock
from typing import Generic, TypeVar

T = TypeVar("T")


class TtlCache(Generic[T]):
    def __init__(self, ttl_seconds: float, clock: Callable[[], float] = time.monotonic) -> None:
        if ttl_seconds < 0:
            raise ValueError("ttl_seconds must not be negative")
        self._ttl = ttl_seconds
        self._clock = clock
        self._entries: dict[str, tuple[float, T]] = {}
        self._lock = Lock()

    def get_or_load(self, key: str, loader: Callable[[], T]) -> T:
        with self._lock:
            entry = self._entries.get(key)
            if entry is not None and entry[0] > self._clock():
                return entry[1]
        value = loader()
        with self._lock:
            self._entries[key] = (self._clock() + self._ttl, value)
        return value

    def invalidate(self, key: str | None = None) -> None:
        with self._lock:
            if key is None:
                self._entries.clear()
            else:
                self._entries.pop(key, None)
