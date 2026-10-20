import { Component, ChangeDetectionStrategy, computed, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { IonIcon } from '@ionic/angular';
import { OptionsResponse, PortfolioItem } from '../../models/api.models';
import { Project } from '../../models/portfolio.models';
import { changedProjectFields } from '../../core/project-changes';
import { problemMessage } from '../../core/problem-detail';
import { DataApiService } from '../../services/data-api.service';

@Component({
  selector: 'app-edit-project-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-card">
        <div class="modal-header">
          <div class="header-titles">
            <div class="id-badge-row">
              <span class="pid-badge">{{ form().projectId }}</span>
              @if (form().aiGenerated) {
                <span class="ai-pill"><ion-icon name="sparkles"></ion-icon> AI-Generated Fields</span>
              }
              <span class="status-pill" [attr.data-status]="form().projectStatus">{{ form().projectStatus }}</span>
            </div>
            <h3 class="modal-title">Edit Project: {{ form().projectName }}</h3>
            <p class="modal-subtitle">
              Review and adjust core inputs or fine-tune AI-predicted tiers, priority scores, and resource signals.
            </p>
          </div>
          <button type="button" class="close-modal-btn" (click)="dismiss.emit()">&times;</button>
        </div>

        <!-- Section Switcher Tabs -->
        <div class="modal-tabs">
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'core'"
            (click)="activeTab.set('core')"
          >
            1. Core Project Inputs (Human)
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'ai'"
            (click)="activeTab.set('ai')"
          >
            2. Priority Assessment (Read-only)
          </button>
        </div>

        <div class="modal-body">
          @if (!ready()) {
            <p class="loading-note">Loading project options...</p>
          } @else {
          <!-- TAB 1: CORE INPUTS -->
          @if (activeTab() === 'core') {
            <div class="form-grid">
              <div class="form-field col-full">
                <label class="field-label">Project Name <span class="req">*</span></label>
                <input type="text" class="field-input" [(ngModel)]="form().projectName" />
              </div>

              <div class="form-field col-half">
                <label class="field-label">Portfolio <span class="req">*</span></label>
                <select class="field-select" [ngModel]="form().portfolioKey" (ngModelChange)="onPortfolioChange($event)">
                  @for (item of portfolioItems(); track item.key) {
                    <option [value]="item.key">{{ item.displayName }}</option>
                  }
                </select>
              </div>

              <div class="form-field col-half">
                <label class="field-label">Program <span class="req">*</span></label>
                <select class="field-select" [(ngModel)]="form().programKey">
                  @for (pr of programsOf(form().portfolioKey); track pr.key) {
                    <option [value]="pr.key">{{ pr.displayName ?? pr.name ?? pr.key }}</option>
                  }
                </select>
              </div>

              <div class="form-field col-half">
                <label class="field-label">Business Unit <span class="req">*</span></label>
                <select class="field-select" [(ngModel)]="form().businessUnit">
                  @for (bu of lists()?.businessUnits ?? []; track bu) {
                    <option [value]="bu">{{ bu }}</option>
                  }
                </select>
              </div>

              <div class="form-field col-half">
                <label class="field-label">Site Location</label>
                <select class="field-select" [(ngModel)]="form().site">
                  @for (s of lists()?.sites ?? []; track s) {
                    <option [value]="s">{{ s }}</option>
                  }
                </select>
              </div>

              <div class="form-field col-half">
                <label class="field-label">Primary Skill Domain <span class="req">*</span></label>
                <select class="field-select" [(ngModel)]="form().primarySkill">
                  @for (sk of lists()?.skills ?? []; track sk.key) {
                    <option [value]="sk.key">{{ sk.displayName }}</option>
                  }
                </select>
              </div>

              <div class="form-field col-half">
                <label class="field-label">Total Cost Estimate (USD) <span class="req">*</span></label>
                <input type="number" step="10000" class="field-input" [(ngModel)]="form().costEstimateUsd" />
              </div>

              <div class="form-field col-half">
                <label class="field-label">Business Value Score (1 - 5) <span class="req">*</span>: {{ form().businessValue }}</label>
                <input type="range" min="1" max="5" step="1" class="field-range" [(ngModel)]="form().businessValue" />
              </div>

              <div class="form-field col-half">
                <label class="field-label">Project Status</label>
                <select class="field-select" [(ngModel)]="form().projectStatus">
                  @for (st of lists()?.projectStatuses ?? []; track st) {
                    <option [value]="st">{{ st }}</option>
                  }
                </select>
              </div>

              <div class="form-field col-half">
                <label class="field-label">Target Go-Live Date</label>
                <input type="date" class="field-input" [(ngModel)]="form().goLiveDate" />
              </div>

              <div class="form-field col-half">
                <label class="field-label">Executive Sponsor</label>
                <input type="text" class="field-input" [(ngModel)]="form().executiveSponsor" />
              </div>

              <div class="form-field col-half">
                <label class="field-label">Sponsor Level</label>
                <select class="field-select" [(ngModel)]="form().sponsorLevel">
                  @for (lvl of lists()?.sponsorLevels ?? []; track lvl) {
                    <option [value]="lvl">{{ lvl }}</option>
                  }
                </select>
              </div>

              <div class="form-field col-full flags-row">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="form().regulatorySecurity" />
                  <span>Regulatory or Security Driven (Triggers Rule R1)</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="form().dtAlignment" />
                  <span>Digital Transformation Aligned</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="form().protectedProgram" />
                  <span>Protected Strategic Program (Triggers Rule R3)</span>
                </label>
              </div>
            </div>
          }

          <!-- TAB 2: AI SIGNALS & SCORING -->
          @if (activeTab() === 'ai') {
            <div class="ai-tab-wrapper">
              <div class="ai-callout-banner">
                <div class="callout-left">
                  <ion-icon name="sparkles" class="callout-sparkle"></ion-icon>
                  <div>
                    <strong>Calculated priorities are read-only</strong>
                    <p>Priority tiers, scores, and project groups update during an analysis refresh. You can edit risk, skill demand, and effort with the other project details.</p>
                  </div>
                </div>
              </div>

              <div class="form-grid">
                <div class="form-field col-half">
                  <label class="field-label">Final Prioritized Tier</label>
                  <div class="readonly-value">{{ form().finalTier }}</div>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Suggested Priority Tier</label>
                  <div class="readonly-value">{{ form().mlTier }}</div>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Priority Score (0 - 100)</label>
                  <div class="readonly-value">{{ form().priorityScore }}</div>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Confidence Score (0 - 100)</label>
                  <div class="readonly-value">{{ form().confidenceScore }}%</div>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Confidence Tier</label>
                  <div class="readonly-value">{{ form().confidenceLevel }}</div>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Recommended Action</label>
                  <div class="readonly-value">{{ form().recommendedAction }}</div>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Strategic Cluster</label>
                  <div class="readonly-value">{{ form().cluster }}</div>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Risk Rating</label>
                  <select class="field-select" [(ngModel)]="form().riskRating">
                    @for (rr of lists()?.riskRatings ?? []; track rr) {
                      <option [value]="rr">{{ rr }}</option>
                    }
                  </select>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Skill Demand (FTE)</label>
                  <input type="number" step="0.1" class="field-input" [(ngModel)]="form().skillDemandFte" />
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Effort (Person-Weeks)</label>
                  <input type="number" step="1" class="field-input" [(ngModel)]="form().effortPersonWeeks" />
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Months to Go-Live</label>
                  <div class="readonly-value">{{ form().monthsToGoLive }}</div>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Dependency Count</label>
                  <div class="readonly-value">{{ form().dependencyCount }}</div>
                </div>
              </div>
            </div>
          }
          }
        </div>

        <div class="modal-footer">
          <div class="footer-left">
            @if (error() ?? loadError(); as message) {
              <span class="modal-error" role="alert">{{ message }}</span>
            }
          </div>

          <div class="footer-right">
            <button type="button" class="btn-cancel" (click)="dismiss.emit()">Cancel</button>
            <button type="button" class="btn-save" [disabled]="!ready()" (click)="onSave()">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1050;
        padding: 16px;
      }
      .modal-card {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        width: 100%;
        max-width: 860px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 18px 22px 14px 22px;
        border-bottom: 1px solid #e2e8f0;
      }
      .id-badge-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      .pid-badge {
        font-family: monospace;
        font-weight: 700;
        background: var(--pmo-primary, #0078d4);
        color: #ffffff;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.78rem;
      }
      .ai-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.72rem;
        background: #f3e8ff;
        color: #7e22ce;
        padding: 2px 8px;
        border-radius: 10px;
        font-weight: 600;
      }
      .status-pill {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 10px;
      }
      .status-pill[data-status="Active"] { background: #dcfce7; color: #166534; }
      .status-pill[data-status="Planning"] { background: #e0f2fe; color: #0369a1; }
      .status-pill[data-status="On Hold"] { background: #fef9c3; color: #854d0e; }
      .status-pill[data-status="Backlog"] { background: #fae8ff; color: #86198f; }

      .modal-title {
        margin: 2px 0 2px 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: #0f172a;
      }
      .modal-subtitle {
        margin: 0;
        font-size: 0.8rem;
        color: #64748b;
      }
      .close-modal-btn {
        background: none;
        border: none;
        font-size: 1.6rem;
        color: #94a3b8;
        cursor: pointer;
        padding: 0 4px;
      }
      .close-modal-btn:hover {
        color: #0f172a;
      }

      .modal-tabs {
        display: flex;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        padding: 4px 18px 0 18px;
        gap: 8px;
      }
      .tab-btn {
        background: transparent;
        border: none;
        border-bottom: 3px solid transparent;
        padding: 8px 14px;
        font-size: 0.84rem;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
      }
      .tab-btn.active {
        color: var(--pmo-primary, #0078d4);
        border-bottom-color: var(--pmo-primary, #0078d4);
        background: #ffffff;
      }

      .modal-body {
        padding: 18px 22px;
        overflow-y: auto;
        flex: 1;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px 18px;
      }
      .col-full { grid-column: span 2; }
      .col-half { grid-column: span 1; }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .field-label {
        font-size: 0.78rem;
        font-weight: 600;
        color: #334155;
      }
      .field-label .req {
        color: #dc2626;
      }
      .field-input, .field-select {
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 7px 10px;
        font-size: 0.84rem;
        color: #0f172a;
        background: #ffffff;
        outline: none;
      }
      .field-input:focus, .field-select:focus {
        border-color: var(--pmo-primary, #0078d4);
      }
      .field-range {
        accent-color: var(--pmo-primary, #0078d4);
      }

      .flags-row {
        display: flex;
        flex-wrap: wrap;
        gap: 18px;
        padding-top: 6px;
      }
      .checkbox-label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.82rem;
        font-weight: 500;
        color: #1e293b;
        cursor: pointer;
      }

      .ai-callout-banner {
        background: #faf5ff;
        border: 1px solid #e9d5ff;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
      }
      .callout-left {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        flex: 1;
      }
      .callout-sparkle {
        font-size: 1.4rem;
        color: #7e22ce;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .callout-left strong {
        font-size: 0.86rem;
        color: #581c87;
        display: block;
        margin-bottom: 2px;
      }
      .callout-left p {
        margin: 0;
        font-size: 0.78rem;
        color: #6b21a8;
        line-height: 1.35;
      }

      .modal-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 22px;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .footer-right {
        display: flex;
        gap: 10px;
      }
      .btn-cancel {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        padding: 7px 16px;
        border-radius: 6px;
        font-size: 0.82rem;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
      }
      .btn-cancel:hover {
        background: #f1f5f9;
      }
      .btn-save {
        background: var(--pmo-primary, #0078d4);
        border: none;
        padding: 7px 18px;
        border-radius: 6px;
        font-size: 0.82rem;
        font-weight: 700;
        color: #ffffff;
        cursor: pointer;
      }
      .btn-save:hover {
        background: var(--pmo-primary-dark, #004578);
      }
      .readonly-value {
        padding: 8px 10px;
        border-radius: 6px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        font-size: 0.85rem;
        color: #334155;
      }
      .loading-note,
      .modal-error {
        font-size: 0.8rem;
      }
      .loading-note {
        color: #64748b;
      }
      .modal-error {
        color: #b91c1c;
        font-weight: 600;
      }

      @media (max-width: 650px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
        .col-half { grid-column: span 1; }
      }
    `,
  ],
})
export class EditProjectModalComponent implements OnInit {
  private readonly api = inject(DataApiService);

  readonly project = input.required<Project>();
  readonly error = input<string | null>(null);
  /** The PATCH body: only the contract fields that changed. */
  readonly save = output<Record<string, unknown>>();
  readonly dismiss = output<void>();

  readonly activeTab = signal<'core' | 'ai'>('core');
  readonly form = signal<Project>({} as Project);
  readonly baseline = signal<Project | null>(null);
  readonly options = signal<OptionsResponse | null>(null);
  readonly portfolioItems = signal<PortfolioItem[]>([]);
  readonly loadError = signal<string | null>(null);
  readonly ready = computed(() => this.options() !== null);
  readonly lists = computed(() => this.options()?.options ?? null);

  ngOnInit(): void {
    forkJoin({ options: this.api.getOptions(), portfolios: this.api.getPortfolios() }).subscribe({
      next: ({ options, portfolios }) => {
        const project = this.project();
        const portfolioKey =
          project.portfolioKey ?? portfolios.find((item) => item.displayName === project.portfolio)?.key ?? '';
        const programKey =
          project.programKey ??
          portfolios
            .find((item) => item.key === portfolioKey)
            ?.programs.find((pr) => (pr.displayName ?? pr.name) === project.program)?.key ??
          '';
        const skillKey =
          options.options.skills.find((sk) => sk.key === project.primarySkill || sk.displayName === project.primarySkill)
            ?.key ?? project.primarySkill;
        const resolved: Project = { ...structuredClone(project), portfolioKey, programKey, primarySkill: skillKey };
        this.portfolioItems.set(portfolios);
        this.form.set(structuredClone(resolved));
        this.baseline.set(structuredClone(resolved));
        this.options.set(options);
      },
      error: (err: unknown) => this.loadError.set(problemMessage(err, 'Could not load the project options.')),
    });
  }

  programsOf(portfolioKey: string | undefined): PortfolioItem['programs'] {
    return this.portfolioItems().find((item) => item.key === portfolioKey)?.programs ?? [];
  }

  onPortfolioChange(portfolioKey: string): void {
    const programKey = this.programsOf(portfolioKey)[0]?.key ?? '';
    this.form.update((current) => ({ ...current, portfolioKey, programKey }));
  }

  onSave(): void {
    const baseline = this.baseline();
    const options = this.options();
    if (!baseline || !options) return;
    this.save.emit(changedProjectFields(baseline, this.form(), options.projectFields));
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.dismiss.emit();
    }
  }
}
