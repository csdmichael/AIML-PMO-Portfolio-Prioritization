import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonBadge,
} from '@ionic/angular';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { PowerBiAuthService, ReportEmbedDetails } from '../../services/powerbi-auth.service';
import {
  PowerBiEmbedConfig,
  isReportConfigured,
} from '../../models/powerbi.models';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { PortfolioStore } from '../../services/portfolio.store';
import { Project } from '../../models/portfolio.models';
import { PowerBiEmbedComponent } from '../../components/powerbi-embed/powerbi-embed.component';
import { businessText } from '../../core/problem-detail';
import { isScoredProject } from '../../core/portfolio-filter';

echarts.use([
  BarChart,
  PieChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-powerbi-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    IonBadge,
    NgxEchartsDirective,
    EmptyStateComponent,
    PowerBiEmbedComponent,
  ],
  providers: [provideEchartsCore({ echarts })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding powerbi-content">
      <!-- Page Top Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="pbi-title-row">
            <span class="pbi-badge-pill">
              <ion-icon name="analytics"></ion-icon>
              Portfolio Insights
            </span>
            <h2 class="page-title">Executive Portfolio Analytics</h2>
          </div>
          <p class="page-subtitle">
            Explore project investment, priority, confidence, and resource needs using saved database records.
          </p>
        </div>

        <div class="header-right">
          <ion-segment
            [value]="activeViewMode()"
            (ionChange)="onViewModeChange($event)"
            class="mode-switch-segment"
          >
            <ion-segment-button value="directlake">
              <ion-label>Portfolio Dashboard</ion-label>
            </ion-segment-button>
            <ion-segment-button value="embed">
              <ion-label>Published Reports</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>
      </div>

      <!-- VIEW 1: DIRECT LAKE INTERACTIVE DASHBOARD -->
      @if (activeViewMode() === 'directlake') {
        <ng-container *ngTemplateOutlet="directLakeTemplate"></ng-container>
      }

      <ng-template #directLakeTemplate>
        <!-- Direct Lake Sync Banner -->
        <div class="directlake-banner">
          <div class="sync-info">
            <span class="sync-dot"></span>
            <span class="sync-text">
              <strong>Portfolio Analysis</strong> • Saved database records • Last analysed {{ store.dataset()?.asOfDate }}
            </span>
          </div>

          <div class="slicers-bar">
            <div class="slicer-group">
              <label class="slicer-label">Portfolio:</label>
              <select class="slicer-select" [(ngModel)]="selectedPortfolio">
                <option value="All">All Portfolios ({{ store.portfolios().length }})</option>
                @for (p of store.portfolios(); track p) {
                  <option [value]="p">{{ p }}</option>
                }
              </select>
            </div>

            <div class="slicer-group">
              <label class="slicer-label">Tier:</label>
              <select class="slicer-select" [(ngModel)]="selectedTier">
                <option value="All">All Tiers (4)</option>
                <option value="Must-do-now">Must-do-now</option>
                <option value="Proceed">Proceed</option>
                <option value="Can wait">Can wait</option>
                <option value="Candidate to deprioritize">Deprioritize</option>
              </select>
            </div>

            <div class="slicer-group">
              <label class="slicer-label">Business Unit:</label>
              <select class="slicer-select" [(ngModel)]="selectedBu">
                <option value="All">All Business Units ({{ store.businessUnits().length }})</option>
                @for (bu of store.businessUnits(); track bu) {
                  <option [value]="bu">{{ bu }}</option>
                }
              </select>
            </div>
          </div>
        </div>

        <!-- 4 KPI Summary Tiles -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Capital Spend</div>
            <div class="kpi-value text-primary">\${{ (filteredCost() / 1000000).toFixed(1) }}M</div>
            <div class="kpi-sub">Across {{ filteredCount() }} filtered projects</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Must-Do-Now Spend</div>
            <div class="kpi-value text-mustdo">\${{ (mustDoCost() / 1000000).toFixed(1) }}M</div>
            <div class="kpi-sub">{{ mustDoCount() }} projects prioritized</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Average Priority Confidence</div>
            <div class="kpi-value text-success">{{ avgConfidence() }}%</div>
            <div class="kpi-sub">Based on completeness, quality, and prediction confidence</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-label">Critical Path Coupling (R5)</div>
            <div class="kpi-value text-warning">{{ r5Count() }} Projects</div>
            <div class="kpi-sub">&ge; 3 cross-portfolio links</div>
          </div>
        </div>

        <!-- Charts Grid (3 Power BI Visuals) -->
        <div class="pbi-visuals-grid">
          <!-- Visual 1: Prioritization Value vs Cost Matrix -->
          <div class="visual-card">
            <div class="visual-header">
              <span class="visual-title">Prioritization Matrix: Business Value vs Cost ($M)</span>
              <span class="visual-badge">Scatter Quadrant</span>
            </div>
            <div echarts [options]="scatterOption()" class="pbi-chart-box"></div>
          </div>

          <!-- Visual 2: Spend by Business Unit -->
          <div class="visual-card">
            <div class="visual-header">
              <span class="visual-title">Capital Allocation by Business Unit</span>
              <span class="visual-badge">Bar Chart</span>
            </div>
            <div echarts [options]="buBarOption()" class="pbi-chart-box"></div>
          </div>

          <!-- Visual 3: Tier Distribution -->
          <div class="visual-card">
            <div class="visual-header">
              <span class="visual-title">Priority Tier Breakdown</span>
              <span class="visual-badge">Donut</span>
            </div>
            <div echarts [options]="tierDonutOption()" class="pbi-chart-box"></div>
          </div>
        </div>

        <!-- Visual 4: High Impact Direct Lake Matrix Table -->
        <div class="matrix-card">
          <div class="matrix-header">
            <span class="matrix-title">Project Portfolio Summary (Top 10 Ranked)</span>
            <span class="matrix-counter">Showing 10 of {{ filteredCount() }} projects</span>
          </div>

          <div class="matrix-table-wrap">
            <table class="pbi-matrix-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>ID</th>
                  <th>Project Name</th>
                  <th>Portfolio</th>
                  <th>Business Unit</th>
                  <th>Tier</th>
                  <th>Priority</th>
                  <th>Value</th>
                  <th>Cost ($M)</th>
                  <th>Confidence</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (p of topRankedProjects(); track p.projectId; let idx = $index) {
                  <tr>
                    <td class="rank-col">#{{ idx + 1 }}</td>
                    <td class="id-col">
                      <a [href]="'#/projects/' + p.projectId" class="p-link">{{ p.projectId }}</a>
                    </td>
                    <td class="name-col" [title]="p.projectName">{{ p.projectName }}</td>
                    <td>{{ p.portfolio }}</td>
                    <td>{{ p.businessUnit }}</td>
                    <td>
                      <span class="tier-pill" [class]="p.finalTier.toLowerCase().replace(' ', '-')">
                        {{ p.finalTier }}
                      </span>
                    </td>
                    <td class="num-col">
                      <div class="bar-num-cell">
                        <span>{{ p.priorityScore.toFixed(1) }}</span>
                        <div class="mini-bar-track">
                          <div class="mini-bar-fill" [style.width.%]="p.priorityScore"></div>
                        </div>
                      </div>
                    </td>
                    <td class="num-col">{{ p.businessValue }}/5</td>
                    <td class="num-col">\${{ (p.costEstimateUsd / 1000000).toFixed(2) }}M</td>
                    <td class="num-col">
                      <span class="conf-pill" [class]="p.confidenceLevel.toLowerCase()">
                        {{ p.confidenceScore.toFixed(0) }}%
                      </span>
                    </td>
                    <td>
                      <span class="action-text">{{ p.recommendedAction }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </ng-template>

      <!-- VIEW 2: LIVE FABRIC EMBED / MSAL SETTINGS -->
      @if (activeViewMode() === 'embed') {
        <!-- Auth Bar -->
        <div class="auth-bar">
          @if (isSignedIn()) {
            <span class="auth-status">
              <ion-icon name="checkmark-circle" class="signed-in-icon"></ion-icon>
              Signed in as {{ userEmail() }}
            </span>
            @if (availableReports().length > 1) {
              <label class="report-picker">
                <span>Report</span>
                <select [disabled]="isBusy()" [ngModel]="selectedReportId()" (ngModelChange)="onReportChange($event)">
                  @for (report of availableReports(); track report.id) {
                    <option [value]="report.id">{{ report.name }}</option>
                  }
                </select>
              </label>
            }
            <ion-button size="small" fill="outline" color="medium" [disabled]="isBusy()" (click)="onSignOut()">
              Sign out
            </ion-button>
          } @else {
            <ion-button size="small" color="primary" [disabled]="isBusy()" (click)="onSignIn()">
              <ion-icon name="log-in-outline" slot="start"></ion-icon>
              Sign in to view reports
            </ion-button>
          }

          @if (openInPowerBiUrl()) {
            <a [href]="openInPowerBiUrl()" target="_blank" rel="noopener" class="open-pbi-btn">
              <ion-icon name="open-outline"></ion-icon>
              Open Report in New Window
            </a>
          }
        </div>

        @if (embedReport(); as report) {
          <div class="report-embed-card">
            <app-powerbi-embed
              [report]="report"
              [accessToken]="embedAccessToken()"
              (embedError)="embedError.set($event)"
            />
          </div>
        } @else {
          <div class="directlake-notice-strip">
            <ion-icon name="analytics"></ion-icon>
            <div>
              <strong>Portfolio dashboard available:</strong>
              Review saved project analysis from the database below.
              Sign in above to view reports published by your reporting team.
            </div>
          </div>

          <ng-container *ngTemplateOutlet="directLakeTemplate"></ng-container>
        }
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
        margin-bottom: 14px;
      }
      .pbi-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .pbi-badge-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: #f2c811;
        color: #212121;
        font-size: 0.72rem;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
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
        margin: 4px 0 0 0;
      }
      .mode-switch-segment {
        background: #ffffff;
        border: 1px solid #d0d7de;
        border-radius: 8px;
        max-width: 320px;
      }

      /* Direct Lake Sync Banner */
      .directlake-banner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        padding: 10px 16px;
        background: #ffffff;
        border: 1px solid #e1dfdd;
        border-left: 4px solid #107c10;
        border-radius: 8px;
        margin-bottom: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }
      .sync-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .sync-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #107c10;
        box-shadow: 0 0 8px #107c10;
      }
      .sync-text {
        font-size: 0.82rem;
        color: #323130;
      }
      .slicers-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .slicer-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .slicer-label {
        font-size: 0.78rem;
        font-weight: 600;
        color: #605e5c;
      }
      .slicer-select {
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid #d0d7de;
        background: #f8f9fa;
        font-size: 0.8rem;
        color: #242424;
        cursor: pointer;
      }

      /* KPI Grid */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 14px;
        margin-bottom: 16px;
      }
      .kpi-card {
        background: #ffffff;
        border: 1px solid #edebe9;
        border-radius: 10px;
        padding: 14px 16px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .kpi-label {
        font-size: 0.76rem;
        font-weight: 600;
        color: #605e5c;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .kpi-value {
        font-size: 1.6rem;
        font-weight: 800;
        line-height: 1.15;
      }
      .kpi-sub {
        font-size: 0.72rem;
        color: #8a8886;
      }
      .text-primary { color: #0078d4; }
      .text-mustdo { color: #d13438; }
      .text-success { color: #107c10; }
      .text-warning { color: #c19c00; }

      /* Visuals Grid */
      .pbi-visuals-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }
      .visual-card {
        background: #ffffff;
        border: 1px solid #edebe9;
        border-radius: 10px;
        padding: 14px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        display: flex;
        flex-direction: column;
      }
      .visual-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid #f3f2f1;
      }
      .visual-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: #323130;
      }
      .visual-badge {
        font-size: 0.68rem;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        background: #eff6fc;
        color: #0078d4;
      }
      .pbi-chart-box {
        width: 100%;
        height: 250px;
      }

      /* Matrix Table */
      .matrix-card {
        background: #ffffff;
        border: 1px solid #edebe9;
        border-radius: 10px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        overflow: hidden;
        margin-bottom: 24px;
      }
      .matrix-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #faf9f8;
        border-bottom: 1px solid #edebe9;
      }
      .matrix-title {
        font-size: 0.88rem;
        font-weight: 700;
        color: #323130;
      }
      .matrix-counter {
        font-size: 0.75rem;
        color: #605e5c;
      }
      .matrix-table-wrap {
        overflow-x: auto;
      }
      .pbi-matrix-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;
      }
      .pbi-matrix-table th {
        background: #f3f2f1;
        padding: 9px 12px;
        text-align: left;
        font-weight: 700;
        color: #323130;
        border-bottom: 1px solid #e1dfdd;
        white-space: nowrap;
      }
      .pbi-matrix-table td {
        padding: 8px 12px;
        border-bottom: 1px solid #f3f2f1;
        color: #242424;
        white-space: nowrap;
      }
      .pbi-matrix-table tr:hover td {
        background: #f4f8fc;
      }
      .rank-col {
        font-weight: 700;
        color: #605e5c;
      }
      .id-col {
        font-weight: 700;
      }
      .p-link {
        color: #0078d4;
        text-decoration: none;
      }
      .p-link:hover {
        text-decoration: underline;
      }
      .name-col {
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
      }
      .num-col {
        text-align: right;
      }
      .bar-num-cell {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
      }
      .mini-bar-track {
        width: 48px;
        height: 6px;
        background: #edebe9;
        border-radius: 3px;
        overflow: hidden;
      }
      .mini-bar-fill {
        height: 100%;
        background: #0078d4;
        border-radius: 3px;
      }
      .tier-pill {
        font-size: 0.7rem;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 4px;
        text-transform: capitalize;
      }
      .tier-pill.must-do-now { background: #fed9cc; color: #a80000; }
      .tier-pill.proceed { background: #dff6dd; color: #107c10; }
      .tier-pill.can-wait { background: #fff4ce; color: #795e00; }
      .tier-pill.candidate-to-deprioritize { background: #edebe9; color: #605e5c; }

      .conf-pill {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .conf-pill.high { background: #dff6dd; color: #107c10; }
      .conf-pill.medium { background: #fff4ce; color: #795e00; }
      .conf-pill.low { background: #fed9cc; color: #a80000; }

      .action-text {
        font-size: 0.75rem;
        color: #605e5c;
        font-style: italic;
      }

      /* Embed Mode Styles */
      .auth-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .auth-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.82rem;
        color: #444444;
      }
      .report-picker {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.78rem;
        font-weight: 600;
      }
      .report-picker select {
        min-width: 210px;
        max-width: 320px;
        padding: 6px 28px 6px 8px;
        border: 1px solid var(--pmo-border, #d0d0d0);
        border-radius: 4px;
        background: #ffffff;
      }
      .signed-in-icon {
        color: #107c10;
        font-size: 16px;
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
      .directlake-notice-strip {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
        padding: 12px 18px;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.45;
        margin-bottom: 20px;
      }
      .directlake-notice-strip ion-icon {
        font-size: 22px;
        flex-shrink: 0;
        margin-top: 1px;
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
      .embed-actions-row {
        display: flex;
        gap: 12px;
        margin-top: 14px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .report-embed-card {
        border-radius: 8px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      }
    `,
  ],
})
export class PowerBiPageComponent implements OnInit {
  readonly store = inject(PortfolioStore);
  private readonly auth = inject(PowerBiAuthService);

  readonly activeViewMode = signal<'directlake' | 'embed'>('directlake');
  readonly config = signal<PowerBiEmbedConfig | null>(null);
  readonly isConfigured = signal<boolean>(false);
  readonly isSignedIn = signal<boolean>(false);
  readonly userEmail = signal<string>('');
  readonly isBusy = signal(false);
  readonly embedReport = signal<ReportEmbedDetails | null>(null);
  readonly embedAccessToken = signal<string | null>(null);
  readonly embedError = signal<string | null>(null);
  readonly availableReports = signal<ReportEmbedDetails[]>([]);
  readonly selectedReportId = signal<string | null>(null);

  // Slicers
  selectedPortfolio = 'All';
  selectedTier = 'All';
  selectedBu = 'All';

  // Filtered dataset for Direct Lake
  readonly filteredProjects = computed<Project[]>(() => {
    let projs = this.store.rawProjects();
    if (this.selectedPortfolio !== 'All') {
      projs = projs.filter((p) => p.portfolio === this.selectedPortfolio);
    }
    if (this.selectedTier !== 'All') {
      projs = projs.filter((p) => p.finalTier === this.selectedTier);
    }
    if (this.selectedBu !== 'All') {
      projs = projs.filter((p) => p.businessUnit === this.selectedBu);
    }
    return projs;
  });

  readonly filteredCount = computed(() => this.filteredProjects().length);
  readonly filteredCost = computed(() =>
    this.filteredProjects().reduce((s, p) => s + p.costEstimateUsd, 0),
  );
  readonly mustDoProjects = computed(() =>
    this.filteredProjects().filter((p) => p.finalTier === 'Must-do-now'),
  );
  readonly mustDoCount = computed(() => this.mustDoProjects().length);
  readonly mustDoCost = computed(() =>
    this.mustDoProjects().reduce((s, p) => s + p.costEstimateUsd, 0),
  );
  readonly avgConfidence = computed(() => {
    const list = this.filteredProjects();
    if (list.length === 0) return 0;
    return Math.round((list.reduce((s, p) => s + p.confidenceScore, 0) / list.length) * 10) / 10;
  });
  readonly r5Count = computed(
    () => this.filteredProjects().filter((p) => p.dependencyCount >= 3).length,
  );

  readonly topRankedProjects = computed(() => {
    return this.filteredProjects().filter(isScoredProject)
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 10);
  });

  // Visual 1: Scatter plot option
  readonly scatterOption = computed(() => {
    const projs = this.filteredProjects().filter(isScoredProject);
    const data = projs.map((p) => [
      p.businessValue,
      Math.round((p.costEstimateUsd / 1000000) * 10) / 10,
      p.priorityScore,
      p.projectName,
      p.projectId,
      p.finalTier,
    ]);

    return {
      tooltip: {
        formatter: (params: { data: (string | number)[] }) => {
          const d = params.data;
          return `<strong>${d[4]}: ${d[3]}</strong><br/>Value: ${d[0]} / 5<br/>Cost: $${d[1]}M<br/>Priority: ${d[2]}<br/>Tier: ${d[5]}`;
        },
      },
      grid: { left: '12%', right: '8%', bottom: '15%', top: '10%' },
      xAxis: {
        type: 'value',
        name: 'Value (1-5)',
        min: 1,
        max: 5,
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: 'Cost ($M)',
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      series: [
        {
          name: 'Projects',
          type: 'scatter',
          symbolSize: (data: number[]) => Math.max(10, Math.min(28, data[2] / 3.5)),
          itemStyle: {
            color: (params: { data: (string | number)[] }) => {
              const tier = params.data[5];
              if (tier === 'Must-do-now') return '#D13438';
              if (tier === 'Proceed') return '#107C10';
              if (tier === 'Can wait') return '#C19C00';
              return '#737373';
            },
            opacity: 0.85,
          },
          data,
        },
      ],
    };
  });

  // Visual 2: Spend by BU bar chart
  readonly buBarOption = computed(() => {
    const projs = this.filteredProjects();
    const buMap = new Map<string, number>();
    for (const p of projs) {
      buMap.set(p.businessUnit, (buMap.get(p.businessUnit) || 0) + p.costEstimateUsd);
    }
    const sorted = Array.from(buMap.entries())
      .map(([k, v]) => ({ name: k.slice(0, 18), val: Math.round((v / 1000000) * 10) / 10 }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 6);

    return {
      tooltip: { trigger: 'axis', formatter: '{b}: ${c}M' },
      grid: { left: '26%', right: '8%', bottom: '12%', top: '8%' },
      xAxis: { type: 'value', name: '$M' },
      yAxis: { type: 'category', data: sorted.map((s) => s.name).reverse() },
      color: ['#0078D4'],
      series: [
        {
          type: 'bar',
          data: sorted.map((s) => s.val).reverse(),
          itemStyle: { borderRadius: [0, 4, 4, 0] },
        },
      ],
    };
  });

  // Visual 3: Tier Donut
  readonly tierDonutOption = computed(() => {
    const projs = this.filteredProjects();
    const must = projs.filter((p) => p.finalTier === 'Must-do-now').length;
    const proceed = projs.filter((p) => p.finalTier === 'Proceed').length;
    const wait = projs.filter((p) => p.finalTier === 'Can wait').length;
    const dep = projs.filter((p) => p.finalTier === 'Candidate to deprioritize').length;

    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { fontSize: 10 } },
      color: ['#D13438', '#107C10', '#C19C00', '#737373'],
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          data: [
            { name: 'Must-do-now', value: must },
            { name: 'Proceed', value: proceed },
            { name: 'Can wait', value: wait },
            { name: 'Deprioritize', value: dep },
          ],
        },
      ],
    };
  });

  ngOnInit(): void {
    this.auth.getConfig().subscribe({
      next: (cfg) => {
        this.config.set(cfg);
        const configured = isReportConfigured(cfg);
        this.isConfigured.set(configured);
        if (configured) {
          this.selectedReportId.set(cfg.reportId);
        }
        this.checkAuthAndEmbed();
      },
      error: (error: unknown) => {
        this.embedError.set(
          businessText(error instanceof Error ? error.message : 'Unable to load reporting settings.'),
        );
      },
    });
  }

  onViewModeChange(event: CustomEvent): void {
    const val = event.detail.value as 'directlake' | 'embed';
    this.activeViewMode.set(val);
    if (val === 'embed') {
      this.checkAuthAndEmbed();
    }
  }

  openInPowerBiUrl(): string | null {
    const cfg = this.config();
    const reportId = this.selectedReportId();
    if (!cfg || !reportId) return null;
    return `https://app.powerbi.com/groups/${cfg.workspaceId}/reports/${reportId}`;
  }

  async checkAuthAndEmbed(): Promise<void> {
    const cfg = this.config();
    if (!cfg || this.isBusy()) return;

    this.isBusy.set(true);
    try {
      this.embedError.set(null);
      const account = await this.auth.getActiveAccount(cfg);
      if (account) {
        this.isSignedIn.set(true);
        this.userEmail.set(account.username);
        const token = await this.auth.acquireAccessToken(cfg);
        await this.discoverReportsAndEmbed(token);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      this.embedError.set(businessText(error.message ?? 'Unable to restore your report sign-in.'));
    } finally {
      this.isBusy.set(false);
    }
  }

  async onSignIn(): Promise<void> {
    const cfg = this.config();
    if (!cfg || this.isBusy()) return;

    this.isBusy.set(true);
    try {
      this.embedError.set(null);
      const token = await this.auth.signIn(cfg);
      const account = await this.auth.getActiveAccount(cfg);
      if (account) {
        this.isSignedIn.set(true);
        this.userEmail.set(account.username);
      }
      await this.discoverReportsAndEmbed(token);
    } catch (err: unknown) {
      const e = err as { message?: string };
      this.embedError.set(businessText(e?.message ?? 'Sign-in failed'));
    } finally {
      this.isBusy.set(false);
    }
  }

  async onSignOut(): Promise<void> {
    const cfg = this.config();
    if (!cfg || this.isBusy()) return;
    this.isBusy.set(true);
    try {
      await this.auth.signOut(cfg);
      this.isSignedIn.set(false);
      this.userEmail.set('');
      this.availableReports.set([]);
      this.embedReport.set(null);
      this.embedAccessToken.set(null);
      this.embedError.set(null);
    } catch (error: unknown) {
      this.embedError.set(businessText(error instanceof Error ? error.message : 'Sign-out failed'));
    } finally {
      this.isBusy.set(false);
    }
  }

  async onReportChange(reportId: string): Promise<void> {
    if (this.isBusy()) return;
    this.isBusy.set(true);
    try {
      this.selectedReportId.set(reportId);
      this.isConfigured.set(true);
      await this.loadAndEmbed();
    } finally {
      this.isBusy.set(false);
    }
  }

  async loadAndEmbed(accessToken?: string): Promise<void> {
    const cfg = this.config();
    const reportId = this.selectedReportId();
    if (!cfg || !reportId) return;

    try {
      this.embedError.set(null);
      const token = accessToken ?? await this.auth.acquireAccessToken(cfg);
      const knownReport = this.availableReports().find((report) => report.id === reportId);
      const report = knownReport ?? await this.auth.getReportEmbedDetails(cfg.workspaceId, reportId, token);
      this.embedAccessToken.set(token);
      this.embedReport.set({ ...report });
    } catch (err: unknown) {
      const e = err as { message?: string };
      this.embedError.set(businessText(e?.message ?? 'The selected report could not be displayed.'));
    }
  }

  private async discoverReportsAndEmbed(accessToken: string): Promise<void> {
    const cfg = this.config();
    if (!cfg) return;

    try {
      const reports = await this.auth.getWorkspaceReports(cfg.workspaceId, accessToken);
      this.availableReports.set(reports);

      const configuredId = isReportConfigured(cfg) ? cfg.reportId : null;
      const preferredName = cfg.preferredReportName?.trim().toLocaleLowerCase();
      const selected =
        reports.find((report) => report.id === configuredId) ??
        reports.find((report) => report.name.trim().toLocaleLowerCase() === preferredName) ??
        reports[0];

      if (!selected) {
        this.isConfigured.set(false);
        this.embedError.set(
          'No reports have been published for this portfolio yet. Ask your reporting team to publish a report, or use the Portfolio Dashboard to review saved project analysis.',
        );
        return;
      }

      this.selectedReportId.set(selected.id);
      this.isConfigured.set(true);
      await this.loadAndEmbed(accessToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401')) {
        this.embedError.set(
          `Your account (${this.userEmail() || 'current account'}) does not have permission to view the published reports. Contact your reporting team for access, or use the Portfolio Dashboard.`,
        );
      } else {
        this.embedError.set(businessText(msg));
      }
    }
  }
}
