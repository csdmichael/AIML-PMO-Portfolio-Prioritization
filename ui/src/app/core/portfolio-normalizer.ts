import {
  PortfolioDataset,
  Project,
  RiskRating,
  SponsorLevel,
  CapacityBySkill,
  ProjectCluster,
} from '../models/portfolio.models';

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

export function normalizeProject(project: Project): Project {
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

export function recalculateDatasetRollups(projects: Project[]): {
  capacityBySkill: CapacityBySkill[];
  clusters: ProjectCluster[];
} {
  const BASE_SUPPLY: Record<string, number> = {
    'Application Development': 48.0,
    'Network Engineering': 36.0,
    'Cloud and Infrastructure': 40.0,
    'Data Engineering': 28.0,
    'Cybersecurity': 24.0,
    'Unified Communications': 20.0,
    'Integration (iPaaS)': 16.0,
    'Project Management': 22.0,
  };

  const active = projects.filter((p) => !p.isDeleted);
  const capacityBySkill: CapacityBySkill[] = Object.entries(BASE_SUPPLY).map(([skill, supplyFte]) => {
    const demandRows = active.filter(
      (p) => (p.finalTier === 'Must-do-now' || p.finalTier === 'Proceed') && p.primarySkill === skill
    );
    const demandFte = Math.round(demandRows.reduce((sum, p) => sum + (p.skillDemandFte || 0), 0) * 10) / 10;
    const gapFte = Math.round((supplyFte - demandFte) * 10) / 10;
    return {
      skill,
      supplyFte,
      demandFte,
      gapFte,
      projectsInDemand: demandRows.length,
    };
  });

  const clusterMap = new Map<string, { count: number; totalConf: number; id: number }>();
  const defaultClusters = [
    { id: 1, name: 'Platform' },
    { id: 2, name: 'Analytics & AI' },
    { id: 3, name: 'Security & Identity' },
    { id: 4, name: 'Core Enterprise IT' },
  ];
  defaultClusters.forEach((c) => clusterMap.set(c.name, { count: 0, totalConf: 0, id: c.id }));

  active.forEach((p) => {
    const cName = p.cluster || 'Core Enterprise IT';
    const existing = clusterMap.get(cName) || { count: 0, totalConf: 0, id: clusterMap.size + 1 };
    existing.count++;
    existing.totalConf += p.confidenceScore || 0;
    clusterMap.set(cName, existing);
  });

  const clusters: ProjectCluster[] = Array.from(clusterMap.entries()).map(([name, data]) => ({
    clusterId: data.id,
    name,
    projectCount: data.count,
    avgConfidence: data.count > 0 ? Math.round((data.totalConf / data.count) * 10) / 10 : 0,
  }));

  return { capacityBySkill, clusters };
}
