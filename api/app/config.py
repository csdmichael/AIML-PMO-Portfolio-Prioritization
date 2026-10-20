"""Loads api/config/api.json and the shared configs (config/shared, or the folder named by CONFIG_DIR).

Fabric and OneLake values are looked up through the {file, path} references in api.json, so the code
never holds a workspace ID, a URL, or a lakehouse name.
"""

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.contracts import AiPrefillSettings, DataEntryContract, DataSourcesContract, OneLakeDatasetsContract, OptionLists, RecommendationSettings

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
API_SETTINGS_FILE = API_ROOT / "config" / "api.json"

_DYNAMIC_SELECT_SOURCES = frozenset({"portfolios", "programsOfPortfolio"})
_IMPORT_LOOKUPS = frozenset({"portfolioName", "programName", "skillName"})
_OPTIONS_PREFIX = "options."


class ConfigError(RuntimeError):
    """A config file is missing, malformed, or inconsistent with another config file."""


class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")


class TagSetting(Settings):
    name: str
    description: str


class ApiInfo(Settings):
    title: str
    description: str
    version: str
    routePrefix: str
    docsPath: str
    openApiPath: str
    tags: list[TagSetting]


class HostingSettings(Settings):
    host: str
    port: int
    startupCommand: str


class CacheSettings(Settings):
    ttlSeconds: float


class PagingSettings(Settings):
    defaultPageSize: int
    maxPageSize: int


class AuthSettings(Settings):
    storageScope: str
    fabricScope: str


class SharedFileSettings(Settings):
    fileName: str
    repoSource: str


class SharedConfigSettings(Settings):
    environmentVariable: str
    defaultDirectory: str
    files: dict[str, SharedFileSettings]


class FileRef(Settings):
    file: str
    path: str


class FabricSettings(Settings):
    timeoutSeconds: float
    pipelineItemType: str
    workspaceName: FileRef
    workspaceId: FileRef
    lakehouseName: FileRef
    apiBaseUrl: FileRef
    pipelineDisplayName: FileRef
    pipelineJobType: FileRef


class ExportFileNames(Settings):
    portfolio: str
    capacityScenarios: str


class UiEntryFolders(Settings):
    decisions: str
    projectChanges: str
    drafts: str


class OneLakeSettings(Settings):
    dfsEndpoint: FileRef
    itemSuffix: str
    lookupsFile: str
    rawRoot: FileRef
    exportsRoot: FileRef
    exportFiles: ExportFileNames
    uiEntryFolders: UiEntryFolders


class OpenApiSettings(Settings):
    outputFile: FileRef


class LengthRule(Settings):
    minLength: int
    maxLength: int


class ValidationSettings(Settings):
    emailPattern: str
    slugPattern: str
    codePattern: str
    programDisplayName: LengthRule
    programCode: LengthRule


class ProjectSettings(Settings):
    idAssignmentAttempts: int
    statusProcessed: str
    statusPending: str
    projectNameField: str


class UploadSettings(Settings):
    maxOriginalNameLength: int
    unsafeFileNameCharacters: str
    fallbackFileName: str


class DecisionSettings(Settings):
    idPrefix: str
    tiers: list[str]
    actions: list[str]
    reasonMinLength: int
    reasonMaxLength: int
    decidedByMaxLength: int


class ProblemSettings(Settings):
    typeBase: str


class PipelineSettings(Settings):
    acceptedStatus: str


class IdentifierColumn(Settings):
    header: str
    fieldKey: str | None = None


class IntakeWorkbookSettings(Settings):
    fileName: str
    sourceKey: str
    tableName: str
    listsSheetName: str
    dropdownRows: int
    contentType: str
    identifierColumns: list[IdentifierColumn]
    signalColumns: list[str]


class TemplateSettings(Settings):
    intakeWorkbook: IntakeWorkbookSettings


class IntakeStatuses(Settings):
    draft: str
    prefilled: str
    submitted: str


class IntakeSettings(Settings):
    draftIdPrefix: str
    schemaName: str
    statuses: IntakeStatuses


class ProjectImportColumn(Settings):
    header: str
    fieldKey: str
    required: bool = False
    lookup: str | None = None


class ProjectImportSettings(Settings):
    fileName: str
    contentType: str
    sheetName: str | None = None
    headerRow: int
    maxRows: int
    booleanWords: dict[str, list[str]]
    columns: list[ProjectImportColumn]


class ApiSettings(Settings):
    api: ApiInfo
    hosting: HostingSettings
    cache: CacheSettings
    paging: PagingSettings
    auth: AuthSettings
    sharedConfig: SharedConfigSettings
    fabric: FabricSettings
    oneLake: OneLakeSettings
    openApi: OpenApiSettings
    validation: ValidationSettings
    projects: ProjectSettings
    uploads: UploadSettings
    decisions: DecisionSettings
    projectImport: ProjectImportSettings
    pipeline: PipelineSettings
    problems: ProblemSettings
    templates: TemplateSettings
    intake: IntakeSettings


@dataclass(frozen=True)
class ResolvedValues:
    workspace_name: str
    workspace_id: str
    lakehouse_name: str
    api_base_url: str
    pipeline_display_name: str
    pipeline_job_type: str
    dfs_endpoint: str
    raw_root: str
    exports_root: str
    openapi_output_file: str


@dataclass(frozen=True)
class AppConfig:
    api: ApiSettings
    data_entry: DataEntryContract
    ai_prefill: AiPrefillSettings
    recommendations: RecommendationSettings
    onelake_datasets: OneLakeDatasetsContract
    data_sources: DataSourcesContract
    values: ResolvedValues
    shared_dir: Path


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError(f"config file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"config file is not valid JSON: {path}: {exc}") from exc


def _shared_directory(settings: SharedConfigSettings) -> Path:
    override = os.environ.get(settings.environmentVariable, "").strip()
    if override:
        return Path(override).expanduser().resolve()
    return (API_ROOT / settings.defaultDirectory).resolve()


def _resolve(ref: FileRef, documents: dict[str, Any]) -> str:
    if ref.file not in documents:
        raise ConfigError(f"api.json refers to an unknown shared file '{ref.file}'")
    node: Any = documents[ref.file]
    for part in ref.path.split("."):
        if not isinstance(node, dict) or part not in node:
            raise ConfigError(f"'{ref.path}' is missing from shared file '{ref.file}'")
        node = node[part]
    if not isinstance(node, str) or not node.strip():
        raise ConfigError(f"'{ref.path}' in shared file '{ref.file}' must be a non-empty string")
    return node.strip()


def _check_contract(api: ApiSettings, data_entry: DataEntryContract, ai: AiPrefillSettings, sources: DataSourcesContract) -> None:
    keys = [rule.key for rule in data_entry.projectFields]
    if len(keys) != len(set(keys)):
        raise ConfigError("data-entry.json projectFields has duplicate keys")
    option_names = set(OptionLists.model_fields)
    for rule in [*data_entry.projectFields, *data_entry.portfolioFields]:
        if rule.type != "select" or rule.options is not None:
            continue
        source = rule.source or ""
        if source in _DYNAMIC_SELECT_SOURCES:
            continue
        if not source.startswith(_OPTIONS_PREFIX) or source[len(_OPTIONS_PREFIX):] not in option_names:
            raise ConfigError(f"select field '{rule.key}' has an unknown option source '{source}'")
    name_field = api.projects.projectNameField
    if name_field not in keys:
        raise ConfigError(f"'{name_field}' must be a projectFields key in data-entry.json")
    expected = set(keys) - {name_field}
    guided = [item.key for item in ai.fields]
    if len(guided) != len(set(guided)) or set(guided) != expected:
        missing = sorted(expected - set(guided))
        extra = sorted(set(guided) - expected)
        raise ConfigError(f"ai-prefill.json fields must match data-entry.json projectFields (except '{name_field}'); missing {missing}, extra {extra}")
    if set(ai.evidenceToConfidence) != set(ai.evidenceLevels):
        raise ConfigError("ai-prefill.json evidenceToConfidence must have one entry per evidence level")
    for name, creatable in ai.creatableFields.items():
        rule = next((item for item in data_entry.projectFields if item.key == name), None)
        if rule is None:
            raise ConfigError(f"ai-prefill.json creatableFields names '{name}', which is not a projectFields key")
        source = rule.source or ""
        if creatable.kind == "option":
            list_name = source.removeprefix("options.")
            if not source.startswith("options.") or list_name == "skills" or list_name not in OptionLists.model_fields:
                raise ConfigError(f"'{name}' can be created as an option only when it reads a static list other than skills")
        else:
            role_rule = next((item for item in data_entry.portfolioFields if item.key == "role"), None)
            if source != "portfolios" or role_rule is None or creatable.role not in (role_rule.options or []):
                raise ConfigError(f"'{name}' can be created as a portfolio only when it reads the portfolio list and has a valid role")
    importing = api.projectImport
    for column in importing.columns:
        if column.fieldKey not in keys:
            raise ConfigError(f"api.json projectImport column '{column.header}' names '{column.fieldKey}', which is not a projectFields key")
        if column.lookup is not None and column.lookup not in _IMPORT_LOOKUPS:
            raise ConfigError(f"api.json projectImport column '{column.header}' uses an unknown lookup '{column.lookup}'")
    if set(importing.booleanWords) != {"true", "false"}:
        raise ConfigError("api.json projectImport booleanWords must have exactly the lists true and false")
    source_keys = {source.key for source in sources.sources}
    unknown = sorted(set(data_entry.uploads.acceptedBySource) - source_keys)
    if unknown:
        raise ConfigError(f"data-entry.json acceptedBySource names unknown sources {unknown}")
    workbook = api.templates.intakeWorkbook
    tables = {table.name for source in sources.sources if source.key == workbook.sourceKey for table in source.tables}
    if workbook.tableName not in tables:
        raise ConfigError(f"intake workbook table '{workbook.tableName}' is not in data-sources.json source '{workbook.sourceKey}'")


def load_config(*, settings_file: Path = API_SETTINGS_FILE, shared_dir: Path | None = None) -> AppConfig:
    api = ApiSettings.model_validate(_read_json(settings_file))
    folder = shared_dir.resolve() if shared_dir else _shared_directory(api.sharedConfig)
    documents = {key: _read_json(folder / spec.fileName) for key, spec in api.sharedConfig.files.items()}
    data_entry = DataEntryContract.model_validate(documents["dataEntry"])
    ai_prefill = AiPrefillSettings.model_validate(documents["aiPrefill"])
    recommendations = RecommendationSettings.model_validate(documents["recommendations"])
    onelake = OneLakeDatasetsContract.model_validate(documents["onelakeDatasets"])
    dataset_keys = [dataset.key for dataset in onelake.datasets]
    if len(dataset_keys) != len(set(dataset_keys)):
        raise ConfigError("onelake-datasets.json has duplicate dataset keys")
    data_sources = DataSourcesContract.model_validate(documents["dataSources"])
    refs = {
        "workspace_name": api.fabric.workspaceName,
        "workspace_id": api.fabric.workspaceId,
        "lakehouse_name": api.fabric.lakehouseName,
        "api_base_url": api.fabric.apiBaseUrl,
        "pipeline_display_name": api.fabric.pipelineDisplayName,
        "pipeline_job_type": api.fabric.pipelineJobType,
        "dfs_endpoint": api.oneLake.dfsEndpoint,
        "raw_root": api.oneLake.rawRoot,
        "exports_root": api.oneLake.exportsRoot,
        "openapi_output_file": api.openApi.outputFile,
    }
    values = ResolvedValues(**{name: _resolve(ref, documents) for name, ref in refs.items()})
    _check_contract(api, data_entry, ai_prefill, data_sources)
    return AppConfig(
        api=api, data_entry=data_entry, ai_prefill=ai_prefill, recommendations=recommendations,
        onelake_datasets=onelake, data_sources=data_sources, values=values, shared_dir=folder,
    )


@lru_cache(maxsize=1)
def get_config() -> AppConfig:
    return load_config()
