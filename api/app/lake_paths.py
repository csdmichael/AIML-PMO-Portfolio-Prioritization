"""Lakehouse-relative paths for every file the API reads or writes. Built only from config."""

from app.config import AppConfig, ConfigError


class LakePaths:
    def __init__(self, config: AppConfig) -> None:
        values = config.values
        onelake = config.api.oneLake
        lake = config.data_entry.lake
        uploads = config.data_entry.uploads
        self.raw_root = values.raw_root.strip("/")
        self.exports_root = values.exports_root.strip("/")
        self._export_files = onelake.exportFiles
        self._projects = lake.manualProjectsFolder.strip("/")
        self._portfolios = lake.manualPortfoliosFolder.strip("/")
        self._decisions = f"{self.raw_root}/{onelake.uiEntryFolders.decisions}"
        self._drafts = f"{self.raw_root}/{onelake.uiEntryFolders.drafts}"
        self._project_changes = f"{self.raw_root}/{onelake.uiEntryFolders.projectChanges}"
        self._upload_folder_template = uploads.oneLakeFolderTemplate
        self._file_name_template = uploads.fileNameTemplate
        self._source_folders = {source.key: source.folder for source in config.data_sources.sources}

    def portfolio_export(self) -> str:
        return f"{self.exports_root}/{self._export_files.portfolio}"

    def capacity_export(self) -> str:
        return f"{self.exports_root}/{self._export_files.capacityScenarios}"

    def project_entries_folder(self) -> str:
        return self._projects

    def project_entry(self, project_id: str) -> str:
        return f"{self._projects}/{project_id}.json"

    def project_documents_folder(self, project_id: str) -> str:
        return f"{self._projects}/{project_id}/documents"

    def portfolio_entries_folder(self) -> str:
        return self._portfolios

    def portfolio_entry(self, key: str) -> str:
        return f"{self._portfolios}/{key}.json"

    def decisions_folder(self) -> str:
        return self._decisions

    def decision(self, decision_id: str) -> str:
        return f"{self._decisions}/{decision_id}.json"

    def drafts_folder(self) -> str:
        return self._drafts

    def draft(self, draft_id: str) -> str:
        return f"{self._drafts}/{draft_id}.json"

    def draft_documents_folder(self, draft_id: str) -> str:
        return f"{self._drafts}/{draft_id}/documents"

    def project_changes_folder(self) -> str:
        return self._project_changes

    def project_change(self, project_id: str) -> str:
        return f"{self._project_changes}/{project_id}.json"

    def source_folder(self, source_key: str) -> str:
        try:
            return self._source_folders[source_key]
        except KeyError as exc:
            raise ConfigError(f"data-sources.json has no source '{source_key}'") from exc

    def upload_folder(self, source_key: str, project_id: str) -> str:
        return self._upload_folder_template.format(
            rawRoot=self.raw_root,
            sourceFolder=self.source_folder(source_key),
            projectId=project_id,
        )

    def named_file(self, folder: str, file_id: str, original_name: str) -> str:
        name = self._file_name_template.format(uploadId=file_id, originalName=original_name)
        return f"{folder}/{name}"
