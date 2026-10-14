import { describe, it, expect, vi } from 'vitest';
import { PortfolioAgentService } from './portfolio-agent.service';
import { SAMPLE_PORTFOLIO_DATASET } from '../data/sample-portfolio.data';
import { signal } from '@angular/core';

describe('PortfolioAgentService', () => {
  it('should initialize with welcome message and closed state', () => {
    const mockStore = {
      rawProjects: signal(SAMPLE_PORTFOLIO_DATASET.projects),
      dataset: signal(SAMPLE_PORTFOLIO_DATASET),
    };
    const mockExport = {
      exportToWord: vi.fn(),
      exportToExcel: vi.fn(),
      exportToPowerPoint: vi.fn(),
    };

    const service = Object.create(PortfolioAgentService.prototype);
    service.store = mockStore;
    service.exportService = mockExport;
    service.isOpen = signal(false);
    service.isThinking = signal(false);
    service.messages = signal([]);
    service.samplePrompts = [
      { id: 'must-do', title: 'Top 5 Must-Do-Now Projects', icon: 'sparkles-outline', prompt: 'test', category: 'priority' },
      { id: 'budget-bu', title: 'Budget by Business Unit', icon: 'pie-chart-outline', prompt: 'test', category: 'budget' },
      { id: 'skills-gap', title: 'Skills Capacity Deficits', icon: 'people-outline', prompt: 'test', category: 'skills' },
      { id: 'explain-gis42', title: 'Explain GIS-0042 Deprioritization', icon: 'help-circle-outline', prompt: 'test', category: 'rules' },
      { id: 'regulatory', title: 'Regulatory & Security Projects', icon: 'shield-checkmark-outline', prompt: 'test', category: 'risk' },
      { id: 'r5-blockers', title: 'R5 Critical Path Dependencies', icon: 'git-network-outline', prompt: 'test', category: 'rules' },
    ];

    expect(service.isOpen()).toBe(false);
    expect(service.samplePrompts.length).toBe(6);

    service.toggleOpen();
    expect(service.isOpen()).toBe(true);

    const option = service.buildEchartsOption({
      id: 'test',
      query: 'test',
      text: 'test',
      tableData: {
        title: 'Test',
        headers: ['Project', 'Priority'],
        rows: [['GIS-0001', '92.5'], ['GIS-0002', '88.0']],
      },
      activeView: 'chart',
      activeChartType: 'bar',
      timestamp: '12:00',
      sourceRecordCount: 2,
    });
    expect(option).toBeDefined();
    expect(option.series).toBeDefined();
  });
});
