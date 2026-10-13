"""Project entries and project uploads: validation, GIS-#### assignment, and lake writes."""

from collections.abc import Mapping
from typing import Any

from app.catalog import Catalog
from app.config import ProjectSettings, UploadSettings, ValidationSettings
from app.contracts import DataEntryContract
from app.files import file_suffix, iso_utc, safe_file_name, utc_now
from app.ids import IdentifierExhausted, new_identifier, next_project_id
from app.lake_paths import LakePaths
from app.onelake import LakeConflict, OneLakeClient
from app.problems import FieldIssue, ProblemError
from app.store import EntryStore
from app.validation import FieldValidator, RecordResult


class ProjectService:
    def __init__(
        self,
        *,
        lake: OneLakeClient,
        entries: EntryStore,
        paths: LakePaths,
        catalog: Catalog,
        contract: DataEntryContract,
        validation: ValidationSettings,
        project_settings: ProjectSettings,
        upload_settings: UploadSettings,
    ) -> None:
        self._lake = lake
        self._entries = entries
        self._paths = paths
        self._catalog = catalog
        self._contract = contract
        self._validation = validation
        self._project_settings = project_settings
        self._upload_settings = upload_settings

    @property
    def contract(self) -> DataEntryContract:
        return self._contract

    def validator(self) -> FieldValidator:
        return FieldValidator(
            settings=self._validation,
            project_id_pattern=self._contract.projectIdPattern,
            relationship_types=self._contract.options.relationshipTypes,
            options=self._catalog.options(),
        )

    def validate(
        self,
        values: Mapping[str, Any],
        *,
        partial: bool = False,
        context: Mapping[str, Any] | None = None,
    ) -> RecordResult:
        return self.validator().check_record(self._contract.projectFields, values, partial=partial, context=context)

    def create(self, values: Mapping[str, Any], *, extra: Mapping[str, Any] | None = None) -> dict[str, Any]:
        result = self.validate(values)
        if not result.valid:
            raise ProblemError(422, "The project does not match the data-entry rules.", slug="validation-failed", errors=result.issues)
        return self.write_entry(result.values, extra=extra)

    def write_entry(self, validated: Mapping[str, Any], *, extra: Mapping[str, Any] | None = None) -> dict[str, Any]:
        contract = self._contract
        reserved: set[str] = set()
        for _ in range(self._project_settings.idAssignmentAttempts):
            taken = set(self._catalog.project_ids()) | reserved
            try:
                project_id = next_project_id(
                    taken,
                    prefix=contract.projectIdPrefix,
                    digits=contract.projectIdDigits,
                    first_number=contract.firstNewProjectNumber,
                )
            except IdentifierExhausted as exc:
                raise ProblemError(409, str(exc), slug="conflict") from exc
            entry = {"projectId": project_id, **validated, "submittedAtUtc": utc_now(), **dict(extra or {})}
            try:
                self._entries.create(self._paths.project_entry(project_id), entry)
            except LakeConflict:
                reserved.add(project_id)
                continue
            return entry
        raise ProblemError(409, "A unique project ID could not be assigned. Try again.", slug="conflict")

    def require_project(self, project_id: str) -> dict[str, Any]:
        found = self._catalog.get_project(project_id)
        if found is None:
            raise ProblemError(404, f"Project {project_id} was not found.", slug="not-found")
        return found

    def list_uploads(self, project_id: str) -> list[dict[str, Any]]:
        self.require_project(project_id)
        items: list[dict[str, Any]] = []
        for source_key in self._contract.uploads.acceptedBySource:
            folder = self._paths.upload_folder(source_key, project_id)
            for entry in self._lake.list_files(folder):
                upload_id, _, original = entry.name.partition("_")
                items.append(
                    {
                        "uploadId": upload_id,
                        "sourceKey": source_key,
                        "fileName": original or entry.name,
                        "sizeBytes": entry.size_bytes,
                        "oneLakePath": entry.path,
                        "uploadedAt": iso_utc(entry.last_modified),
                    }
                )
        return sorted(items, key=lambda item: (item["sourceKey"], item["fileName"]))

    def add_upload(self, project_id: str, source_key: str, original_name: str, data: bytes) -> dict[str, Any]:
        self.require_project(project_id)
        uploads = self._contract.uploads
        accepted = uploads.acceptedBySource.get(source_key)
        if accepted is None:
            raise ProblemError(422, "The source is not accepted for uploads.", slug="validation-failed", errors=[FieldIssue("sourceKey", "is not an accepted upload source")])
        if file_suffix(original_name) not in accepted.extensions:
            allowed = ", ".join(accepted.extensions)
            raise ProblemError(422, "The file type is not accepted for this source.", slug="validation-failed", errors=[FieldIssue("file", f"extension must be one of: {allowed}")])
        if not data:
            raise ProblemError(422, "The file is empty.", slug="validation-failed", errors=[FieldIssue("file", "is empty")])
        if len(data) > uploads.maxFileBytes:
            raise ProblemError(413, "The file is larger than the upload limit.", slug="payload-too-large", extensions={"maxFileBytes": uploads.maxFileBytes})
        folder = self._paths.upload_folder(source_key, project_id)
        if len(self._lake.list_files(folder)) >= uploads.maxFilesPerSourcePerProject:
            raise ProblemError(409, "The upload limit for this source is reached for this project.", slug="conflict", extensions={"maxFiles": uploads.maxFilesPerSourcePerProject})
        upload_id = new_identifier()
        file_name = safe_file_name(original_name, self._upload_settings)
        path = self._paths.named_file(folder, upload_id, file_name)
        self._lake.write_bytes(path, data)
        return {
            "uploadId": upload_id,
            "sourceKey": source_key,
            "fileName": file_name,
            "sizeBytes": len(data),
            "oneLakePath": path,
            "uploadedAt": utc_now(),
        }
