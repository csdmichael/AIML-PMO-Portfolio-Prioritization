import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { ConfigService } from './services/config.service';

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

    // Documentation category defaults to expanded
    expect(app.isCategoryExpanded('documentation')).toBe(true);

    // Toggle to collapse
    app.toggleCategory('documentation');
    expect(app.isCategoryExpanded('documentation')).toBe(false);

    // Toggle to re-expand
    app.toggleCategory('documentation');
    expect(app.isCategoryExpanded('documentation')).toBe(true);
  });
});
