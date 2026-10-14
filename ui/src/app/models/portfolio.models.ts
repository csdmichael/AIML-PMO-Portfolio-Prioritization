export type SponsorLevel = 'Executive' | 'Director' | 'Manager' | 'Individual' | 'Unknown';
export type ProjectStatus = 'Planning' | 'Active' | 'On Hold';
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

export interface Project {
  projectId: string;
  projectName: string;
  portfolio: string;
  businessUnit: string;
  site: string;
  projectManager: string;
  executiveSponsor: string;
  sponsorLevel: SponsorLevel;
  projectStatus: ProjectStatus;
  goLiveDate: string; // YYYY-MM-DD
  monthsToGoLive: number;
  businessValue: number; // 1-5
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
  priorityScore: number; // 0-100
  ruleOverrides: string[];
  recommendedAction: RecommendedAction;
  cluster: string;
  topDrivers: SignalDriver[];
  dataIssues: string[];
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
  projectId: string;
  action: DecisionAction;
  reason: string;
  timestamp: string; // ISO
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
