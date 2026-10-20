import { Component, ChangeDetectionStrategy, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonButton,
  IonIcon,
  IonTextarea,
  IonNote,
} from '@ionic/angular';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { PortfolioStore } from '../../services/portfolio.store';
import { DataApiService } from '../../services/data-api.service';
import { ConfidenceRingComponent } from '../confidence-ring/confidence-ring.component';
import { Project, DecisionAction, LocalDecision } from '../../models/portfolio.models';
import { EditProjectModalComponent } from '../edit-project-modal/edit-project-modal.component';
import { ConfigService } from '../../services/config.service';
import { problemMessage } from '../../core/problem-detail';
import { Observable } from 'rxjs';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

@Component({
  selector: 'app-detail-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonButton,
    IonIcon,
    IonTextarea,
    IonNote,
    ConfidenceRingComponent,
    NgxEchartsDirective,
    EditProjectModalComponent,
  ],
  providers: [provideEchartsCore({ echarts })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.selectedProject(); as p) {
      <div class="detail-container" role="region" [attr.aria-label]="'Detail for ' + p.projectId">
        <ion-card class="detail-card">
          <ion-card-header>
            <div class="header-top-row">
              <div>
                <span class="project-id-badge">{{ p.projectId }}</span>
                <span class="status-badge" [class]="p.projectStatus.toLowerCase()">{{ p.projectStatus }}</span>
                @if (store.isPinned(p.projectId)) {
                  <span class="pinned-indicator">&#9733; Shortlisted</span>
                }
              </div>
              <ion-button
                size="small"
                fill="clear"
                (click)="store.togglePin(p.projectId)"
                [attr.aria-label]="store.isPinned(p.projectId) ? 'Unpin project' : 'Pin project to shortlist'"
              >
                {{ store.isPinned(p.projectId) ? 'Unpin' : 'Pin' }}
              </ion-button>
            </div>

            <ion-card-title class="project-title">{{ p.projectName }}</ion-card-title>
            <ion-card-subtitle class="project-subtitle">
              {{ p.businessUnit }} &bull; {{ p.site }} &bull; {{ p.portfolio }}
            </ion-card-subtitle>
          </ion-card-header>

          <ion-card-content class="detail-card-content">
            <!-- Key Metadata Strip -->
            <div class="meta-strip">
              <div class="meta-item">
                <span class="meta-label">PM</span>
                <span class="meta-val">{{ p.projectManager }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Sponsor</span>
                <span class="meta-val">{{ p.executiveSponsor }} ({{ p.sponsorLevel }})</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Go-Live</span>
                <span class="meta-val">{{ p.goLiveDate }} ({{ p.monthsToGoLive.toFixed(1) }} mo)</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Cost / Effort</span>
                <span class="meta-val">\${{ (p.costEstimateUsd / 1000000).toFixed(2) }}M / {{ p.effortPersonWeeks.toFixed(1) }} pw</span>
              </div>
            </div>

            <!-- Lifecycle Management Bar -->
            <div class="lifecycle-bar">
              <span class="lifecycle-lbl">Lifecycle Actions:</span>
              <button type="button" class="life-btn edit-proj-btn" (click)="isEditing.set(true)">
                <ion-icon name="create-outline"></ion-icon>
                Edit Project & AI Signals
              </button>
              @if (p.projectStatus !== 'Backlog') {
                <button type="button" class="life-btn backlog" (click)="runLifecycle(store.setProjectStatus(p.projectId, 'Backlog'))">
                  Mark as Backlog
                </button>
              } @else {
                <button type="button" class="life-btn active" (click)="runLifecycle(store.setProjectStatus(p.projectId, 'Active'))">
                  Move to Active
                </button>
              }
              @if (p.isDeleted) {
                <button type="button" class="life-btn active" (click)="runLifecycle(store.setSoftDeleted(p.projectId, false))">
                  Restore
                </button>
              } @else {
                <button type="button" class="life-btn soft" (click)="runLifecycle(store.setSoftDeleted(p.projectId, true))">
                  Soft Delete (Trash)
                </button>
              }
              @if (lifecycleError(); as message) {
                <div class="panel-error" role="alert">{{ message }}</div>
              }
              <button type="button" class="life-btn hard" (click)="onPermanentDelete(p)">
                Permanent Delete
              </button>
            </div>

            <!-- TIER PREDICTION & RULE OVERRIDES -->
            <div class="detail-section tier-section">
              <div class="section-heading">Tier Alignment & Rules</div>
              <div class="tier-compare-row">
                <div class="tier-box ml-tier">
                  <span class="tier-sub">Suggested Priority</span>
                  <span class="tier-name">{{ p.mlTier }}</span>
                </div>
                <div class="arrow">&rarr;</div>
                <div class="tier-box final-tier">
                  <span class="tier-sub">Final Prioritized Tier</span>
                  <span class="tier-name">{{ p.finalTier }}</span>
                </div>
              </div>

              @if (p.ruleOverrides.length > 0) {
                <div class="rules-box">
                  <span class="rules-label">Business Rules Applied:</span>
                  @for (r of p.ruleOverrides; track r) {
                    <span class="rule-chip">{{ r }}</span>
                  }
                </div>
              } @else {
                <div class="rules-box none">
                  <span>No business-rule adjustments were needed. The suggested priority is unchanged.</span>
                </div>
              }
            </div>

            <!-- CONFIDENCE BREAKDOWN -->
            <div class="detail-section confidence-breakdown-section">
              <div class="section-heading">
                <span>Confidence Assessment</span>
                <span class="weight-note">45% completeness + 35% data quality + 20% prediction confidence</span>
              </div>

              <div class="confidence-summary-row">
                <app-confidence-ring [score]="p.confidenceScore" [level]="p.confidenceLevel" [size]="72"></app-confidence-ring>
                <div class="bars-container">
                  <!-- Completeness (45%) -->
                  <div class="bar-group">
                    <div class="bar-label-row">
                      <span>Sources Completeness (45%)</span>
                      <span>{{ (p.completeness * 100).toFixed(0) }}% ({{ p.sourcesPresent }}/{{ p.sourcesTotal }} sources)</span>
                    </div>
                    <div class="progress-track">
                      <div class="progress-fill fill-blue" [style.width.%]="p.completeness * 100"></div>
                    </div>
                  </div>

                  <!-- Quality (35%) -->
                  <div class="bar-group">
                    <div class="bar-label-row">
                      <span>Data Quality & Consistency (35%)</span>
                      <span>{{ (p.quality * 100).toFixed(0) }}%</span>
                    </div>
                    <div class="progress-track">
                      <div class="progress-fill fill-green" [style.width.%]="p.quality * 100"></div>
                    </div>
                  </div>

                  <!-- Model Certainty (20%) -->
                  <div class="bar-group">
                    <div class="bar-label-row">
                      <span>Prediction Confidence (20%)</span>
                      <span>{{ (p.modelCertainty * 100).toFixed(0) }}%</span>
                    </div>
                    <div class="progress-track">
                      <div class="progress-fill fill-purple" [style.width.%]="p.modelCertainty * 100"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 10 SHAP SIGNAL DRIVERS -->
            <div class="detail-section drivers-section">
              <div class="section-heading">Top 10 Factors Behind This Priority</div>
              <div
                echarts
                [options]="getDriverChartOptions(p)"
                class="driver-chart"
                aria-label="Factors contributing to the suggested priority"
              ></div>
            </div>

            <!-- 11 SOURCES BADGES -->
            <div class="detail-section sources-section">
              <div class="section-heading">Project Information Coverage ({{ p.sourcesPresent }}/{{ p.sourcesTotal }} Sources)</div>
              <div class="sources-grid">
                @for (src of getSourcesList(p); track src.name) {
                  <span class="source-badge" [class.present]="src.present" [class.missing]="!src.present">
                    {{ src.present ? '&#10003;' : '&#10007;' }} {{ src.name }}
                  </span>
                }
              </div>
            </div>

            <!-- DATA ISSUES -->
            @if (p.dataIssues.length > 0) {
              <div class="detail-section issues-section">
                <div class="section-heading text-danger">Data Quality Issues Identified</div>
                <ul class="issues-list">
                  @for (iss of p.dataIssues; track iss) {
                    <li>{{ iss }}</li>
                  }
                </ul>
              </div>
            }

            <!-- RECOMMENDED ACTION & HUMAN GOVERNANCE -->
            <div class="detail-section action-section">
              <div class="section-heading">Recommended Action</div>
              <div class="action-box">
                <div class="action-title">{{ p.recommendedAction }}</div>
                <div class="action-subnote">
                  <strong>Notice:</strong> Every recommendation requires human approval. Machine suggestions inform human PMO decision-making; final authorization rests with the PMO committee.
                </div>
              </div>
            </div>

            <!-- DECISION CONTROLS -->
            <div class="detail-section decision-controls-section">
              <div class="section-heading">PMO Decision Capture</div>

              @if (latestDecision(); as dec) {
                <div class="recorded-decision-box" [class]="(dec.action ?? 'recorded').toLowerCase()">
                  <div class="dec-header">
                    <strong>Recorded: {{ dec.action ?? 'Decision' }} · {{ dec.decision }}</strong>
                    <span class="dec-time">{{ dec.timestamp | date:'short' }}</span>
                  </div>
                  <div class="dec-reason">"{{ dec.reason }}"{{ dec.decidedBy ? ' (' + dec.decidedBy + ')' : '' }}</div>
                </div>
              }

              <div class="decision-form">
                <div class="decision-meta-row">
                  <label class="decision-field">
                    <span>Priority tier</span>
                    <select class="decision-select" [(ngModel)]="decisionTier" aria-label="Decision priority tier">
                      <option value="">{{ p.finalTier }} (current)</option>
                      @for (tier of tierOptions; track tier) {
                        <option [value]="tier">{{ tier }}</option>
                      }
                    </select>
                  </label>
                  <label class="decision-field">
                    <span>Decided by</span>
                    <input class="decision-select" type="text" maxlength="80" [(ngModel)]="decidedBy" aria-label="Decided by" />
                  </label>
                </div>
                @if (decisionError(); as message) {
                  <div class="panel-error" role="alert">{{ message }}</div>
                }
                <div class="reason-input-wrap">
                  <ion-textarea
                    [(ngModel)]="decisionReason"
                    rows="2"
                    aria-label="Decision justification"
                  ></ion-textarea>
                </div>

                <div class="decision-buttons-row">
                  <ion-button
                    color="success"
                    size="small"
                    [disabled]="!decisionReason.trim() || !decidedBy.trim()"
                    (click)="submitDecision(p, 'Approve')"
                    aria-label="Approve recommendation"
                  >
                    Approve
                  </ion-button>
                  <ion-button
                    color="warning"
                    size="small"
                    [disabled]="!decisionReason.trim() || !decidedBy.trim()"
                    (click)="submitDecision(p, 'Adjust')"
                    aria-label="Adjust project tier"
                  >
                    Adjust
                  </ion-button>
                  <ion-button
                    color="danger"
                    size="small"
                    [disabled]="!decisionReason.trim() || !decidedBy.trim()"
                    (click)="submitDecision(p, 'Reject')"
                    aria-label="Reject recommendation"
                  >
                    Reject
                  </ion-button>
                </div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        @if (isEditing()) {
          <app-edit-project-modal
            [project]="p"
            [error]="editError()"
            (save)="onSaveEditedProject($event)"
            (dismiss)="isEditing.set(false)"
          ></app-edit-project-modal>
        }
      </div>
    } @else {
      <div class="no-selection">
        <p>Select a project from the board or table to review its priority factors and confidence assessment.</p>
      </div>
    }
  `,
  styles: [
    `
      .detail-container {
        padding: 4px;
      }
      .detail-card {
        margin: 0;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        border: 1px solid var(--ion-color-step-150, #e6e6e6);
        border-radius: 8px;
      }
      .header-top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      .project-id-badge {
        font-size: 0.8rem;
        font-weight: 700;
        background: #0078d4;
        color: #fff;
        padding: 2px 8px;
        border-radius: 4px;
        margin-right: 6px;
      }
      .status-badge {
        font-size: 0.72rem;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        background: #e1dfdd;
        color: #323130;
      }
      .status-badge.active {
        background: #dff6dd;
        color: #107c10;
      }
      .status-badge.on.hold {
        background: #fed9cc;
        color: #d13438;
      }
      .pinned-indicator {
        font-size: 0.75rem;
        font-weight: 600;
        color: #c19c00;
        margin-left: 6px;
      }
      .project-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--ion-text-color, #1a1a1a);
        line-height: 1.3;
      }
      .project-subtitle {
        font-size: 0.8rem;
        color: var(--ion-color-step-600, #666666);
        margin-top: 2px;
      }
      .detail-card-content {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 12px 16px;
      }
      .meta-strip {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 8px;
        background: var(--ion-color-step-50, #f9f9f9);
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid var(--ion-color-step-100, #eeeeee);
      }
      .meta-item {
        display: flex;
        flex-direction: column;
      }
      .meta-label {
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #777777;
      }
      .meta-val {
        font-size: 0.8rem;
        font-weight: 600;
        color: #222222;
      }
      .detail-section {
        border-top: 1px solid var(--ion-color-step-150, #e6e6e6);
        padding-top: 10px;
      }
      .section-heading {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--ion-color-step-700, #444444);
        margin-bottom: 8px;
        display: flex;
        flex-direction: column;
      }
      .weight-note {
        font-size: 0.68rem;
        text-transform: none;
        color: #666666;
        font-weight: 500;
        margin-top: 2px;
      }
      .tier-compare-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tier-box {
        flex: 1;
        padding: 6px 10px;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
      }
      .ml-tier {
        background: #f0f0f0;
        border: 1px solid #d0d0d0;
      }
      .final-tier {
        background: #e6f2fb;
        border: 1px solid #0078d4;
      }
      .tier-sub {
        font-size: 0.65rem;
        text-transform: uppercase;
        font-weight: 600;
        color: #666666;
      }
      .tier-name {
        font-size: 0.9rem;
        font-weight: 700;
        color: #1a1a1a;
      }
      .arrow {
        font-size: 1.2rem;
        color: #0078d4;
        font-weight: 700;
      }
      .rules-box {
        margin-top: 6px;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
      }
      .rules-box.none {
        color: #777777;
        font-style: italic;
      }
      .rules-label {
        font-weight: 600;
        color: #555555;
      }
      .rule-chip {
        background: #fed9cc;
        color: #a80000;
        padding: 1px 6px;
        border-radius: 3px;
        font-weight: 700;
        font-size: 0.7rem;
      }
      .confidence-summary-row {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .bars-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .bar-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .bar-label-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.72rem;
        font-weight: 600;
        color: #444444;
      }
      .progress-track {
        height: 6px;
        background: #e0e0e0;
        border-radius: 3px;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      .fill-blue {
        background: #0078d4;
      }
      .fill-green {
        background: #107c10;
      }
      .fill-purple {
        background: #8764b8;
      }
      .driver-chart {
        height: 240px;
        width: 100%;
      }
      .sources-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
        gap: 6px;
      }
      .source-badge {
        font-size: 0.7rem;
        padding: 3px 6px;
        border-radius: 4px;
        font-weight: 600;
        text-align: center;
        border: 1px solid;
      }
      .source-badge.present {
        background: #eef7ee;
        border-color: #badcba;
        color: #107c10;
      }
      .source-badge.missing {
        background: #fdf2f2;
        border-color: #f6c8c8;
        color: #d13438;
      }
      .issues-list {
        margin: 0;
        padding-left: 18px;
        font-size: 0.75rem;
        color: #d13438;
      }
      .action-box {
        background: #f3f9fd;
        border-left: 4px solid #0078d4;
        padding: 8px 12px;
        border-radius: 0 4px 4px 0;
      }
      .action-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: #004578;
      }
      .action-subnote {
        font-size: 0.72rem;
        color: #444444;
        margin-top: 4px;
        line-height: 1.3;
      }
      .decision-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
      }
      .reason-input-wrap ion-textarea {
        --background: var(--ion-color-step-50, #fcfcfc);
        --padding-start: 8px;
        --padding-end: 8px;
        border: 1px solid var(--ion-color-step-200, #cccccc);
        border-radius: 4px;
        font-size: 0.8rem;
      }
      .decision-buttons-row {
        display: flex;
        gap: 8px;
      }
      .recorded-decision-box {
        padding: 6px 10px;
        border-radius: 6px;
        margin-bottom: 8px;
        font-size: 0.75rem;
        border: 1px solid;
      }
      .recorded-decision-box.approve {
        background: #dff6dd;
        border-color: #107c10;
        color: #107c10;
      }
      .recorded-decision-box.adjust {
        background: #fff4ce;
        border-color: #c19c00;
        color: #795e00;
      }
      .recorded-decision-box.reject {
        background: #fed9cc;
        border-color: #d13438;
        color: #a80000;
      }
      .dec-header {
        display: flex;
        justify-content: space-between;
      }
      .dec-time {
        font-size: 0.7rem;
        opacity: 0.8;
      }
      .dec-reason {
        margin-top: 2px;
        font-style: italic;
      }
      .no-selection {
        padding: 32px;
        text-align: center;
        color: #777777;
        font-size: 0.9rem;
      }
      .text-danger {
        color: #d13438;
      }
      .lifecycle-bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        padding: 6px 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
      }
      .lifecycle-lbl {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
        margin-right: 4px;
      }
      .life-btn {
        border: none;
        border-radius: 3px;
        padding: 3px 8px;
        font-size: 0.72rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }
      .life-btn:hover {
        opacity: 0.85;
      }
      .life-btn.backlog {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
      }
      .life-btn.active {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
      .life-btn.soft {
        background: #fee2e2;
        color: #b91c1c;
        border: 1px solid #fecaca;
      }
      .life-btn.edit-proj-btn {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .life-btn.hard {
        background: #ef4444;
        color: #ffffff;
      }
      .decision-meta-row {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .decision-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 160px;
        font-size: 0.72rem;
        color: #475569;
      }
      .decision-select {
        padding: 6px 8px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.8rem;
        background: #ffffff;
      }
      .panel-error {
        color: #b91c1c;
        font-size: 0.78rem;
        font-weight: 600;
        margin: 6px 0;
      }
    `,
  ],
})
export class DetailPanelComponent {
  readonly store = inject(PortfolioStore);
  private readonly api = inject(DataApiService);
  private readonly configService = inject(ConfigService);
  private readonly selectedId = computed(() => this.store.selectedProject()?.projectId ?? null);

  readonly isEditing = signal<boolean>(false);
  readonly editError = signal<string | null>(null);
  readonly lifecycleError = signal<string | null>(null);
  readonly latestDecision = signal<LocalDecision | null>(null);
  readonly decisionError = signal<string | null>(null);
  readonly tierOptions: string[] = Object.values(this.configService.config.tiers.labels);
  decisionTier = '';
  decidedBy = '';
  decisionReason = '';

  constructor() {
    effect(() => {
      const projectId = this.selectedId();
      untracked(() => this.resetFor(projectId));
    });
  }

  runLifecycle(change: Observable<unknown>): void {
    this.lifecycleError.set(null);
    change.subscribe({
      error: (err: unknown) => this.lifecycleError.set(problemMessage(err, 'Could not update the project. Try again.')),
    });
  }

  onSaveEditedProject(changes: Record<string, unknown>): void {
    const projectId = this.selectedId();
    if (!projectId) return;
    if (Object.keys(changes).length === 0) {
      this.isEditing.set(false);
      return;
    }
    this.editError.set(null);
    this.store.updateProject(projectId, changes).subscribe({
      next: () => this.isEditing.set(false),
      error: (err: unknown) => this.editError.set(problemMessage(err, 'Could not save the project changes.')),
    });
  }

  private resetFor(projectId: string | null): void {
    this.isEditing.set(false);
    this.lifecycleError.set(null);
    this.decisionError.set(null);
    this.latestDecision.set(null);
    this.decisionTier = '';
    this.decisionReason = '';
    if (!projectId) return;
    this.api.getDecisions(projectId).subscribe({
      next: (decisions) => {
        if (this.selectedId() === projectId) this.latestDecision.set(decisions[0] ?? null);
      },
      error: (err: unknown) => {
        if (this.selectedId() === projectId) {
          this.decisionError.set(problemMessage(err, 'Could not load the recorded decision.'));
        }
      },
    });
  }

  getSourcesList(p: Project): Array<{ name: string; present: boolean }> {
    return [
      { name: 'Planview', present: p.sources.planview },
      { name: 'PowerApps', present: p.sources.powerapps },
      { name: 'ADO', present: p.sources.ado },
      { name: 'Jira', present: p.sources.jira },
      { name: 'MS Project', present: p.sources.msProject },
      { name: 'Smartsheet', present: p.sources.smartsheet },
      { name: 'BU Trackers', present: p.sources.buTrackers },
      { name: 'BU Repos', present: p.sources.buRepositories },
      { name: 'HR Capacity', present: p.sources.hrCapacity },
      { name: 'Cost Tracking', present: p.sources.cost },
      { name: 'Excel Intake', present: p.sources.excelIntake },
    ];
  }

  getDriverChartOptions(p: Project): echarts.EChartsCoreOption {
    // Top 10 drivers sorted by shapValue
    const drivers = [...p.topDrivers].reverse();
    const categories = drivers.map((d) => d.signalLabel);
    const values = drivers.map((d) => d.shapValue);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const arr = params as Array<{ dataIndex: number; value: number }>;
          if (!arr || arr.length === 0) return '';
          const idx = arr[0].dataIndex;
          const drv = drivers[idx];
          return `<b>${drv.signalLabel}</b><br/>Priority contribution: ${drv.shapValue > 0 ? '+' : ''}${drv.shapValue.toFixed(3)}<br/>Direction: ${drv.direction}<br/>Recorded value: ${drv.featureValue}`;
        },
      },
      grid: {
        top: 10,
        bottom: 20,
        left: 120,
        right: 30,
      },
      xAxis: {
        type: 'value',
        axisLine: { show: true },
        splitLine: { show: true, lineStyle: { type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          name: 'Priority Contribution',
          type: 'bar',
          data: values.map((val) => ({
            value: val,
            itemStyle: {
              color: val >= 0 ? '#107C10' : '#D13438',
            },
          })),
        },
      ],
    };
  }

  submitDecision(project: Project, action: DecisionAction): void {
    const reason = this.decisionReason.trim();
    const decidedBy = this.decidedBy.trim();
    if (!reason || !decidedBy) return;
    this.decisionError.set(null);
    this.api
      .createDecision({
        projectId: project.projectId,
        decision: this.decisionTier || project.finalTier,
        action,
        reason,
        decidedBy,
      })
      .subscribe({
        next: (saved) => {
          this.latestDecision.set(saved);
          this.decisionReason = '';
          this.decisionTier = '';
        },
        error: (err: unknown) => this.decisionError.set(problemMessage(err, 'Could not record the decision.')),
      });
  }

  onPermanentDelete(p: Project): void {
    if (!confirm(`Are you sure you want to PERMANENTLY delete project ${p.projectId} (${p.projectName})? This action cannot be undone.`)) return;
    this.runLifecycle(this.store.permanentlyDelete(p.projectId));
  }
}
