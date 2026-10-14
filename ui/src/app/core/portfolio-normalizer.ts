import { PortfolioDataset, Project, RiskRating, SponsorLevel } from '../models/portfolio.models';

function stringOr(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function numberOrZero(value: number | null | undefined): number {
  return Number.isFinite(value) ? value! : 0;
}

export function normalizePortfolioDataset(dataset: PortfolioDataset): PortfolioDataset {
  return {
    ...dataset,
    projects: dataset.projects.map((project) => normalizeProject(project)),
  };
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
    projectName: stringOr(project.projectName, 'Unnamed project'),
    businessUnit: stringOr(project.businessUnit, 'Unassigned business unit'),
    site: stringOr(project.site, 'Unassigned site'),
    projectManager: stringOr(project.projectManager, 'Unassigned'),
    executiveSponsor: stringOr(project.executiveSponsor, 'Unassigned'),
    sponsorLevel: stringOr(project.sponsorLevel, 'Unknown') as SponsorLevel,
    riskRating: stringOr(project.riskRating, 'Unknown') as RiskRating,
    businessValue: numberOrZero(project.businessValue),
    costEstimateUsd: numberOrZero(project.costEstimateUsd),
    dependencyCount: numberOrZero(project.dependencyCount),
    effortPersonWeeks: numberOrZero(project.effortPersonWeeks),
  };
}
