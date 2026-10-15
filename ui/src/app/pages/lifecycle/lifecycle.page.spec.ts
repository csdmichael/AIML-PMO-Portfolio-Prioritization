import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LifecyclePageComponent } from './lifecycle.page';
import { PortfolioStore } from '../../services/portfolio.store';
import { ConfigService } from '../../services/config.service';
import { SAMPLE_PORTFOLIO_DATASET } from '../../data/sample-portfolio.data';

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
    store.resetToDefaultData();
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

  it('should support clearing all projects for demo and restoring defaults', () => {
    const fixture = TestBed.createComponent(LifecyclePageComponent);
    const component = fixture.componentInstance;

    store.clearAllProjects();
    expect(store.rawProjects().length).toBe(0);
    expect(store.activeProjects().length).toBe(0);

    store.resetToDefaultData();
    expect(store.rawProjects().length).toBe(SAMPLE_PORTFOLIO_DATASET.projects.length);
  });
});
