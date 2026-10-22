"""Models for the shared config files: data-entry.json, data-sources.json, and ai-prefill.json.

Extra keys are allowed so these contracts can be returned to clients as they are written.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Contract(BaseModel):
    model_config = ConfigDict(extra="allow")


class SkillOption(Contract):
    key: str
    displayName: str


class OptionLists(Contract):
    businessUnits: list[str]
    sites: list[str]
    projectStatuses: list[str]
    sponsorLevels: list[str]
    sponsorLevelScores: dict[str, Annotated[float, Field(strict=True, gt=0, allow_inf_nan=False)]] = Field(default_factory=dict)
    riskRatings: list[str]
    skills: list[SkillOption]
    relationshipTypes: list[str]


class FieldRule(Contract):
    key: str
    label: str
    type: str
    required: bool = False
    minLength: int | None = None
    maxLength: int | None = None
    min: float | None = None
    max: float | None = None
    minDate: str | None = None
    maxDate: str | None = None
    source: str | None = None
    exportKey: str | None = None
    options: list[str] | None = None
    minItems: int | None = None
    maxItems: int | None = None


class UploadAcceptance(Contract):
    extensions: list[str]


class UploadContract(Contract):
    maxFilesPerSourcePerProject: int
    maxFileBytes: int
    oneLakeFolderTemplate: str
    fileNameTemplate: str
    acceptedBySource: dict[str, UploadAcceptance]


class LakeFolders(Contract):
    manualProjectsFolder: str
    manualPortfoliosFolder: str


class PipelineContract(Contract):
    displayName: str
    folderKey: str
    notebookRunOrder: list[str]
    jobType: str
    pollSeconds: int
    maxWaitMinutes: int


class ProjectProgressRules(Contract):
    notStartedStatuses: list[str]
    startedStatuses: list[str]
    completedStatus: str
    startStatus: str
    planningStatus: str


class DataEntryContract(Contract):
    schemaVersion: int
    description: str
    projectIdPattern: str
    projectIdPrefix: str
    projectIdDigits: int
    firstNewProjectNumber: int
    progress: ProjectProgressRules
    options: OptionLists
    projectFields: list[FieldRule]
    portfolioFields: list[FieldRule]
    uploads: UploadContract
    lake: LakeFolders
    pipeline: PipelineContract


def static_option_values(contract: "DataEntryContract", rule: FieldRule) -> list[str] | None:
    if rule.options is not None:
        return list(rule.options)
    prefix = "options."
    if not rule.source or not rule.source.startswith(prefix):
        return None
    name = rule.source[len(prefix) :]
    if name == "skills":
        return [skill.key for skill in contract.options.skills]
    values = getattr(contract.options, name, None)
    return list(values) if isinstance(values, list) else None


class SourceTable(Contract):
    name: str
    files: list[str]
    sheet: str | None = None
    headerRow: int | None = None


class DataSource(Contract):
    key: str
    folder: str
    lakehouseSchema: str
    format: str
    tables: list[SourceTable]


class DataSourcesContract(Contract):
    schemaVersion: int
    localRawRoot: str
    lakehouseRawRoot: str
    sources: list[DataSource]


class PrefillLimits(Contract):
    maxProjectNameChars: int
    minDescriptionChars: int
    maxDescriptionChars: int
    maxDocuments: int
    maxDocumentBytes: int
    maxDocumentTextChars: int
    acceptedDocumentExtensions: list[str]
    xlsxRowsPerSheet: int


class ConfidenceMapping(Contract):
    level: str
    score: float


class PrefillFieldGuidance(Contract):
    key: str
    guidance: str


class PromptTemplates(Contract):
    system: list[str]
    userTemplate: list[str]


class CreatableField(Contract):
    kind: Literal["option", "portfolio"]
    role: str | None = None


class AiPrefillSettings(Contract):
    schemaVersion: int
    description: str
    limits: PrefillLimits
    evidenceLevels: list[str]
    evidenceToConfidence: dict[str, ConfidenceMapping]
    fields: list[PrefillFieldGuidance]
    creatableFields: dict[str, CreatableField] = Field(default_factory=dict)
    suggestionMaxChars: int = 80
    prompt: PromptTemplates


class RecommendationLimits(Contract):
    maxSections: int
    maxItemsPerSection: int


class RecommendationCacheSettings(Contract):
    oneLakeFolder: str
    policyVersion: str

    @field_validator("oneLakeFolder")
    @classmethod
    def lakehouse_folder(cls, value: str) -> str:
        value = value.rstrip("/")
        if not value.startswith("Files/") or ".." in value.split("/"):
            raise ValueError("must start with Files/ and must not contain '..'")
        return value


class RecommendationSettings(Contract):
    schemaVersion: int
    description: str
    defaultFocus: str
    cache: RecommendationCacheSettings
    limits: RecommendationLimits
    prompt: PromptTemplates


class OneLakeDataset(Contract):
    key: str
    label: str
    description: str
    path: str
    shape: Literal["array", "object"]
    access: Literal["read", "readWrite"]
    requiredFields: list[str] = []
    maxBytes: int = Field(gt=0)

    @field_validator("path")
    @classmethod
    def lakehouse_path(cls, value: str) -> str:
        if not value.startswith(("Files/", "Tables/")) or ".." in value.split("/"):
            raise ValueError("must start with Files/ or Tables/ and must not contain '..'")
        return value


class OneLakeDatasetsContract(Contract):
    schemaVersion: int
    description: str
    datasets: list[OneLakeDataset]
