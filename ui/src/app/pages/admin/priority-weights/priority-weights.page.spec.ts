import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataApiService } from '../../../services/data-api.service';
import { PortfolioStore } from '../../../services/portfolio.store';
import { Project, PortfolioDataset } from '../../../models/portfolio.models';
import { PriorityWeightsPageComponent } from './priority-weights.page';
import {
  PriorityScoreMetadata, PriorityWeightMap, PriorityWeightsResponse, PriorityWeightsUpdateRequest,
} from './priority-weights.models';

const settings: PriorityWeightsResponse = {
  version: 2,
  description: 'Saved weights',
  availableFields: [
    { key: 'businessValue', label: 'Business Value', category: 'Impact', description: 'Value', min: 1, max: 5, higherIsBetter: true, defaultWeight: 25 },
    { key: 'userBase', label: 'Users', category: 'Reach', description: 'Reach', min: 0, max: 100000, higherIsBetter: true, defaultWeight: 20 },
    { key: 'risk', label: 'Risk', category: 'Risk', description: 'Risk', min: 1, max: 4, higherIsBetter: true, defaultWeight: 5 },
  ],
  defaultWeights: { businessValue: 25, userBase: 20, risk: 5 },
  portfolioOverrides: { alpha: { businessValue: 40, risk: 10 }, beta: { userBase: 60 } },
  projectOverrides: { 'A-1': { businessValue: 80, userBase: 0 } },
  presets: [{ id: 'balanced', name: 'Balanced', description: 'Balanced', weights: { businessValue: 50, userBase: 40, risk: 10 } }],
  etag: 'weights-v1',
};

function savedProject(id: string, portfolio: string, score: number, extra: PriorityScoreMetadata = {}): Project & PriorityScoreMetadata {
  return {
    projectId: id, projectName: `Project ${id}`, portfolio, portfolioKey: portfolio, priorityScore: score,
    businessValue: 4, userBase: 1000, mlTier: 'Proceed', finalTier: 'Proceed',
    priorityScoreState: 'weighted', priorityWeightScope: 'portfolio', ...extra,
  } as Project & PriorityScoreMetadata;
}

function mergeScopes(saved: Record<string, PriorityWeightMap>, patches: Record<string, PriorityWeightMap> = {}): Record<string, PriorityWeightMap> {
  const result = structuredClone(saved);
  for (const [key, weights] of Object.entries(patches)) {
    if (Object.keys(weights).length) result[key] = { ...weights };
    else delete result[key];
  }
  return result;
}

function createApi() {
  return {
    getPriorityWeights: vi.fn<() => Observable<PriorityWeightsResponse>>(() => of(structuredClone(settings))),
    updatePriorityWeights: vi.fn<(request: PriorityWeightsUpdateRequest) => Observable<PriorityWeightsResponse>>(request =>
      of({
        ...structuredClone(settings),
        defaultWeights: { ...settings.defaultWeights, ...request.defaultWeights },
        portfolioOverrides: mergeScopes(settings.portfolioOverrides, request.portfolioOverrides),
        projectOverrides: mergeScopes(settings.projectOverrides, request.projectOverrides),
        etag: 'weights-v2',
      }),
    ),
  };
}

function render(api = createApi()) {
  const store = {
    dataset: signal({
      projects: [
        savedProject('A-1', 'alpha', 71.7, { priorityWeightScope: 'project' }),
        savedProject('B-1', 'beta', 50.2),
        savedProject('A-pending', 'alpha', 99, { priorityScoreState: 'awaiting-analysis' }),
      ],
    } as PortfolioDataset),
    portfolioItems: signal([
      { key: 'alpha', displayName: 'Alpha' }, { key: 'beta', displayName: 'Beta' }, { key: 'empty', displayName: 'New portfolio' },
    ]),
    isLoading: signal(false),
    loadError: signal<string | null>(null),
    refresh: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [PriorityWeightsPageComponent],
    providers: [
      { provide: DataApiService, useValue: api },
      { provide: PortfolioStore, useValue: store },
    ],
  });
  const fixture = TestBed.createComponent(PriorityWeightsPageComponent);
  fixture.detectChanges();
  return { fixture, page: fixture.componentInstance, store, api };
}

function inputEvent(value: string): Event {
  const input = document.createElement('input');
  input.value = value;
  return { target: input } as unknown as Event;
}

describe('Priority weight administration', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('loads real settings and selects portfolios, including portfolios with no projects', async () => {
    const { fixture, page, api } = render();
    await fixture.whenStable();
    page.activeTab = 'portfolios';
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const select: HTMLElement = fixture.nativeElement.querySelector('.portfolio-selector');
    select.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'alpha' } }));
    fixture.detectChanges();
    expect(api.getPriorityWeights).toHaveBeenCalledOnce();
    expect(page.selectedPortfolioKey()).toBe('alpha');
    expect(fixture.nativeElement.querySelector('#portfolio-businessValue').value).toBe('40');
    expect(fixture.nativeElement.querySelector('#portfolio-userBase').value).toBe('');
    expect(fixture.nativeElement.querySelector('#portfolio-userBase').placeholder).toContain('20');
    expect(fixture.nativeElement.textContent).toContain('New portfolio');
    expect(page.canSave()).toBe(false);
  });

  it('inherits each factor project over portfolio over global, including an explicit zero', () => {
    const { page } = render();
    expect(page.getProjectWeight('A-1', 'businessValue')).toBe(80);
    expect(page.getProjectWeight('A-1', 'userBase')).toBe(0);
    expect(page.getProjectWeight('A-1', 'risk')).toBe(10);
    expect(page.projectWeightSource('A-1', 'risk')).toBe('Portfolio');
    expect(page.getProjectWeight('B-1', 'businessValue')).toBe(25);
    expect(page.projectWeightSource('B-1', 'businessValue')).toBe('Global');
    const effective = page.effectiveProjectWeights('A-1');
    const total = Object.keys(effective).reduce((sum, field) => sum + page.percentage(effective, field), 0);
    expect(total).toBeCloseTo(100);
    expect(page.percentage(effective, 'userBase')).toBe(0);
  });

  it('saves only the selected changed portfolio, with an etag, without replacing other scopes', () => {
    const { fixture, page, api, store } = render();
    page.selectPortfolio('alpha');
    page.onPortfolioWeightChange('alpha', 'userBase', inputEvent('45'));
    page.selectPortfolio('beta');
    expect(page.getPortfolioWeight('beta', 'userBase')).toBe(60);
    page.selectPortfolio('alpha');
    expect(page.getPortfolioWeight('alpha', 'userBase')).toBe(45);
    page.saveWeights();
    fixture.detectChanges();
    expect(api.updatePriorityWeights).toHaveBeenCalledWith({
      etag: 'weights-v1',
      portfolioOverrides: { alpha: { businessValue: 40, risk: 10, userBase: 45 } },
    });
    expect(page.portfolioOverrides()['beta']).toEqual({ userBase: 60 });
    expect(page.projectOverrides()['A-1']).toEqual({ businessValue: 80, userBase: 0 });
    expect(page.savedSettings()?.etag).toBe('weights-v2');
    expect(store.refresh).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Priority weights saved');
    expect(page.hasUnsavedChanges()).toBe(false);
  });

  it('clears a portfolio override, reveals globals, and keeps explicit project factors', () => {
    const { page, api } = render();
    page.removePortfolioOverride('alpha');
    expect(page.getPortfolioWeight('alpha', 'businessValue')).toBe(25);
    expect(page.getProjectWeight('A-1', 'businessValue')).toBe(80);
    expect(page.getProjectWeight('A-1', 'risk')).toBe(5);
    page.saveWeights();
    expect(api.updatePriorityWeights).toHaveBeenCalledWith({ etag: 'weights-v1', portfolioOverrides: { alpha: {} } });
    expect(page.portfolioOverrides()).toEqual({ beta: { userBase: 60 } });
  });

  it('clears a project override and immediately shows its inherited portfolio values', async () => {
    const { fixture, page, api } = render();
    await fixture.whenStable();
    page.activeTab = 'overrides';
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.project-selector').dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'A-1' } }));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.reset-project').click();
    fixture.detectChanges();
    expect(page.getProjectWeight('A-1', 'businessValue')).toBe(40);
    expect(page.getProjectWeight('A-1', 'userBase')).toBe(20);
    expect(page.projectWeightSource('A-1', 'businessValue')).toBe('Portfolio');
    page.saveWeights();
    expect(api.updatePriorityWeights).toHaveBeenCalledWith({ etag: 'weights-v1', projectOverrides: { 'A-1': {} } });
  });

  it('clearing one override factor resumes inheritance instead of silently setting zero', () => {
    const { page } = render();
    page.onProjectWeightChange('A-1', 'userBase', inputEvent(''));
    expect(page.getProjectWeight('A-1', 'userBase')).toBe(20);
    expect(page.projectWeightSource('A-1', 'userBase')).toBe('Global');
    expect(page.projectOverrides()['A-1']).toEqual({ businessValue: 80 });
    page.onPortfolioWeightChange('alpha', 'risk', inputEvent(''));
    expect(page.getPortfolioWeight('alpha', 'risk')).toBe(5);
  });

  it('creates sparse overrides so future global and portfolio edits continue to flow through', () => {
    const { page, store } = render();
    page.initPortfolioOverride('empty');
    expect(page.portfolioOverrides()['empty']).toEqual({});
    page.initOverride('B-1');
    expect(page.projectOverrides()['B-1']).toEqual({});
    page.onProjectWeightChange('B-1', 'risk', inputEvent('30'));
    page.onWeightChange('businessValue', 45);
    expect(page.getProjectWeight('B-1', 'businessValue')).toBe(45);
    expect(page.getProjectWeight('B-1', 'userBase')).toBe(60);
    store.dataset.update(dataset => ({
      ...dataset, projects: [...dataset.projects, savedProject('new', 'alpha', 0, { priorityScoreState: 'awaiting-analysis' })],
    }));
    expect(page.getProjectWeight('new', 'businessValue')).toBe(40);
    expect(page.getProjectWeight('new', 'userBase')).toBe(20);
  });

  it('accepts positive non-100 totals and displays coherent normalized percentages', () => {
    const { page } = render();
    page.onWeightChange('businessValue', 400);
    expect(page.totalWeight()).toBe(425);
    expect(page.validationError()).toBeNull();
    expect(page.canSave()).toBe(true);
    const total = Object.keys(page.currentWeights()).reduce((sum, key) => sum + page.percentage(page.currentWeights(), key), 0);
    expect(total).toBeCloseTo(100);
    page.autoBalance();
    expect(page.totalWeight()).toBe(100);
    expect(Object.values(page.currentWeights()).every(value => value >= 0)).toBe(true);
  });

  it('uses presets for globals only and preserves portfolio/project customizations', () => {
    const { page, api } = render();
    page.applyPreset(page.presets()[0]);
    page.saveWeights();
    expect(api.updatePriorityWeights).toHaveBeenCalledWith({
      etag: 'weights-v1', defaultWeights: { businessValue: 50, userBase: 40, risk: 10 },
    });
    expect(page.portfolioOverrides()).toEqual(settings.portfolioOverrides);
    expect(page.projectOverrides()).toEqual(settings.projectOverrides);
  });

  it('blocks negative/nonfinite or zero-total effective weights with an explicit validation state', () => {
    const { fixture, page, api } = render();
    page.onWeightChange('businessValue', -1);
    fixture.detectChanges();
    expect(page.canSave()).toBe(false);
    expect(fixture.nativeElement.querySelector('.validation-error').textContent).toContain('nonnegative');
    page.onWeightChange('businessValue', Number.NaN);
    expect(page.canSave()).toBe(false);
    page.currentWeights.set({ businessValue: 0, userBase: 0, risk: 0 });
    page.saveWeights();
    expect(page.validationError()).toContain('positive');
    expect(api.updatePriorityWeights).not.toHaveBeenCalled();
  });

  it('shows a save conflict, retains edits, and does not imply that scores were refreshed', () => {
    const api = createApi();
    api.updatePriorityWeights.mockReturnValue(throwError(() => ({ error: { detail: 'Priority weights changed. Reload before saving.' } })));
    const { fixture, page, store } = render(api);
    page.onWeightChange('businessValue', 35);
    page.saveWeights();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.save-error[role="alert"]').textContent).toContain('Reload before saving');
    expect(page.currentWeights()['businessValue']).toBe(35);
    expect(page.savedSettings()?.etag).toBe('weights-v1');
    expect(page.isSaving()).toBe(false);
    expect(page.saveSuccess()).toBeNull();
    expect(store.refresh).not.toHaveBeenCalled();
  });

  it('shows and retries load errors without enabling an empty or invented configuration', () => {
    const api = createApi();
    api.getPriorityWeights.mockReturnValue(throwError(() => ({ error: { detail: 'Weights are unavailable.' } })));
    const { fixture, page } = render(api);
    expect(fixture.nativeElement.querySelector('.load-error[role="alert"]').textContent).toContain('Weights are unavailable');
    expect(page.fields()).toEqual([]);
    expect(page.canSave()).toBe(false);
    api.getPriorityWeights.mockReturnValue(of(structuredClone(settings)));
    page.loadWeights();
    fixture.detectChanges();
    expect(page.loadError()).toBeNull();
    expect(page.currentWeights()).toEqual(settings.defaultWeights);
  });

  it('prevents duplicate writes while a save is pending', () => {
    const api = createApi();
    const response = new Subject<PriorityWeightsResponse>();
    api.updatePriorityWeights.mockReturnValue(response);
    const { page } = render(api);
    page.onWeightChange('businessValue', 35);
    page.saveWeights();
    page.saveWeights();
    expect(page.isSaving()).toBe(true);
    expect(api.updatePriorityWeights).toHaveBeenCalledOnce();
    response.next({ ...structuredClone(settings), defaultWeights: { ...settings.defaultWeights, businessValue: 35 }, etag: 'new-etag' });
    response.complete();
    expect(page.isSaving()).toBe(false);
  });

  it('shows server-saved scores only and never simulates draft edits or pending-project scores', () => {
    const { fixture, page } = render();
    page.activeTab = 'results';
    page.onWeightChange('businessValue', 1000);
    fixture.detectChanges();
    const scores = Array.from(fixture.nativeElement.querySelectorAll('.saved-score') as NodeListOf<HTMLElement>).map(item => item.textContent?.trim());
    expect(scores).toEqual(['71.7', '50.2', '—']);
    expect(fixture.nativeElement.textContent).toContain('not simulated');
    expect(fixture.nativeElement.textContent).toContain('Awaiting analysis');
    expect(page.savedRanking()[0].priorityScore).toBe(71.7);
  });
});
