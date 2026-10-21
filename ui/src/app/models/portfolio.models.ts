import type { PriorityScoreMetadata } from '../pages/admin/priority-weights/priority-weights.models';

export type SponsorLevel = 'Executive' | 'Director' | 'Manager' | 'Individual' | 'Unknown';
export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Backlog';
export interface ProjectProgressRecord {
  projectId: string;
  projectStatus: ProjectStatus;
  progressStatus?: 'notStarted' | 'started' | 'completed' | 'unconfirmed';
  hasStarted?: boolean | null;
  completed?: boolean;
  startDate?: string | null;
  estimatedFinishDate?: string | null;
  completionDate?: string | null;
  changeRevision?: string | null;
}

export interface ProjectDetailRecord extends ProjectProgressRecord {
  projectName?: string;
  status: string;
  fieldProvenance?: Record<string, any>;
}

export interface ProjectProgressUpdate {
  hasStarted: boolean;
  startDate: string | null;
  estimatedFinishDate: string | null;
  completed: boolean;
  completionDate: string | null;
  expectedRevision: string | null;
}
export type RiskRating = 'Low' | 'Medium' | 'High' | 'Critical' | 'Unknown';
export type PriorityTier = 'Must-do-now' | 'Proceed' | 'Can wait' | 'Candidate to deprioritize';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type RecommendedAction =
  | 'Add capacity'
  | 'Protect slot'
  | 'Proceed'
  | 'Re-sequence'
  | 'Pause or divert skills';
export type DecisionAction = 'Approve' | 'Adjust' | 'Reject';
export type DriverDirection = 'increases' | 'decreases';

export interface ProjectSources {
  planview: boolean;
  powerapps: boolean;
  ado: boolean;
  jira: boolean;
  msProject: boolean;
  smartsheet: boolean;
  buTrackers: boolean;
  buRepositories: boolean;
  hrCapacity: boolean;
  cost: boolean;
  excelIntake: boolean;
}

export interface TierProbabilities {
  mustDoNow: number;
  proceed: number;
  canWait: number;
  deprioritize: number;
}

export interface SignalDriver {
  signalKey: string;
  signalLabel: string;
  shapValue: number;
  direction: DriverDirection;
  featureValue: number;
}

export interface Project extends ProjectProgressRecord, PriorityScoreMetadata {
  projectId: string;
  projectName: string;
  portfolio: string;
  portfolioKey?: string;
  program?: string;
  programKey?: string;
  businessUnit: string;
  site: string;
  projectManager: string;
  executiveSponsor: string;
  sponsorLevel: SponsorLevel;
  projectStatus: ProjectStatus;
  goLiveDate: string; // YYYY-MM-DD
  monthsToGoLive: number;
  businessValue: number; // 1-5
  userBase?: number; // count of impacted users
  regulatorySecurity: boolean;
  dtAlignment: boolean;
  protectedProgram: boolean;
  primarySkill: string;
  skillDemandFte: number;
  costEstimateUsd: number;
  dependencyCount: number;
  riskRating: RiskRating;
  effortPersonWeeks: number;
  sourcesPresent: number;
  sourcesTotal: number;
  sources: ProjectSources;
  completeness: number; // 0-1
  quality: number; // 0-1
  modelCertainty: number; // 0-1
  confidenceScore: number; // 0-100
  confidenceLevel: ConfidenceLevel;
  mlTier: PriorityTier;
  finalTier: PriorityTier;
  tierProbabilities: TierProbabilities;
  priorityScore: number | null; // 0-100, or unavailable until saved analysis is sufficient
  fieldWeightedScore?: number | null; // 0-100 computed from configured field weights
  ruleOverrides: string[];
  recommendedAction: RecommendedAction;
  cluster: string;
  topDrivers: SignalDriver[];
  dataIssues: string[];
  isDeleted?: boolean;
  deletedAt?: string;
  aiGenerated?: boolean;
  aiGeneratedFields?: string[];
  fieldProvenance?: Record<string, any>;
}

export interface CapacityBySkill {
  skill: string;
  supplyFte: number;
  demandFte: number;
  gapFte: number;
  projectsInDemand: number;
}

export interface ProjectCluster {
  clusterId: number;
  name: string;
  projectCount: number;
  avgConfidence: number;
}

export interface PmoRule {
  ruleId: string;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
}

export interface ModelMetrics {
  algorithm: string;
  accuracyCv: number;
  macroF1Cv: number;
  logLossCv: number;
  trainingRows: number;
  features: string[];
}

export interface PortfolioDataset {
  generatedAtUtc: string;
  asOfDate: string;
  source: string;
  projects: Project[];
  capacityBySkill: CapacityBySkill[];
  clusters: ProjectCluster[];
  rules: PmoRule[];
  modelMetrics: ModelMetrics;
}

export interface LocalDecision {
  decisionId?: string;
  projectId: string;
  /** The priority tier the decision sets. */
  decision?: string;
  /** Approve, Adjust, or Reject. Recommendation decisions have no action. */
  action?: DecisionAction | null;
  reason: string;
  decidedBy?: string | null;
  timestamp: string; // ISO
}

export interface DecisionRequest {
  projectId: string;
  decision: string;
  action: DecisionAction;
  reason: string;
  decidedBy: string;
}

export interface DecisionView {
  decisionId: string;
  projectId: string;
  decision: string;
  action?: DecisionAction | null;
  reason: string;
  decidedBy?: string | null;
  recordedAtUtc: string;
}

export interface DecisionList {
  items: DecisionView[];
  count: number;
}

export type SortField = 'priority' | 'confidence' | 'goLive' | 'cost' | 'sources' | 'name';
export type SortDirection = 'asc' | 'desc';

export type GroupByOption =
  | 'none'
  | 'finalTier'
  | 'confidenceLevel'
  | 'businessUnit'
  | 'cluster'
  | 'recommendedAction';

export interface FilterCriteria {
  search: string;
  confidenceLevels: ConfidenceLevel[];
  finalTiers: PriorityTier[];
  businessUnits: string[];
  sites: string[];
  portfolios: string[];
  sponsorLevels: SponsorLevel[];
  riskRatings: RiskRating[];
  primarySkills: string[];
  clusters: string[];
  recommendedActions: RecommendedAction[];
  regulatory: boolean | null;
  dtAlignment: boolean | null;
  protectedProgram: boolean | null;
  hasDataIssues: boolean | null;
  minSources: number;
  maxSources: number;
  minCompleteness: number; // 0-100
  maxCompleteness: number; // 0-100
  minPriorityScore: number; // 0-100
  maxPriorityScore: number; // 0-100
  minCostUsd: number;
  maxCostUsd: number;
  goLiveFrom: string; // YYYY-MM-DD or empty
  goLiveTo: string;   // YYYY-MM-DD or empty
  statuses?: ProjectStatus[];
  includeDeleted?: boolean;
}

export interface SavedView {
  id: string;
  name: string;
  criteria: FilterCriteria;
  sortField: SortField;
  sortDirection: SortDirection;
  groupBy: GroupByOption;
  createdAt: string;
}

export interface GroupSummary<T> {
  key: string;
  label: string;
  count: number;
  avgConfidence: number;
  totalCost: number;
  items: T[];
}

export interface HierarchyNode {
  id: string;
  name: string;
  level: 'root' | 'businessUnit' | 'site' | 'project';
  count: number;
  avgConfidence: number;
  totalCost: number;
  project?: Project;
  children: HierarchyNode[];
  expanded?: boolean;
}
