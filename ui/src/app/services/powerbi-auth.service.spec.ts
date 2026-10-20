import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  InteractionRequiredAuthError,
  PublicClientApplication,
} from '@azure/msal-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PowerBiEmbedConfig } from '../models/powerbi.models';
import { PowerBiAuthService } from './powerbi-auth.service';

const { msalMock } = vi.hoisted(() => ({
  msalMock: {
    initialize: vi.fn(),
    getActiveAccount: vi.fn(),
    getAllAccounts: vi.fn(),
    setActiveAccount: vi.fn(),
    acquireTokenSilent: vi.fn(),
    acquireTokenPopup: vi.fn(),
    logoutPopup: vi.fn(),
  },
}));

vi.mock('@azure/msal-browser', () => {
  class MockInteractionRequiredAuthError extends Error {}
  class MockBrowserAuthError extends Error {}
  return {
    InteractionRequiredAuthError: MockInteractionRequiredAuthError,
    BrowserAuthError: MockBrowserAuthError,
    PublicClientApplication: vi.fn(function PublicClientApplicationMock() {
      return msalMock;
    }),
  };
});

const CONFIG: PowerBiEmbedConfig = {
  tenantId: 'tenant-id',
  clientId: 'client-id',
  workspaceId: 'workspace-id',
  reportId: 'report-id',
  scopes: ['https://analysis.windows.net/powerbi/api/Report.Read.All'],
};

describe('PowerBiAuthService', () => {
  let service: PowerBiAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    msalMock.initialize.mockResolvedValue(undefined);
    msalMock.getActiveAccount.mockReturnValue(null);
    msalMock.getAllAccounts.mockReturnValue([]);
    msalMock.acquireTokenPopup.mockResolvedValue({
      accessToken: 'access-token',
      account: null,
    });

    TestBed.configureTestingModule({
      providers: [PowerBiAuthService, provideHttpClient()],
    });
    service = TestBed.inject(PowerBiAuthService);
  });

  it('shares MSAL initialization across concurrent callers', async () => {
    const [first, second] = await Promise.all([
      service.getMsalInstance(CONFIG),
      service.getMsalInstance(CONFIG),
    ]);

    expect(first).toBe(second);
    expect(PublicClientApplication).toHaveBeenCalledTimes(1);
    expect(msalMock.initialize).toHaveBeenCalledTimes(1);
  });

  it('shares an in-progress interactive token request', async () => {
    const tokens = await Promise.all([
      service.acquireAccessToken(CONFIG),
      service.acquireAccessToken(CONFIG),
    ]);

    expect(tokens).toEqual(['access-token', 'access-token']);
    expect(msalMock.acquireTokenPopup).toHaveBeenCalledTimes(1);
  });

  it('only falls back to a popup when silent acquisition requires interaction', async () => {
    const account = { username: 'user@example.com' };
    msalMock.getActiveAccount.mockReturnValue(account);
    msalMock.acquireTokenSilent.mockRejectedValue(
      new InteractionRequiredAuthError('interaction_required', 'Sign-in is required'),
    );

    await expect(service.acquireAccessToken(CONFIG)).resolves.toBe('access-token');
    expect(msalMock.acquireTokenPopup).toHaveBeenCalledTimes(1);
  });

  it('does not start another popup when silent acquisition fails for another reason', async () => {
    const account = { username: 'user@example.com' };
    const error = new Error('interaction_in_progress');
    msalMock.getActiveAccount.mockReturnValue(account);
    msalMock.acquireTokenSilent.mockRejectedValue(error);

    await expect(service.acquireAccessToken(CONFIG)).rejects.toBe(error);
    expect(msalMock.acquireTokenPopup).not.toHaveBeenCalled();
  });

  it('releases a failed token request so the user can retry', async () => {
    const error = new Error('Popup cancelled');
    msalMock.acquireTokenPopup.mockRejectedValueOnce(error);

    await expect(service.acquireAccessToken(CONFIG)).rejects.toBe(error);
    await expect(service.acquireAccessToken(CONFIG)).resolves.toBe('access-token');
    expect(msalMock.acquireTokenPopup).toHaveBeenCalledTimes(2);
  });

  it('retries initialization after failure', async () => {
    const error = new Error('Initialization failed');
    msalMock.initialize.mockRejectedValueOnce(error);

    await expect(service.getMsalInstance(CONFIG)).rejects.toBe(error);
    await service.getMsalInstance(CONFIG);
    expect(msalMock.initialize).toHaveBeenCalledTimes(2);
  });
});
