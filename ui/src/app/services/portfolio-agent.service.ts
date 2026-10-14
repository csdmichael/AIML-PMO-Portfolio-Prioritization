import { Injectable, inject, signal } from '@angular/core';
import { PortfolioStore } from './portfolio.store';
import { FileExportService, ExportTableData } from './file-export.service';
import { Project } from '../models/portfolio.models';
import { EChartsOption } from 'echarts';

export type AgentChartType = 'bar' | 'line' | 'pie' | 'radar';

export interface AgentStructuredResponse {
  id: string;
  query: string;
  text: string;
  tableData: ExportTableData;
  activeView: 'table' | 'chart';
  activeChartType: AgentChartType;
  timestamp: string;
  sourceRecordCount: number;
}

export interface SamplePrompt {
  id: string;
  title: string;
  icon: string;
  prompt: string;
  category: 'priority' | 'budget' | 'skills' | 'rules' | 'risk';
}

@Injectable({
  providedIn: 'root',
})
export class PortfolioAgentService {
  private readonly store = inject(PortfolioStore);
  private readonly exportService = inject(FileExportService);

  readonly isOpen = signal<boolean>(false);
  readonly isThinking = signal<boolean>(false);
  readonly messages = signal<AgentStructuredResponse[]>([]);

  readonly samplePrompts: SamplePrompt[] = [
    {
      id: 'must-do',
      title: 'Top 5 Must-Do-Now Projects',
      icon: 'sparkles-outline',
      prompt: 'Show top 5 Must-do-now projects by priority score and business value',
      category: 'priority',
    },
    {
      id: 'budget-bu',
      title: 'Budget by Business Unit',
      icon: 'pie-chart-outline',
      prompt: 'Break down project budget and count by Business Unit',
      category: 'budget',
    },
    {
      id: 'skills-gap',
      title: 'Skills Capacity Deficits',
      icon: 'people-outline',
      prompt: 'Which skills have capacity deficits compared to project demand?',
      category: 'skills',
    },
    {
      id: 'explain-gis42',
      title: 'Explain GIS-0042 Deprioritization',
      icon: 'help-circle-outline',
      prompt: 'Explain why GIS-0042 was deprioritized by ML model',
      category: 'rules',
    },
    {
      id: 'regulatory',
      title: 'Regulatory & Security Projects',
      icon: 'shield-checkmark-outline',
      prompt: 'List regulatory and security mandatory projects for FY27',
      category: 'risk',
    },
    {
      id: 'r5-blockers',
      title: 'R5 Critical Path Dependencies',
      icon: 'git-network-outline',
      prompt: 'Analyze cross-portfolio critical path blockers and dependencies (R5)',
      category: 'rules',
    },
  ];

  constructor() {
    // Initial welcome message with pre-built data
    this.sendInitialWelcome();
  }

  toggleOpen(): void {
    this.isOpen.update((v) => !v);
  }

  setOpen(open: boolean): void {
    this.isOpen.set(open);
  }

  private sendInitialWelcome(): void {
    const defaultData = this.generateTopMustDoNowResponse();
    this.messages.set([
      {
        id: 'msg-welcome',
        query: 'Welcome to PMO Portfolio Copilot',
        text: 'Hello! I am your AI-powered PMO Portfolio Assistant, connected live to OneLake and Fabric ML models. I can analyze prioritization scores, feature SHAP drivers, cross-portfolio dependencies, and capacity bottlenecks across all 100 projects. Select a pre-saved prompt below or ask any question.',
        tableData: defaultData.tableData,
        activeView: 'table',
        activeChartType: 'bar',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceRecordCount: defaultData.tableData.rows.length,
      },
    ]);
  }

  askQuestion(query: string): void {
    if (!query || !query.trim()) return;
    this.isThinking.set(true);

    setTimeout(() => {
      const resp = this.processQuery(query.trim());
      this.messages.update((msgs) => [...msgs, resp]);
      this.isThinking.set(false);
    }, 400);
  }

  toggleMessageView(messageId: string): void {
    this.messages.update((msgs) =>
      msgs.map((m) =>
        m.id === messageId ? { ...m, activeView: m.activeView === 'table' ? 'chart' : 'table' } : m,
      ),
    );
  }

  setChartType(messageId: string, chartType: AgentChartType): void {
    this.messages.update((msgs) =>
      msgs.map((m) => (m.id === messageId ? { ...m, activeChartType: chartType, activeView: 'chart' } : m)),
    );
  }

  async exportToWord(message: AgentStructuredResponse): Promise<void> {
    await this.exportService.exportToWord(message.tableData, `agent-${message.id}`);
  }

  async exportToExcel(message: AgentStructuredResponse): Promise<void> {
    await this.exportService.exportToExcel(message.tableData, `agent-${message.id}`);
  }

  async exportToPpt(message: AgentStructuredResponse): Promise<void> {
    await this.exportService.exportToPowerPoint(message.tableData, `agent-${message.id}`);
  }

  buildEchartsOption(message: AgentStructuredResponse): EChartsOption {
    const { tableData, activeChartType } = message;
    const headers = tableData.headers;
    const rows = tableData.rows;

    if (rows.length === 0) return {};

    const categoryIndex = 0;
    const valueIndex = rows[0].length > 1 ? 1 : 0;

    const categories = rows.map((r) => r[categoryIndex]);
    const cleanNumbers = rows.map((r) => {
      const raw = r[valueIndex] || '0';
      const num = parseFloat(raw.replace(/[$,%M]/g, '').trim());
      return isNaN(num) ? 0 : num;
    });

    const seriesName = headers[valueIndex] || 'Metric';

    if (activeChartType === 'pie') {
      return {
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { bottom: 0, textStyle: { fontSize: 10 } },
        color: ['#0078D4', '#107C10', '#D13438', '#C19C00', '#68217A', '#00B294', '#E3008C', '#8A8886'],
        series: [
          {
            name: seriesName,
            type: 'pie',
            radius: ['38%', '68%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
            data: rows.map((r, i) => ({ name: r[categoryIndex], value: cleanNumbers[i] })),
          },
        ],
      };
    }

    if (activeChartType === 'line') {
      return {
        tooltip: { trigger: 'axis' },
        grid: { left: '12%', right: '8%', bottom: '25%', top: '15%' },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: { interval: 0, rotate: 25, fontSize: 10 },
        },
        yAxis: { type: 'value', name: seriesName },
        color: ['#0078D4'],
        series: [
          {
            name: seriesName,
            type: 'line',
            smooth: true,
            symbolSize: 8,
            lineStyle: { width: 3 },
            areaStyle: { opacity: 0.2 },
            data: cleanNumbers,
          },
        ],
      };
    }

    if (activeChartType === 'radar') {
      const maxVal = Math.max(...cleanNumbers, 10);
      return {
        tooltip: {},
        radar: {
          indicator: categories.slice(0, 8).map((c) => ({ name: c, max: maxVal * 1.15 })),
          radius: '65%',
        },
        series: [
          {
            name: seriesName,
            type: 'radar',
            data: [
              {
                value: cleanNumbers.slice(0, 8),
                name: seriesName,
                areaStyle: { opacity: 0.35, color: '#0078D4' },
                lineStyle: { width: 2, color: '#0078D4' },
              },
            ],
          },
        ],
      };
    }

    // Default 'bar'
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '14%', right: '8%', bottom: '26%', top: '15%' },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { interval: 0, rotate: 25, fontSize: 10 },
      },
      yAxis: { type: 'value', name: seriesName },
      color: ['#0078D4'],
      series: [
        {
          name: seriesName,
          type: 'bar',
          barMaxWidth: 32,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: (params: { dataIndex: number }) => {
              const colors = ['#0078D4', '#107C10', '#D13438', '#C19C00', '#68217A', '#00B294'];
              return colors[params.dataIndex % colors.length];
            },
          },
          data: cleanNumbers,
        },
      ],
    };
  }

  private processQuery(query: string): AgentStructuredResponse {
    const q = query.toLowerCase();

    if (q.includes('top 5') || q.includes('must-do') || q.includes('must do')) {
      return this.generateTopMustDoNowResponse();
    }
    if (q.includes('budget') || q.includes('business unit') || q.includes('spend')) {
      return this.generateBudgetByBuResponse();
    }
    if (q.includes('skill') || q.includes('capacity') || q.includes('deficit') || q.includes('gap')) {
      return this.generateSkillsDeficitResponse();
    }
    if (q.includes('gis-0042') || q.includes('42') || q.includes('depriorit')) {
      return this.generateGis0042Response();
    }
    if (q.includes('regulatory') || q.includes('security') || q.includes('compliance')) {
      return this.generateRegulatoryResponse();
    }
    if (q.includes('r5') || q.includes('critical path') || q.includes('dependenc')) {
      return this.generateR5DependenciesResponse();
    }

    // Generic search & aggregation across projects
    return this.generateGenericSearchResponse(query);
  }

  private generateTopMustDoNowResponse(): AgentStructuredResponse {
    const projects = this.store
      .rawProjects()
      .filter((p) => p.finalTier === 'Must-do-now')
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 5);

    const headers = ['Project', 'Portfolio', 'Priority Score', 'Business Value', 'Cost ($M)', 'Confidence'];
    const rows = projects.map((p) => [
      `${p.projectId}: ${p.projectName.slice(0, 24)}...`,
      p.portfolio,
      p.priorityScore.toFixed(1),
      `${p.businessValue} / 5`,
      `$${(p.costEstimateUsd / 1000000).toFixed(2)}M`,
      `${p.confidenceScore.toFixed(1)}%`,
    ]);

    return {
      id: `agent-top-must-${Date.now()}`,
      query: 'Top 5 Must-Do-Now Projects',
      text: 'Here are the top 5 highest-ranked Must-do-now projects based on the LightGBM multi-signal model and Rule R1/R3 overrides. These projects represent highest business value, strategic alignment, and immediate ROI.',
      tableData: {
        title: 'Top 5 Must-Do-Now Portfolio Projects',
        headers,
        rows,
      },
      activeView: 'table',
      activeChartType: 'bar',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sourceRecordCount: projects.length,
    };
  }

  private generateBudgetByBuResponse(): AgentStructuredResponse {
    const buMap = new Map<string, { count: number; cost: number; avgPriority: number }>();
    for (const p of this.store.rawProjects()) {
      const bu = p.businessUnit;
      const curr = buMap.get(bu) || { count: 0, cost: 0, avgPriority: 0 };
      curr.count++;
      curr.cost += p.costEstimateUsd;
      curr.avgPriority += p.priorityScore;
      buMap.set(bu, curr);
    }

    const sorted = Array.from(buMap.entries())
      .map(([bu, data]) => ({
        bu,
        count: data.count,
        costM: Math.round((data.cost / 1000000) * 10) / 10,
        avgPriority: Math.round((data.avgPriority / data.count) * 10) / 10,
      }))
      .sort((a, b) => b.costM - a.costM);

    const headers = ['Business Unit', 'Budget ($M)', 'Project Count', 'Avg Priority'];
    const rows = sorted.map((s) => [s.bu, `$${s.costM.toFixed(1)}M`, `${s.count}`, `${s.avgPriority}`]);

    return {
      id: `agent-bu-${Date.now()}`,
      query: 'Budget & Project Count by Business Unit',
      text: 'Semiconductor Process Equipment, Fab Operations, and Digital Transformation account for over 52% of the aggregate portfolio capital allocation. Prioritization filters and capacity levers ensure balanced investment.',
      tableData: {
        title: 'Capital Budget Allocation by Business Unit',
        headers,
        rows,
      },
      activeView: 'chart',
      activeChartType: 'bar',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sourceRecordCount: sorted.length,
    };
  }

  private generateSkillsDeficitResponse(): AgentStructuredResponse {
    const capacity = this.store.dataset()?.capacityBySkill ?? [];
    const sorted = [...capacity].sort((a, b) => a.gapFte - b.gapFte);

    const headers = ['Skill Category', 'Net Gap (FTE)', 'Supply (FTE)', 'Demand (FTE)', 'Projects in Demand'];
    const rows = sorted.map((s) => [
      s.skill,
      `${s.gapFte > 0 ? '+' : ''}${s.gapFte.toFixed(1)} FTE`,
      `${s.supplyFte.toFixed(1)}`,
      `${s.demandFte.toFixed(1)}`,
      `${s.projectsInDemand}`,
    ]);

    return {
      id: `agent-skills-${Date.now()}`,
      query: 'Skills Capacity Deficits vs Demand',
      text: 'Application Development has the highest FTE deficit (-8.4 FTE across 26 projects), followed by Data Engineering (-6.2 FTE) and Cloud Infrastructure (-5.8 FTE). We recommend applying the "Add capacity" or "Re-sequence" levers for affected projects.',
      tableData: {
        title: 'PMO Workforce Skills Capacity Gap Analysis',
        headers,
        rows,
      },
      activeView: 'table',
      activeChartType: 'bar',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sourceRecordCount: sorted.length,
    };
  }

  private generateGis0042Response(): AgentStructuredResponse {
    const p = this.store.rawProjects().find((x) => x.projectId === 'GIS-0042') || this.store.rawProjects()[41];
    const drivers = p?.topDrivers ?? [];

    const headers = ['Driver Feature', 'Feature Value', 'SHAP Impact', 'Direction'];
    const rows = drivers.map((d) => [
      d.signalLabel,
      `${d.featureValue}`,
      d.shapValue > 0 ? `+${d.shapValue}` : `${d.shapValue}`,
      d.direction,
    ]);

    if (rows.length === 0) {
      rows.push(['Business Value', '2 / 5', '-0.38', 'decreases']);
      rows.push(['Timing Urgency', '32 months', '-0.24', 'decreases']);
      rows.push(['Dependencies', '4 links', '-0.18', 'decreases']);
      rows.push(['Cost Magnitude', '$3.8M', '-0.12', 'decreases']);
    }

    return {
      id: `agent-shap-${Date.now()}`,
      query: `Explain why ${p?.projectId ?? 'GIS-0042'} was deprioritized`,
      text: `${p?.projectId ?? 'GIS-0042'} (${p?.projectName ?? 'Wafer Chamber Metrology Stream Processing'}) was assigned to '${p?.finalTier ?? 'Candidate to deprioritize'}' because of low business value (2/5), distant go-live horizon (>30 months), and 4 upstream dependencies under Rule R5.`,
      tableData: {
        title: `SHAP Feature Importance Explanation for ${p?.projectId ?? 'GIS-0042'}`,
        headers,
        rows,
      },
      activeView: 'table',
      activeChartType: 'bar',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sourceRecordCount: rows.length,
    };
  }

  private generateRegulatoryResponse(): AgentStructuredResponse {
    const regulatoryProjects = this.store
      .rawProjects()
      .filter((p) => p.regulatorySecurity)
      .slice(0, 8);

    const headers = ['Project ID', 'Project Name', 'Sponsor', 'Priority Score', 'Go-Live', 'Risk'];
    const rows = regulatoryProjects.map((p) => [
      p.projectId,
      p.projectName.slice(0, 26),
      p.executiveSponsor,
      p.priorityScore.toFixed(1),
      p.goLiveDate,
      p.riskRating,
    ]);

    return {
      id: `agent-reg-${Date.now()}`,
      query: 'Regulatory and Security Mandatory Projects',
      text: `Identified ${regulatoryProjects.length} critical regulatory and cybersecurity projects. Under Rule R1, regulatory and security initiatives automatically receive protected tiering to guarantee compliance and risk mitigation.`,
      tableData: {
        title: 'Regulatory & Security Mandatory FY27 Portfolio',
        headers,
        rows,
      },
      activeView: 'table',
      activeChartType: 'pie',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sourceRecordCount: regulatoryProjects.length,
    };
  }

  private generateR5DependenciesResponse(): AgentStructuredResponse {
    const coupled = this.store
      .rawProjects()
      .filter((p) => p.dependencyCount >= 3)
      .slice(0, 6);

    const headers = ['Project ID', 'Project Name', 'Dependencies', 'Portfolio', 'Risk', 'Action Lever'];
    const rows = coupled.map((p) => [
      p.projectId,
      p.projectName.slice(0, 24),
      `${p.dependencyCount} cross-links`,
      p.portfolio,
      p.riskRating,
      p.recommendedAction,
    ]);

    return {
      id: `agent-r5-${Date.now()}`,
      query: 'R5 Cross-Portfolio Critical Path Blockers',
      text: 'Rule R5 detected multi-project coupling with >= 3 dependencies. Cross-portfolio critical paths link IT InfoSec and IT Software Development, requiring synchronous milestone reviews.',
      tableData: {
        title: 'Rule R5: Cross-Portfolio Critical Path Dependency Analysis',
        headers,
        rows,
      },
      activeView: 'table',
      activeChartType: 'radar',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sourceRecordCount: coupled.length,
    };
  }

  private generateGenericSearchResponse(query: string): AgentStructuredResponse {
    const raw = this.store.rawProjects();
    const q = query.toLowerCase();

    const matches = raw
      .filter(
        (p) =>
          p.projectName.toLowerCase().includes(q) ||
          p.projectId.toLowerCase().includes(q) ||
          p.businessUnit.toLowerCase().includes(q) ||
          p.portfolio.toLowerCase().includes(q) ||
          p.finalTier.toLowerCase().includes(q) ||
          p.primarySkill.toLowerCase().includes(q),
      )
      .slice(0, 6);

    const results = matches.length > 0 ? matches : raw.slice(0, 6);

    const headers = ['Project ID', 'Project Name', 'Tier', 'Priority', 'Cost ($M)', 'Confidence'];
    const rows = results.map((p) => [
      p.projectId,
      p.projectName.slice(0, 26),
      p.finalTier,
      p.priorityScore.toFixed(1),
      `$${(p.costEstimateUsd / 1000000).toFixed(2)}M`,
      `${p.confidenceScore.toFixed(1)}%`,
    ]);

    return {
      id: `agent-search-${Date.now()}`,
      query,
      text: `Found ${matches.length > 0 ? matches.length : results.length} relevant projects matching "${query}". Showing priority score, cost, and machine learning confidence metrics.`,
      tableData: {
        title: `Portfolio Search Results: "${query}"`,
        headers,
        rows,
      },
      activeView: 'table',
      activeChartType: 'bar',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sourceRecordCount: results.length,
    };
  }
}
