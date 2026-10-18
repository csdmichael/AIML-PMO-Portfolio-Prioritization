import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PortfolioAgentService } from './portfolio-agent.service';
import { ConfigService } from './config.service';
import { FileExportService } from './file-export.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const answer = {
  text: 'GIS-0001 has priority score 92.',
  tableData: { title: 'Priority', headers: ['Project', 'Priority'], rows: [['GIS-0001', '92']] },
  sourceProjectIds: ['GIS-0001'], sourceRecordCount: 1,
  provenance: {
    provider: 'azure-ai-foundry', agentName: 'pmo-portfolio-copilot', agentVersion: '2',
    responseId: 'resp_test', groundingSource: 'fabric-onelake-via-apim', queryIds: ['query_1'],
  },
};

describe('PortfolioAgentService', () => {
  let service: PortfolioAgentService;
  let http: HttpTestingController;
  const exports = { exportToWord: vi.fn(), exportToExcel: vi.fn(), exportToPowerPoint: vi.fn() };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: ConfigService, useValue: { config: { api: { basePath: '/api/v1' } } } },
        { provide: FileExportService, useValue: exports },
      ],
    });
    service = TestBed.inject(PortfolioAgentService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('has a neutral welcome without generated records or live claims', () => {
    expect(service.messages()[0].tableData.rows).toEqual([]);
    expect(service.messages()[0].provenance).toBeUndefined();
    expect(service.samplePrompts).toHaveLength(6);
    service.toggleOpen();
    expect(service.isOpen()).toBe(true);
  });

  it('posts to the real API and displays its provenance', async () => {
    const pending = service.askQuestion(' Highest priority? ');
    const request = http.expectOne('/api/v1/agent/chat');
    expect(request.request.body).toEqual({ question: 'Highest priority?', history: [] });
    expect(service.isThinking()).toBe(true);
    request.flush(answer);
    await pending;
    expect(service.isThinking()).toBe(false);
    expect(service.messages()[1].provenance?.responseId).toBe('resp_test');
    expect(service.messages()[1].sourceProjectIds).toEqual(['GIS-0001']);
  });

  it('prevents duplicate requests and recovers after explicit upstream errors', async () => {
    const pending = service.askQuestion('Top projects?');
    await service.askQuestion('Duplicate');
    http.expectOne('/api/v1/agent/chat').flush({ detail: 'Fabric unavailable' }, { status: 502, statusText: 'Bad Gateway' });
    await pending;
    expect(service.error()).toBe('Fabric unavailable');
    expect(service.messages()).toHaveLength(1);
    expect(service.isThinking()).toBe(false);
    const retry = service.askQuestion('Retry');
    http.expectOne('/api/v1/agent/chat').flush(answer);
    await retry;
    expect(service.error()).toBeNull();
  });

  it('bounds history to 12 turns and never sends project snapshots', async () => {
    service.messages.set(Array.from({ length: 9 }, (_, index) => ({
      ...service.messages()[0], query: `Question ${index}`, text: 'x'.repeat(13000),
      provenance: { ...answer.provenance, provider: 'azure-ai-foundry', groundingSource: 'fabric-onelake-via-apim' },
    })));
    const pending = service.askQuestion('Next');
    const request = http.expectOne('/api/v1/agent/chat');
    expect(request.request.body.history).toHaveLength(12);
    expect(request.request.body.history[0].content).toBe('Question 3');
    expect(request.request.body.history[1].content).toHaveLength(12000);
    expect(request.request.body.portfolioSnapshot).toBeUndefined();
    request.flush(answer);
    await pending;
  });

  it('rejects empty and oversized questions with a visible error', async () => {
    await service.askQuestion(' ');
    expect(service.error()).toBeTruthy();
    await service.askQuestion('x'.repeat(4001));
    http.expectNone('/api/v1/agent/chat');
  });

  it('preserves chart types and exports for returned tables', async () => {
    const pending = service.askQuestion('Top');
    http.expectOne('/api/v1/agent/chat').flush(answer);
    await pending;
    for (const type of ['bar', 'line', 'pie', 'radar'] as const) {
      service.setChartType('resp_test', type);
      expect(service.buildEchartsOption(service.messages()[1]).series).toBeDefined();
    }
    await service.exportToExcel(service.messages()[1]);
    expect(exports.exportToExcel).toHaveBeenCalledWith(answer.tableData, 'agent-resp_test');
  });
});
