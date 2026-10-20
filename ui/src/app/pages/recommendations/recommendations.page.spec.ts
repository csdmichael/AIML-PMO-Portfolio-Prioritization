import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
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
    getCachedRecommendations: vi.fn(() => of(null)),
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
      { provide: PortfolioStore, useValue: {
        portfolioItems: signal([{ key: 'it-infosec', displayName: 'IT - InfoSec' }]),
        init: vi.fn(),
      } },
    ],
  });
  const fixture = TestBed.createComponent(RecommendationsPageComponent);
  fixture.componentInstance.ionViewWillEnter();
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
    expect(element.querySelector('.error-text')?.textContent).toContain('The AI assistant timed out.');
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

  it('shows the persisted report before the agent finishes, then replaces it with the fresh report', () => {
    const fresh = new Subject<RecommendationReport>();
    const api = createApi({
      getCachedRecommendations: vi.fn(() => of(report)),
      getRecommendations: vi.fn(() => fresh),
    });
    const fixture = render(api);
    const page = fixture.componentInstance;
    expect(page.loading()).toBe(true);
    expect(fixture.nativeElement.querySelector('.item-title')?.textContent).toContain('Review GIS-0002');
    expect(fixture.nativeElement.querySelector('.report-status')?.textContent).toContain('Previous');

    fresh.next({ ...report, summary: 'Updated evidence from the agent.' });
    fixture.detectChanges();
    expect(page.loading()).toBe(false);
    expect(fixture.nativeElement.querySelector('.summary-text')?.textContent).toContain('Updated evidence');
    expect(fixture.nativeElement.querySelector('.report-status')?.textContent).toContain('Updated');
  });

  it('keeps saved recommendations visible when the refresh fails', () => {
    const fixture = render(createApi({
      getCachedRecommendations: vi.fn(() => of(report)),
      getRecommendations: vi.fn(() => throwError(() => ({ error: { detail: 'Foundry is unavailable.' } }))),
    }));
    expect(fixture.nativeElement.querySelector('.item-card')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.error-text')?.textContent).toContain('AI service is unavailable.');
    expect(fixture.componentInstance.showingSaved()).toBe(true);
  });

  it('still loads a saved report when its read completes after a refresh failure', () => {
    const cached = new Subject<RecommendationReport | null>();
    const fixture = render(createApi({
      getCachedRecommendations: vi.fn(() => cached),
      getRecommendations: vi.fn(() => throwError(() => ({ error: { detail: 'Agent timed out.' } }))),
    }));
    cached.next(report);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.item-card')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.error-text')?.textContent).toContain('Agent timed out.');
  });

  it('does not let a slow cache read overwrite fresh agent results', () => {
    const cached = new Subject<RecommendationReport | null>();
    const fixture = render(createApi({ getCachedRecommendations: vi.fn(() => cached) }));
    cached.next({ ...report, summary: 'Older report' });
    fixture.detectChanges();
    expect(fixture.componentInstance.report()?.summary).toBe(report.summary);
    expect(fixture.componentInstance.showingSaved()).toBe(false);
  });

  it('reports a cache read failure while continuing the agent refresh', () => {
    const fresh = new Subject<RecommendationReport>();
    const fixture = render(createApi({
      getCachedRecommendations: vi.fn(() => throwError(() => ({ error: { detail: 'OneLake unavailable.' } }))),
      getRecommendations: vi.fn(() => fresh),
    }));
    expect(fixture.nativeElement.querySelector('.cache-warning')?.textContent).toContain('database unavailable.');
    expect(fixture.componentInstance.loading()).toBe(true);
    fresh.next(report);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cache-warning')).toBeNull();
    expect(fixture.nativeElement.querySelector('.item-card')).not.toBeNull();
  });

  it('isolates portfolio and research caches and sends portfolio keys, not display names', () => {
    const pending = new Subject<RecommendationReport>();
    const api = createApi({ queryResearcherAgent: vi.fn(() => pending) });
    const fixture = render(api);
    const page = fixture.componentInstance;
    const option = fixture.nativeElement.querySelector('option[value="it-infosec"]');
    expect(option?.textContent).toContain('IT - InfoSec');
    page.portfolioKey = 'it-infosec';
    page.ask('Which projects need capacity?');
    fixture.detectChanges();
    expect(page.report()).toBeNull();
    expect(api.getCachedRecommendations).toHaveBeenLastCalledWith('it-infosec', 'Which projects need capacity?');
    expect(api.queryResearcherAgent).toHaveBeenCalledWith('Which projects need capacity?', 'it-infosec');
  });

  it('runs the agent on every page entry and cancels view subscriptions when leaving', () => {
    const fresh = new Subject<RecommendationReport>();
    const api = createApi({ getRecommendations: vi.fn(() => fresh) });
    const fixture = render(api);
    const page = fixture.componentInstance;
    page.ionViewWillLeave();
    fresh.next(report);
    expect(page.report()).toBeNull();
    page.ionViewWillEnter();
    expect(api.getRecommendations).toHaveBeenCalledTimes(2);
    expect(api.getCachedRecommendations).toHaveBeenCalledTimes(2);
  });

  it('drops an in-memory report when a dataset reset invalidates its persisted cache', () => {
    const pending = new Subject<RecommendationReport>();
    const api = createApi({
      getRecommendations: vi.fn().mockReturnValueOnce(of(report)).mockReturnValue(pending),
    });
    const fixture = render(api);
    expect(fixture.componentInstance.report()).toEqual(report);
    fixture.componentInstance.ionViewWillEnter();
    expect(fixture.componentInstance.report()).toBeNull();
    expect(fixture.componentInstance.loading()).toBe(true);
  });
});
