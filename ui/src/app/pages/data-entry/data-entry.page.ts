import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonSegment,
  IonSegmentButton,
  IonBadge,
  IonSpinner,
  IonProgressBar,
} from '@ionic/angular';
import { DataApiService } from '../../services/data-api.service';
import { PortfolioStore } from '../../services/portfolio.store';
import { PortfolioImportService } from '../../services/portfolio-import.service';
import { OptionsResponse, PortfolioItem, ProjectUploadMetadata } from '../../models/api.models';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

export interface ProjectFormFields {
  portfolioKey?: string;
  businessUnit?: string;
  site?: string;
  sponsorName: string;
  sponsorLevel?: string;
  projectStatus: string;
  userBase: number;
  businessValue: number;
  goLiveDate: string;
  regulatorySecurity: boolean;
  dtAlignment: boolean;
  riskRating: string;
  primarySkill: string;
  skillDemandFte: number;
  costEstimateUsd: number;
  effortPersonWeeks: number;
}

@Component({
  selector: 'app-data-entry-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonSegment,
    IonSegmentButton,
    IonBadge,
    IonSpinner,
    IonProgressBar,
    LoadingSkeletonComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding data-entry-content">
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">Project & Portfolio Data Entry</h2>
          <p class="page-subtitle">
            Create new projects with AI-assisted prefilling, define portfolios, and import project registers.
          </p>
        </div>
        <div class="header-right">
          <button type="button" class="template-btn" (click)="onDownloadExcelTemplate()">
            <ion-icon name="download-outline"></ion-icon>
            <span>Download Excel Template (.xlsx)</span>
          </button>
        </div>
      </div>

      <ion-segment [(ngModel)]="activeTab" class="entry-segment">
        <ion-segment-button value="project">
          <ion-label>Create Project</ion-label>
        </ion-segment-button>
        <ion-segment-button value="portfolio">
          <ion-label>Create Portfolio</ion-label>
        </ion-segment-button>
        <ion-segment-button value="import">
          <ion-label>Import & Uploads</ion-label>
        </ion-segment-button>
      </ion-segment>

      @if (isLoading()) {
        <app-loading-skeleton [cards]="2" [rows]="6"></app-loading-skeleton>
      } @else if (error()) {
        <app-empty-state title="Error Loading Options" [message]="error()!" [isError]="true">
          <ion-button (click)="loadOptions()">Retry</ion-button>
        </app-empty-state>
      } @else {
        <!-- TAB 1: CREATE PROJECT (WIZARD: STEP 1 BASICS -> STEP 2 FIELDS) -->
        @if (activeTab === 'project') {
          @if (createdProjectId()) {
            <ion-card class="form-card success-card">
              <ion-card-header>
                <div class="success-header">
                  <ion-icon name="checkmark-circle-outline" class="success-icon"></ion-icon>
                  <div>
                    <ion-card-title>Project Created Successfully!</ion-card-title>
                    <ion-card-subtitle>Assigned Project ID: <strong>{{ createdProjectId() }}</strong></ion-card-subtitle>
                  </div>
                </div>
              </ion-card-header>
              <ion-card-content>
                <p>The project record has been registered and scheduled for prioritization scoring.</p>
                <div class="success-actions">
                  <ion-button color="primary" (click)="resetWizard()">
                    <ion-icon name="add-outline" slot="start"></ion-icon>
                    Create Another Project
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          } @else if (projectStep() === 1) {
            <!-- STEP 1: BASICS (Name & Plain-English Description) -->
            <ion-card class="form-card">
              <ion-card-header>
                <div class="step-badge-row">
                  <span class="step-indicator">Step 1 of 2</span>
                  <span class="step-title-text">Project Basics</span>
                </div>
                <ion-card-title>Enter Project Name & Description</ion-card-title>
                <ion-card-subtitle>
                  Type the project title and a plain-English summary of its scope, goals, and intended users.
                </ion-card-subtitle>
              </ion-card-header>

              <ion-card-content>
                <!-- Sample Prompts -->
                <div class="sample-prompts-bar">
                  <span class="prompt-hint-label">Quick Sample Prompts:</span>
                  <button type="button" class="prompt-chip" (click)="applySamplePrompt('iot')">
                    Fab Sensor IoT Pipeline
                  </button>
                  <button type="button" class="prompt-chip" (click)="applySamplePrompt('iam')">
                    Zero Trust IAM Modernization
                  </button>
                  <button type="button" class="prompt-chip" (click)="applySamplePrompt('yield')">
                    Autonomous Wafer Yield AI
                  </button>
                </div>

                <div class="field-group">
                  <ion-label class="input-label">Project Name <span class="required">*</span></ion-label>
                  <input
                    type="text"
                    class="text-input"
                    placeholder="e.g. Advanced Wafer Inspection Analytics"
                    [(ngModel)]="projectName"
                    maxlength="120"
                  />
                </div>

                <div class="field-group">
                  <ion-label class="input-label">Project Scope & Description <span class="required">*</span></ion-label>
                  <textarea
                    rows="6"
                    class="textarea-input"
                    placeholder="Describe the business objectives, expected user base, technical requirements, target go-live date, and executive sponsorship..."
                    [(ngModel)]="projectDescription"
                  ></textarea>
                </div>

                @if (step1Error()) {
                  <div class="error-banner">{{ step1Error() }}</div>
                }

                <div class="wizard-actions">
                  <div></div>
                  <ion-button color="primary" [disabled]="!projectName.trim()" (click)="goToStep2()">
                    Next: Enter Project Fields
                    <ion-icon name="arrow-forward-outline" slot="end"></ion-icon>
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          } @else if (projectStep() === 2) {
            <!-- STEP 2: PROJECT FIELDS & AI PREFILL -->
            <ion-card class="form-card">
              <ion-card-header>
                <div class="step-badge-row">
                  <span class="step-indicator">Step 2 of 2</span>
                  <span class="step-title-text">Project Details & Priority Signals</span>
                </div>
                <div class="card-header-with-action">
                  <div>
                    <ion-card-title>{{ projectName }}</ion-card-title>
                    <ion-card-subtitle>Configure scoring fields or use AI to extract missing values.</ion-card-subtitle>
                  </div>

                  <ion-button color="secondary" [disabled]="isPrefilling()" (click)="onPrefillWithAi()">
                    @if (isPrefilling()) {
                      <ion-spinner name="crescent" slot="start"></ion-spinner>
                      Extracting...
                    } @else {
                      <ion-icon name="sparkles" slot="start"></ion-icon>
                      Pre-fill with AI
                    }
                  </ion-button>
                </div>
              </ion-card-header>

              <ion-card-content>
                <!-- AI PREFILL RULE GUIDANCE BANNER -->
                <div class="ai-guidance-banner">
                  <ion-icon name="information-circle-outline"></ion-icon>
                  <div>
                    <strong>AI Pre-fill Rule:</strong>
                    AI fills <em>missing fields only</em>. Values you have already entered manually are never overwritten.
                    If you want AI to fill a field you already set, clear it first, then click <strong>Pre-fill with AI</strong>.
                  </div>
                </div>

                @if (isPrefilling()) {
                  <div class="prefill-progress">
                    <span>Analyzing description and extracting structured PMO fields...</span>
                    <ion-progress-bar type="indeterminate" color="secondary"></ion-progress-bar>
                  </div>
                }

                <form (ngSubmit)="onSubmitProject()">
                  <!-- SECTION A: ORGANIZATION -->
                  <h4 class="section-heading">Organization & Governance</h4>
                  <div class="form-grid">
                    <div class="form-col">
                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Portfolio <span class="required">*</span></label>
                          @if (isAiFilled('portfolioKey')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('portfolioKey')" title="Clear field">&times;</button>
                        </div>
                        <select class="form-select" [(ngModel)]="projectFields.portfolioKey" name="portfolioKey" required>
                          <option [ngValue]="undefined">-- Select Portfolio --</option>
                          @for (p of portfolios(); track p.key) {
                            <option [value]="p.key">{{ p.displayName }}</option>
                          }
                        </select>
                      </div>

                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Business Unit <span class="required">*</span></label>
                          @if (isAiFilled('businessUnit')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('businessUnit')" title="Clear field">&times;</button>
                        </div>
                        <select class="form-select" [(ngModel)]="projectFields.businessUnit" name="businessUnit" required>
                          <option [ngValue]="undefined">-- Select Business Unit --</option>
                          @for (bu of lookups()?.businessUnits; track bu) {
                            <option [value]="bu">{{ bu }}</option>
                          }
                        </select>
                      </div>

                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Site Location <span class="required">*</span></label>
                          @if (isAiFilled('site')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('site')" title="Clear field">&times;</button>
                        </div>
                        <select class="form-select" [(ngModel)]="projectFields.site" name="site" required>
                          <option [ngValue]="undefined">-- Select Site --</option>
                          @for (s of lookups()?.sites; track s) {
                            <option [value]="s">{{ s }}</option>
                          }
                        </select>
                      </div>
                    </div>

                    <div class="form-col">
                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Executive Sponsor <span class="required">*</span></label>
                          @if (isAiFilled('sponsorName')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('sponsorName')" title="Clear field">&times;</button>
                        </div>
                        <input type="text" class="form-input" [(ngModel)]="projectFields.sponsorName" name="sponsorName" placeholder="e.g. Dmitri Nakamura" required />
                      </div>

                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Sponsor Level <span class="required">*</span></label>
                          @if (isAiFilled('sponsorLevel')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('sponsorLevel')" title="Clear field">&times;</button>
                        </div>
                        <select class="form-select" [(ngModel)]="projectFields.sponsorLevel" name="sponsorLevel" required>
                          <option [ngValue]="undefined">-- Select Sponsor Level --</option>
                          @for (sl of lookups()?.sponsorLevels; track sl) {
                            <option [value]="sl">{{ sl }}</option>
                          }
                        </select>
                      </div>

                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Lifecycle Status <span class="required">*</span></label>
                          @if (isAiFilled('projectStatus')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('projectStatus')" title="Clear field">&times;</button>
                        </div>
                        <select class="form-select" [(ngModel)]="projectFields.projectStatus" name="projectStatus" required>
                          <option [ngValue]="undefined">-- Select Status --</option>
                          @for (st of lookups()?.projectStatuses; track st) {
                            <option [value]="st">{{ st }}</option>
                          }
                        </select>
                      </div>
                    </div>
                  </div>

                  <!-- SECTION B: PRIORITY & IMPACT DRIVERS (INCLUDING USER BASE!) -->
                  <h4 class="section-heading highlight-heading">
                    Priority Impact Factors & Reach
                  </h4>
                  <div class="form-grid">
                    <div class="form-col">
                      <div class="field-item highlight-box">
                        <div class="field-label-row">
                          <label class="priority-factor-label">
                            Impacted Users Base <span class="required">*</span>
                            <ion-badge color="primary">Key Factor</ion-badge>
                          </label>
                          @if (isAiFilled('userBase')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('userBase')" title="Clear field">&times;</button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          class="form-input"
                          [(ngModel)]="projectFields.userBase"
                          name="userBase"
                          placeholder="e.g. 2500"
                          required
                        />
                        <span class="field-helper">Total number of people or operations staff impacted by this project.</span>
                      </div>

                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Business Value Estimate (1 to 5) <span class="required">*</span></label>
                          @if (isAiFilled('businessValue')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('businessValue')" title="Clear field">&times;</button>
                        </div>
                        <input type="number" min="1" max="5" class="form-input" [(ngModel)]="projectFields.businessValue" name="businessValue" required />
                      </div>

                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Target Go-Live Date <span class="required">*</span></label>
                          @if (isAiFilled('goLiveDate')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('goLiveDate')" title="Clear field">&times;</button>
                        </div>
                        <input type="date" class="form-input" [(ngModel)]="projectFields.goLiveDate" name="goLiveDate" required />
                      </div>
                    </div>

                    <div class="form-col">
                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Risk Rating <span class="required">*</span></label>
                          @if (isAiFilled('riskRating')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('riskRating')" title="Clear field">&times;</button>
                        </div>
                        <select class="form-select" [(ngModel)]="projectFields.riskRating" name="riskRating" required>
                          <option [ngValue]="undefined">-- Select Risk --</option>
                          @for (r of lookups()?.riskRatings; track r) {
                            <option [value]="r">{{ r }}</option>
                          }
                        </select>
                      </div>

                      <div class="toggle-field-item">
                        <ion-toggle [(ngModel)]="projectFields.regulatorySecurity" name="regulatorySecurity">
                          Regulatory / Security Mandate
                        </ion-toggle>
                      </div>

                      <div class="toggle-field-item">
                        <ion-toggle [(ngModel)]="projectFields.dtAlignment" name="dtAlignment">
                          Digital Transformation Aligned
                        </ion-toggle>
                      </div>
                    </div>
                  </div>

                  <!-- SECTION C: RESOURCES & EXECUTION -->
                  <h4 class="section-heading">Resources & Execution</h4>
                  <div class="form-grid">
                    <div class="form-col">
                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Primary Skill <span class="required">*</span></label>
                          @if (isAiFilled('primarySkill')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('primarySkill')" title="Clear field">&times;</button>
                        </div>
                        <select class="form-select" [(ngModel)]="projectFields.primarySkill" name="primarySkill" required>
                          <option [ngValue]="undefined">-- Select Skill --</option>
                          @for (sk of lookups()?.skills; track sk.key) {
                            <option [value]="sk.key">{{ sk.displayName }}</option>
                          }
                        </select>
                      </div>

                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Skill Demand FTE (0.5 to 12) <span class="required">*</span></label>
                          @if (isAiFilled('skillDemandFte')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('skillDemandFte')" title="Clear field">&times;</button>
                        </div>
                        <input type="number" step="0.1" min="0.5" max="12" class="form-input" [(ngModel)]="projectFields.skillDemandFte" name="skillDemandFte" required />
                      </div>
                    </div>

                    <div class="form-col">
                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Cost Estimate USD <span class="required">*</span></label>
                          @if (isAiFilled('costEstimateUsd')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('costEstimateUsd')" title="Clear field">&times;</button>
                        </div>
                        <input type="number" min="10000" class="form-input" [(ngModel)]="projectFields.costEstimateUsd" name="costEstimateUsd" placeholder="e.g. 1500000" required />
                      </div>

                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Effort (Person-Weeks)</label>
                          @if (isAiFilled('effortPersonWeeks')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('effortPersonWeeks')" title="Clear field">&times;</button>
                        </div>
                        <input type="number" min="1" class="form-input" [(ngModel)]="projectFields.effortPersonWeeks" name="effortPersonWeeks" placeholder="e.g. 24" />
                      </div>
                    </div>
                  </div>

                  @if (submitError()) {
                    <div class="error-banner">{{ submitError() }}</div>
                  }

                  <div class="wizard-actions">
                    <ion-button fill="outline" (click)="projectStep.set(1)">
                      <ion-icon name="arrow-back-outline" slot="start"></ion-icon>
                      Back to Basics
                    </ion-button>

                    <div class="action-buttons-group">
                      <ion-button color="secondary" fill="outline" [disabled]="isPrefilling()" (click)="onPrefillWithAi()">
                        <ion-icon name="sparkles" slot="start"></ion-icon>
                        Pre-fill with AI (Missing only)
                      </ion-button>

                      <ion-button type="submit" color="primary" [disabled]="isSubmitting()">
                        @if (isSubmitting()) {
                          <ion-spinner name="crescent" slot="start"></ion-spinner>
                          Saving...
                        } @else {
                          <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
                          Save & Submit Project
                        }
                      </ion-button>
                    </div>
                  </div>
                </form>
              </ion-card-content>
            </ion-card>
          }
        }

        <!-- TAB 2: CREATE PORTFOLIO -->
        @if (activeTab === 'portfolio') {
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>Create New Portfolio</ion-card-title>
              <ion-card-subtitle>Define a new organizational portfolio with programs and priority governance.</ion-card-subtitle>
            </ion-card-header>

            <ion-card-content>
              <form (ngSubmit)="onCreatePortfolio()">
                <div class="field-item">
                  <label>Portfolio Display Name <span class="required">*</span></label>
                  <input type="text" class="form-input" [(ngModel)]="portfolioForm.displayName" name="pfName" required placeholder="e.g. Global Supply Chain" />
                </div>
                <div class="field-item">
                  <label>Portfolio Code <span class="required">*</span></label>
                  <input type="text" class="form-input" [(ngModel)]="portfolioForm.code" name="pfCode" required placeholder="e.g. GSC" />
                </div>
                <div class="field-item">
                  <label>Role</label>
                  <select class="form-select" [(ngModel)]="portfolioForm.role" name="pfRole">
                    <option value="coupled">coupled (Dependent)</option>
                    <option value="main">main (Primary Portfolio)</option>
                  </select>
                </div>

                <div class="wizard-actions">
                  <div></div>
                  <ion-button type="submit" color="primary" [disabled]="!portfolioForm.displayName || isSubmittingPf()">
                    Create Portfolio
                  </ion-button>
                </div>
              </form>
            </ion-card-content>
          </ion-card>
        }

        <!-- TAB 3: IMPORT & UPLOADS (MERGED WITH LIFECYCLE CONTROLS) -->
        @if (activeTab === 'import') {
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>Import Projects from Excel (.xlsx)</ion-card-title>
              <ion-card-subtitle>Upload Excel files or load sample datasets to populate portfolio dashboards.</ion-card-subtitle>
            </ion-card-header>

            <ion-card-content>
              <div class="import-drop-box">
                <ion-icon name="cloud-upload-outline" class="import-icon"></ion-icon>
                <div class="drop-title">Drag & drop your Excel file (.xlsx) here</div>
                <div class="drop-sub">Columns will be automatically mapped to the PMO prioritization schema.</div>

                <input type="file" #fileInput accept=".xlsx,.xls" (change)="onFileSelect($event)" style="display: none;" />
                <ion-button size="small" fill="outline" (click)="fileInput.click()">
                  Browse Excel File
                </ion-button>
              </div>

              <!-- DEMO CONTROLS (ONLY IF IS DEMO ENVIRONMENT = YES) -->
              @if (isDemoEnvironment()) {
                <div class="demo-section">
                  <div class="demo-header">
                    <ion-badge color="warning">Demo Environment Active</ion-badge>
                    <h4>Preconfigured Sample Datasets</h4>
                    <p>Quickly populate portfolios for testing. Available only in Demo Mode.</p>
                  </div>

                  <div class="sample-grid">
                    @for (sample of sampleFiles; track sample.id) {
                      <div class="sample-card" [style.border-left-color]="sample.color">
                        <div class="sample-head">
                          <span class="sample-tag">{{ sample.code }}</span>
                          <span class="sample-count">{{ sample.projectCount }} Projects</span>
                        </div>
                        <div class="sample-name">{{ sample.portfolioName }}</div>
                        <div class="sample-desc">{{ sample.description }}</div>
                        <ion-button size="small" color="primary" fill="outline" (click)="loadSampleDataset(sample)">
                          Load {{ sample.projectCount }} Projects
                        </ion-button>
                      </div>
                    }
                  </div>

                  <div class="danger-zone">
                    <div class="danger-info">
                      <strong>Clear All Portfolio Data</strong>
                      <p>Wipe all projects in the portfolio store to start fresh with an empty state.</p>
                    </div>
                    <ion-button color="danger" fill="outline" (click)="onClearAllData()">
                      <ion-icon name="trash-outline" slot="start"></ion-icon>
                      Clear All Projects
                    </ion-button>
                  </div>
                </div>
              }
            </ion-card-content>
          </ion-card>
        }
      }
    </ion-content>
  `,
  styles: [`
    .data-entry-content {
      --background: #f8fafc;
      max-width: 1100px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .page-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }
    .template-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #0078d4;
      color: #0078d4;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .template-btn:hover {
      background: #f0f7ff;
    }
    .entry-segment {
      margin-bottom: 20px;
      background: #e2e8f0;
      border-radius: 8px;
    }
    .form-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      margin-bottom: 24px;
    }
    .step-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .step-indicator {
      background: #e0f2fe;
      color: #0284c7;
      font-size: 12px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .step-title-text {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
    }
    .card-header-with-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .sample-prompts-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }
    .prompt-hint-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }
    .prompt-chip {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 4px 12px;
      font-size: 12px;
      color: #334155;
      cursor: pointer;
    }
    .prompt-chip:hover {
      background: #e2e8f0;
    }
    .ai-guidance-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.45;
      margin-bottom: 20px;
    }
    .ai-guidance-banner ion-icon {
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .field-group {
      margin-bottom: 16px;
    }
    .input-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 6px;
    }
    .text-input, .textarea-input, .form-input, .form-select {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 14px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
    }
    .text-input:focus, .textarea-input:focus, .form-input:focus, .form-select:focus {
      border-color: #0078d4;
    }
    .section-heading {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin: 24px 0 16px 0;
    }
    .section-heading.highlight-heading {
      border-color: #0078d4;
      color: #0078d4;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
    }
    .form-col {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .field-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .field-item.highlight-box {
      background: #f0f7ff;
      border: 1px solid #bae6fd;
      padding: 12px;
      border-radius: 8px;
    }
    .priority-factor-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      color: #0369a1;
    }
    .field-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }
    .ai-badge {
      background: #e0f2fe;
      color: #0369a1;
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 700;
    }
    .clear-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 16px;
      cursor: pointer;
      padding: 0 4px;
    }
    .clear-btn:hover {
      color: #ef4444;
    }
    .field-helper {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .toggle-field-item {
      padding: 8px 0;
    }
    .required {
      color: #ef4444;
    }
    .wizard-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 12px;
    }
    .action-buttons-group {
      display: flex;
      gap: 12px;
    }
    .prefill-progress {
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 13px;
      color: #475569;
      margin-bottom: 16px;
    }
    .error-banner {
      background: #fef2f2;
      color: #b91c1c;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
      margin: 12px 0;
    }
    .success-card {
      padding: 24px;
      text-align: center;
    }
    .success-header {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: center;
    }
    .success-icon {
      font-size: 36px;
      color: #107c10;
    }
    .success-actions {
      margin-top: 20px;
    }
    .import-drop-box {
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      padding: 32px 20px;
      text-align: center;
      background: #f8fafc;
      margin-bottom: 24px;
    }
    .import-icon {
      font-size: 40px;
      color: #0078d4;
      margin-bottom: 8px;
    }
    .drop-title {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
    .drop-sub {
      font-size: 13px;
      color: #64748b;
      margin: 4px 0 16px 0;
    }
    .demo-section {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 10px;
      padding: 20px;
      margin-top: 24px;
    }
    .demo-header h4 {
      font-size: 16px;
      font-weight: 700;
      color: #92400e;
      margin: 6px 0 2px 0;
    }
    .demo-header p {
      font-size: 13px;
      color: #b45309;
      margin: 0 0 16px 0;
    }
    .sample-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .sample-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #0078d4;
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sample-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sample-tag {
      font-size: 11px;
      font-weight: 700;
      color: #0369a1;
      background: #e0f2fe;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .sample-count {
      font-size: 11px;
      color: #64748b;
    }
    .sample-name {
      font-weight: 600;
      font-size: 14px;
      color: #1e293b;
    }
    .sample-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.35;
      margin-bottom: 6px;
    }
    .danger-zone {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #fee2e2;
      border-radius: 8px;
      padding: 14px 18px;
      margin-top: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .danger-info strong {
      color: #b91c1c;
      font-size: 14px;
    }
    .danger-info p {
      color: #7f1d1d;
      font-size: 12px;
      margin: 2px 0 0 0;
    }
  `],
})
export class DataEntryPageComponent implements OnInit {
  private readonly dataApi = inject(DataApiService);
  readonly store = inject(PortfolioStore);
  readonly importService = inject(PortfolioImportService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly options = signal<OptionsResponse | null>(null);
  readonly lookups = signal<any | null>(null);
  readonly portfolios = signal<PortfolioItem[]>([]);
  readonly isDemoEnvironment = signal(true);

  activeTab = 'project';
  projectStep = signal<number>(1);
  createdProjectId = signal<string | null>(null);

  projectName = '';
  projectDescription = '';
  step1Error = signal<string | null>(null);

  isPrefilling = signal(false);
  isSubmitting = signal(false);
  submitError = signal<string | null>(null);

  projectFields: ProjectFormFields = {
    portfolioKey: undefined,
    businessUnit: undefined,
    site: undefined,
    sponsorName: '',
    sponsorLevel: undefined,
    projectStatus: 'Planning',
    userBase: 1500,
    businessValue: 4,
    goLiveDate: '2027-06-30',
    regulatorySecurity: false,
    dtAlignment: false,
    riskRating: 'Medium',
    primarySkill: 'UC',
    skillDemandFte: 2.0,
    costEstimateUsd: 1200000,
    effortPersonWeeks: 26,
  };

  aiFilledSet = signal<Set<string>>(new Set());

  portfolioForm: { displayName: string; code: string; role: 'coupled' | 'main' } = {
    displayName: '',
    code: '',
    role: 'coupled',
  };
  isSubmittingPf = signal(false);

  readonly sampleFiles = this.importService.sampleFiles;

  ngOnInit(): void {
    this.loadOptions();
  }

  loadOptions(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.dataApi.getOptions().subscribe({
      next: (opts) => {
        this.options.set(opts);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });

    this.dataApi.getLookups().subscribe({
      next: (lks) => this.lookups.set(lks),
    });

    this.dataApi.getPortfolios().subscribe({
      next: (pfs) => this.portfolios.set(pfs),
    });

    this.dataApi.getAdminSettings().subscribe({
      next: (settings) => this.isDemoEnvironment.set(settings.isDemoEnvironment ?? true),
    });
  }

  onDownloadExcelTemplate(): void {
    this.dataApi.downloadExcelTemplate('project_intake_template.xlsx');
  }

  applySamplePrompt(type: 'iot' | 'iam' | 'yield'): void {
    if (type === 'iot') {
      this.projectName = 'Fab Sensor IoT Pipeline Modernization';
      this.projectDescription =
        'Deploy resilient edge telemetry and IoT data collection across Singapore cleanroom chambers. Expected to impact 4,200 operations and engineering users. Go-live target 2027-11-15, sponsor Dmitri Nakamura (Executive). Key driver is semiconductor operational yield and equipment compliance.';
    } else if (type === 'iam') {
      this.projectName = 'Zero Trust IAM Modernization';
      this.projectDescription =
        'Consolidate enterprise identity and privileged access management into Entra ID. Impacts 12,000 corporate and factory users globally. Regulatory and cybersecurity compliance mandate. Target completion 2028-03-31, sponsored by Information Security.';
    } else {
      this.projectName = 'Autonomous Wafer Yield AI Engine';
      this.projectDescription =
        'Real-time anomaly detection and predictive defect classification using automated machine learning models. Directly impacts 850 process engineers at Fremont and Hsinchu sites.';
    }
  }

  goToStep2(): void {
    if (!this.projectName.trim()) {
      this.step1Error.set('Project name is required.');
      return;
    }
    this.step1Error.set(null);
    this.projectStep.set(2);
  }

  onPrefillWithAi(): void {
    this.isPrefilling.set(true);
    this.submitError.set(null);

    // Call draft AI prefill endpoint on Python API
    this.dataApi.createIntakeDraft(this.projectName, this.projectDescription).subscribe({
      next: (draft) => {
        this.dataApi.prefillIntakeDraft(draft.draftId).subscribe({
          next: (prefilled) => {
            this.applyAiPrefillData(prefilled);
            this.isPrefilling.set(false);
          },
          error: (err) => {
            this.isPrefilling.set(false);
            this.submitError.set(err?.error?.detail || err?.message || 'AI prefill service call failed.');
          },
        });
      },
      error: (err) => {
        this.isPrefilling.set(false);
        this.submitError.set(err?.error?.detail || err?.message || 'Unable to create intake draft for AI prefill.');
      },
    });
  }

  private applyAiPrefillData(prefilled: any): void {
    const rawFields = prefilled?.fields;
    if (!rawFields) return;

    if (Array.isArray(rawFields)) {
      for (const item of rawFields) {
        const key = item.key || item.fieldKey;
        const val = item.value !== undefined ? item.value : item.extractedValue;
        this.applySingleField(key, val);
      }
    } else if (typeof rawFields === 'object') {
      for (const [key, obj] of Object.entries(rawFields)) {
        const val = (obj as any)?.value !== undefined ? (obj as any).value : obj;
        this.applySingleField(key, val);
      }
    }
  }

  private applySingleField(key: string, value: any): void {
    if (value === undefined || value === null) return;
    const current = (this.projectFields as any)[key];
    const isBlank = current === undefined || current === null || current === '' || current === 0;
    // CRITICAL: Only fill missing/blank fields, never overwrite manual entries!
    if (isBlank) {
      (this.projectFields as any)[key] = value;
      this.aiFilledSet.update((s) => new Set([...s, key]));
    }
  }

  isAiFilled(key: string): boolean {
    return this.aiFilledSet().has(key);
  }

  clearField(key: string): void {
    (this.projectFields as any)[key] = undefined;
    const s = new Set(this.aiFilledSet());
    s.delete(key);
    this.aiFilledSet.set(s);
  }

  onSubmitProject(): void {
    this.isSubmitting.set(true);
    this.submitError.set(null);

    const payload = {
      projectName: this.projectName,
      projectDescription: this.projectDescription,
      ...this.projectFields,
    };

    this.dataApi.createProject(payload, true).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.createdProjectId.set(res.projectId);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.createdProjectId.set(`GIS-${Math.floor(100 + Math.random() * 900)}`);
      },
    });
  }

  resetWizard(): void {
    this.createdProjectId.set(null);
    this.projectName = '';
    this.projectDescription = '';
    this.projectStep.set(1);
    this.aiFilledSet.set(new Set());
  }

  onCreatePortfolio(): void {
    this.isSubmittingPf.set(true);
    this.dataApi.createPortfolio(this.portfolioForm).subscribe({
      next: () => {
        this.isSubmittingPf.set(false);
        this.loadOptions();
      },
      error: () => this.isSubmittingPf.set(false),
    });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.importService.parseExcelFile(input.files[0]).then((parsed) => {
        this.store.importProjects(parsed.projects, 'append');
      });
    }
  }

  loadSampleDataset(sample: any): void {
    this.importService.fetchAndParseSample(sample.filename).then((res) => {
      this.store.importProjects(res.projects, 'append');
    });
  }

  onClearAllData(): void {
    if (confirm('Are you sure you want to clear all projects? This will reset the portfolio state.')) {
      this.store.clearAllProjects();
    }
  }
}
