import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecommendationsPageComponent } from './recommendations.page';
import { DataApiService } from '../../services/data-api.service';
import { PortfolioStore } from '../../services/portfolio.store';
import { ConfigService } from '../../services/config.service';
import { RecommendationReport } from '../../models/recommendation.models';

const report: RecommendationReport = {
  title: 'Portfolio recommendations',
  summary: 'Summary text.',
  sections: [
    {
      id: 'priority',
      title: 'Priority changes',
      description: 'Projects to review.',
      items: [
        {
          id: 'rec-1',
          title: 'Review GIS-0002',
          subtitle: null,
          summary: 'Score 60.',
          badges: ['Can wait'],
          metrics: [{ label: 'Priority score', value: '60' }],
          sourceProjectIds: ['GIS-0002'],
          sourceUrls: ['https://example.org/segmentation'],
          actions: [
            {
              id: 'decide-1',
              label: 'Record decision',
              type: 'recordDecision',
              payload: { projectId: 'GIS-0002', decision: 'Can wait', reason: 'Keep the ranking.' },
            },
          ],
        },
      ],
    },
  ],
  sourceProjectIds: ['GIS-0002'],
  sourceUrls: ['https://example.org/segmentation'],
  generatedAtUtc: '2026-10-17T18:42:14Z',
  portfolioKey: null,
  query: null,
  provenance: {
    provider: 'azure-ai-foundry',
    agentName: 'pmo-recommendation-agent',
    agentVersion: '2',
    responseId: 'resp_test',
    groundingSource: 'fabric-onelake-via-apim',
    queryIds: ['query-1'],
    webSearches: 1,
    webCitations: [],
  },
};

const configStub = {
  config: {
    recommendations: {
      title: 'AI Recommendations',
      subtitle: 'Test subtitle',
      researchPlaceholder: 'Ask a question',
      askLabel: 'Ask agent',
      quickPrompts: [],
    },
  },
};

function createApi(overrides: Record<string, unknown> = {}) {
  return {
    getRecommendations: vi.fn(() => of(report)),
    queryResearcherAgent: vi.fn(() => of(report)),
    postDecision: vi.fn(() => of({ decisionId: 'DEC-1' })),
    createProject: vi.fn(() => of({ projectId: 'GIS-0100' })),
    ...overrides,
  };
}

function render(api: ReturnType<typeof createApi>) {
  TestBed.configureTestingModule({
    imports: [RecommendationsPageComponent],
    providers: [
      { provide: DataApiService, useValue: api },
      { provide: ConfigService, useValue: configStub },
      { provide: PortfolioStore, useValue: { portfolios: signal(['it-infosec']), init: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(RecommendationsPageComponent);
  fixture.detectChanges();
  return fixture;
}

describe('AI recommendations page', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('renders whatever sections the agent returned, with OneLake and web evidence', () => {
    const fixture = render(createApi());
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.section-title')?.textContent).toContain('Priority changes');
    expect(element.querySelector('.item-title')?.textContent).toContain('Review GIS-0002');
    expect(element.querySelector('.source-chip')?.textContent).toContain('GIS-0002');
    const link = element.querySelector('a.source-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://example.org/segmentation');
  });

  it('shows the API problem instead of a canned report', () => {
    const api = createApi({
      getRecommendations: vi.fn(() => throwError(() => ({ error: { detail: 'The Foundry agent timed out.' } }))),
    });
    const element: HTMLElement = render(api).nativeElement;
    expect(element.querySelector('.error-text')?.textContent).toContain('The Foundry agent timed out.');
    expect(element.querySelector('.item-card')).toBeNull();
  });

  it('keeps an action failed, not done, when the write is rejected', () => {
    const api = createApi({
      postDecision: vi.fn(() =>
        throwError(() => ({
          error: { detail: 'Some decision fields are not valid.', errors: [{ field: 'decision', message: 'must be a tier' }] },
        })),
      ),
    });
    const fixture = render(api);
    const action = report.sections[0].items[0].actions[0];
    fixture.componentInstance.runAction(0, 0, 0, action);
    fixture.detectChanges();
    expect(api.postDecision).toHaveBeenCalledWith(action.payload);
    const status = fixture.nativeElement.querySelector('.action-status.failed');
    expect(status?.textContent).toContain('decision: must be a tier');
  });
});
