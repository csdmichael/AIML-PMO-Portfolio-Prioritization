export type RecommendationActionType = 'addProject' | 'recordDecision';

export interface RecommendationMetric {
  label: string;
  value: string;
}

export interface RecommendationAction {
  id: string;
  label: string;
  type: RecommendationActionType;
  payload: Record<string, unknown>;
}

export interface RecommendationItem {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string;
  badges: string[];
  metrics: RecommendationMetric[];
  sourceProjectIds: string[];
  sourceUrls: string[];
  actions: RecommendationAction[];
}

export interface RecommendationSection {
  id: string;
  title: string;
  description: string | null;
  items: RecommendationItem[];
}

export interface RecommendationProvenance {
  provider: string;
  agentName: string;
  agentVersion: string;
  responseId: string;
  groundingSource: string;
  queryIds: string[];
  webSearches: number;
  webCitations: string[];
}

export interface RecommendationReport {
  title: string;
  summary: string;
  sections: RecommendationSection[];
  sourceProjectIds: string[];
  sourceUrls: string[];
  generatedAtUtc: string;
  portfolioKey: string | null;
  query: string | null;
  provenance: RecommendationProvenance;
}
