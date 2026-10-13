import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { PowerBiEmbedConfig } from '../models/powerbi.models';

export interface ReportEmbedDetails {
  id: string;
  name: string;
  embedUrl: string;
  datasetId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PowerBiAuthService {
  private readonly http = inject(HttpClient);
  private config$?: Observable<PowerBiEmbedConfig>;
  private msalInstance?: PublicClientApplication;
  private isInitialized = false;

  getConfig(): Observable<PowerBiEmbedConfig> {
    if (!this.config$) {
      this.config$ = this.http
        .get<PowerBiEmbedConfig>('assets/config/powerbi-embed.json')
        .pipe(shareReplay(1));
    }
    return this.config$;
  }

  async getMsalInstance(config: PowerBiEmbedConfig): Promise<PublicClientApplication> {
    if (this.msalInstance && this.isInitialized) {
      return this.msalInstance;
    }

    this.msalInstance = new PublicClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'localStorage',
      },
    });

    await this.msalInstance.initialize();
    this.isInitialized = true;
    return this.msalInstance;
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
        // Fall back to popup if silent acquisition fails
        console.warn('acquireTokenSilent failed, falling back to popup', err);
      }
    }

    try {
      const popupResult = await msal.acquireTokenPopup({
        scopes: config.scopes,
      });
      if (popupResult.account) {
        msal.setActiveAccount(popupResult.account);
      }
      return popupResult.accessToken;
    } catch (popupErr) {
      console.warn('acquireTokenPopup failed, falling back to redirect', popupErr);
      await msal.acquireTokenRedirect({
        scopes: config.scopes,
      });
      throw new Error('Redirecting to login...');
    }
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
}
