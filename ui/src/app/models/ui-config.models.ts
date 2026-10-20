export interface ApiConfig {
  basePath: string;
  timeoutMs: number;
  pipelinePollIntervalMs: number;
}

export interface MicrosoftLogoConfig {
  wordmark: string;
  wordmarkColor: string;
  squareRed: string;
  squareGreen: string;
  squareBlue: string;
  squareYellow: string;
}

export interface BrandConfig {
  title: string;
  subtitle: string;
  logo: MicrosoftLogoConfig;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  isCategory?: boolean;
  children?: NavigationItem[];
}

export interface BreakpointsConfig {
  xl: number;
  md: number;
}

export interface ConfidenceThresholds {
  high: number;
  medium: number;
}

export interface ConfidenceColors {
  high: string;
  medium: string;
  low: string;
  none: string;
  human: string;
}

export interface ConfidenceConfig {
  thresholds: ConfidenceThresholds;
  labels: {
    high: string;
    medium: string;
    low: string;
    none: string;
  };
  colors: ConfidenceColors;
}

export interface TierColors {
  mustDoNow: string;
  proceed: string;
  canWait: string;
  deprioritize: string;
}

export interface TierLabels {
  mustDoNow: string;
  proceed: string;
  canWait: string;
  deprioritize: string;
}

export interface TiersConfig {
  labels: TierLabels;
  colors: TierColors;
}

export interface FooterConfig {
  authorName: string;
  authorRole: string;
  linkedInUrl: string;
  linkedInLabel: string;
  gitHubUrl: string;
  gitHubLabel: string;
}

export interface TableConfig {
  pageSize: number;
  pageSizes: number[];
  exportFileName?: string;
}

export interface ChartSettingsConfig {
  driverChartHeight: number;
  kpiCardHeight: number;
  donutRadiusInner: string;
  donutRadiusOuter: string;
}

export interface CopilotSamplePrompt {
  id: string;
  title: string;
  icon: string;
  prompt: string;
  category: 'priority' | 'budget' | 'skills' | 'rules' | 'risk';
}

export interface CopilotConfig {
  samplePrompts: CopilotSamplePrompt[];
}

export interface UiConfig {
  api: ApiConfig;
  brand: BrandConfig;
  navigation: NavigationItem[];
  recommendations: RecommendationsUiConfig;
  breakpoints: BreakpointsConfig;
  confidence: ConfidenceConfig;
  tiers: TiersConfig;
  copilot?: CopilotConfig;
  footer: FooterConfig;
  table: TableConfig;
  charts: ChartSettingsConfig;
  tokens: Record<string, string>;
}

export interface RecommendationPrompt {
  label: string;
  prompt: string;
}

export interface RecommendationsUiConfig {
  title: string;
  subtitle: string;
  researchPlaceholder: string;
  askLabel: string;
  quickPrompts: RecommendationPrompt[];
}
