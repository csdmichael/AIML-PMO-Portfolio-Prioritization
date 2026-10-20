import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DataApiService } from './data-api.service';
import { ConfigService } from './config.service';
import { UiConfig } from '../models/ui-config.models';

const TEST_UI_CONFIG: UiConfig = {
  api: {
    basePath: '/api/v1',
    timeoutMs: 30000,
    pipelinePollIntervalMs: 15000,
  },
  brand: {
    title: 'PMO Test',
    subtitle: 'Subtitle',
    logo: {
      wordmark: 'Microsoft',
      wordmarkColor: '#5E5E5E',
      squareRed: '#F25022',
      squareGreen: '#7FBA00',
      squareBlue: '#00A4EF',
      squareYellow: '#FFB900',
    },
  },
  navigation: [],
  breakpoints: { xl: 1200, md: 768 },
  confidence: {
    thresholds: { high: 75, medium: 50 },
    labels: { high: 'High', medium: 'Medium', low: 'Low', none: 'None' },
    colors: { high: '#107C10', medium: '#C19C00', low: '#D13438', none: '#8A8886', human: '#0078D4' },
  },
  tiers: {
    labels: { mustDoNow: 'Must-do-now', proceed: 'Proceed', canWait: 'Can wait', deprioritize: 'Candidate to deprioritize' },
    colors: { mustDoNow: '#D13438', proceed: '#107C10', canWait: '#C19C00', deprioritize: '#737373' },
  },
  footer: {
    authorName: 'Michael',
    authorRole: 'Engineer',
    linkedInUrl: 'https://linkedin.com',
    linkedInLabel: 'LinkedIn',
    gitHubUrl: 'https://github.com',
    gitHubLabel: 'GitHub',
  },
  table: { pageSize: 25, pageSizes: [10, 25, 50] },
  charts: { driverChartHeight: 240, kpiCardHeight: 110, donutRadiusInner: '45%', donutRadiusOuter: '70%' },
  tokens: {},
  recommendations: {
    title: 'AI Recommendations',
    subtitle: 'Test subtitle',
    researchPlaceholder: 'Ask a question',
    askLabel: 'Ask agent',
    quickPrompts: [],
  },
};

describe('DataApiService', () => {
  let service: DataApiService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    const fakeConfigService = {
      config: TEST_UI_CONFIG,
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: fakeConfigService },
        DataApiService,
      ],
    });

    service = TestBed.inject(DataApiService);
    httpController = TestBed.inject(HttpTestingController);
  });

  it('should call GET /options under configured basePath', () => {
    service.getOptions().subscribe();
    const req = httpController.expectOne('/api/v1/options');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should call GET /portfolio under configured basePath', () => {
    service.getPortfolio().subscribe();
    const req = httpController.expectOne('/api/v1/portfolio');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should call GET /portfolios under configured basePath', () => {
    service.getPortfolios().subscribe();
    const req = httpController.expectOne('/api/v1/portfolios');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call POST /intake/drafts for Quick Add', () => {
    service.createIntakeDraft('Test Name', 'Test Desc').subscribe();
    const req = httpController.expectOne('/api/v1/intake/drafts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ projectName: 'Test Name', description: 'Test Desc' });
    req.flush({ draftId: 'draft-123', status: 'draft' });
  });

  it('should call GET /pipeline/runs/{runId}', () => {
    service.getPipelineRunStatus('run-999').subscribe();
    const req = httpController.expectOne('/api/v1/pipeline/runs/run-999');
    expect(req.request.method).toBe('GET');
    req.flush({ runId: 'run-999', status: 'Completed' });
  });

  it('should handle 404 RFC 9457 problem document when lake export is missing', () => {
    let errorResponse: any;
    service.getPortfolio().subscribe({
      next: () => expect.unreachable(),
      error: (err) => {
        errorResponse = err;
      },
    });

    const req = httpController.expectOne('/api/v1/portfolio');
    req.flush(
      {
        type: 'https://tools.ietf.org/html/rfc9457',
        title: 'Export Not Found',
        status: 404,
        detail: 'Files/exports OneLake export not found. Run PMO Full Pipeline.',
      },
      { status: 404, statusText: 'Not Found' },
    );

    expect(errorResponse.status).toBe(404);
    expect(errorResponse.error.detail).toContain('Files/exports');
  });

  it('should list the OneLake datasets the UI can use', () => {
    service.listOneLakeDatasets().subscribe();
    const req = httpController.expectOne('/api/v1/onelake/datasets');
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], count: 0 });
  });

  it('should send the etag from the last read as If-Match when updating a dataset', () => {
    service.putOneLakeDataset('system-settings', [{ setting_key: 'isDemoEnvironment' }], 'etag-1').subscribe();
    const req = httpController.expectOne('/api/v1/onelake/datasets/system-settings');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('If-Match')).toBe('"etag-1"');
    expect(req.request.body).toEqual([{ setting_key: 'isDemoEnvironment' }]);
    req.flush({ key: 'system-settings', exists: true, etag: 'etag-2', data: [] });
  });

  it('should create a dataset without If-Match when it does not exist yet', () => {
    service.putOneLakeDataset('priority-field-weights', [], null).subscribe();
    const req = httpController.expectOne('/api/v1/onelake/datasets/priority-field-weights');
    expect(req.request.headers.has('If-Match')).toBe(false);
    req.flush({});
  });
});
