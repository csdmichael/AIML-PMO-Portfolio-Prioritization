import {
  PortfolioDataset,
  Project,
  CapacityBySkill,
  ProjectCluster,
  PmoRule,
  ModelMetrics,
  LocalDecision,
} from './portfolio.models';

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  invalidFields?: Record<string, string>;
}

export interface SkillOption {
  key: string;
  displayName: string;
}

export interface DataEntryOptions {
  businessUnits: string[];
  sites: string[];
  projectStatuses: string[];
  sponsorLevels: string[];
  riskRatings: string[];
  skills: SkillOption[];
  relationshipTypes: string[];
}

export interface ProjectFieldDef {
  key: string;
  label: string;
  type: string;
  required: boolean;
  source?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  minDate?: string;
  maxDate?: string;
  maxItems?: number;
}

export interface PortfolioFieldDef {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
}

export interface UploadAcceptedConfig {
  extensions: string[];
}

export interface UploadsConfig {
  maxFilesPerSourcePerProject: number;
  maxFileBytes: number;
  acceptedBySource: Record<string, UploadAcceptedConfig>;
}

export interface QuickAddLimits {
  maxProjectNameChars: number;
  minDescriptionChars: number;
  maxDescriptionChars: number;
  maxDocuments: number;
  maxDocumentBytes: number;
  acceptedDocumentExtensions: string[];
}

export interface QuickAddOptions {
  limits: QuickAddLimits;
  evidenceLevels: string[];
}

export interface OptionsResponse {
  schemaVersion?: number;
  description?: string;
  projectIdPattern?: string;
  options: DataEntryOptions;
  projectFields: ProjectFieldDef[];
  portfolioFields: PortfolioFieldDef[];
  uploads: UploadsConfig;
  quickAdd?: QuickAddOptions;
}

export interface PortfolioItem {
  key: string;
  displayName: string;
  code: string;
  role: 'main' | 'coupled';
  jiraProjectKey?: string;
  adoAreaRoot?: string;
  programs: Array<{ key: string; name: string }>;
  status?: 'processed' | 'pending';
}

export interface ProjectUploadMetadata {
  uploadId: string;
  sourceKey: string;
  fileName: string;
  sizeBytes: number;
  oneLakePath: string;
  uploadedAt: string;
}

export interface CreateProjectResponse {
  projectId: string;
  status: 'pending' | 'processed';
  pipelineRunId?: string | null;
  warnings?: string[];
}

export interface PipelineRunStatus {
  runId: string;
  jobInstanceId?: string;
  status: 'NotStarted' | 'InProgress' | 'Completed' | 'Failed' | 'Cancelled';
  startTimeUtc?: string;
  endTimeUtc?: string;
  failureReason?: string;
}

export interface DraftFieldProvenance {
  key: string;
  label: string;
  value: unknown;
  evidence: 'explicit' | 'inferred' | 'estimated' | 'notProvided' | 'human';
  confidenceLevel: 'High' | 'Medium' | 'Low' | 'None' | 'Human';
  confidenceScore: number;
  evidenceQuote?: string;
  rationale?: string;
  source: 'ai' | 'human' | 'default';
  aiValue?: unknown;
  updatedAt?: string;
}

export interface DraftDocumentMetadata {
  documentId: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface IntakeDraft {
  draftId: string;
  projectName: string;
  description: string;
  status: 'draft' | 'prefilled' | 'submitted';
  documents: DraftDocumentMetadata[];
  fields: DraftFieldProvenance[];
  missingRequired: string[];
  pipelineRunId?: string | null;
  projectId?: string;
  warnings?: string[];
}
