import { describe, expect, it } from 'vitest';
import { SAMPLE_PORTFOLIO_DATASET } from '../data/sample-portfolio.data';
import { PortfolioDataset, Project } from '../models/portfolio.models';
import { normalizePortfolioDataset } from './portfolio-normalizer';

describe('normalizePortfolioDataset', () => {
  it('replaces nullable live-export fields with render-safe values', () => {
    const project = {
      ...SAMPLE_PORTFOLIO_DATASET.projects[0],
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
      ...SAMPLE_PORTFOLIO_DATASET,
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
