import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LifecyclePageComponent } from './lifecycle.page';
import { PortfolioStore } from '../../services/portfolio.store';
import { ConfigService } from '../../services/config.service';

const TEST_CONFIG = {
  api: { basePath: '/api/v1', timeoutMs: 30000, pipelinePollIntervalMs: 15000 },
  brand: {
    title: 'PMO Prioritization',
    subtitle: 'AI-assisted',
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
    authorName: 'Michael Yaacoub',
    authorRole: 'Sr Solution Engineer',
    linkedInUrl: 'https://linkedin.com',
    linkedInLabel: 'LinkedIn',
    gitHubUrl: 'https://github.com',
    gitHubLabel: 'GitHub',
  },
  table: { pageSize: 25, pageSizes: [10, 25, 50] },
  charts: { driverChartHeight: 240, kpiCardHeight: 110, donutRadiusInner: '45%', donutRadiusOuter: '70%' },
  tokens: {},
};

describe('LifecyclePageComponent', () => {
  let store: PortfolioStore;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LifecyclePageComponent],
      providers: [
        PortfolioStore,
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ConfigService,
          useValue: { config: TEST_CONFIG },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(PortfolioStore);
    const testProject = {
      projectId: 'GIS-0001',
      projectName: 'Test Project 1',
      portfolio: 'IT - InfoSec',
      businessUnit: 'Corporate IT',
      site: 'Fremont',
      projectManager: 'PM One',
      executiveSponsor: 'Exec One',
      sponsorLevel: 'Executive' as const,
      projectStatus: 'Active' as const,
      goLiveDate: '2027-01-01',
      monthsToGoLive: 12,
      businessValue: 5,
      regulatorySecurity: true,
      dtAlignment: false,
      protectedProgram: false,
      primarySkill: 'UC',
      skillDemandFte: 1,
      costEstimateUsd: 100000,
      dependencyCount: 0,
      riskRating: 'Low' as const,
      effortPersonWeeks: 10,
      sourcesPresent: 5,
      sourcesTotal: 10,
      sources: { planview: true, powerapps: true, ado: false, jira: false, msProject: false, smartsheet: false, buTrackers: false, buRepositories: false, hrCapacity: false, cost: false, excelIntake: false },
      completeness: 1,
      quality: 1,
      modelCertainty: 1,
      confidenceScore: 90,
      confidenceLevel: 'High' as const,
      mlTier: 'Must-do-now' as const,
      finalTier: 'Must-do-now' as const,
      tierProbabilities: { mustDoNow: 1, proceed: 0, canWait: 0, deprioritize: 0 },
      priorityScore: 95,
      ruleOverrides: [],
      recommendedAction: 'Proceed' as const,
      cluster: 'Cluster 1',
      topDrivers: [],
      dataIssues: [],
    };
    store.dataset.set({
      projects: [testProject],
      generatedAtUtc: '',
      asOfDate: '2026-10-12',
      source: '',
      capacityBySkill: [],
      clusters: [],
      rules: [],
      modelMetrics: {
        algorithm: 'LightGBM',
        accuracyCv: 0.9,
        macroF1Cv: 0.9,
        logLossCv: 0.1,
        trainingRows: 100,
        features: [],
      },
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the lifecycle page', () => {
    const fixture = TestBed.createComponent(LifecyclePageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should support marking project as backlog and switching tabs', () => {
    const fixture = TestBed.createComponent(LifecyclePageComponent);
    const component = fixture.componentInstance;

    const firstProj = store.activeProjects()[0];
    expect(firstProj).toBeTruthy();

    component.onSingleMarkBacklog(firstProj);
    const updated = store.rawProjects().find((p) => p.projectId === firstProj.projectId);
    expect(updated?.projectStatus).toBe('Backlog');

    // Switch to trash tab
    component.switchViewTab('trash');
    expect(component.viewTab()).toBe('trash');
  });

  it('should support soft delete and restore', () => {
    const fixture = TestBed.createComponent(LifecyclePageComponent);
    const component = fixture.componentInstance;

    const initialActiveCount = store.activeProjects().length;
    const firstProj = store.activeProjects()[0];

    // Soft delete
    component.onSingleSoftDelete(firstProj);
    expect(store.activeProjects().length).toBe(initialActiveCount - 1);
    expect(store.softDeletedProjects().length).toBe(1);

    // Restore
    component.onSingleRestore(firstProj);
    expect(store.activeProjects().length).toBe(initialActiveCount);
    expect(store.softDeletedProjects().length).toBe(0);
  });

  it('should support clearing all projects', () => {
    const fixture = TestBed.createComponent(LifecyclePageComponent);
    const component = fixture.componentInstance;

    store.clearAllProjects();
    expect(store.rawProjects().length).toBe(0);
    expect(store.activeProjects().length).toBe(0);
  });

  it('should support opening edit modal and saving project modifications', () => {
    const fixture = TestBed.createComponent(LifecyclePageComponent);
    const component = fixture.componentInstance;

    const firstProj = store.activeProjects()[0];
    component.onOpenEditModal(firstProj);
    expect(component.editingProject()?.projectId).toBe(firstProj.projectId);

    const modified = { ...firstProj, projectName: 'Updated Project Name by User', businessValue: 5 };
    component.onSaveEditedProject(modified);
    expect(component.editingProject()).toBeNull();

    const stored = store.rawProjects().find((p) => p.projectId === firstProj.projectId);
    expect(stored?.projectName).toBe('Updated Project Name by User');
    expect(stored?.businessValue).toBe(5);
  });

  it('should support adding and deleting portfolios', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(LifecyclePageComponent);
    const component = fixture.componentInstance;

    const initialCount = store.availablePortfolios().length;
    component.newPfName = 'Cloud Center of Excellence';
    component.newPfCode = 'CCOE';
    component.newPfDesc = 'Enterprise multi-cloud architecture';
    component.onCreatePortfolio();

    expect(store.availablePortfolios().length).toBe(initialCount + 1);
    expect(store.availablePortfolios()).toContain('Cloud Center of Excellence');

    // Delete the newly added portfolio
    component.onDeletePortfolio('Cloud Center of Excellence');
    expect(store.availablePortfolios()).not.toContain('Cloud Center of Excellence');
  });
});
