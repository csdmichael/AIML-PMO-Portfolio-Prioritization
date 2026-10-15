import { Component, ChangeDetectionStrategy, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonIcon,
} from '@ionic/angular';
import { Project, ProjectStatus, SponsorLevel, RiskRating, PriorityTier, ConfidenceLevel, RecommendedAction } from '../../models/portfolio.models';
import { PortfolioStore } from '../../services/portfolio.store';
import { PortfolioImportService } from '../../services/portfolio-import.service';

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
          <button type="button" class="close-modal-btn" (click)="cancel.emit()">&times;</button>
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
            2. AI Signals & Scoring (Governed)
          </button>
        </div>

        <div class="modal-body">
          <!-- TAB 1: CORE INPUTS -->
          @if (activeTab() === 'core') {
            <div class="form-grid">
              <div class="form-field col-full">
                <label class="field-label">Project Name <span class="req">*</span></label>
                <input type="text" class="field-input" [(ngModel)]="form().projectName" />
              </div>

              <div class="form-field col-half">
                <label class="field-label">Portfolio <span class="req">*</span></label>
                <select class="field-select" [(ngModel)]="form().portfolio">
                  @for (pf of store.availablePortfolios(); track pf) {
                    <option [value]="pf">{{ pf }}</option>
                  }
                </select>
              </div>

              <div class="form-field col-half">
                <label class="field-label">Business Unit <span class="req">*</span></label>
                <select class="field-select" [(ngModel)]="form().businessUnit">
                  @for (bu of availableBusinessUnits; track bu) {
                    <option [value]="bu">{{ bu }}</option>
                  }
                </select>
              </div>

              <div class="form-field col-half">
                <label class="field-label">Site Location</label>
                <select class="field-select" [(ngModel)]="form().site">
                  @for (s of availableSites; track s) {
                    <option [value]="s">{{ s }}</option>
                  }
                </select>
              </div>

              <div class="form-field col-half">
                <label class="field-label">Primary Skill Domain <span class="req">*</span></label>
                <select class="field-select" [(ngModel)]="form().primarySkill">
                  @for (sk of availableSkills; track sk) {
                    <option [value]="sk">{{ sk }}</option>
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
                  <option value="Active">Active</option>
                  <option value="Planning">Planning</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Backlog">Backlog</option>
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
                  <option value="Executive">Executive</option>
                  <option value="Director">Director</option>
                  <option value="Manager">Manager</option>
                  <option value="Individual">Individual</option>
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
                    <strong>AI Signal Synthesis & Governance Controls</strong>
                    <p>You can manually adjust any calculated attribute below, or click &ldquo;Recalculate AI Signals&rdquo; to re-run LightGBM, R1-R5 rules, and TreeSHAP feature attributions.</p>
                  </div>
                </div>
                <button type="button" class="recalc-btn" (click)="onRecalculateAi()">
                  <ion-icon name="flash-outline"></ion-icon>
                  Recalculate AI Signals
                </button>
              </div>

              <div class="form-grid">
                <div class="form-field col-half">
                  <label class="field-label">Final Prioritized Tier</label>
                  <select class="field-select" [(ngModel)]="form().finalTier">
                    <option value="Must-do-now">Must-do-now</option>
                    <option value="Proceed">Proceed</option>
                    <option value="Can wait">Can wait</option>
                    <option value="Candidate to deprioritize">Candidate to deprioritize</option>
                  </select>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">ML Predicted Tier</label>
                  <select class="field-select" [(ngModel)]="form().mlTier">
                    <option value="Must-do-now">Must-do-now</option>
                    <option value="Proceed">Proceed</option>
                    <option value="Can wait">Can wait</option>
                    <option value="Candidate to deprioritize">Candidate to deprioritize</option>
                  </select>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Priority Score (0 - 100): {{ form().priorityScore }}</label>
                  <input type="number" step="0.1" min="0" max="100" class="field-input" [(ngModel)]="form().priorityScore" />
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Confidence Score (0 - 100): {{ form().confidenceScore }}%</label>
                  <input type="number" step="0.1" min="0" max="100" class="field-input" [(ngModel)]="form().confidenceScore" />
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Confidence Tier</label>
                  <select class="field-select" [(ngModel)]="form().confidenceLevel">
                    <option value="High">High (&ge; 75%)</option>
                    <option value="Medium">Medium (50 - 74%)</option>
                    <option value="Low">Low (&lt; 50%)</option>
                  </select>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Recommended Action</label>
                  <select class="field-select" [(ngModel)]="form().recommendedAction">
                    <option value="Protect slot">Protect slot</option>
                    <option value="Proceed">Proceed</option>
                    <option value="Re-sequence">Re-sequence</option>
                    <option value="Pause or divert skills">Pause or divert skills</option>
                    <option value="Add capacity">Add capacity</option>
                  </select>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Strategic Cluster</label>
                  <select class="field-select" [(ngModel)]="form().cluster">
                    <option value="Platform">Platform</option>
                    <option value="Analytics & AI">Analytics & AI</option>
                    <option value="Security & Identity">Security & Identity</option>
                    <option value="Core Enterprise IT">Core Enterprise IT</option>
                  </select>
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Risk Rating</label>
                  <select class="field-select" [(ngModel)]="form().riskRating">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
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
                  <input type="number" step="0.5" class="field-input" [(ngModel)]="form().monthsToGoLive" />
                </div>

                <div class="form-field col-half">
                  <label class="field-label">Dependency Count</label>
                  <input type="number" step="1" class="field-input" [(ngModel)]="form().dependencyCount" />
                </div>
              </div>
            </div>
          }
        </div>

        <div class="modal-footer">
          <div class="footer-left">
            @if (activeTab() === 'core') {
              <button type="button" class="btn-recalc" (click)="onRecalculateAi()">
                <ion-icon name="flash-outline"></ion-icon>
                Auto-Fill AI Signals
              </button>
            }
          </div>

          <div class="footer-right">
            <button type="button" class="btn-cancel" (click)="cancel.emit()">Cancel</button>
            <button type="button" class="btn-save" (click)="onSave()">Save Changes</button>
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
      .recalc-btn {
        background: #7e22ce;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        padding: 7px 12px;
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .recalc-btn:hover {
        background: #6b21a8;
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
      .btn-recalc {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        color: var(--pmo-primary, #0078d4);
        padding: 7px 14px;
        border-radius: 6px;
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .btn-recalc:hover {
        background: #dbeafe;
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
  readonly store = inject(PortfolioStore);
  private readonly importService = inject(PortfolioImportService);

  readonly project = input.required<Project>();
  readonly save = output<Project>();
  readonly cancel = output<void>();

  readonly activeTab = signal<'core' | 'ai'>('core');
  readonly form = signal<Project>({} as Project);

  readonly availableBusinessUnits = [
    'Semiconductor Process Equipment',
    'Fab Operations',
    'Global Supply Chain',
    'Digital Transformation',
    'Finance and Controls',
    'Human Resources',
    'Information Security',
    'Manufacturing Engineering',
    'Customer Services',
    'Corporate IT',
  ];

  readonly availableSites = [
    'Fremont',
    'Tualatin',
    'Singapore',
    'Penang',
    'Hsinchu',
    'Global Remote',
  ];

  readonly availableSkills = [
    'Application Development',
    'Cloud and Infrastructure',
    'Data Engineering',
    'Cybersecurity',
    'Network Engineering',
    'Unified Communications',
    'Integration (iPaaS)',
    'Project Management',
  ];

  ngOnInit(): void {
    // Clone project into editable form signal
    this.form.set(JSON.parse(JSON.stringify(this.project())));
  }

  onRecalculateAi(): void {
    const updated = this.importService.recalculateAiSignals(this.form());
    this.form.set(updated);
  }

  onSave(): void {
    this.save.emit(this.form());
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.cancel.emit();
    }
  }
}
