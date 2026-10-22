import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { ConfigService } from './services/config.service';

async function settleIonApp(fixture: ComponentFixture<AppComponent>): Promise<void> {
  // ion-app starts a short readiness timer once it loads; finish it before the test environment is torn down.
  const appElement = fixture.nativeElement.querySelector('ion-app') as (HTMLElement & { componentOnReady?: () => Promise<unknown> }) | null;
  await appElement?.componentOnReady?.();
  await new Promise((resolve) => setTimeout(resolve, 50));
}

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
  navigation: [
    { id: 'overview', label: 'Overview', icon: 'pie-chart-outline', route: '/overview' },
    {
      id: 'documentation',
      label: 'Documentation',
      icon: 'book-outline',
      isCategory: true,
      children: [
        { id: 'docs-architecture', label: 'Architecture & Steps', icon: 'git-network-outline', route: '/docs/architecture' },
        { id: 'docs-algorithms', label: 'ML Algorithms', icon: 'hardware-chip-outline', route: '/docs/algorithms' },
      ],
    },
  ],
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

describe('AppComponent', () => {
  it('should create the app', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ConfigService,
          useValue: { config: TEST_CONFIG },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    await settleIonApp(fixture);
  });

  it('should toggle documentation category expansion', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ConfigService,
          useValue: { config: TEST_CONFIG },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    // Categories default to collapsed
    expect(app.isCategoryExpanded('documentation')).toBe(false);
    expect(app.isCategoryExpanded('admin')).toBe(false);

    // Toggle to expand
    app.toggleCategory('documentation');
    expect(app.isCategoryExpanded('documentation')).toBe(true);

    // Toggle to collapse
    app.toggleCategory('documentation');
    expect(app.isCategoryExpanded('documentation')).toBe(false);
    await settleIonApp(fixture);
  });
});
