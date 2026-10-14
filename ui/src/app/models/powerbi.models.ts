export interface PowerBiEmbedConfig {
  tenantId: string;
  clientId: string;
  workspaceId: string;
  reportId: string;
  preferredReportName?: string;
  scopes: string[];
}

export interface PowerBiPageSegment {
  name: string;
  displayName: string;
  isActive: boolean;
}

export function isReportConfigured(config: PowerBiEmbedConfig | null | undefined): boolean {
  if (!config) return false;
  if (!config.reportId) return false;
  const trimmed = config.reportId.trim().toUpperCase();
  return trimmed !== 'PENDING' && trimmed !== '' && trimmed !== 'TODO';
}

export function mapReportPagesToSegments(
  pages: Array<{ name: string; displayName: string; isActive?: boolean; visibility?: number }>,
): PowerBiPageSegment[] {
  // Power BI visibility: 0 is visible, 1 is hidden
  return pages
    .filter((p) => p.visibility === undefined || p.visibility === 0)
    .map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      isActive: !!p.isActive,
    }));
}
