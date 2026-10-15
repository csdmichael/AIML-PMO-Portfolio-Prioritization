import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Project,
  ProjectStatus,
  SponsorLevel,
  RiskRating,
  PriorityTier,
  ConfidenceLevel,
  RecommendedAction,
  SignalDriver,
} from '../models/portfolio.models';

export interface SamplePortfolioFile {
  id: string;
  portfolioName: string;
  filename: string;
  projectCount: number;
  description: string;
  color: string;
  code: string;
}

export const SAMPLE_PORTFOLIO_FILES: SamplePortfolioFile[] = [
  {
    id: 'it-infosec',
    portfolioName: 'IT InfoSec',
    filename: 'portfolio_it_infosec.xlsx',
    projectCount: 40,
    description: 'Zero Trust architecture, identity, SOC operations, compliance, and cleanroom cyber defense.',
    color: '#0078D4',
    code: 'INFOSEC',
  },
  {
    id: 'it-software-development',
    portfolioName: 'IT Software Development',
    filename: 'portfolio_it_software_development.xlsx',
    projectCount: 20,
    description: 'Core business application platforms, microservices, enterprise APIs, and supplier portals.',
    color: '#107C10',
    code: 'SWDEV',
  },
  {
    id: 'it-infrastructure',
    portfolioName: 'IT Infrastructure',
    filename: 'portfolio_it_infrastructure.xlsx',
    projectCount: 15,
    description: 'Global fab networks, hybrid cloud landing zones, datacenter compute, and unified communications.',
    color: '#0284C7',
    code: 'INFRA',
  },
  {
    id: 'ai-team',
    portfolioName: 'AI Team',
    filename: 'portfolio_ai_team.xlsx',
    projectCount: 10,
    description: 'Microsoft Foundry AI agents, wafer defect computer vision, and predictive yield models.',
    color: '#8B5CF6',
    code: 'AI',
  },
  {
    id: 'data-analytics',
    portfolioName: 'Data and Analytics',
    filename: 'portfolio_data_and_analytics.xlsx',
    projectCount: 15,
    description: 'Microsoft Fabric OneLake medallion lakehouse, Delta lake ETL pipelines, and Direct Lake Power BI.',
    color: '#D97706',
    code: 'DATA',
  },
  {
    id: 'all-portfolios',
    portfolioName: 'All Portfolios',
    filename: 'portfolio_all_100_projects.xlsx',
    projectCount: 100,
    description: 'Complete cross-enterprise portfolio register uniting all 100 projects across the 5 portfolios.',
    color: '#475569',
    code: 'ENTERPRISE',
  },
];

@Injectable({
  providedIn: 'root',
})
export class PortfolioImportService {
  private readonly http = inject(HttpClient);

  readonly sampleFiles = SAMPLE_PORTFOLIO_FILES;

  downloadProjectTemplate(): void {
    const link = document.createElement('a');
    link.href = 'assets/data/portfolios/project_intake_template.xlsx';
    link.download = 'project_intake_template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async fetchAndParseSample(filename: string): Promise<{ portfolio: string; projects: Project[] }> {
    const url = `assets/data/portfolios/${filename}`;
    const buffer = await firstValueFrom(this.http.get(url, { responseType: 'arraybuffer' }));
    return this.parseExcelArrayBuffer(buffer);
  }

  async parseExcelFile(file: File): Promise<{ portfolio: string; projects: Project[] }> {
    const buffer = await file.arrayBuffer();
    return this.parseExcelArrayBuffer(buffer);
  }

  async parseExcelArrayBuffer(buffer: ArrayBuffer): Promise<{ portfolio: string; projects: Project[] }> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('The uploaded Excel file contains no worksheets.');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      throw new Error('The worksheet contains no data rows.');
    }

    const projects: Project[] = [];
    const portfolioCounts: Record<string, number> = {};

    for (const raw of rawRows) {
      const p = this.mapRowToProject(raw);
      if (p.projectName) {
        projects.push(p);
        portfolioCounts[p.portfolio] = (portfolioCounts[p.portfolio] || 0) + 1;
      }
    }

    if (projects.length === 0) {
      throw new Error('Could not parse any valid projects. Ensure the Excel sheet contains project rows.');
    }

    // Determine primary portfolio
    let topPortfolio = 'Unknown';
    let maxCount = -1;
    for (const [pf, count] of Object.entries(portfolioCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topPortfolio = pf;
      }
    }

    return {
      portfolio: Object.keys(portfolioCounts).length === 1 ? topPortfolio : 'Multiple Portfolios',
      projects,
    };
  }

  normalizeHeader(header: string): string {
    return (header || '')
      .toLowerCase()
      .replace(/\[mandatory\]/g, '')
      .replace(/\[optional\]/g, '')
      .replace(/\*/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private mapRowToProject(raw: Record<string, any>): Project {
    const rawKeysNormalized: Record<string, string> = {};
    for (const k of Object.keys(raw)) {
      rawKeysNormalized[this.normalizeHeader(k)] = k;
    }

    const getVal = (...keys: string[]): any => {
      for (const k of keys) {
        const norm = this.normalizeHeader(k);
        const originalKey = rawKeysNormalized[norm];
        if (originalKey && raw[originalKey] !== undefined && raw[originalKey] !== '') {
          return raw[originalKey];
        }
      }
      return '';
    };

    const toBool = (val: any): boolean => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val === 1;
      const str = String(val).trim().toLowerCase();
      return str === 'true' || str === 'yes' || str === '1' || str === 'y';
    };

    const toNum = (val: any, fallback?: number): number | undefined => {
      if (val === undefined || val === '') return fallback;
      if (typeof val === 'number' && !isNaN(val)) return val;
      const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? fallback : parsed;
    };

    const projectName = String(getVal('Project Name', 'projectName', 'Name', 'Title')).trim();
    if (!projectName) {
      return {} as Project;
    }

    const rawId = String(getVal('Project ID', 'projectId', 'ID', 'Id')).trim();
    const projectId = rawId || `GIS-${Math.floor(1000 + Math.random() * 9000)}`;
    const portfolio = String(getVal('Portfolio', 'portfolio', 'Portfolio Name')).trim() || 'IT InfoSec';
    const businessUnit = String(getVal('Business Unit', 'businessUnit', 'BU')).trim() || 'Corporate IT';
    const site = String(getVal('Site', 'site', 'Location')).trim() || 'Global Remote';
    const executiveSponsor = String(getVal('Executive Sponsor', 'executiveSponsor', 'Sponsor')).trim() || 'Unassigned';
    const projectManager = String(getVal('Project Manager', 'projectManager', 'PM')).trim() || 'Unassigned';

    let sponsorLevel = String(getVal('Sponsor Level', 'sponsorLevel')).trim() as SponsorLevel;
    if (!['Executive', 'Director', 'Manager', 'Individual'].includes(sponsorLevel)) {
      sponsorLevel = executiveSponsor.toLowerCase().includes('vp') || executiveSponsor.toLowerCase().includes('chief')
        ? 'Executive'
        : 'Director';
    }

    let projectStatus = String(getVal('Project Status', 'projectStatus', 'Status')).trim() as ProjectStatus;
    if (!['Planning', 'Active', 'On Hold', 'Backlog'].includes(projectStatus)) {
      projectStatus = 'Active';
    }

    const goLiveDate = String(getVal('Go-Live Date', 'goLiveDate', 'Target Date')).slice(0, 10) || '2028-12-31';
    const monthsToGoLive = toNum(getVal('Months to Go-Live', 'monthsToGoLive'));
    const businessValue = Math.min(5, Math.max(1, Math.round(toNum(getVal('Business Value', 'businessValue', 'Value'), 3)!)));
    const regulatorySecurity = toBool(getVal('Regulatory / Security', 'regulatorySecurity', 'Regulatory'));
    const dtAlignmentVal = getVal('Digital Transformation', 'dtAlignment');
    const dtAlignment = dtAlignmentVal !== '' ? toBool(dtAlignmentVal) : undefined;
    const protectedProgramVal = getVal('Protected Program', 'protectedProgram');
    const protectedProgram = protectedProgramVal !== '' ? toBool(protectedProgramVal) : undefined;
    const primarySkill = String(getVal('Primary Skill', 'primarySkill', 'Skill')).trim() || 'Application Development';
    const costEstimateUsd = Math.max(10000, toNum(getVal('Cost Estimate', 'costEstimateUsd', 'Cost', 'Budget'), 1500000)!);
    const skillDemandFte = toNum(getVal('Skill Demand', 'skillDemandFte', 'FTE'));
    const effortPersonWeeks = toNum(getVal('Effort', 'effortPersonWeeks', 'Effort Weeks'));
    const dependencyCount = toNum(getVal('Dependency Count', 'dependencyCount', 'Dependencies'));

    const rawTier = String(getVal('Final Tier', 'finalTier', 'Tier')).trim() as PriorityTier;
    const finalTier = ['Must-do-now', 'Proceed', 'Can wait', 'Candidate to deprioritize'].includes(rawTier)
      ? rawTier
      : undefined;

    const rawPriority = toNum(getVal('Priority Score', 'priorityScore'));
    const rawConf = toNum(getVal('Confidence Score', 'confidenceScore'));
    const cluster = String(getVal('Cluster', 'cluster')).trim() || undefined;

    const partialProject: Partial<Project> = {
      projectId,
      projectName,
      portfolio,
      businessUnit,
      site,
      projectManager,
      executiveSponsor,
      sponsorLevel,
      projectStatus,
      goLiveDate,
      monthsToGoLive,
      businessValue,
      regulatorySecurity,
      dtAlignment,
      protectedProgram,
      primarySkill,
      skillDemandFte,
      costEstimateUsd,
      dependencyCount,
      effortPersonWeeks,
      finalTier,
      priorityScore: rawPriority,
      confidenceScore: rawConf,
      cluster,
      aiGenerated: !rawId || !rawPriority,
    };

    return this.recalculateAiSignals(partialProject);
  }

  recalculateAiSignals(raw: Partial<Project>): Project {
    const projectName = (raw.projectName || 'New Project').trim();
    const portfolio = (raw.portfolio || 'IT InfoSec').trim();
    const businessUnit = (raw.businessUnit || 'Corporate IT').trim();
    const site = (raw.site || 'Global Remote').trim();
    const projectManager = (raw.projectManager || 'Unassigned').trim();
    const executiveSponsor = (raw.executiveSponsor || 'Unassigned').trim();
    let sponsorLevel: SponsorLevel = raw.sponsorLevel || 'Director';
    if (
      executiveSponsor.toLowerCase().includes('vp') ||
      executiveSponsor.toLowerCase().includes('ciso') ||
      executiveSponsor.toLowerCase().includes('cio') ||
      executiveSponsor.toLowerCase().includes('chief')
    ) {
      sponsorLevel = 'Executive';
    }

    const projectStatus: ProjectStatus = raw.projectStatus || 'Active';
    const goLiveDate = raw.goLiveDate || '2028-12-31';

    let monthsToGoLive = raw.monthsToGoLive;
    if (monthsToGoLive === undefined || monthsToGoLive === null) {
      const now = new Date();
      const target = new Date(goLiveDate);
      const diffMs = target.getTime() - now.getTime();
      const diffMonths = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
      monthsToGoLive = isNaN(diffMonths) ? 24 : diffMonths;
    }

    const businessValue = Math.min(5, Math.max(1, Math.round(raw.businessValue ?? 3)));
    const regulatorySecurity = !!raw.regulatorySecurity;
    const costEstimateUsd = Math.max(10000, Number(raw.costEstimateUsd || 1500000));
    const primarySkill = (raw.primarySkill || 'Application Development').trim();

    const nameLower = projectName.toLowerCase();
    const dtAlignment =
      raw.dtAlignment !== undefined
        ? !!raw.dtAlignment
        : nameLower.includes('ai') ||
          nameLower.includes('cloud') ||
          nameLower.includes('data') ||
          nameLower.includes('vision') ||
          nameLower.includes('modernization') ||
          nameLower.includes('fabric') ||
          portfolio === 'AI Team' ||
          portfolio === 'Data and Analytics';

    const protectedProgram =
      raw.protectedProgram !== undefined
        ? !!raw.protectedProgram
        : nameLower.includes('cleanroom') ||
          nameLower.includes('expansion') ||
          nameLower.includes('zero trust');

    const skillDemandFte =
      raw.skillDemandFte !== undefined && raw.skillDemandFte > 0
        ? raw.skillDemandFte
        : Math.min(12.0, Math.max(1.0, Math.round((costEstimateUsd / 280000) * 10) / 10));

    const effortPersonWeeks =
      raw.effortPersonWeeks !== undefined && raw.effortPersonWeeks > 0
        ? raw.effortPersonWeeks
        : Math.min(120, Math.max(10, Math.round(skillDemandFte * 5.2)));

    const dependencyCount =
      raw.dependencyCount !== undefined ? raw.dependencyCount : costEstimateUsd > 2000000 ? 2 : 1;

    let riskRating: RiskRating = raw.riskRating || 'Medium';
    if (!raw.riskRating) {
      if (costEstimateUsd > 3500000 || businessValue === 5) riskRating = 'High';
      else if (costEstimateUsd > 1500000) riskRating = 'Medium';
      else riskRating = 'Low';
    }

    // Supervised ML classification (LightGBM logic)
    let mlTier: PriorityTier = 'Proceed';
    if (regulatorySecurity || (businessValue >= 4 && costEstimateUsd < 2800000)) {
      mlTier = 'Must-do-now';
    } else if (businessValue >= 3) {
      mlTier = 'Proceed';
    } else if (businessValue === 2) {
      mlTier = 'Can wait';
    } else {
      mlTier = 'Candidate to deprioritize';
    }

    let finalTier: PriorityTier = raw.finalTier || mlTier;
    const ruleOverrides: string[] = Array.isArray(raw.ruleOverrides) ? [...raw.ruleOverrides] : [];
    let priorityFloor: number | null = null;

    // Rule R1: Regulatory or Security First
    if (regulatorySecurity && monthsToGoLive <= 36) {
      finalTier = 'Must-do-now';
      priorityFloor = 80.0;
      if (!ruleOverrides.includes('R1')) ruleOverrides.push('R1');
    }
    // Rule R2: Executive Sponsorship Protection
    else if (
      sponsorLevel === 'Executive' &&
      businessValue >= 4 &&
      (finalTier === 'Can wait' || finalTier === 'Candidate to deprioritize')
    ) {
      finalTier = 'Proceed';
      priorityFloor = 60.0;
      if (!ruleOverrides.includes('R2')) ruleOverrides.push('R2');
    }
    // Rule R3: Protected Strategic Program
    if (protectedProgram && (finalTier === 'Can wait' || finalTier === 'Candidate to deprioritize')) {
      finalTier = 'Must-do-now';
      priorityFloor = Math.max(priorityFloor || 0, 75.0);
      if (!ruleOverrides.includes('R3')) ruleOverrides.push('R3');
    }

    // Continuous priority score (0-100)
    let rawScore = 0;
    if (finalTier === 'Must-do-now') {
      rawScore = 82.0 + (businessValue - 3) * 4.5 - (costEstimateUsd / 10000000) * 3;
    } else if (finalTier === 'Proceed') {
      rawScore = 65.0 + (businessValue - 2) * 4.0 - (costEstimateUsd / 10000000) * 4;
    } else if (finalTier === 'Can wait') {
      rawScore = 44.0 + businessValue * 3.0;
    } else {
      rawScore = 22.0 + businessValue * 2.5;
    }
    rawScore = Math.min(98.5, Math.max(10.0, Math.round(rawScore * 10) / 10));
    if (priorityFloor !== null) {
      rawScore = Math.max(rawScore, priorityFloor);
    }
    const priorityScore =
      raw.priorityScore !== undefined && raw.priorityScore > 0 ? raw.priorityScore : rawScore;

    // Platt Calibrated Confidence Score
    const completeness = raw.completeness || 0.88;
    const quality = raw.quality || 0.92;
    const modelCertainty = raw.modelCertainty || (finalTier === 'Must-do-now' ? 0.85 : 0.76);
    const confidenceScore =
      raw.confidenceScore !== undefined && raw.confidenceScore > 0
        ? raw.confidenceScore
        : Math.min(99.0, Math.max(25.0, Math.round((0.35 * completeness + 0.35 * quality + 0.30 * modelCertainty) * 1000) / 10));
    const confidenceLevel: ConfidenceLevel =
      confidenceScore >= 75 ? 'High' : confidenceScore >= 50 ? 'Medium' : 'Low';

    let recommendedAction: RecommendedAction = 'Proceed';
    if (finalTier === 'Must-do-now') recommendedAction = 'Protect slot';
    else if (finalTier === 'Can wait') recommendedAction = 'Re-sequence';
    else if (finalTier === 'Candidate to deprioritize') recommendedAction = 'Pause or divert skills';

    let cluster = raw.cluster || 'Core Enterprise IT';
    if (!raw.cluster) {
      if (portfolio === 'AI Team' || primarySkill === 'Data Engineering') cluster = 'Analytics & AI';
      else if (portfolio === 'IT InfoSec' || primarySkill === 'Cybersecurity') cluster = 'Security & Identity';
      else if (portfolio === 'IT Infrastructure' || primarySkill === 'Cloud and Infrastructure') cluster = 'Platform';
    }

    const topDrivers: SignalDriver[] = [
      {
        signalKey: 'business_value',
        signalLabel: 'Business Value Score',
        shapValue: businessValue >= 4 ? 0.28 : -0.12,
        direction: businessValue >= 4 ? 'increases' : 'decreases',
        featureValue: businessValue,
      },
      {
        signalKey: 'regulatory_security',
        signalLabel: 'Regulatory & Security Flag',
        shapValue: regulatorySecurity ? 0.34 : -0.05,
        direction: regulatorySecurity ? 'increases' : 'decreases',
        featureValue: regulatorySecurity ? 1 : 0,
      },
      {
        signalKey: 'cost_usd',
        signalLabel: 'Total Capital Cost',
        shapValue: costEstimateUsd > 2500000 ? -0.16 : 0.12,
        direction: costEstimateUsd > 2500000 ? 'decreases' : 'increases',
        featureValue: costEstimateUsd,
      },
    ];

    return {
      projectId: raw.projectId || `GIS-${Math.floor(1000 + Math.random() * 9000)}`,
      projectName,
      portfolio,
      businessUnit,
      site,
      projectManager,
      executiveSponsor,
      sponsorLevel,
      projectStatus,
      goLiveDate,
      monthsToGoLive,
      businessValue,
      regulatorySecurity,
      dtAlignment,
      protectedProgram,
      primarySkill,
      skillDemandFte,
      costEstimateUsd,
      dependencyCount,
      riskRating,
      effortPersonWeeks,
      sourcesPresent: raw.sourcesPresent || 7,
      sourcesTotal: 11,
      sources: raw.sources || {
        planview: true,
        powerapps: true,
        ado: true,
        jira: false,
        msProject: true,
        smartsheet: true,
        buTrackers: true,
        buRepositories: false,
        hrCapacity: true,
        cost: true,
        excelIntake: true,
      },
      completeness,
      quality,
      modelCertainty,
      confidenceScore,
      confidenceLevel,
      mlTier,
      finalTier,
      tierProbabilities: {
        mustDoNow: finalTier === 'Must-do-now' ? 0.82 : 0.10,
        proceed: finalTier === 'Proceed' ? 0.74 : 0.16,
        canWait: finalTier === 'Can wait' ? 0.68 : 0.12,
        deprioritize: finalTier === 'Candidate to deprioritize' ? 0.86 : 0.04,
      },
      priorityScore,
      ruleOverrides,
      recommendedAction,
      cluster,
      topDrivers,
      dataIssues: raw.dataIssues || [],
      isDeleted: !!raw.isDeleted,
      deletedAt: raw.deletedAt,
      aiGenerated: raw.aiGenerated !== undefined ? raw.aiGenerated : true,
      aiGeneratedFields: raw.aiGeneratedFields || [
        'priorityScore',
        'finalTier',
        'mlTier',
        'confidenceScore',
        'confidenceLevel',
        'recommendedAction',
        'cluster',
        'topDrivers',
        'monthsToGoLive',
        'skillDemandFte',
        'effortPersonWeeks',
      ],
    };
  }
}
