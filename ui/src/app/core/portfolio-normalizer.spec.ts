import { describe, expect, it } from 'vitest';
import { PortfolioDataset, Project } from '../models/portfolio.models';
import { normalizePortfolioDataset } from './portfolio-normalizer';

const BASE_TEST_PROJECT: Project = {
  projectId: 'GIS-0001',
  projectName: 'Test Project',
  portfolio: 'IT InfoSec',
  businessUnit: 'Corporate IT',
  site: 'Fremont',
  projectManager: 'PM',
  executiveSponsor: 'Sponsor',
  sponsorLevel: 'Executive',
  projectStatus: 'Active',
  goLiveDate: '2027-01-01',
  monthsToGoLive: 12,
  businessValue: 4,
  regulatorySecurity: false,
  dtAlignment: false,
  protectedProgram: false,
  primarySkill: 'UC',
  skillDemandFte: 2,
  costEstimateUsd: 1000000,
  dependencyCount: 1,
  riskRating: 'Low',
  effortPersonWeeks: 20,
  sourcesPresent: 5,
  sourcesTotal: 11,
  sources: {
    planview: true,
    powerapps: true,
    ado: false,
    jira: false,
    msProject: false,
    smartsheet: false,
    buTrackers: false,
    buRepositories: false,
    hrCapacity: false,
    cost: false,
    excelIntake: false,
  },
  completeness: 1,
  quality: 1,
  modelCertainty: 1,
  confidenceScore: 90,
  confidenceLevel: 'High',
  mlTier: 'Must-do-now',
  finalTier: 'Must-do-now',
  tierProbabilities: { mustDoNow: 1, proceed: 0, canWait: 0, deprioritize: 0 },
  priorityScore: 95,
  ruleOverrides: [],
  recommendedAction: 'Proceed',
  cluster: 'Cluster',
  topDrivers: [],
  dataIssues: [],
};

const BASE_TEST_DATASET: PortfolioDataset = {
  generatedAtUtc: '2026-10-12T00:00:00Z',
  asOfDate: '2026-10-12',
  source: 'test',
  projects: [BASE_TEST_PROJECT],
  capacityBySkill: [],
  clusters: [],
  rules: [],
  modelMetrics: {
    algorithm: 'LightGBM',
    accuracyCv: 0.9,
    macroF1Cv: 0.9,
    logLossCv: 0.1,
    trainingRows: 100,
    features: [],
  },
};

describe('normalizePortfolioDataset', () => {
  it('replaces nullable live-export fields with render-safe values', () => {
    const project = {
      ...BASE_TEST_PROJECT,
      projectName: null,
      businessUnit: null,
      site: null,
      projectManager: null,
      executiveSponsor: null,
      sponsorLevel: null,
      riskRating: null,
      businessValue: null,
      costEstimateUsd: null,
      dependencyCount: null,
      effortPersonWeeks: null,
    } as unknown as Project;
    const dataset = {
      ...BASE_TEST_DATASET,
      projects: [project],
    } as PortfolioDataset;

    const normalized = normalizePortfolioDataset(dataset).projects[0];

    expect(normalized.projectName).toBe('Unnamed project');
    expect(normalized.businessUnit).toBe('Unassigned business unit');
    expect(normalized.site).toBe('Unassigned site');
    expect(normalized.projectManager).toBe('Unassigned');
    expect(normalized.executiveSponsor).toBe('Unassigned');
    expect(normalized.sponsorLevel).toBe('Unknown');
    expect(normalized.riskRating).toBe('Unknown');
    expect(normalized.businessValue).toBe(0);
    expect(normalized.costEstimateUsd).toBe(0);
    expect(normalized.dependencyCount).toBe(0);
    expect(normalized.effortPersonWeeks).toBe(0);
  });
});
