import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FileExportService, ExportTableData } from './file-export.service';
import { ConfigService } from './config.service';
import { CopilotSamplePrompt } from '../models/ui-config.models';
import { EChartsOption } from 'echarts';

export type AgentChartType = 'bar' | 'line' | 'pie' | 'radar';

export interface AgentProvenance {
  provider: 'azure-ai-foundry';
  agentName: string;
  agentVersion: string;
  responseId: string;
  groundingSource: 'fabric-onelake-via-apim';
  queryIds: string[];
}

interface AgentAnswer {
  text: string;
  tableData: ExportTableData;
  sourceProjectIds: string[];
  sourceRecordCount: number;
  provenance: AgentProvenance;
}

export interface AgentStructuredResponse {
  id: string;
  query: string;
  text: string;
  tableData: ExportTableData;
  activeView: 'table' | 'chart';
  activeChartType: AgentChartType;
  timestamp: string;
  sourceRecordCount: number;
  sourceProjectIds?: string[];
  provenance?: AgentProvenance;
}

export type SamplePrompt = CopilotSamplePrompt;

@Injectable({ providedIn: 'root' })
export class PortfolioAgentService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly exportService = inject(FileExportService);

  readonly isOpen = signal(false);
  readonly isThinking = signal(false);
  readonly error = signal<string | null>(null);
  readonly messages = signal<AgentStructuredResponse[]>([{
    id: 'msg-welcome', query: '', text: 'Ask about portfolio priorities, recorded ML explanations, budgets, or capacity. Answers require available Fabric evidence and human review.',
    tableData: { title: '', headers: [], rows: [] }, activeView: 'table', activeChartType: 'bar',
    timestamp: '', sourceRecordCount: 0,
  }]);
  /** Starter questions are configured in ui.json (copilot.samplePrompts). */
  get samplePrompts(): SamplePrompt[] {
    return this.config.config.copilot?.samplePrompts ?? [];
  }

  toggleOpen(): void { this.isOpen.update(value => !value); }
  setOpen(open: boolean): void { this.isOpen.set(open); }

  async askQuestion(query: string): Promise<void> {
    if (this.isThinking()) return;
    query = query.trim();
    if (!query || query.length > 4000) {
      this.error.set('Enter a question between 1 and 4,000 characters.');
      return;
    }
    this.error.set(null);
    this.isThinking.set(true);
    try {
      const history = this.messages().filter(message => message.provenance).slice(-6).flatMap(message => [
        { role: 'user', content: message.query.slice(0, 12000) },
        { role: 'assistant', content: message.text.slice(0, 12000) },
      ]);
      const answer = await firstValueFrom(this.http.post<AgentAnswer>(
        `${this.config.config.api.basePath.replace(/\/$/, '')}/agent/chat`, { question: query, history },
      ));
      this.messages.update(messages => [...messages, {
        ...answer, id: answer.provenance.responseId, query, activeView: 'table', activeChartType: 'bar',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (error: unknown) {
      const detail: unknown = error instanceof HttpErrorResponse ? error.error?.detail : null;
      this.error.set(typeof detail === 'string' ? detail : 'The portfolio agent could not answer. No sample results were substituted. Please retry.');
    } finally {
      this.isThinking.set(false);
    }
  }

  toggleMessageView(id: string): void {
    this.messages.update(messages => messages.map(message => message.id === id
      ? { ...message, activeView: message.activeView === 'table' ? 'chart' : 'table' } : message));
  }
  setChartType(id: string, activeChartType: AgentChartType): void {
    this.messages.update(messages => messages.map(message => message.id === id
      ? { ...message, activeChartType, activeView: 'chart' } : message));
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
    const { headers, rows } = message.tableData;
    if (!rows.length) return {};
    const numeric = (value: string): number => Number(value.replace(/[$,%]/g, '').trim());
    const valueIndex = headers.findIndex((_, index) => index > 0 && rows.every(row => row[index]?.trim() && Number.isFinite(numeric(row[index]))));
    if (valueIndex < 0) return { title: { text: 'This answer has no numeric chart column.', textStyle: { fontSize: 12 } } };
    const categories = rows.map(row => row[0]);
    const values = rows.map(row => numeric(row[valueIndex]));
    const name = headers[valueIndex];
    if (message.activeChartType === 'pie') {
      return {
        tooltip: { trigger: 'item' }, legend: { bottom: 0 },
        series: [{ name, type: 'pie', radius: ['38%', '68%'], data: categories.map((category, index) => ({ name: category, value: values[index] })) }],
      };
    }
    if (message.activeChartType === 'radar') {
      const max = Math.max(1, ...values);
      return {
        tooltip: {}, radar: { indicator: categories.map(category => ({ name: category, max })) },
        series: [{ name, type: 'radar', data: [{ name, value: values }] }],
      };
    }
    return {
      tooltip: { trigger: 'axis' }, grid: { left: '12%', right: '8%', bottom: '25%', top: '15%' },
      xAxis: { type: 'category', data: categories, axisLabel: { rotate: 25, fontSize: 10 } },
      yAxis: { type: 'value', name },
      series: [{ name, type: message.activeChartType, data: values }],
    };
  }
}
