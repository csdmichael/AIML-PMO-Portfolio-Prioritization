import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DocsProjectFieldsPageComponent, PROJECT_FIELD_GUIDE } from './docs-project-fields.page';
import { ConfigService } from '../../../services/config.service';
import { OptionsResponse } from '../../../models/api.models';

const contract: OptionsResponse = {
  options: {
    businessUnits: ['Corporate IT'], sites: ['Fremont'], projectStatuses: ['Planning'],
    sponsorLevels: ['Executive'], riskRatings: ['Low', 'High'],
    skills: [{ key: 'CLOUD', displayName: 'Cloud' }], relationshipTypes: ['FinishToStart'],
  },
  projectFields: [
    { key: 'projectName', label: 'Project name', type: 'text', required: true, minLength: 3, maxLength: 120 },
    { key: 'businessValue', label: 'Business value', type: 'integer', required: true, min: 1, max: 5 },
    { key: 'costEstimateUsd', label: 'Cost', type: 'number', required: true, min: 10000, max: 100000000 },
    { key: 'protectedProgram', label: 'Protected', type: 'boolean', required: false },
    { key: 'notes', label: 'Notes', type: 'text', required: false, maxLength: 1000 },
  ],
  portfolioFields: [], uploads: { maxFilesPerSourcePerProject: 5, maxFileBytes: 10, acceptedBySource: {} },
};

describe('Project Fields documentation', () => {
  let http: HttpTestingController;
  let component: DocsProjectFieldsPageComponent;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DocsProjectFieldsPageComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: ConfigService, useValue: { config: { api: { basePath: '/api/v1' } } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    component = TestBed.createComponent(DocsProjectFieldsPageComponent).componentInstance;
  });
  afterEach(() => http.verify());

  it('uses every contract field, keeps policy gates first and computes actual attribution shares', async () => {
    const pending = component.load();
    http.expectOne('/api/v1/options').flush(contract);
    http.expectOne('/api/v1/portfolio').flush({
      generatedAtUtc: '2026-10-17T18:42:14Z', source: 'OneLake',
      projects: [{ topDrivers: [
        { signalKey: 'business_value', shapValue: 3 },
        { signalKey: 'cost_log10', shapValue: -1 },
      ] }],
    });
    await pending;
    expect(component.rows()).toHaveLength(contract.projectFields.length);
    expect(component.rows()[0].field.key).toBe('businessValue');
    expect(component.rows()[1].field.key).toBe('protectedProgram');
    expect(component.rows().find(row => row.field.key === 'businessValue')?.share).toBe(75);
    expect(component.rows().find(row => row.field.key === 'costEstimateUsd')?.share).toBe(25);
    expect(component.rows().find(row => row.field.key === 'projectName')?.share).toBeNull();
    expect(component.potentialValues(contract.projectFields[1])).toBe('1 to 5');
  });

  it('shows fields without fabricated impact if attribution is unavailable', async () => {
    const pending = component.load();
    http.expectOne('/api/v1/options').flush(contract);
    http.expectOne('/api/v1/portfolio').flush({}, { status: 502, statusText: 'Bad Gateway' });
    await pending;
    expect(component.rows()).toHaveLength(5);
    expect(component.rows().every(row => row.share === null)).toBe(true);
    expect(component.impactError()).toBeTruthy();
    expect(component.schemaError()).toBeNull();
  });

  it('reports schema failure explicitly without substituting a sample contract', async () => {
    const pending = component.load();
    http.expectOne('/api/v1/options').flush({}, { status: 503, statusText: 'Unavailable' });
    http.expectOne('/api/v1/portfolio').flush({ projects: [] });
    await pending;
    expect(component.rows()).toEqual([]);
    expect(component.schemaError()).toBeTruthy();
    expect(component.loading()).toBe(false);
  });

  it('handles zero attributions, required false boolean and search correctly', () => {
    component.contract.set(contract);
    component.dataset.set(null);
    expect(component.potentialValues(contract.projectFields[3])).toContain('false is a valid required value');
    component.search.set('costEstimateUsd');
    expect(component.rows()).toHaveLength(1);
    expect(component.rows()[0].guide.description).toContain('USD');
  });

  it('documents all current input keys with descriptions and examples', () => {
    expect(Object.keys(PROJECT_FIELD_GUIDE)).toHaveLength(24);
    for (const guide of Object.values(PROJECT_FIELD_GUIDE)) {
      expect(guide.description.length).toBeGreaterThan(20);
      expect(guide.example.length).toBeGreaterThan(0);
    }
  });
});
