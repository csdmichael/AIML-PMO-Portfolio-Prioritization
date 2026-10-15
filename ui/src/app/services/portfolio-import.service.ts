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
      if (p.projectId) {
        projects.push(p);
        portfolioCounts[p.portfolio] = (portfolioCounts[p.portfolio] || 0) + 1;
      }
    }

    if (projects.length === 0) {
      throw new Error('Could not parse any valid projects. Ensure the Excel sheet contains a "Project ID" column.');
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

  private mapRowToProject(raw: Record<string, any>): Project {
    const getVal = (...keys: string[]): any => {
      for (const k of keys) {
        if (raw[k] !== undefined && raw[k] !== '') return raw[k];
        const matchKey = Object.keys(raw).find((ok) => ok.trim().toLowerCase() === k.trim().toLowerCase());
        if (matchKey && raw[matchKey] !== undefined && raw[matchKey] !== '') return raw[matchKey];
      }
      return '';
    };

    const toBool = (val: any): boolean => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val === 1;
      const str = String(val).trim().toLowerCase();
      return str === 'true' || str === 'yes' || str === '1' || str === 'y';
    };

    const toNum = (val: any, fallback = 0): number => {
      if (typeof val === 'number' && !isNaN(val)) return val;
      const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? fallback : parsed;
    };

    const projectId = String(getVal('Project ID', 'projectId', 'ID', 'Id')).trim() || `GIS-${Math.floor(1000 + Math.random() * 9000)}`;
    const projectName = String(getVal('Project Name', 'projectName', 'Name', 'Title')).trim() || 'Imported Project';
    const portfolio = String(getVal('Portfolio', 'portfolio', 'Portfolio Name')).trim() || 'IT InfoSec';
    const businessUnit = String(getVal('Business Unit', 'businessUnit', 'BU')).trim() || 'Corporate IT';
    const site = String(getVal('Site', 'site', 'Location')).trim() || 'Global Remote';
    const projectManager = String(getVal('Project Manager', 'projectManager', 'PM')).trim() || 'Unassigned';
    const executiveSponsor = String(getVal('Executive Sponsor', 'executiveSponsor', 'Sponsor')).trim() || 'Unassigned';

    let sponsorLevel = String(getVal('Sponsor Level', 'sponsorLevel')).trim() as SponsorLevel;
    if (!['Executive', 'Director', 'Manager', 'Individual'].includes(sponsorLevel)) {
      sponsorLevel = 'Director';
    }

    let projectStatus = String(getVal('Project Status', 'projectStatus', 'Status')).trim() as ProjectStatus;
    if (!['Planning', 'Active', 'On Hold', 'Backlog'].includes(projectStatus)) {
      projectStatus = 'Active';
    }

    const goLiveDate = String(getVal('Go-Live Date', 'goLiveDate', 'Target Date')).slice(0, 10) || '2028-12-31';
    const monthsToGoLive = toNum(getVal('Months to Go-Live', 'monthsToGoLive'), 24);
    const businessValue = Math.min(5, Math.max(1, Math.round(toNum(getVal('Business Value (1-5)', 'businessValue', 'Value'), 3))));
    const regulatorySecurity = toBool(getVal('Regulatory / Security', 'regulatorySecurity', 'Regulatory'));
    const dtAlignment = toBool(getVal('Digital Transformation', 'dtAlignment', 'DT Alignment'));
    const protectedProgram = toBool(getVal('Protected Program', 'protectedProgram'));
    const primarySkill = String(getVal('Primary Skill', 'primarySkill', 'Skill')).trim() || 'Application Development';
    const skillDemandFte = toNum(getVal('Skill Demand (FTE)', 'skillDemandFte', 'FTE'), 3.0);
    const costEstimateUsd = toNum(getVal('Cost Estimate (USD)', 'costEstimateUsd', 'Cost', 'Budget'), 1500000);
    const dependencyCount = Math.round(toNum(getVal('Dependency Count', 'dependencyCount', 'Dependencies'), 0));
    
    let riskRating = String(getVal('Risk Rating', 'riskRating', 'Risk')).trim() as RiskRating;
    if (!['Low', 'Medium', 'High', 'Critical'].includes(riskRating)) {
      riskRating = 'Medium';
    }

    const effortPersonWeeks = toNum(getVal('Effort (Person-Weeks)', 'effortPersonWeeks', 'Effort'), 20);
    const completeness = toNum(getVal('Completeness', 'completeness'), 0.8);
    const quality = toNum(getVal('Quality', 'quality'), 0.85);
    const modelCertainty = toNum(getVal('Model Certainty', 'modelCertainty'), 0.75);

    const calcConf = Math.round((0.35 * completeness + 0.35 * quality + 0.30 * modelCertainty) * 1000) / 10;
    const confidenceScore = toNum(getVal('Confidence Score', 'confidenceScore'), calcConf);

    let confidenceLevel = String(getVal('Confidence Level', 'confidenceLevel')).trim() as ConfidenceLevel;
    if (!['High', 'Medium', 'Low'].includes(confidenceLevel)) {
      confidenceLevel = confidenceScore >= 75 ? 'High' : confidenceScore >= 50 ? 'Medium' : 'Low';
    }

    let mlTier = String(getVal('ML Tier', 'mlTier')).trim() as PriorityTier;
    if (!['Must-do-now', 'Proceed', 'Can wait', 'Candidate to deprioritize'].includes(mlTier)) {
      mlTier = regulatorySecurity || businessValue >= 4 ? 'Must-do-now' : 'Proceed';
    }

    let finalTier = String(getVal('Final Tier', 'finalTier')).trim() as PriorityTier;
    if (!['Must-do-now', 'Proceed', 'Can wait', 'Candidate to deprioritize'].includes(finalTier)) {
      finalTier = mlTier;
    }

    const priorityScore = toNum(
      getVal('Priority Score', 'priorityScore'),
      finalTier === 'Must-do-now' ? 88.5 : finalTier === 'Proceed' ? 72.0 : 45.0
    );

    let recommendedAction = String(getVal('Recommended Action', 'recommendedAction')).trim() as RecommendedAction;
    if (!recommendedAction) {
      recommendedAction = finalTier === 'Must-do-now' ? 'Protect slot' : 'Proceed';
    }

    const cluster = String(getVal('Cluster', 'cluster')).trim() || 'Core Enterprise IT';

    // Rule overrides
    const rawOverrides = getVal('Rule Overrides', 'ruleOverrides');
    const ruleOverrides: string[] = Array.isArray(rawOverrides)
      ? rawOverrides
      : String(rawOverrides)
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean);

    // Data issues
    const rawIssues = getVal('Data Issues', 'dataIssues');
    const dataIssues: string[] = Array.isArray(rawIssues)
      ? rawIssues
      : String(rawIssues)
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean);

    // Top drivers
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
        shapValue: regulatorySecurity ? 0.32 : -0.05,
        direction: regulatorySecurity ? 'increases' : 'decreases',
        featureValue: regulatorySecurity ? 1 : 0,
      },
      {
        signalKey: 'cost_usd',
        signalLabel: 'Total Capital Cost',
        shapValue: costEstimateUsd > 3000000 ? -0.18 : 0.14,
        direction: costEstimateUsd > 3000000 ? 'decreases' : 'increases',
        featureValue: costEstimateUsd,
      },
    ];

    const sourcesPresent = Math.round(toNum(getVal('Sources Present', 'sourcesPresent'), 6));

    return {
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
      riskRating,
      effortPersonWeeks,
      sourcesPresent,
      sourcesTotal: 11,
      sources: {
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
        excelIntake: false,
      },
      completeness,
      quality,
      modelCertainty,
      confidenceScore,
      confidenceLevel,
      mlTier,
      finalTier,
      tierProbabilities: {
        mustDoNow: finalTier === 'Must-do-now' ? 0.8 : 0.1,
        proceed: finalTier === 'Proceed' ? 0.75 : 0.15,
        canWait: finalTier === 'Can wait' ? 0.7 : 0.1,
        deprioritize: finalTier === 'Candidate to deprioritize' ? 0.85 : 0.05,
      },
      priorityScore,
      ruleOverrides,
      recommendedAction,
      cluster,
      topDrivers,
      dataIssues,
      isDeleted: false,
    };
  }
}
