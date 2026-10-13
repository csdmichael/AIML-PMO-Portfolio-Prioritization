import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/angular';
import { PowerBiAuthService } from '../../services/powerbi-auth.service';
import { PowerBiEmbedConfig, isReportConfigured, PowerBiPageSegment } from '../../models/powerbi.models';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import * as pbi from 'powerbi-client';

@Component({
  selector: 'app-powerbi-page',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding powerbi-content">
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">Power BI Portfolio Analytics</h2>
          <p class="page-subtitle">Interactive Power BI reports embedded via Microsoft Authentication Library (MSAL).</p>
        </div>
        <div class="header-right">
          @if (openInPowerBiUrl()) {
            <a [href]="openInPowerBiUrl()" target="_blank" rel="noopener" class="open-pbi-btn">
              <ion-icon name="open-outline"></ion-icon>
              Open in Power BI
            </a>
          }
        </div>
      </div>

      <!-- Auth Controls -->
      <div class="auth-bar">
        @if (isSignedIn()) {
          <span class="auth-status">
            <ion-icon name="checkmark-circle" class="signed-in-icon"></ion-icon>
            Signed in as {{ userEmail() }}
          </span>
          <ion-button size="small" fill="outline" color="medium" (click)="onSignOut()">
            Sign out
          </ion-button>
        } @else {
          <ion-button size="small" color="primary" (click)="onSignIn()">
            <ion-icon name="log-in-outline" slot="start"></ion-icon>
            Sign in to Power BI
          </ion-button>
        }
      </div>

      <!-- PENDING OR UNCONFIGURED STATE -->
      @if (!isConfigured()) {
        <app-empty-state
          title="Power BI report not configured yet"
          message="The Power BI report has not been published or linked to this workspace."
          icon="analytics-outline"
        >
          <div class="setup-steps">
            <h4>Setup Steps:</h4>
            <ol>
              <li>Open Fabric workspace <code>PMO-Portfolio-Prioritization</code>.</li>
              <li>Publish the <code>PMO Portfolio Prioritization</code> report from Git or Power BI Desktop.</li>
              <li>Copy the report GUID and update <code>reportId</code> in <code>ui/src/assets/config/powerbi-embed.json</code>.</li>
              <li>Run deployment or refresh the page to embed the interactive analytics.</li>
            </ol>
          </div>
        </app-empty-state>
      } @else {
        <!-- Page Navigation Segments -->
        @if (reportPages().length > 1) {
          <ion-segment
            [value]="activePageName()"
            (ionChange)="onPageSegmentChange($event)"
            [scrollable]="true"
            class="pbi-page-segment"
          >
            @for (pg of reportPages(); track pg.name) {
              <ion-segment-button [value]="pg.name">
                <ion-label>{{ pg.displayName }}</ion-label>
              </ion-segment-button>
            }
          </ion-segment>
        }

        @if (embedError()) {
          <app-empty-state
            title="Embed Error"
            [message]="embedError()!"
            [isError]="true"
            icon="alert-circle-outline"
          >
            <ion-button (click)="loadAndEmbed()">Retry Embed</ion-button>
          </app-empty-state>
        }

        <!-- Report Container -->
        <div class="report-embed-card" [class.hidden]="!isEmbedded()">
          <div #embedContainer class="pbi-container"></div>
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .powerbi-content {
        --background: var(--pmo-bg, #f4f6f8);
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 12px;
      }
      .page-title {
        font-size: 1.35rem;
        font-weight: 700;
        margin: 0;
        color: var(--pmo-text, #1a1a1a);
      }
      .page-subtitle {
        font-size: 0.85rem;
        color: var(--pmo-muted, #666666);
        margin: 2px 0 0 0;
      }
      .open-pbi-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--pmo-primary, #0078d4);
        text-decoration: none;
        border: 1px solid var(--pmo-primary, #0078d4);
        padding: 5px 12px;
        border-radius: 6px;
        background: #ffffff;
      }
      .auth-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      .auth-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.82rem;
        color: #444444;
      }
      .signed-in-icon {
        color: #107c10;
        font-size: 16px;
      }
      .setup-steps {
        text-align: left;
        margin-top: 14px;
        padding: 12px 18px;
        background: #f8f9fb;
        border-radius: 6px;
        border: 1px solid #e0e0e0;
      }
      .setup-steps h4 {
        margin: 0 0 8px 0;
        font-size: 0.88rem;
        color: var(--pmo-text, #1a1a1a);
      }
      .setup-steps ol {
        margin: 0;
        padding-left: 20px;
        font-size: 0.8rem;
        color: #555555;
        line-height: 1.5;
      }
      .pbi-page-segment {
        margin-bottom: 12px;
        background: #ffffff;
        border-radius: 6px;
        border: 1px solid var(--pmo-border, #e0e0e0);
      }
      .report-embed-card {
        border-radius: 8px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      }
      .report-embed-card.hidden {
        display: none;
      }
      .pbi-container {
        width: 100%;
        height: calc(100vh - 240px);
        min-height: 560px;
      }
    `,
  ],
})
export class PowerBiPageComponent implements OnInit, OnDestroy {
  private readonly auth = inject(PowerBiAuthService);
  private powerBiService = new pbi.service.Service(
    pbi.factories.hpmFactory,
    pbi.factories.wpmpFactory,
    pbi.factories.routerFactory,
  );

  readonly embedContainer = viewChild<ElementRef<HTMLDivElement>>('embedContainer');

  readonly config = signal<PowerBiEmbedConfig | null>(null);
  readonly isConfigured = signal<boolean>(false);
  readonly isSignedIn = signal<boolean>(false);
  readonly userEmail = signal<string>('');
  readonly isEmbedded = signal<boolean>(false);
  readonly embedError = signal<string | null>(null);

  readonly reportPages = signal<PowerBiPageSegment[]>([]);
  readonly activePageName = signal<string>('');
  private currentReport?: pbi.Report;

  ngOnInit(): void {
    this.auth.getConfig().subscribe({
      next: (cfg) => {
        this.config.set(cfg);
        const configured = isReportConfigured(cfg);
        this.isConfigured.set(configured);
        if (configured) {
          this.checkAuthAndEmbed();
        }
      },
    });
  }

  ngOnDestroy(): void {
    const el = this.embedContainer()?.nativeElement;
    if (el) {
      this.powerBiService.reset(el);
    }
  }

  openInPowerBiUrl(): string | null {
    const cfg = this.config();
    if (!cfg || !this.isConfigured()) return null;
    return `https://app.powerbi.com/groups/${cfg.workspaceId}/reports/${cfg.reportId}`;
  }

  async checkAuthAndEmbed(): Promise<void> {
    const cfg = this.config();
    if (!cfg) return;

    try {
      const account = await this.auth.getActiveAccount(cfg);
      if (account) {
        this.isSignedIn.set(true);
        this.userEmail.set(account.username);
        await this.loadAndEmbed();
      }
    } catch {
      // Not signed in yet
      this.isSignedIn.set(false);
    }
  }

  async onSignIn(): Promise<void> {
    const cfg = this.config();
    if (!cfg) return;

    try {
      await this.auth.signIn(cfg);
      const account = await this.auth.getActiveAccount(cfg);
      if (account) {
        this.isSignedIn.set(true);
        this.userEmail.set(account.username);
      }
      await this.loadAndEmbed();
    } catch (err: unknown) {
      const e = err as { message?: string };
      this.embedError.set(e?.message ?? 'Sign-in failed');
    }
  }

  async onSignOut(): Promise<void> {
    const cfg = this.config();
    if (!cfg) return;
    await this.auth.signOut(cfg);
    this.isSignedIn.set(false);
    this.userEmail.set('');
    const el = this.embedContainer()?.nativeElement;
    if (el) this.powerBiService.reset(el);
    this.isEmbedded.set(false);
  }

  async loadAndEmbed(): Promise<void> {
    const cfg = this.config();
    const el = this.embedContainer()?.nativeElement;
    if (!cfg || !el || !this.isConfigured()) return;

    this.embedError.set(null);

    try {
      const token = await this.auth.acquireAccessToken(cfg);
      const details = await this.auth.getReportEmbedDetails(cfg.workspaceId, cfg.reportId, token);

      const embedConfig: pbi.models.IReportEmbedConfiguration = {
        type: 'report',
        id: cfg.reportId,
        embedUrl: details.embedUrl,
        accessToken: token,
        tokenType: pbi.models.TokenType.Aad,
        settings: {
          panes: {
            filters: { visible: false },
            pageNavigation: { visible: false },
          },
          background: pbi.models.BackgroundType.Transparent,
          layoutType: pbi.models.LayoutType.Custom,
          customLayout: {
            displayOption: pbi.models.DisplayOption.FitToWidth,
          },
        },
      };

      this.powerBiService.reset(el);
      const report = this.powerBiService.embed(el, embedConfig) as pbi.Report;
      this.currentReport = report;

      report.on('loaded', async () => {
        this.isEmbedded.set(true);
        const pages = await report.getPages();
        const validPages = pages
          .filter((p) => p.visibility === undefined || p.visibility === 0)
          .map((p) => ({
            name: p.name,
            displayName: p.displayName || p.name,
            isActive: !!p.isActive,
          }));
        this.reportPages.set(validPages);
        const active = validPages.find((p) => p.isActive) || validPages[0];
        if (active) this.activePageName.set(active.name);
      });

      report.on('pageChanged', (event: unknown) => {
        const ev = event as { detail?: { newPage?: { name: string } } };
        if (ev.detail?.newPage?.name) {
          this.activePageName.set(ev.detail.newPage.name);
        }
      });

      report.on('error', (event: unknown) => {
        const ev = event as { detail?: { message?: string } };
        this.embedError.set(ev.detail?.message ?? 'Power BI Embed error');
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      this.embedError.set(e?.message ?? 'Failed to embed report');
    }
  }

  onPageSegmentChange(event: CustomEvent): void {
    const pageName = event.detail.value;
    if (this.currentReport && pageName) {
      this.currentReport.setPage(pageName);
      this.activePageName.set(pageName);
    }
  }
}
