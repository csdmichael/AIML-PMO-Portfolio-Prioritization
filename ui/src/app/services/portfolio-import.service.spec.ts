import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PortfolioImportService } from './portfolio-import.service';
import * as XLSX from 'xlsx';

describe('PortfolioImportService', () => {
  let service: PortfolioImportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PortfolioImportService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PortfolioImportService);
  });

  it('should be created and have 6 sample portfolio metadata definitions', () => {
    expect(service).toBeTruthy();
    expect(service.sampleFiles.length).toBe(6);
    expect(service.sampleFiles.map((s) => s.id)).toContain('it-infosec');
    expect(service.sampleFiles.map((s) => s.id)).toContain('ai-team');
  });

  it('should parse an Excel ArrayBuffer into Project objects', async () => {
    // Generate a small Excel buffer in-memory
    const testData = [
      {
        'Project ID': 'GIS-9999',
        'Project Name': 'Test Quantum AI Accelerator',
        'Portfolio': 'AI Team',
        'Business Unit': 'Digital Transformation',
        'Site': 'Fremont',
        'Project Status': 'Active',
        'Business Value (1-5)': 5,
        'Cost Estimate (USD)': 2500000,
        'Regulatory / Security': true,
        'Primary Skill': 'Data Engineering',
        'Final Tier': 'Must-do-now',
        'Priority Score': 92.4,
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(testData);
    XLSX.utils.book_append_sheet(wb, ws, 'Projects');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const result = await service.parseExcelArrayBuffer(out);
    expect(result.portfolio).toBe('AI Team');
    expect(result.projects.length).toBe(1);
    expect(result.projects[0].projectId).toBe('GIS-9999');
    expect(result.projects[0].projectName).toBe('Test Quantum AI Accelerator');
    expect(result.projects[0].businessValue).toBe(5);
    expect(result.projects[0].costEstimateUsd).toBe(2500000);
    expect(result.projects[0].regulatorySecurity).toBe(true);
    expect(result.projects[0].finalTier).toBe('Must-do-now');
  });

  it('should parse minimal template and auto-generate AI fields', async () => {
    // Minimal template input with only 6 mandatory fields
    const minimalData = [
      {
        'Project Name * [MANDATORY]': 'Fab Cyber Isolation Gateway',
        'Portfolio * [MANDATORY]': 'IT InfoSec',
        'Business Unit * [MANDATORY]': 'Fab Operations',
        'Primary Skill * [MANDATORY]': 'Cybersecurity',
        'Cost Estimate (USD) * [MANDATORY]': 2200000,
        'Business Value (1-5) * [MANDATORY]': 5,
        'Regulatory / Security [OPTIONAL]': true,
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(minimalData);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const result = await service.parseExcelArrayBuffer(out);
    expect(result.projects.length).toBe(1);
    const proj = result.projects[0];

    expect(proj.projectName).toBe('Fab Cyber Isolation Gateway');
    expect(proj.portfolio).toBe('IT InfoSec');
    expect(proj.businessValue).toBe(5);
    expect(proj.regulatorySecurity).toBe(true);

    // AI-generated signals
    expect(proj.aiGenerated).toBe(true);
    expect(proj.projectId).toMatch(/^GIS-\d{4}$/);
    expect(proj.finalTier).toBe('Must-do-now'); // Triggered by Rule R1 (regulatory)
    expect(proj.priorityScore).toBeGreaterThanOrEqual(80.0);
    expect(proj.confidenceLevel).toBe('High');
    expect(proj.recommendedAction).toBe('Protect slot');
    expect(proj.cluster).toBe('Security & Identity');
  });

  it('should recalculate AI signals dynamically when inputs are adjusted', () => {
    const updated = service.recalculateAiSignals({
      projectName: 'Predictive Yield Diagnostics',
      portfolio: 'AI Team',
      businessValue: 5,
      costEstimateUsd: 1800000,
      regulatorySecurity: false,
      primarySkill: 'Data Engineering',
    });

    expect(updated.finalTier).toBe('Must-do-now');
    expect(updated.cluster).toBe('Analytics & AI');
    expect(updated.skillDemandFte).toBeGreaterThan(0);
    expect(updated.effortPersonWeeks).toBeGreaterThan(0);
  });

  it('should throw an error for empty workbooks', async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, ws, 'Empty');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    await expect(service.parseExcelArrayBuffer(out)).rejects.toThrow();
  });
});
