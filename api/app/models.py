"""Response and request models. Field names are the JSON names that clients see."""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict

from app.contracts import DataEntryContract

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


class ProjectRecord(BaseModel):
    model_config = ConfigDict(extra="allow")

    projectId: str
    status: str


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
    decision: str
    reason: str
    decidedBy: str | None = None


class DecisionView(BaseModel):
    decisionId: str
    projectId: str
    decision: str
    reason: str
    decidedBy: str | None = None
    recordedAtUtc: str
    oneLakePath: str | None = None


class DecisionList(BaseModel):
    items: list[DecisionView]
    count: int
