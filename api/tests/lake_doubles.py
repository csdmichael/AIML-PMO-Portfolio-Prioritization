import copy
from types import SimpleNamespace

from app.onelake import LakeConflict, LakeError


class MemoryLake:
    """In-memory OneLake files with the same create-only and ETag rules as the real client."""

    def __init__(self) -> None:
        self.files: dict[str, tuple[object, str]] = {}
        self._version = 0

    def read_json(self, lake_path: str):
        found = self.files.get(lake_path)
        return None if found is None else (copy.deepcopy(found[0]), found[1])

    def write_json(self, lake_path: str, value, *, etag: str | None = None, overwrite: bool = False) -> str:
        current = self.files.get(lake_path)
        if etag is None and not overwrite and current is not None:
            raise LakeConflict(f"{lake_path} already exists")
        if etag is not None and (current is None or current[1] != etag):
            raise LakeConflict(f"{lake_path} changed")
        self._version += 1
        new_etag = f"etag-{self._version}"
        self.files[lake_path] = (copy.deepcopy(value), new_etag)
        return new_etag

    def list_files(self, folder: str):
        prefix = folder.rstrip("/") + "/"
        names = [path for path in sorted(self.files) if path.startswith(prefix) and "/" not in path[len(prefix):]]
        return [SimpleNamespace(name=path[len(prefix):], path=path, size_bytes=0, last_modified=None) for path in names]

    def delete(self, lake_path: str) -> None:
        self.files.pop(lake_path, None)

    def read_table(self, table_name: str):
        found = self.read_json(f"Tables/{table_name}/records.json")
        if found is None:
            return None
        if not isinstance(found[0], list) or not all(isinstance(row, dict) for row in found[0]):
            raise LakeError(f"{table_name} is not an array of records")
        return found[0]

    def write_table(self, table_name: str, records):
        return self.write_json(f"Tables/{table_name}/records.json", records, overwrite=True)
