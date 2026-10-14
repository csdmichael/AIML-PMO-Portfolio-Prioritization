import {
  Project,
  FilterCriteria,
  SortField,
  SortDirection,
  GroupByOption,
  GroupSummary,
  HierarchyNode,
  ConfidenceLevel,
} from '../models/portfolio.models';

export const DEFAULT_FILTER_CRITERIA: FilterCriteria = {
  search: '',
  confidenceLevels: [],
  finalTiers: [],
  businessUnits: [],
  sites: [],
  portfolios: [],
  sponsorLevels: [],
  riskRatings: [],
  primarySkills: [],
  clusters: [],
  recommendedActions: [],
  regulatory: null,
  dtAlignment: null,
  protectedProgram: null,
  hasDataIssues: null,
  minSources: 0,
  maxSources: 11,
  minCompleteness: 0,
  maxCompleteness: 100,
  minPriorityScore: 0,
  maxPriorityScore: 100,
  minCostUsd: 0,
  maxCostUsd: 15000000,
  goLiveFrom: '',
  goLiveTo: '',
};

export function filterProjects(projects: readonly Project[], criteria: FilterCriteria): Project[] {
  const searchNormalized = criteria.search.trim().toLowerCase();

  return projects.filter((p) => {
    // Free-text search over project id, name, sponsor, and project manager
    if (searchNormalized) {
      const matchId = p.projectId.toLowerCase().includes(searchNormalized);
      const matchName = p.projectName.toLowerCase().includes(searchNormalized);
      const matchSponsor = p.executiveSponsor.toLowerCase().includes(searchNormalized);
      const matchPm = p.projectManager.toLowerCase().includes(searchNormalized);
      if (!matchId && !matchName && !matchSponsor && !matchPm) {
        return false;
      }
    }

    // Confidence levels (multi-select)
    if (criteria.confidenceLevels.length > 0 && !criteria.confidenceLevels.includes(p.confidenceLevel)) {
      return false;
    }

    // Final tiers (multi-select)
    if (criteria.finalTiers.length > 0 && !criteria.finalTiers.includes(p.finalTier)) {
      return false;
    }

    // Business units
    if (criteria.businessUnits.length > 0 && !criteria.businessUnits.includes(p.businessUnit)) {
      return false;
    }

    // Sites
    if (criteria.sites.length > 0 && !criteria.sites.includes(p.site)) {
      return false;
    }

    // Portfolios
    if (criteria.portfolios.length > 0 && !criteria.portfolios.includes(p.portfolio)) {
      return false;
    }

    // Sponsor levels
    if (criteria.sponsorLevels.length > 0 && !criteria.sponsorLevels.includes(p.sponsorLevel)) {
      return false;
    }

    // Risk ratings
    if (criteria.riskRatings.length > 0 && !criteria.riskRatings.includes(p.riskRating)) {
      return false;
    }

    // Primary skills
    if (criteria.primarySkills.length > 0 && !criteria.primarySkills.includes(p.primarySkill)) {
      return false;
    }

    // Clusters
    if (criteria.clusters.length > 0 && !criteria.clusters.includes(p.cluster)) {
      return false;
    }

    // Recommended actions
    if (criteria.recommendedActions.length > 0 && !criteria.recommendedActions.includes(p.recommendedAction)) {
      return false;
    }

    // Boolean flags
    if (criteria.regulatory !== null && p.regulatorySecurity !== criteria.regulatory) {
      return false;
    }
    if (criteria.dtAlignment !== null && p.dtAlignment !== criteria.dtAlignment) {
      return false;
    }
    if (criteria.protectedProgram !== null && p.protectedProgram !== criteria.protectedProgram) {
      return false;
    }
    if (criteria.hasDataIssues !== null) {
      const hasIssues = p.dataIssues && p.dataIssues.length > 0;
      if (hasIssues !== criteria.hasDataIssues) {
        return false;
      }
    }

    // Sliders
    if (p.sourcesPresent < criteria.minSources || p.sourcesPresent > criteria.maxSources) {
      return false;
    }

    const completenessPct = p.completeness * 100;
    if (completenessPct < criteria.minCompleteness || completenessPct > criteria.maxCompleteness) {
      return false;
    }

    if (p.priorityScore < criteria.minPriorityScore || p.priorityScore > criteria.maxPriorityScore) {
      return false;
    }

    if (p.costEstimateUsd < criteria.minCostUsd || p.costEstimateUsd > criteria.maxCostUsd) {
      return false;
    }

    // Go-live date window
    if (criteria.goLiveFrom && p.goLiveDate < criteria.goLiveFrom) {
      return false;
    }
    if (criteria.goLiveTo && p.goLiveDate > criteria.goLiveTo) {
      return false;
    }

    return true;
  });
}

export function sortProjects(
  projects: readonly Project[],
  field: SortField,
  direction: SortDirection = 'asc',
): Project[] {
  const result = [...projects];
  const mult = direction === 'asc' ? 1 : -1;

  result.sort((a, b) => {
    switch (field) {
      case 'priority':
        return (a.priorityScore - b.priorityScore) * mult;
      case 'confidence':
        return (a.confidenceScore - b.confidenceScore) * mult;
      case 'goLive':
        return a.goLiveDate.localeCompare(b.goLiveDate) * mult;
      case 'cost':
        return (a.costEstimateUsd - b.costEstimateUsd) * mult;
      case 'sources':
        return (a.sourcesPresent - b.sourcesPresent) * mult;
      case 'name':
        return a.projectName.localeCompare(b.projectName) * mult;
      default:
        return 0;
    }
  });

  return result;
}

export function groupProjects(
  projects: readonly Project[],
  groupBy: GroupByOption,
): GroupSummary<Project>[] {
  if (groupBy === 'none') {
    const totalCost = projects.reduce((s, p) => s + p.costEstimateUsd, 0);
    const avgConfidence =
      projects.length === 0
        ? 0
        : Math.round((projects.reduce((s, p) => s + p.confidenceScore, 0) / projects.length) * 10) / 10;
    return [
      {
        key: 'all',
        label: `All Projects (${projects.length})`,
        count: projects.length,
        avgConfidence,
        totalCost,
        items: [...projects],
      },
    ];
  }

  const map = new Map<string, Project[]>();

  for (const p of projects) {
    let key = '';
    switch (groupBy) {
      case 'finalTier':
        key = p.finalTier;
        break;
      case 'confidenceLevel':
        key = p.confidenceLevel;
        break;
      case 'businessUnit':
        key = p.businessUnit;
        break;
      case 'cluster':
        key = p.cluster;
        break;
      case 'recommendedAction':
        key = p.recommendedAction;
        break;
    }
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }

  const summaries: GroupSummary<Project>[] = [];
  for (const [key, items] of map.entries()) {
    const totalCost = items.reduce((s, p) => s + p.costEstimateUsd, 0);
    const avgConfidence =
      items.length === 0
        ? 0
        : Math.round((items.reduce((s, p) => s + p.confidenceScore, 0) / items.length) * 10) / 10;
    summaries.push({
      key,
      label: key,
      count: items.length,
      avgConfidence,
      totalCost,
      items,
    });
  }

  // Stable sort by group label or priority ordering if finalTier
  if (groupBy === 'finalTier') {
    const order: Record<string, number> = {
      'Must-do-now': 1,
      'Proceed': 2,
      'Can wait': 3,
      'Candidate to deprioritize': 4,
    };
    summaries.sort((a, b) => (order[a.key] ?? 99) - (order[b.key] ?? 99));
  } else if (groupBy === 'confidenceLevel') {
    const order: Record<string, number> = { High: 1, Medium: 2, Low: 3 };
    summaries.sort((a, b) => (order[a.key] ?? 99) - (order[b.key] ?? 99));
  } else {
    summaries.sort((a, b) => a.label.localeCompare(b.label));
  }

  return summaries;
}

export function buildHierarchyTree(projects: readonly Project[]): HierarchyNode[] {
  const buMap = new Map<string, Map<string, Project[]>>();

  for (const p of projects) {
    let siteMap = buMap.get(p.businessUnit);
    if (!siteMap) {
      siteMap = new Map<string, Project[]>();
      buMap.set(p.businessUnit, siteMap);
    }
    const list = siteMap.get(p.site) ?? [];
    list.push(p);
    siteMap.set(p.site, list);
  }

  const result: HierarchyNode[] = [];

  for (const [bu, siteMap] of buMap.entries()) {
    const siteNodes: HierarchyNode[] = [];
    let buTotalCost = 0;
    let buConfSum = 0;
    let buCount = 0;

    for (const [site, projList] of siteMap.entries()) {
      const siteTotalCost = projList.reduce((s, p) => s + p.costEstimateUsd, 0);
      const siteConfSum = projList.reduce((s, p) => s + p.confidenceScore, 0);
      const siteAvgConf = projList.length === 0 ? 0 : Math.round((siteConfSum / projList.length) * 10) / 10;

      const projNodes: HierarchyNode[] = projList.map((p) => ({
        id: `proj-${p.projectId}`,
        name: `${p.projectId} - ${p.projectName}`,
        level: 'project',
        count: 1,
        avgConfidence: p.confidenceScore,
        totalCost: p.costEstimateUsd,
        project: p,
        children: [],
        expanded: false,
      }));

      siteNodes.push({
        id: `site-${bu}-${site}`,
        name: site,
        level: 'site',
        count: projList.length,
        avgConfidence: siteAvgConf,
        totalCost: siteTotalCost,
        children: projNodes,
        expanded: true,
      });

      buTotalCost += siteTotalCost;
      buConfSum += siteConfSum;
      buCount += projList.length;
    }

    const buAvgConf = buCount === 0 ? 0 : Math.round((buConfSum / buCount) * 10) / 10;
    siteNodes.sort((a, b) => a.name.localeCompare(b.name));

    result.push({
      id: `bu-${bu}`,
      name: bu,
      level: 'businessUnit',
      count: buCount,
      avgConfidence: buAvgConf,
      totalCost: buTotalCost,
      children: siteNodes,
      expanded: true,
    });
  }

  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

export function exportProjectsToCsv(projects: readonly Project[]): string {
  const headers = [
    'Project ID',
    'Project Name',
    'Portfolio',
    'Business Unit',
    'Site',
    'Project Manager',
    'Executive Sponsor',
    'Sponsor Level',
    'Status',
    'Go-Live Date',
    'Months to Go-Live',
    'Business Value',
    'Regulatory/Security',
    'DT Alignment',
    'Protected Program',
    'Primary Skill',
    'Skill Demand FTE',
    'Cost Estimate USD',
    'Dependency Count',
    'Risk Rating',
    'Effort Person-Weeks',
    'Sources Present',
    'Sources Total',
    'Completeness %',
    'Quality %',
    'Model Certainty %',
    'Confidence Score',
    'Confidence Level',
    'ML Tier',
    'Final Tier',
    'Priority Score',
    'Rule Overrides',
    'Recommended Action',
    'Cluster',
    'Data Issues',
  ];

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows: string[] = [headers.map((h) => `"${h}"`).join(',')];

  for (const p of projects) {
    const row = [
      p.projectId,
      p.projectName,
      p.portfolio,
      p.businessUnit,
      p.site,
      p.projectManager,
      p.executiveSponsor,
      p.sponsorLevel,
      p.projectStatus,
      p.goLiveDate,
      p.monthsToGoLive,
      p.businessValue,
      p.regulatorySecurity ? 'Yes' : 'No',
      p.dtAlignment ? 'Yes' : 'No',
      p.protectedProgram ? 'Yes' : 'No',
      p.primarySkill,
      p.skillDemandFte,
      p.costEstimateUsd,
      p.dependencyCount,
      p.riskRating,
      p.effortPersonWeeks,
      p.sourcesPresent,
      p.sourcesTotal,
      Math.round(p.completeness * 100),
      Math.round(p.quality * 100),
      Math.round(p.modelCertainty * 100),
      p.confidenceScore,
      p.confidenceLevel,
      p.mlTier,
      p.finalTier,
      p.priorityScore,
      p.ruleOverrides.join('; '),
      p.recommendedAction,
      p.cluster,
      p.dataIssues.join('; '),
    ];
    rows.push(row.map(escapeCsv).join(','));
  }

  return rows.join('\r\n');
}

export function calculateConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 75) return 'High';
  if (score >= 50) return 'Medium';
  return 'Low';
}

export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'High':
      return '#107C10';
    case 'Medium':
      return '#C19C00';
    case 'Low':
      return '#D13438';
  }
}
