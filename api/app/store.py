"""Lake reads and writes: cached exports, and JSON entries (projects, portfolios, decisions, drafts)."""

from typing import Any

from app.cache import TtlCache
from app.onelake import LakeEntry, OneLakeClient
from app.problems import ProblemError

JSON_SUFFIX = ".json"


def missing_export_problem(lake_path: str, pipeline_name: str) -> ProblemError:
    return ProblemError(
        404,
        f"The OneLake file {lake_path} does not exist yet. Run the pipeline '{pipeline_name}' to create it.",
        slug="lake-data-missing",
        extensions={"oneLakePath": lake_path, "pipeline": pipeline_name},
    )


class ExportReader:
    """Reads exports written by notebook 02. A missing export is a 404 problem and is never cached."""

    def __init__(self, *, lake: OneLakeClient, cache: TtlCache[Any], pipeline_name: str) -> None:
        self._lake = lake
        self._cache = cache
        self._pipeline_name = pipeline_name

    def read(self, lake_path: str) -> Any:
        return self._cache.get_or_load(lake_path, lambda: self._load(lake_path))

    def invalidate(self) -> None:
        self._cache.invalidate()

    def _load(self, lake_path: str) -> Any:
        found = self._lake.read_json(lake_path)
        if found is None:
            raise missing_export_problem(lake_path, self._pipeline_name)
        return found[0]


class EntryStore:
    """JSON entries directly under a lake folder. Subfolders, such as project documents, are skipped."""

    def __init__(self, lake: OneLakeClient) -> None:
        self._lake = lake

    @staticmethod
    def _is_entry(entry: LakeEntry) -> bool:
        return entry.name.endswith(JSON_SUFFIX)

    def names(self, folder: str) -> list[str]:
        return [entry.name[: -len(JSON_SUFFIX)] for entry in self._lake.list_files(folder) if self._is_entry(entry)]

    def list(self, folder: str) -> list[tuple[str, dict[str, Any]]]:
        items: list[tuple[str, dict[str, Any]]] = []
        for entry in self._lake.list_files(folder):
            if not self._is_entry(entry):
                continue
            found = self._lake.read_json(entry.path)
            if found is not None and isinstance(found[0], dict):
                items.append((entry.name[: -len(JSON_SUFFIX)], found[0]))
        return items

    def get(self, lake_path: str) -> dict[str, Any] | None:
        found = self.get_with_etag(lake_path)
        return found[0] if found else None

    def get_with_etag(self, lake_path: str) -> tuple[dict[str, Any], str] | None:
        found = self._lake.read_json(lake_path)
        if found is None:
            return None
        value, etag = found
        if not isinstance(value, dict):
            raise ProblemError(502, f"{lake_path} does not hold a JSON object.", slug="upstream-failure")
        return value, etag

    def create(self, lake_path: str, value: dict[str, Any]) -> None:
        self._lake.write_json(lake_path, value)

    def replace(self, lake_path: str, value: dict[str, Any], etag: str) -> str:
        return self._lake.write_json(lake_path, value, etag=etag)

    def delete(self, lake_path: str) -> None:
        self._lake.delete(lake_path)
