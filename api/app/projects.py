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
from app.project_changes import ProjectChanges
from app.project_progress import ProjectProgressUpdate, validate_progress
from app.recommendation_policy import new_project
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
        changes: ProjectChanges,
    ) -> None:
        self._lake = lake
        self._entries = entries
        self._paths = paths
        self._catalog = catalog
        self._contract = contract
        self._validation = validation
        self._project_settings = project_settings
        self._upload_settings = upload_settings
        self._changes = changes

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

    def create(
        self, values: Mapping[str, Any], *, extra: Mapping[str, Any] | None = None, recommendation: bool = False,
    ) -> dict[str, Any]:
        result = self.validate(values)
        if not result.valid:
            raise ProblemError(422, "The project does not match the data-entry rules.", slug="validation-failed", errors=result.issues)
        return self.write_entry(result.values, extra=extra, recommendation=recommendation)

    def write_entry(
        self, validated: Mapping[str, Any], *, extra: Mapping[str, Any] | None = None, recommendation: bool = False,
    ) -> dict[str, Any]:
        contract = self._contract
        reserved: set[str] = set()
        for _ in range(self._project_settings.idAssignmentAttempts):
            taken = set(self._catalog.project_ids()) | reserved
            if recommendation:
                new_project(
                    validated, self._catalog.agent_snapshot()["projects"], planning_status=contract.progress.planningStatus,
                )
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

    def update_fields(self, project_id: str, body: Mapping[str, Any]) -> dict[str, Any]:
        """Change project fields and/or soft delete or restore a project. Fields follow the data-entry rules."""
        current = self.require_project(project_id)
        issues: list[FieldIssue] = []
        if "isDeleted" in body and not isinstance(body["isDeleted"], bool):
            issues.append(FieldIssue("isDeleted", "must be true or false"))
        field_provenance = body.get("fieldProvenance")
        if field_provenance is not None and not isinstance(field_provenance, Mapping):
            issues.append(FieldIssue("fieldProvenance", "must be an object"))
        values = {key: value for key, value in body.items() if key not in ("isDeleted", "fieldProvenance")}
        known = {rule.key for rule in self._contract.projectFields}
        issues.extend(FieldIssue(key, "is not a project field") for key in values if key not in known)
        if "portfolioKey" in values and "programKey" not in values:
            issues.append(FieldIssue("programKey", "is required when the portfolio changes"))
        result = self.validate(
            {key: value for key, value in values.items() if key in known},
            partial=True,
            context={"portfolioKey": current.get("portfolioKey")},
        )
        issues.extend(result.issues)
        if issues:
            raise ProblemError(422, "Some fields are not valid.", slug="validation-failed", errors=issues)
        status = result.values.get("projectStatus")
        rules = self._contract.progress
        if status is not None:
            if current.get("hasStarted") is True and status in rules.notStartedStatuses:
                raise ProblemError(409, "Started projects cannot be returned to the not-started queue.", slug="conflict")
            if current.get("completed") is True and status != rules.completedStatus:
                raise ProblemError(409, "A completed project cannot be reopened.", slug="conflict")
            if status == rules.completedStatus and not current.get("completed"):
                raise ProblemError(422, "Use Record progress to complete the project and record its completion date.", slug="validation-failed")
            if status in rules.startedStatuses and current.get("hasStarted") is not True:
                raise ProblemError(422, "Use Record progress to start the project and record its dates.", slug="validation-failed")
        is_deleted = body["isDeleted"] if "isDeleted" in body else None
        if result.values or is_deleted is not None or field_provenance is not None:
            self._changes.save(
                project_id,
                values=result.values,
                is_deleted=is_deleted,
                field_provenance=field_provenance,
                expected_revision=current.get("changeRevision"),
            )
        updated = self._catalog.get_project(project_id)
        if updated is None:
            raise ProblemError(404, f"Project {project_id} was not found.", slug="not-found")
        return updated

    def update_progress(self, project_id: str, body: ProjectProgressUpdate) -> dict[str, Any]:
        current = self.require_project(project_id)
        if current.get("isDeleted"):
            raise ProblemError(409, "Restore the project before updating its progress.", slug="conflict")
        progress = validate_progress(body, current)
        rules = self._contract.progress
        status = (
            rules.completedStatus if body.completed
            else current.get("projectStatus") if body.hasStarted and current.get("projectStatus") in rules.startedStatuses
            else rules.startStatus if body.hasStarted
            else current.get("projectStatus") if current.get("projectStatus") in rules.notStartedStatuses
            else rules.planningStatus
        )
        self._changes.save(
            project_id, values={"projectStatus": status}, progress=progress, expected_revision=body.expectedRevision,
        )
        return self.require_project(project_id)

    def remove(self, project_id: str) -> dict[str, Any]:
        """Remove a project from every view. The entry stays in OneLake for audit."""
        self.require_project(project_id)
        self._changes.save(project_id, deleted=True)
        return {"projectId": project_id, "deleted": True}

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
