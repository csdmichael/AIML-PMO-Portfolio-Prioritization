import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NgForm } from '@angular/forms';
import { DataEntryPageComponent } from './data-entry.page';
import { DataApiService } from '../../services/data-api.service';
import { PortfolioStore } from '../../services/portfolio.store';
import { DemoProjectCatalog, DemoResetResult, IntakeDraft, IntakeSuggestion, OptionsResponse, PortfolioItem } from '../../models/api.models';

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
    { key: 'projectName', label: 'Project name', type: 'text', required: true, minLength: 3, maxLength: 120 },
    { key: 'portfolioKey', label: 'Portfolio', type: 'select', required: true, source: 'portfolios' },
    { key: 'programKey', label: 'Program', type: 'select', required: true, source: 'programsOfPortfolio' },
    { key: 'businessUnit', label: 'Business unit', type: 'select', required: true, source: 'options.businessUnits' },
    { key: 'site', label: 'Site', type: 'select', required: true, source: 'options.sites' },
    { key: 'effortPersonWeeks', label: 'Effort (person-weeks)', type: 'number', required: true, min: 1, max: 2000 },
    { key: 'notes', label: 'Notes', type: 'text', required: false, maxLength: 1000 },
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

const demoCatalog: DemoProjectCatalog = {
  projectCount: 100,
  portfolios: [{ key: 'it-infosec', displayName: 'IT - InfoSec', projectCount: 40 }],
  capturedAtUtc: '2026-10-20T00:00:00Z',
  asOfDate: '2026-10-12',
  oneLakePath: 'Files/demo/portfolio.json',
};
const demoResult: DemoResetResult = {
  action: 'load', portfolioKey: null, loadedProjects: 100, replacedProjects: 100,
  totalProjects: 100, revision: 'dataset-1', updatedAtUtc: '2026-10-20T00:00:00Z',
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
    createProject: vi.fn((_payload: Record<string, unknown>, _runPipeline: boolean) => of({ projectId: 'GIS-0100' })),
    createPortfolio: vi.fn(() => of({})),
    getAdminSettings: vi.fn(() => of({ isDemoEnvironment: false })),
    getDemoProjectCatalog: vi.fn(() => of(demoCatalog)),
    loadDemoProjects: vi.fn(() => of(demoResult)),
    clearDemoProjects: vi.fn(() => of({ ...demoResult, action: 'clear', loadedProjects: 0, totalProjects: 0 })),
    importProjects: vi.fn(() => of({ count: 0, created: [], warnings: [] })),
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
  fixture.componentInstance.ionViewWillEnter();
  fixture.componentInstance.projectName = 'HR Policies website';
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

  it('saves the scope in the supported notes field instead of sending an unknown field', () => {
    const api = createApi();
    const page = render(api).componentInstance;
    page.projectDescription = 'Publish the HR policies and make them searchable by all staff.';
    page.onSubmitProject();
    const payload = api.createProject.mock.calls[0][0];
    expect(payload).not.toHaveProperty('projectDescription');
    expect(payload['notes']).toBe(page.projectDescription);
    expect(payload['projectName']).toBe('HR Policies website');
    expect(page.createdProjectId()).toBe('GIS-0100');
  });

  it('shows API field errors with readable labels and preserves the entered values', () => {
    const api = createApi({
      createProject: vi.fn(() => throwError(() => ({ error: {
        detail: 'The project does not match the data-entry rules.',
        errors: [
          { field: 'effortPersonWeeks', message: 'is required' },
          { field: 'programKey', message: 'must be one of: cloud' },
        ],
      } }))),
    });
    const fixture = render(api);
    const page = fixture.componentInstance;
    page.projectDescription = 'Keep this description after a validation failure.';
    page.projectFields.businessValue = 4;
    page.onSubmitProject();
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.validation-summary');
    expect(banner?.getAttribute('role')).toBe('alert');
    expect(banner?.textContent).toContain('Effort (person-weeks)');
    expect(banner?.textContent).toContain('is required');
    expect(banner?.textContent).toContain('Program');
    expect(banner?.textContent).toContain('must be one of: cloud');
    expect(banner?.textContent).toContain('Your entries have been kept');
    expect(page.projectDescription).toBe('Keep this description after a validation failure.');
    expect(page.projectFields.businessValue).toBe(4);
    expect(page.createdProjectId()).toBeNull();
    expect(page.isSubmitting()).toBe(false);
  });

  it('lists required fields before calling the API, including the required effort field', async () => {
    const api = createApi();
    const fixture = render(api);
    await fixture.whenStable();
    fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    fixture.debugElement.query(By.css('form')).triggerEventHandler('ngSubmit', {});
    fixture.detectChanges();
    expect(form.invalid).toBe(true);
    expect(api.createProject).not.toHaveBeenCalled();
    const banner = fixture.nativeElement.querySelector('.validation-summary');
    expect(banner?.textContent).toContain('Portfolio');
    expect(banner?.textContent).toContain('Effort (person-weeks)');
    expect(fixture.nativeElement.querySelector('[name="effortPersonWeeks"]').required).toBe(true);
  });

  it('explains the description limit without truncating it or sending a rejected request', () => {
    const api = createApi();
    const fixture = render(api);
    const page = fixture.componentInstance;
    page.projectDescription = 'x'.repeat(1001);
    page.onSubmitProject();
    fixture.detectChanges();
    expect(api.createProject).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.validation-summary')?.textContent).toContain('1000');
    expect(page.projectDescription).toHaveLength(1001);
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

  it('hides demo controls in production and does not fetch a synthetic catalog', () => {
    const api = createApi();
    const fixture = render(api);
    fixture.debugElement.query(By.css('ion-segment')).triggerEventHandler('ngModelChange', 'import');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.demo-controls')).toBeNull();
    expect(api.getDemoProjectCatalog).not.toHaveBeenCalled();
    fixture.componentInstance.requestDemoAction('clear');
    fixture.componentInstance.confirmDemoAction();
    expect(api.clearDemoProjects).not.toHaveBeenCalled();
  });

  it('shows full and portfolio loaders plus clear-all only in demo mode', () => {
    const fixture = render(createApi({ getAdminSettings: vi.fn(() => of({ isDemoEnvironment: true })) }));
    fixture.debugElement.query(By.css('ion-segment')).triggerEventHandler('ngModelChange', 'import');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.demo-load-all')?.textContent).toContain('100');
    expect(fixture.nativeElement.querySelector('.demo-load-portfolio')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.demo-clear')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('option[value="it-infosec"]')?.textContent).toContain('40');
  });

  it('requires a confirmation before replacing all projects and refreshes the API-backed store', () => {
    const api = createApi({ getAdminSettings: vi.fn(() => of({ isDemoEnvironment: true })) });
    const fixture = render(api);
    const page = fixture.componentInstance;
    page.requestDemoAction('all');
    expect(api.loadDemoProjects).not.toHaveBeenCalled();
    expect(page.demoConfirmationText()).toContain('all current projects');
    page.confirmDemoAction();
    expect(api.loadDemoProjects).toHaveBeenCalledWith(undefined);
    expect(page.demoResult()?.totalProjects).toBe(100);
    expect(page.store.refresh).toHaveBeenCalledOnce();
    expect(page.store.reloadPortfolioItems).toHaveBeenCalledOnce();
  });

  it('confirms only the selected portfolio and cannot change scope after confirmation is shown', () => {
    const api = createApi({ getAdminSettings: vi.fn(() => of({ isDemoEnvironment: true })) });
    const page = render(api).componentInstance;
    page.demoPortfolioKey = 'it-infosec';
    page.requestDemoAction('portfolio');
    expect(page.demoConfirmationText()).toContain('40 demo projects');
    expect(page.demoConfirmationText()).toContain('Other portfolios will not be changed');
    page.demoPortfolioKey = 'another-portfolio';
    page.confirmDemoAction();
    expect(api.loadDemoProjects).toHaveBeenCalledWith('it-infosec');
  });

  it('requires confirmation to clear all projects and supports cancel without an API write', () => {
    const api = createApi({ getAdminSettings: vi.fn(() => of({ isDemoEnvironment: true })) });
    const page = render(api).componentInstance;
    page.requestDemoAction('clear');
    expect(api.clearDemoProjects).not.toHaveBeenCalled();
    page.demoConfirmation.set(null);
    page.confirmDemoAction();
    expect(api.clearDemoProjects).not.toHaveBeenCalled();
    page.requestDemoAction('clear');
    page.confirmDemoAction();
    expect(api.clearDemoProjects).toHaveBeenCalledOnce();
    expect(page.demoResult()?.totalProjects).toBe(0);
  });

  it('prevents duplicate clicks while a demo write is in progress', () => {
    const pending = new Subject<DemoResetResult>();
    const api = createApi({
      getAdminSettings: vi.fn(() => of({ isDemoEnvironment: true })),
      loadDemoProjects: vi.fn(() => pending),
    });
    const page = render(api).componentInstance;
    page.requestDemoAction('all');
    page.confirmDemoAction();
    page.confirmDemoAction();
    expect(api.loadDemoProjects).toHaveBeenCalledOnce();
    expect(page.demoBusy()).toBe(true);
    pending.next(demoResult);
    expect(page.demoBusy()).toBe(false);
  });

  it('fails closed and shows an explicit error when the global setting cannot be read', () => {
    const api = createApi({
      getAdminSettings: vi.fn(() => throwError(() => ({ error: { detail: 'Settings unavailable.' } }))),
    });
    const fixture = render(api);
    fixture.debugElement.query(By.css('ion-segment')).triggerEventHandler('ngModelChange', 'import');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.demo-controls')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Settings unavailable.');
    expect(api.getDemoProjectCatalog).not.toHaveBeenCalled();
  });

  it('retains an error instead of pretending a rejected clear operation succeeded', () => {
    const api = createApi({
      getAdminSettings: vi.fn(() => of({ isDemoEnvironment: true })),
      clearDemoProjects: vi.fn(() => throwError(() => ({
        status: 403, error: { detail: 'Demo mode has been disabled.' },
      }))),
    });
    const page = render(api).componentInstance;
    page.requestDemoAction('clear');
    page.confirmDemoAction();
    expect(page.demoResult()).toBeNull();
    expect(page.demoError()).toBe('Demo mode has been disabled.');
    expect(page.isDemo()).toBe(false);
    expect(page.store.refresh).not.toHaveBeenCalled();
  });

  it('rechecks the global setting on subsequent page entries', () => {
    const api = createApi({
      getAdminSettings: vi.fn()
        .mockReturnValueOnce(of({ isDemoEnvironment: true }))
        .mockReturnValue(of({ isDemoEnvironment: false })),
    });
    const page = render(api).componentInstance;
    expect(page.isDemo()).toBe(true);
    page.ionViewWillEnter();
    expect(page.isDemo()).toBe(false);
    expect(page.demoCatalog()).toBeNull();
    expect(api.getDemoProjectCatalog).toHaveBeenCalledOnce();
  });

  it('lists workbook validation errors in the actual API field/message format', () => {
    const api = createApi({
      importProjects: vi.fn(() => throwError(() => ({
        error: { detail: 'No projects were saved.', errors: [{ field: 'row 2: Portfolio', message: 'is not available' }] },
      }))),
    });
    const page = render(api).componentInstance;
    page.onFileSelect({ target: { files: [new File(['workbook'], 'projects.xlsx')], value: 'projects.xlsx' } } as unknown as Event);
    expect(page.importError()).toBe('No projects were saved.');
    expect(page.importIssues()).toEqual(['row 2: Portfolio: is not available']);
    expect(page.store.refresh).not.toHaveBeenCalled();
  });
});
