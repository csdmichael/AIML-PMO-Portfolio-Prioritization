import { describe, it, expect } from 'vitest';
import { isReportConfigured } from './powerbi.models';

describe('Power BI PENDING state logic', () => {
  it('should return false when reportId is PENDING', () => {
    const config = {
      tenantId: 't-123',
      clientId: 'c-123',
      workspaceId: 'w-123',
      reportId: 'PENDING',
      scopes: [],
    };
    expect(isReportConfigured(config)).toBe(false);
  });

  it('should return false when reportId is lowercase pending or whitespace', () => {
    expect(
      isReportConfigured({
        tenantId: 't',
        clientId: 'c',
        workspaceId: 'w',
        reportId: ' pending ',
        scopes: [],
      }),
    ).toBe(false);
  });

  it('should return false when reportId is empty or null', () => {
    expect(isReportConfigured(null)).toBe(false);
    expect(
      isReportConfigured({
        tenantId: 't',
        clientId: 'c',
        workspaceId: 'w',
        reportId: '',
        scopes: [],
      }),
    ).toBe(false);
  });

  it('should return true when a real GUID reportId is configured', () => {
    const config = {
      tenantId: '12a4b86b-e64c-43f9-af05-d9130a72dfd2',
      clientId: '5b2b4e8a-53cf-4295-990d-71a34962aadb',
      workspaceId: '39c02d65-d2cb-4355-9e77-cbf442d7fc8b',
      reportId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      scopes: ['https://analysis.windows.net/powerbi/api/Report.Read.All'],
    };
    expect(isReportConfigured(config)).toBe(true);
  });
});
