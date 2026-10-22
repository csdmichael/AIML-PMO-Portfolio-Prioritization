import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FILTER_CRITERIA,
  filterProjects,
  sortProjects,
  groupProjects,
  buildHierarchyTree,
  meanScore,
  priorityAverage,
} from './portfolio-filter';
import { Project } from '../models/portfolio.models';

describe('confidence averages', () => {
  it('leave out projects without a numeric score instead of turning the average into NaN', () => {
    const scored = createDummyProject('GIS-1', 'Scored', 'BU', 'Site', 50, 80, 100);
    const unscored = { ...createDummyProject('GIS-2', 'Unscored', 'BU', 'Site', 50, 0, 100), confidenceScore: undefined as unknown as number };
    expect(groupProjects([scored, unscored], 'none')[0].avgConfidence).toBe(80);
    expect(meanScore([null, undefined])).toBe(0);
  });
});

describe('Overview priority averages', () => {
  const project = createDummyProject('GIS-1', 'Scored', 'BU', 'Site', 70, 80, 100);
  const pending: Project = { ...project, projectId: 'GIS-101', priorityScore: null, priorityScoreState: 'awaiting-analysis' };

  it('keeps the average of 100 prioritized projects when a new unscored project is entered', () => {
    const scored = Array.from({ length: 100 }, (_, index) => ({ ...project, projectId: `GIS-${index}`, priorityScore: index % 2 ? 80 : 60 }));
    expect(priorityAverage([...scored, pending])).toEqual({ value: 70, count: 100, saved: false });
  });

  it('labels recorded scores separately when current weighting lacks evidence', () => {
    const saved = Array.from({ length: 100 }, (_, index) => ({
      ...project, projectId: `GIS-${index}`, priorityScore: null, recordedPriorityScore: 75,
      priorityScoreState: 'requires-analysis' as const,
    }));
    expect(priorityAverage([...saved, pending])).toEqual({ value: 75, count: 100, saved: true });
    expect(priorityAverage([pending])).toEqual({ value: null, count: 0, saved: false });
  });

  it('does not mix historic scores into a current weighted average', () => {
    const saved: Project = { ...project, priorityScore: null, recordedPriorityScore: 95, priorityScoreState: 'requires-analysis' };
    expect(priorityAverage([project, pending, saved])).toEqual({ value: 70, count: 1, saved: false });
  });
});

function createDummyProject(id: string, name: string, bu: string, site: string, priority: number, conf: number, cost: number): Project {
  return {
    projectId: id,
    projectName: name,
    portfolio: 'GIS Portfolio',
    businessUnit: bu,
    site,
    projectManager: 'PM',
    executiveSponsor: 'Sponsor',
    sponsorLevel: 'Executive',
    projectStatus: 'Active',
    goLiveDate: '2027-01-01',
    monthsToGoLive: 6,
    businessValue: 5,
    regulatorySecurity: true,
    dtAlignment: true,
    protectedProgram: false,
    primarySkill: 'Application Development',
    skillDemandFte: 4,
    costEstimateUsd: cost,
    dependencyCount: 2,
    riskRating: 'Low',
    effortPersonWeeks: 50,
    sourcesPresent: 8,
    sourcesTotal: 11,
    sources: {
      planview: true,
      powerapps: true,
      ado: true,
      jira: false,
      msProject: true,
      smartsheet: true,
      buTrackers: true,
      buRepositories: true,
      hrCapacity: true,
      cost: false,
      excelIntake: false,
    },
    completeness: 0.8,
    quality: 0.9,
    modelCertainty: 0.85,
    confidenceScore: conf,
    confidenceLevel: conf >= 75 ? 'High' : conf >= 50 ? 'Medium' : 'Low',
    mlTier: 'Proceed',
    finalTier: 'Proceed',
    tierProbabilities: { mustDoNow: 0.1, proceed: 0.8, canWait: 0.1, deprioritize: 0.0 },
    priorityScore: priority,
    ruleOverrides: [],
    recommendedAction: 'Proceed',
    cluster: 'Platform',
    topDrivers: [],
    dataIssues: [],
  };
}

describe('Portfolio Filter, Sort, Group, and Rollup logic', () => {
  const p1 = createDummyProject('GIS-0001', 'Alpha Project', 'Fab Operations', 'Fremont', 90, 85, 2000000);
  const p2 = createDummyProject('GIS-0002', 'Beta Project', 'Fab Operations', 'Singapore', 70, 60, 1000000);
  const p3 = createDummyProject('GIS-0003', 'Gamma Project', 'Supply Chain', 'Fremont', 80, 45, 3000000);
  const list = [p1, p2, p3];

  it('keeps unavailable scores visible by default, unranked last, and out of numeric score ranges', () => {
    const awaiting: Project = { ...p1, projectId: 'pending', priorityScore: null, priorityScoreState: 'awaiting-analysis' };
    expect(filterProjects([awaiting], DEFAULT_FILTER_CRITERIA)).toEqual([awaiting]);
    expect(filterProjects([awaiting], { ...DEFAULT_FILTER_CRITERIA, minPriorityScore: 1 })).toEqual([]);
    expect(sortProjects([awaiting, p2, p1], 'priority', 'desc').map((p) => p.projectId)).toEqual(['GIS-0001', 'GIS-0002', 'pending']);
    expect(sortProjects([awaiting, p2, p1], 'priority', 'asc').map((p) => p.projectId)).toEqual(['GIS-0002', 'GIS-0001', 'pending']);
  });

  it('filters by search term across ID and name', () => {
    const res = filterProjects(list, { ...DEFAULT_FILTER_CRITERIA, search: 'Beta' });
    expect(res.length).toBe(1);
    expect(res[0].projectId).toBe('GIS-0002');
  });

  it('filters by confidence level', () => {
    const res = filterProjects(list, { ...DEFAULT_FILTER_CRITERIA, confidenceLevels: ['High'] });
    expect(res.length).toBe(1);
    expect(res[0].projectId).toBe('GIS-0001');
  });

  it('sorts projects by priority descending', () => {
    const sorted = sortProjects(list, 'priority', 'desc');
    expect(sorted.map((p) => p.projectId)).toEqual(['GIS-0001', 'GIS-0003', 'GIS-0002']);
  });

  it('sorts projects by cost ascending', () => {
    const sorted = sortProjects(list, 'cost', 'asc');
    expect(sorted.map((p) => p.projectId)).toEqual(['GIS-0002', 'GIS-0001', 'GIS-0003']);
  });

  it('groups projects with none grouping into single All Projects group', () => {
    const groups = groupProjects(list, 'none');
    expect(groups.length).toBe(1);
    expect(groups[0].key).toBe('all');
    expect(groups[0].label).toBe('All Projects');
    expect(groups[0].count).toBe(3);
  });

  it('groups projects by business unit with correct counts and costs', () => {
    const groups = groupProjects(list, 'businessUnit');
    expect(groups.length).toBe(2);
    const fabOps = groups.find((g) => g.key === 'Fab Operations');
    expect(fabOps).toBeDefined();
    expect(fabOps!.count).toBe(2);
    expect(fabOps!.totalCost).toBe(3000000);
    expect(fabOps!.avgConfidence).toBe(72.5);
  });

  it('builds hierarchy tree rolling up BU > Site > Project', () => {
    const tree = buildHierarchyTree(list);
    expect(tree.length).toBe(2); // Fab Operations & Supply Chain
    const fabOps = tree.find((n) => n.name === 'Fab Operations');
    expect(fabOps).toBeDefined();
    expect(fabOps!.count).toBe(2);
    expect(fabOps!.children.length).toBe(2); // Fremont and Singapore
    expect(fabOps!.totalCost).toBe(3000000);
  });
});
