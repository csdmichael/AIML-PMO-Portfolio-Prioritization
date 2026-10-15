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

  it('should throw an error for empty workbooks', async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, ws, 'Empty');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    await expect(service.parseExcelArrayBuffer(out)).rejects.toThrow();
  });
});
