import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { PortfolioStore } from '../../services/portfolio.store';
import { DataApiService } from '../../services/data-api.service';
import { FileExportService } from '../../services/file-export.service';
import { PrioritizationMatrixPageComponent } from './prioritization-matrix.page';
import { Project } from '../../models/portfolio.models';
import { PriorityWeightsResponse } from '../admin/priority-weights/priority-weights.models';

const sampleProject1: Partial<Project> = {
  projectId: 'GIS-0001',
  projectName: 'Enterprise Asset Management Modernization',
  portfolio: 'IT Operations',
  program: 'Infrastructure',
  businessUnit: 'Engineering',
  site: 'HQ',
  projectManager: 'Alex Smith',
  executiveSponsor: 'David Chen',
  sponsorLevel: 'Executive',
  businessValue: 4,
  userBase: 5000,
  regulatorySecurity: true,
  goLiveDate: '2027-04-01',
  monthsToGoLive: 6,
  dtAlignment: true,
  riskRating: 'Medium',
  costEstimateUsd: 1200000,
  dependencyCount: 2,
  effortPersonWeeks: 18,
  skillDemandFte: 2.5,
  confidenceScore: 92,
  confidenceLevel: 'High',
  priorityScore: 88.4,
  finalTier: 'Must-do-now',
  mlTier: 'Must-do-now',
  tierProbabilities: {
    mustDoNow: 0.85,
    proceed: 0.12,
    canWait: 0.03,
    deprioritize: 0.0,
  },
  topDrivers: [
    {
      signalKey: 'businessValue',
      signalLabel: 'Business Value',
      shapValue: 0.35,
      direction: 'increases',
      featureValue: 4,
    },
  ],
  recommendedAction: 'Proceed',
};

const sampleProject2: Partial<Project> = {
  projectId: 'GIS-0002',
  projectName: 'Field Mobility Automation',
  portfolio: 'Digital Transformation',
  program: 'Field Ops',
  businessUnit: 'Operations',
  site: 'Plant North',
  projectManager: 'Maria Garcia',
  executiveSponsor: 'Sarah Jenkins',
  sponsorLevel: 'Director',
  businessValue: 3,
  userBase: 1200,
  regulatorySecurity: false,
  goLiveDate: '2027-12-01',
  monthsToGoLive: 14,
  dtAlignment: true,
  riskRating: 'Low',
  costEstimateUsd: 450000,
  dependencyCount: 0,
  effortPersonWeeks: 8,
  skillDemandFte: 1.0,
  confidenceScore: 78,
  confidenceLevel: 'Medium',
  priorityScore: 68.2,
  finalTier: 'Proceed',
  mlTier: 'Proceed',
  tierProbabilities: {
    mustDoNow: 0.15,
    proceed: 0.70,
    canWait: 0.12,
    deprioritize: 0.03,
  },
  topDrivers: [
    {
      signalKey: 'timingUrgency',
      signalLabel: 'Timing Urgency',
      shapValue: 0.22,
      direction: 'increases',
      featureValue: 14,
    },
  ],
  recommendedAction: 'Proceed',
};

const sampleWeightsResponse: PriorityWeightsResponse = {
  version: 2,
  description: 'Test weights',
  availableFields: [],
  defaultWeights: {
    businessValue: 25.0,
    userBase: 20.0,
    regulatorySecurity: 15.0,
    timingUrgency: 15.0,
    sponsorPriority: 10.0,
    dtAlignment: 5.0,
    risk: 5.0,
    cost: 5.0,
    dependencies: 0.0,
    effort: 0.0,
    skillDemand: 0.0,
  },
  portfolioOverrides: {},
  projectOverrides: {},
  presets: [],
  etag: 'etag-123',
};

describe('PrioritizationMatrixPageComponent', () => {
  let mockStore: {
    activeProjects: ReturnType<typeof signal<Project[]>>;
    rawProjects: ReturnType<typeof signal<Project[]>>;
    availablePortfolios: ReturnType<typeof signal<string[]>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    loadError: ReturnType<typeof signal<string | null>>;
    init: ReturnType<typeof vi.fn>;
  };
  let mockDataApi: {
    getPriorityWeights: ReturnType<typeof vi.fn>;
  };
  let mockFileExport: {
    exportToExcel: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    mockStore = {
      activeProjects: signal<Project[]>([sampleProject1 as Project, sampleProject2 as Project]),
      rawProjects: signal<Project[]>([sampleProject1 as Project, sampleProject2 as Project]),
      availablePortfolios: signal<string[]>(['IT Operations', 'Digital Transformation']),
      isLoading: signal(false),
      loadError: signal<string | null>(null),
      init: vi.fn(),
    };

    mockDataApi = {
      getPriorityWeights: vi.fn().mockReturnValue(of(sampleWeightsResponse)),
    };

    mockFileExport = {
      exportToExcel: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [PrioritizationMatrixPageComponent],
      providers: [
        provideRouter([]),
        { provide: PortfolioStore, useValue: mockStore },
        { provide: DataApiService, useValue: mockDataApi },
        { provide: FileExportService, useValue: mockFileExport },
      ],
    });
  });

  it('renders matrix header, stats, and defaults portfolio filter to all', () => {
    const fixture = TestBed.createComponent(PrioritizationMatrixPageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.page-title')?.textContent).toContain('Project Prioritization Matrix');
    const select = el.querySelector('#portfolio-filter-select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.value).toBe('all');
    expect(fixture.componentInstance.selectedPortfolio()).toBe('all');
  });

  it('renders projects in rows with Overall Score in first score column and Confidence in second', () => {
    const fixture = TestBed.createComponent(PrioritizationMatrixPageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const rows = el.querySelectorAll('.prioritization-matrix-table tbody tr');
    expect(rows.length).toBe(2);

    // Verify first score column is Overall Score
    const firstScoreHeader = el.querySelector('.th-score .th-label')?.textContent;
    expect(firstScoreHeader).toContain('Overall Score');

    // Verify second column is Confidence %
    const confHeader = el.querySelector('.th-conf .th-label')?.textContent;
    expect(confHeader).toContain('Confidence %');

    // Verify cell content has calculated value and percentage in parentheses
    const firstRow = rows[0];
    expect(firstRow.querySelector('.td-score')?.textContent).toContain('88.4');
    expect(firstRow.querySelector('.td-conf')?.textContent).toContain('92%');
    expect(firstRow.textContent).toContain('GIS-0001');
    expect(firstRow.textContent).toContain('(15.0%)'); // Business value 15.0%
    expect(firstRow.textContent).toContain('(40.0%)'); // ML Base score 40.0%
  });

  it('filters projects by portfolio selection', () => {
    const fixture = TestBed.createComponent(PrioritizationMatrixPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.setPortfolioFilter('IT Operations');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelectorAll('.prioritization-matrix-table tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('GIS-0001');
    expect(rows[0].textContent).not.toContain('GIS-0002');
  });

  it('supports selecting multiple projects and comparing side by side', () => {
    const fixture = TestBed.createComponent(PrioritizationMatrixPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleProjectSelection('GIS-0001');
    fixture.componentInstance.toggleProjectSelection('GIS-0002');
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedProjectIds().size).toBe(2);

    // Toggle compare mode
    fixture.componentInstance.toggleCompareMode();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.comparison-card')).toBeTruthy();
    expect(el.querySelector('.comparison-table')).toBeTruthy();

    const compareHeader = el.querySelector('.section-title')?.textContent;
    expect(compareHeader).toContain('Side-by-Side Project Comparison (2 Projects)');
  });

  it('exports matrix data to Excel using FileExportService', () => {
    const fixture = TestBed.createComponent(PrioritizationMatrixPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.exportToExcel();
    expect(mockFileExport.exportToExcel).toHaveBeenCalled();
    const callArgs = mockFileExport.exportToExcel.mock.calls[0];
    expect(callArgs[0].title).toContain('PMO Prioritization Matrix');
    expect(callArgs[0].headers).toContain('Overall Score');
    expect(callArgs[0].headers).toContain('Confidence %');
    expect(callArgs[0].headers).toContain('ML Base Score (40% Weight)');
  });

  it('exports side-by-side comparison to Excel', () => {
    const fixture = TestBed.createComponent(PrioritizationMatrixPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleProjectSelection('GIS-0001');
    fixture.componentInstance.toggleProjectSelection('GIS-0002');
    fixture.componentInstance.toggleCompareMode();
    fixture.detectChanges();

    fixture.componentInstance.exportComparisonToExcel();
    expect(mockFileExport.exportToExcel).toHaveBeenCalled();
    const callArgs = mockFileExport.exportToExcel.mock.calls[0];
    expect(callArgs[0].title).toContain('PMO Side-by-Side Project Prioritization Comparison');
  });
});
