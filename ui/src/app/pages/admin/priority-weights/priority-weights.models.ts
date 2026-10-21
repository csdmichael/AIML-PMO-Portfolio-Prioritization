export type PriorityWeightMap = Record<string, number>;
export type PriorityWeightScope = 'project' | 'portfolio' | 'global';
export type PriorityScoreState = 'weighted' | 'awaiting-analysis' | 'requires-analysis';

export interface PriorityFieldWeight {
  key: string;
  label: string;
  category: string;
  description: string;
  min: number;
  max: number;
  higherIsBetter: boolean;
  defaultWeight: number;
}

export interface PriorityWeightPreset {
  id: string;
  name: string;
  description: string;
  weights: PriorityWeightMap;
}

export interface PriorityWeightsResponse {
  version: number;
  description: string;
  availableFields: PriorityFieldWeight[];
  defaultWeights: PriorityWeightMap;
  portfolioOverrides: Record<string, PriorityWeightMap>;
  projectOverrides: Record<string, PriorityWeightMap>;
  presets: PriorityWeightPreset[];
  etag: string | null;
}

/** Only supplied scope keys are changed. An empty map clears that scope. */
export interface PriorityWeightsUpdateRequest {
  defaultWeights?: PriorityWeightMap;
  portfolioOverrides?: Record<string, PriorityWeightMap>;
  projectOverrides?: Record<string, PriorityWeightMap>;
  etag?: string | null;
}

export interface PriorityScoreMetadata {
  priorityWeightScope?: PriorityWeightScope;
  effectivePriorityWeights?: PriorityWeightMap;
  priorityScoreState?: PriorityScoreState;
  priorityScoreReason?: string | null;
  recordedPriorityScore?: number | null;
  recordedFieldWeightedScore?: number | null;
  mlBaseScore?: number;
  priorityFloor?: number | null;
}
