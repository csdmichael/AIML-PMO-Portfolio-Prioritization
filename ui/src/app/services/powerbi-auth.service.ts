import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import {
  AccountInfo,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from '@azure/msal-browser';
import { PowerBiEmbedConfig } from '../models/powerbi.models';

export interface ReportEmbedDetails {
  id: string;
  name: string;
  embedUrl: string;
  datasetId?: string;
}

interface ReportsResponse {
  value: ReportEmbedDetails[];
}

@Injectable({
  providedIn: 'root',
})
export class PowerBiAuthService {
  private readonly http = inject(HttpClient);
  private config$?: Observable<PowerBiEmbedConfig>;
  private msalInitialization?: Promise<PublicClientApplication>;
  private tokenRequest?: Promise<string>;

  getConfig(): Observable<PowerBiEmbedConfig> {
    if (!this.config$) {
      this.config$ = this.http
        .get<PowerBiEmbedConfig>('assets/config/powerbi-embed.json')
        .pipe(shareReplay(1));
    }
    return this.config$;
  }

  async getMsalInstance(config: PowerBiEmbedConfig): Promise<PublicClientApplication> {
    if (!this.msalInitialization) {
      const msal = new PublicClientApplication({
        auth: {
          clientId: config.clientId,
          authority: `https://login.microsoftonline.com/${config.tenantId}`,
          redirectUri: `${window.location.origin}/assets/auth-callback.html`,
        },
        cache: {
          cacheLocation: 'localStorage',
        },
      });
      this.msalInitialization = msal
        .initialize()
        .then(() => msal)
        .catch((error: unknown) => {
          this.msalInitialization = undefined;
          throw error;
        });
    }

    return this.msalInitialization;
  }

  async getActiveAccount(config: PowerBiEmbedConfig): Promise<AccountInfo | null> {
    const msal = await this.getMsalInstance(config);
    const current = msal.getActiveAccount();
    if (current) return current;
    const accounts = msal.getAllAccounts();
    if (accounts.length > 0) {
      msal.setActiveAccount(accounts[0]);
      return accounts[0];
    }
    return null;
  }

  async acquireAccessToken(config: PowerBiEmbedConfig): Promise<string> {
    if (this.tokenRequest) {
      return this.tokenRequest;
    }

    const request = this.acquireAccessTokenOnce(config);
    this.tokenRequest = request;
    try {
      return await request;
    } finally {
      if (this.tokenRequest === request) {
        this.tokenRequest = undefined;
      }
    }
  }

  private async acquireAccessTokenOnce(config: PowerBiEmbedConfig): Promise<string> {
    const msal = await this.getMsalInstance(config);
    const account = await this.getActiveAccount(config);

    if (account) {
      try {
        const silentResult = await msal.acquireTokenSilent({
          account,
          scopes: config.scopes,
        });
        return silentResult.accessToken;
      } catch (err) {
        if (!(err instanceof InteractionRequiredAuthError)) {
          throw err;
        }
      }
    }

    const popupResult = await msal.acquireTokenPopup({
      scopes: config.scopes,
      redirectUri: `${window.location.origin}/assets/auth-callback.html`,
    });
    if (popupResult.account) {
      msal.setActiveAccount(popupResult.account);
    }
    return popupResult.accessToken;
  }

  async signIn(config: PowerBiEmbedConfig): Promise<string> {
    return this.acquireAccessToken(config);
  }

  async signOut(config: PowerBiEmbedConfig): Promise<void> {
    const msal = await this.getMsalInstance(config);
    const account = await this.getActiveAccount(config);
    if (account) {
      await msal.logoutPopup({ account });
    }
  }

  async getReportEmbedDetails(
    workspaceId: string,
    reportId: string,
    accessToken: string,
  ): Promise<ReportEmbedDetails> {
    const url = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch report embed URL: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as ReportEmbedDetails;
  }

  async getWorkspaceReports(workspaceId: string, accessToken: string): Promise<ReportEmbedDetails[]> {
    const url = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list workspace reports: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as ReportsResponse;
    return result.value ?? [];
  }
}
