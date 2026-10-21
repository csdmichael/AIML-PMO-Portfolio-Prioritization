import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { PortfolioStore } from '../../services/portfolio.store';
import { DataApiService } from '../../services/data-api.service';
import { EditProjectPageComponent } from './edit-project.page';
import { Project } from '../../models/portfolio.models';
import { OptionsResponse, PortfolioItem } from '../../models/api.models';

const sampleProject: Partial<Project> = {
  projectId: 'GIS-0042',
  projectName: 'Cloud Migration & Modernization',
  portfolio: 'Digital Transformation',
  portfolioKey: 'digital-transformation',
  program: 'Cloud Foundation',
  programKey: 'cloud-foundation',
  businessUnit: 'Operations',
  site: 'HQ',
  primarySkill: 'cloud',
  costEstimateUsd: 1500000,
  businessValue: 4,
  projectStatus: 'Planning',
  goLiveDate: '2027-12-31',
  monthsToGoLive: 14,
  executiveSponsor: 'Jane Doe',
  sponsorLevel: 'Executive',
  riskRating: 'Medium',
  skillDemandFte: 3.5,
  effortPersonWeeks: 45,
  regulatorySecurity: true,
  dtAlignment: true,
  protectedProgram: false,
  finalTier: 'Must-do-now',
  mlTier: 'Must-do-now',
  priorityScore: 82.5,
  fieldWeightedScore: 78.0,
  mlBaseScore: 85.0,
  confidenceScore: 90,
  confidenceLevel: 'High',
  cluster: 'Cloud & AI',
  recommendedAction: 'Proceed',
  aiGenerated: true,
  effectivePriorityWeights: {
    businessValue: 0.25,
    userBase: 0.10,
    regulatorySecurity: 0.15,
    timingUrgency: 0.10,
    sponsorPriority: 0.10,
    dtAlignment: 0.10,
    risk: 0.10,
    cost: 0.10,
  },
  fieldProvenance: {
    projectName: { source: 'human', confidenceScore: 100, confidenceLevel: 'Human', rationale: 'Direct user input' },
    businessValue: { source: 'ai', confidenceScore: 85, confidenceLevel: 'High', rationale: 'Extracted from charter' },
  },
};

const mockOptions: OptionsResponse = {
  projectFields: [
    { key: 'projectName', label: 'Project Name', type: 'string', required: true },
    { key: 'businessValue', label: 'Business Value', type: 'integer', required: true },
    { key: 'costEstimateUsd', label: 'Cost', type: 'number', required: true },
  ],
  options: {
    businessUnits: ['Operations', 'Engineering', 'Finance'],
    sites: ['HQ', 'Branch A'],
    skills: [{ key: 'cloud', displayName: 'Cloud Architecture' }],
    sponsorLevels: ['Executive', 'Director', 'Manager'],
    riskRatings: ['Low', 'Medium', 'High', 'Critical'],
    projectStatuses: ['Planning', 'Active', 'On Hold', 'Completed', 'Backlog'],
    relationshipTypes: [],
  },
  portfolioFields: [],
  uploads: {} as any,
  projectIdPattern: '^GIS-\\d{4}$',
};

const mockPortfolios: PortfolioItem[] = [
  {
    key: 'digital-transformation',
    displayName: 'Digital Transformation',
    code: 'DT',
    role: 'main',
    programs: [{ key: 'cloud-foundation', displayName: 'Cloud Foundation' }],
  },
];

describe('EditProjectPageComponent', () => {
  let mockApi: {
    getOptions: ReturnType<typeof vi.fn>;
    getPortfolios: ReturnType<typeof vi.fn>;
    getProject: ReturnType<typeof vi.fn>;
    getProjectUploads: ReturnType<typeof vi.fn>;
    uploadProjectFile: ReturnType<typeof vi.fn>;
    updateProject: ReturnType<typeof vi.fn>;
    recalculateProject: ReturnType<typeof vi.fn>;
  };
  let mockStore: {
    refresh: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockApi = {
      getOptions: vi.fn().mockReturnValue(of(mockOptions)),
      getPortfolios: vi.fn().mockReturnValue(of(mockPortfolios)),
      getProject: vi.fn().mockReturnValue(of(sampleProject)),
      getProjectUploads: vi.fn().mockReturnValue(of([
        { uploadId: 'u1', fileName: 'Charter.pdf', sizeBytes: 102400, sourceKey: 'charter', oneLakePath: '/lake/charter.pdf', uploadedAt: '2026-10-15' },
      ])),
      uploadProjectFile: vi.fn().mockReturnValue(of({ uploadId: 'u2', fileName: 'Budget.xlsx', sizeBytes: 51200, sourceKey: 'business_case', oneLakePath: '/lake/budget.xlsx' })),
      updateProject: vi.fn().mockReturnValue(of({ ...sampleProject })),
      recalculateProject: vi.fn().mockReturnValue(of({ ...sampleProject, priorityScore: 88.0, finalTier: 'Must-do-now' })),
    };
    mockStore = {
      refresh: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [EditProjectPageComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'GIS-0042' } } } },
        { provide: DataApiService, useValue: mockApi },
        { provide: PortfolioStore, useValue: mockStore },
      ],
    });
  });

  it('renders the URL-based edit screen with Back to Prioritization button', () => {
    const fixture = TestBed.createComponent(EditProjectPageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.back-btn')?.textContent).toContain('Back to Prioritization');
    expect(el.querySelector('.edit-title')?.textContent).toContain('Edit Project: Cloud Migration & Modernization');
    expect(el.querySelector('.pid-badge')?.textContent).toContain('GIS-0042');
  });

  it('shows AI vs Human field provenance indicators with confidence tooltip', () => {
    const fixture = TestBed.createComponent(EditProjectPageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const aiBadges = el.querySelectorAll('.form-grid .prov-badge.ai');
    expect(aiBadges.length).toBeGreaterThan(0);
    // Business Value has AI provenance
    const bvBadge = aiBadges[0] as HTMLElement;
    expect(bvBadge.getAttribute('title')).toContain('Confidence:');
  });

  it('switches to Supporting Documents tab and shows existing attachments', () => {
    const fixture = TestBed.createComponent(EditProjectPageComponent);
    fixture.detectChanges();
    fixture.componentInstance.activeTab.set('documents');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.docs-hero-banner')).toBeTruthy();
    expect(el.querySelector('.docs-table')?.textContent).toContain('Charter.pdf');
  });

  it('triggers AI recalculation and updates scores', () => {
    const fixture = TestBed.createComponent(EditProjectPageComponent);
    fixture.detectChanges();
    fixture.componentInstance.activeTab.set('documents');
    fixture.detectChanges();

    const recalcBtn = fixture.nativeElement.querySelector('.btn-recalculate') as HTMLButtonElement;
    expect(recalcBtn).toBeTruthy();
    recalcBtn.click();
    fixture.detectChanges();

    expect(mockApi.recalculateProject).toHaveBeenCalledWith('GIS-0042', expect.any(Object));
    expect(fixture.nativeElement.querySelector('.feedback-banner.ai-success')?.textContent).toContain('AI recalculation complete');
  });

  it('displays calculation transparency tab with LightGBM, formulas, and rule floors', () => {
    const fixture = TestBed.createComponent(EditProjectPageComponent);
    fixture.detectChanges();
    fixture.componentInstance.activeTab.set('transparency');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Full Methodology Transparency');
    expect(el.textContent).toContain('Final Priority Score');
    expect(el.textContent).toContain('Field Weighted Score');
    expect(el.textContent).toContain('LightGBM');
    expect(el.textContent).toContain('Rule R1: Regulatory / Security');
  });
});
