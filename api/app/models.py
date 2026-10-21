"""Response and request models. Field names are the JSON names that clients see."""

from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict

from app.contracts import DataEntryContract
from app.priority_weights import PriorityScoreState, PriorityWeightScope

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    page: int
    pageSize: int
    totalItems: int
    totalPages: int


class LakeFileStatus(BaseModel):
    path: str
    available: bool | None = None
    reason: str | None = None


class HealthLake(BaseModel):
    status: str
    portfolioExport: LakeFileStatus
    capacityScenarios: LakeFileStatus


class HealthResponse(BaseModel):
    status: str
    title: str
    version: str
    checkedAtUtc: str
    lake: HealthLake


class OptionsResponse(DataEntryContract):
    """The data-entry contract as written in data-entry.json."""


class ProjectListItem(BaseModel):
    projectId: str
    projectName: str | None = None
    status: str
    portfolioKey: str | None = None
    portfolioCode: str | None = None
    portfolio: str | None = None
    portfolioRole: str | None = None
    program: str | None = None
    businessUnit: str | None = None
    site: str | None = None
    sponsor: str | None = None
    projectManager: str | None = None
    projectStatus: str | None = None
    goLiveDate: str | None = None
    primarySkill: str | None = None
    riskRating: str | None = None
    confidenceLevel: str | None = None
    confidenceScore: float | None = None
    finalTier: str | None = None
    priorityScore: float | None = None
    recommendedAction: str | None = None
    cluster: str | None = None
    isDeleted: bool = False
    progressStatus: Literal["notStarted", "started", "completed", "unconfirmed"]
    hasStarted: bool | None
    completed: bool
    startDate: str | None = None
    estimatedFinishDate: str | None = None
    completionDate: str | None = None
    changeRevision: str | None = None
    priorityWeightScope: PriorityWeightScope | None = None
    effectivePriorityWeights: dict[str, float] | None = None
    fieldWeightedScore: float | None = None
    priorityScoreState: PriorityScoreState | None = None
    priorityScoreReason: str | None = None
    recordedPriorityScore: float | None = None
    recordedFieldWeightedScore: float | None = None


class ProjectRecord(BaseModel):
    model_config = ConfigDict(extra="allow")

    projectId: str
    status: str


class ProjectRemoved(BaseModel):
    projectId: str
    deleted: bool


class ImportedProject(BaseModel):
    projectId: str
    projectName: str | None = None


class ProjectImportResult(BaseModel):
    created: list[ImportedProject]
    count: int
    pipelineRunId: str | None = None
    warnings: list[str] = []


class ProjectCreated(BaseModel):
    projectId: str
    status: str
    pipelineRunId: str | None = None
    warnings: list[str] = []
    entry: dict[str, Any]


class UploadMeta(BaseModel):
    uploadId: str
    sourceKey: str
    fileName: str
    sizeBytes: int
    oneLakePath: str
    uploadedAt: str | None = None


class UploadList(BaseModel):
    projectId: str
    items: list[UploadMeta]
    count: int


class PortfolioProgram(BaseModel):
    key: str
    displayName: str
    code: str


class PortfolioView(BaseModel):
    key: str
    displayName: str
    code: str
    role: str
    status: str
    jiraProjectKey: str | None = None
    adoAreaRoot: str | None = None
    projectCount: int | None = None
    programs: list[PortfolioProgram] = []


class PortfolioList(BaseModel):
    items: list[PortfolioView]
    count: int


class PipelineRunStarted(BaseModel):
    runId: str
    jobInstanceId: str
    status: str
    retryAfterSeconds: int | None = None


class PipelineRunStatus(BaseModel):
    runId: str
    jobInstanceId: str
    status: str | None = None
    startTimeUtc: str | None = None
    endTimeUtc: str | None = None
    failureReason: dict[str, Any] | None = None


class DecisionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    projectId: str
    recommendation: bool = False
    decision: str
    reason: str
    decidedBy: str | None = None
    action: str | None = None


class DecisionView(BaseModel):
    decisionId: str
    projectId: str
    decision: str
    reason: str
    decidedBy: str | None = None
    action: str | None = None
    recordedAtUtc: str
    oneLakePath: str | None = None


class DecisionList(BaseModel):
    items: list[DecisionView]
    count: int
