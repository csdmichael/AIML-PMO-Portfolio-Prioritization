import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PowerBiAuthService } from '../../services/powerbi-auth.service';
import { PortfolioStore } from '../../services/portfolio.store';
import { PowerBiPageComponent } from './powerbi.page';

const { embed, reset } = vi.hoisted(() => ({
  embed: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('powerbi-client', () => ({
  service: {
    Service: class {
      embed = embed;
      reset = reset;
    },
  },
  factories: {},
  models: {
    TokenType: { Aad: 0 },
    Permissions: { Read: 0 },
    BackgroundType: { Transparent: 1 },
  },
}));

const CONFIG = {
  tenantId: 'tenant',
  clientId: 'client',
  workspaceId: 'workspace',
  reportId: 'PENDING',
  preferredReportName: 'PMO Executive Dashboard',
  scopes: ['Report.Read.All'],
};
const REPORT = {
  id: 'report-id',
  name: 'PMO Executive Dashboard',
  embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=report-id',
};

describe('PowerBiPageComponent embedding', () => {
  const auth = {
    getConfig: vi.fn(),
    getActiveAccount: vi.fn(),
    acquireAccessToken: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    getWorkspaceReports: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    embed.mockReturnValue({ on: vi.fn() });
    auth.getConfig.mockReturnValue(of(CONFIG));
    auth.getActiveAccount.mockResolvedValue(null);
    auth.acquireAccessToken.mockResolvedValue('test-token');
    auth.signIn.mockResolvedValue('test-token');
    auth.signOut.mockResolvedValue(undefined);
    auth.getWorkspaceReports.mockResolvedValue([REPORT]);

    TestBed.configureTestingModule({
      imports: [PowerBiPageComponent],
      providers: [
        { provide: PowerBiAuthService, useValue: auth },
        { provide: PortfolioStore, useValue: {
          rawProjects: signal([]),
          portfolios: signal([]),
          businessUnits: signal([]),
        } },
      ],
    });
  });

  it('discovers a PENDING report before the embed view exists and embeds when opened', async () => {
    auth.getActiveAccount.mockResolvedValue({ username: 'user@example.com' });
    const fixture = TestBed.createComponent(PowerBiPageComponent);
    const page = fixture.componentInstance;
    page.config.set(CONFIG);
    await page.checkAuthAndEmbed();

    expect(page.embedReport()).toEqual(REPORT);
    expect(embed).not.toHaveBeenCalled();
    page.onViewModeChange(new CustomEvent('ionChange', { detail: { value: 'embed' } }));
    fixture.detectChanges();
    await vi.waitFor(() => expect(page.isBusy()).toBe(false));
    await fixture.whenStable();

    expect(embed).toHaveBeenCalled();
    expect(embed).toHaveBeenLastCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({ id: REPORT.id, accessToken: 'test-token' }),
    );
    expect(auth.getWorkspaceReports).toHaveBeenCalledTimes(2);
  });

  it('retry discovers reports again after initial discovery fails', async () => {
    auth.getWorkspaceReports.mockRejectedValueOnce(new Error('Reports unavailable'));
    const fixture = TestBed.createComponent(PowerBiPageComponent);
    const page = fixture.componentInstance;
    page.config.set(CONFIG);
    await page.onSignIn();
    expect(page.embedError()).toBe('Reports unavailable');
    expect(page.selectedReportId()).toBeNull();

    await page.onSignIn();

    expect(page.embedError()).toBeNull();
    expect(page.embedReport()).toEqual(REPORT);
    expect(auth.getWorkspaceReports).toHaveBeenCalledTimes(2);
  });

  it('blocks duplicate sign-in and sign-out while authentication is pending', async () => {
    let finishSignIn!: (token: string) => void;
    auth.signIn.mockReturnValueOnce(new Promise<string>((resolve) => {
      finishSignIn = resolve;
    }));
    const fixture = TestBed.createComponent(PowerBiPageComponent);
    const page = fixture.componentInstance;
    page.config.set(CONFIG);
    const pending = page.onSignIn();
    await page.onSignIn();
    await page.onSignOut();
    expect(auth.signIn).toHaveBeenCalledTimes(1);
    expect(auth.signOut).not.toHaveBeenCalled();
    finishSignIn('test-token');
    await pending;
    expect(page.isBusy()).toBe(false);
  });
});
