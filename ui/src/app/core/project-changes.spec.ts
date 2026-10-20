import { describe, expect, it } from 'vitest';
import { changedProjectFields } from './project-changes';
import { ProjectFieldDef } from '../models/api.models';
import { Project } from '../models/portfolio.models';

const fields: ProjectFieldDef[] = [
  { key: 'projectName', label: 'Project name', type: 'text', required: true },
  { key: 'sponsorName', exportKey: 'executiveSponsor', label: 'Executive sponsor', type: 'text', required: true },
  { key: 'portfolioKey', label: 'Portfolio', type: 'select', required: true, source: 'portfolios' },
  { key: 'programKey', label: 'Program', type: 'select', required: true, source: 'programsOfPortfolio' },
  { key: 'projectStatus', label: 'Status', type: 'select', required: true, source: 'options.projectStatuses' },
  { key: 'sponsorEmail', label: 'Sponsor email', type: 'email', required: false },
];

function project(overrides: Partial<Project> = {}): Project {
  return {
    projectId: 'GIS-0001',
    projectName: 'Edge network segmentation',
    portfolio: 'IT - InfoSec',
    portfolioKey: 'it-infosec',
    program: 'Zero Trust and Identity',
    programKey: 'zero-trust-identity',
    executiveSponsor: 'Ana Lopez',
    projectStatus: 'Active',
    ...overrides,
  } as Project;
}

describe('changedProjectFields', () => {
  it('sends only the contract fields that changed, under their contract keys', () => {
    const baseline = project();
    const edited = { ...baseline, executiveSponsor: 'Ruth Okafor' };

    expect(changedProjectFields(baseline, edited, fields)).toEqual({ sponsorName: 'Ruth Okafor' });
  });

  it('sends the program together with the portfolio when the portfolio changes', () => {
    const baseline = project();
    const edited = { ...baseline, portfolioKey: 'data-analytics', programKey: 'data-platform' };

    expect(changedProjectFields(baseline, edited, fields)).toEqual({
      portfolioKey: 'data-analytics',
      programKey: 'data-platform',
    });
  });

  it('still sends the program when the portfolio changes and the program key is unchanged', () => {
    const baseline = project();
    const edited = { ...baseline, portfolioKey: 'data-analytics' };

    expect(changedProjectFields(baseline, edited, fields)).toEqual({
      portfolioKey: 'data-analytics',
      programKey: 'zero-trust-identity',
    });
  });

  it('returns nothing when no field changed', () => {
    const baseline = project();

    expect(changedProjectFields(baseline, { ...baseline }, fields)).toEqual({});
  });
});
