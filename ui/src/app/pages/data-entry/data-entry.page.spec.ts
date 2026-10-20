import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataEntryPageComponent } from './data-entry.page';
import { DataApiService } from '../../services/data-api.service';
import { PortfolioStore } from '../../services/portfolio.store';
import { IntakeDraft, IntakeSuggestion, OptionsResponse, PortfolioItem } from '../../models/api.models';

const options = {
  options: {
    businessUnits: ['Finance'],
    sites: ['Fremont'],
    projectStatuses: ['Planning'],
    sponsorLevels: ['Executive'],
    riskRatings: ['Medium'],
    skills: [{ key: 'UC', displayName: 'Unified Communications' }],
    relationshipTypes: [],
  },
  projectFields: [
    { key: 'portfolioKey', label: 'Portfolio', type: 'select', required: true, source: 'portfolios' },
    { key: 'programKey', label: 'Program', type: 'select', required: true, source: 'programsOfPortfolio' },
    { key: 'businessUnit', label: 'Business unit', type: 'select', required: true, source: 'options.businessUnits' },
    { key: 'site', label: 'Site', type: 'select', required: true, source: 'options.sites' },
  ],
} as unknown as OptionsResponse;

const lookups = {
  businessUnits: ['Finance'],
  sites: ['Fremont'],
  projectStatuses: ['Planning'],
  sponsorLevels: ['Executive'],
  riskRatings: ['Medium'],
  skills: [{ key: 'UC', displayName: 'Unified Communications' }],
};

const portfolios: PortfolioItem[] = [
  { key: 'it-infosec', displayName: 'IT - InfoSec', code: 'ITI', role: 'main', programs: [{ key: 'cloud', displayName: 'Cloud' }] },
  { key: 'hr-projects', displayName: 'HR Projects', code: 'HP', role: 'main', programs: [{ key: 'hr-projects', displayName: 'HR Projects' }] },
];

const businessUnitSuggestion: IntakeSuggestion = {
  field: 'businessUnit',
  kind: 'option',
  proposedValue: 'Zeta Exploration Unit',
  label: 'Add "Zeta Exploration Unit" as a new Business unit',
  rationale: 'No existing unit fits the description.',
};

function prefilledDraft(fields: Record<string, unknown>, suggestions: Record<string, IntakeSuggestion> = {}): IntakeDraft {
  return {
    draftId: 'DRF-1',
    projectName: 'HR Policies website',
    description: 'A public website that publishes HR policies to all staff.',
    status: 'prefilled',
    documents: [],
    fields: fields as unknown as IntakeDraft['fields'],
    missingRequired: [],
    suggestions,
  };
}

function createApi(overrides: Record<string, unknown> = {}) {
  return {
    getOptions: vi.fn(() => of(options)),
    getLookups: vi.fn(() => of(lookups)),
    getPortfolios: vi.fn(() => of(portfolios)),
    createIntakeDraft: vi.fn(() => of(prefilledDraft({}))),
    prefillIntakeDraft: vi.fn(() => of(prefilledDraft({}, { businessUnit: businessUnitSuggestion }))),
    applyIntakeSuggestion: vi.fn(() => of(prefilledDraft({}))),
    dismissIntakeSuggestion: vi.fn(() => of(prefilledDraft({}))),
    createProject: vi.fn(() => of({ projectId: 'GIS-0100' })),
    createPortfolio: vi.fn(() => of({})),
    ...overrides,
  };
}

function render(api: ReturnType<typeof createApi>) {
  TestBed.configureTestingModule({
    imports: [DataEntryPageComponent],
    providers: [
      { provide: DataApiService, useValue: api },
      { provide: PortfolioStore, useValue: { portfolioDefinitions: signal([]), refresh: vi.fn(), reloadPortfolioItems: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(DataEntryPageComponent);
  fixture.detectChanges();
  fixture.componentInstance.projectStep.set(2);
  fixture.detectChanges();
  return fixture;
}

describe('Data Entry page: AI prefill and dropdown suggestions', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('fills a dropdown when its list has the AI value', () => {
    const api = createApi({
      prefillIntakeDraft: vi.fn(() => of(prefilledDraft({ portfolioKey: { value: 'it-infosec', source: 'ai' } }))),
    });
    const page = render(api).componentInstance;
    page.onPrefillWithAi();
    expect(page.projectFields.portfolioKey).toBe('it-infosec');
    expect(page.isAiFilled('portfolioKey')).toBe(true);
  });

  it('does not fill a dropdown with a value its list does not show', () => {
    const api = createApi({
      prefillIntakeDraft: vi.fn(() => of(prefilledDraft({ site: { value: 'Atlantis', source: 'ai' } }))),
    });
    const page = render(api).componentInstance;
    page.onPrefillWithAi();
    expect(page.projectFields.site).toBeUndefined();
    expect(page.isAiFilled('site')).toBe(false);
  });

  it('shows an unlisted AI value as a suggestion and leaves the dropdown empty', () => {
    const fixture = render(createApi());
    const page = fixture.componentInstance;
    page.onPrefillWithAi();
    fixture.detectChanges();
    expect(page.projectFields.businessUnit).toBeUndefined();
    expect(page.suggestionFor('businessUnit')).toEqual(businessUnitSuggestion);
    expect(fixture.nativeElement.querySelector('.suggestion-apply')).not.toBeNull();
  });

  it('creates the suggested value on one click and sets the dropdown to it', () => {
    const created = { ...lookups, businessUnits: ['Finance', 'Zeta Exploration Unit'] };
    const api = createApi({
      getLookups: vi
        .fn()
        .mockReturnValueOnce(of(lookups))
        .mockReturnValueOnce(of(lookups))
        .mockReturnValue(of(created)),
      applyIntakeSuggestion: vi.fn(() =>
        of(prefilledDraft({ businessUnit: { value: 'Zeta Exploration Unit', source: 'ai' } })),
      ),
    });
    const page = render(api).componentInstance;
    page.onPrefillWithAi();
    page.applySuggestion('businessUnit');
    expect(api.applyIntakeSuggestion).toHaveBeenCalledWith('DRF-1', 'businessUnit');
    expect(page.projectFields.businessUnit).toBe('Zeta Exploration Unit');
    expect(page.isAiFilled('businessUnit')).toBe(true);
    expect(page.suggestionFor('businessUnit')).toBeNull();
  });

  it('dismisses a suggestion without changing the dropdown', () => {
    const api = createApi();
    const page = render(api).componentInstance;
    page.onPrefillWithAi();
    page.dismissSuggestion('businessUnit');
    expect(api.dismissIntakeSuggestion).toHaveBeenCalledWith('DRF-1', 'businessUnit');
    expect(page.suggestionFor('businessUnit')).toBeNull();
    expect(page.projectFields.businessUnit).toBeUndefined();
  });

  it('offers only the programs of the selected portfolio and clears a program from another portfolio', () => {
    const page = render(createApi()).componentInstance;
    page.projectFields.portfolioKey = 'it-infosec';
    page.projectFields.programKey = 'cloud';
    expect(page.programsOf('it-infosec').map((program) => program.key)).toEqual(['cloud']);
    page.onPortfolioChanged('hr-projects');
    expect(page.projectFields.programKey).toBeUndefined();
  });

  it('shows the real error when the project is not created and does not invent a project ID', () => {
    const api = createApi({
      createProject: vi.fn(() => throwError(() => ({ error: { detail: 'programKey is required.' } }))),
    });
    const page = render(api).componentInstance;
    page.onSubmitProject();
    expect(page.submitError()).toBe('programKey is required.');
    expect(page.createdProjectId()).toBeNull();
  });

  it('clears the program when the portfolio is cleared with its own button', () => {
    const page = render(createApi()).componentInstance;
    page.projectFields.portfolioKey = 'it-infosec';
    page.projectFields.programKey = 'cloud';
    page.clearField('portfolioKey');
    expect(page.projectFields.programKey).toBeUndefined();
  });

  it('keeps an applied value when the lists cannot be refreshed afterwards', () => {
    const api = createApi({
      getLookups: vi
        .fn()
        .mockReturnValueOnce(of(lookups))
        .mockReturnValueOnce(of(lookups))
        .mockReturnValue(throwError(() => new Error('offline'))),
      applyIntakeSuggestion: vi.fn(() =>
        of(prefilledDraft({ businessUnit: { value: 'Zeta Exploration Unit', source: 'ai' } })),
      ),
    });
    const page = render(api).componentInstance;
    page.onPrefillWithAi();
    page.applySuggestion('businessUnit');
    expect(page.projectFields.businessUnit).toBe('Zeta Exploration Unit');
    expect(page.submitError()).toContain('could not be refreshed');
    expect(page.suggestionFor('businessUnit')).toBeNull();
  });

  it('shows no suggestions from an earlier draft after a new prefill fails', () => {
    const api = createApi({
      prefillIntakeDraft: vi
        .fn()
        .mockReturnValueOnce(of(prefilledDraft({}, { businessUnit: businessUnitSuggestion })))
        .mockReturnValueOnce(throwError(() => ({ error: { detail: 'AI service unavailable.' } }))),
    });
    const page = render(api).componentInstance;
    page.onPrefillWithAi();
    expect(page.suggestionFor('businessUnit')).not.toBeNull();
    page.onPrefillWithAi();
    expect(page.suggestions()).toEqual({});
    expect(page.submitError()).toBe('AI service unavailable.');
  });
});
