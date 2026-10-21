import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, Subscription, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
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
import { businessText, problemMessage } from '../../core/problem-detail';
import { DemoProjectCatalog, DemoResetResult, IntakeDraft, IntakeSuggestion, OptionsResponse, PortfolioItem, ProblemDetail, ProjectFieldDef, ProjectImportResult, ProjectUploadMetadata } from '../../models/api.models';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

/** Blank numbers stay null until typed, so no example value is ever submitted. */
export interface ProjectFormFields {
  portfolioKey?: string;
  programKey?: string;
  businessUnit?: string;
  site?: string;
  sponsorName: string;
  sponsorLevel?: string;
  projectStatus?: string;
  userBase: number | null;
  businessValue: number | null;
  goLiveDate?: string;
  regulatorySecurity: boolean;
  dtAlignment: boolean;
  riskRating?: string;
  primarySkill?: string;
  skillDemandFte: number | null;
  costEstimateUsd: number | null;
  effortPersonWeeks: number | null;
  notes?: string;
}

interface ProjectValidationIssue {
  field: string;
  label: string;
  message: string;
}

@Component({
  selector: 'app-data-entry-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
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
                  <ion-button fill="outline" [routerLink]="['/projects', createdProjectId()]">Record project progress</ion-button>
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
                <div class="field-group">
                  <ion-label class="input-label">Project Name <span class="required">*</span></ion-label>
                  <input
                    type="text"
                    class="text-input"
                    placeholder="Name the project"
                    [(ngModel)]="projectName"
                    maxlength="120"
                  />
                </div>

                <div class="field-group">
                  <ion-label class="input-label">Project Scope & Description</ion-label>
                  <textarea
                    rows="6"
                    class="textarea-input"
                    placeholder="Describe the business objectives, expected user base, technical requirements, target go-live date, and executive sponsorship..."
                    [(ngModel)]="projectDescription"
                    [attr.maxlength]="projectField('notes')?.maxLength"
                  ></textarea>
                  <span class="field-helper">
                    Saved in the project's Notes and used by AI to suggest missing details.
                    @if (projectField('notes')?.maxLength; as limit) { Maximum {{ limit }} characters. }
                    A description is needed for AI prefill; it is optional when completing the fields manually.
                  </span>
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
                      Pre-fill with AI (Missing only)
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

                <ng-template #suggestionRow let-key="key">
                  @if (suggestionFor(key); as suggestion) {
                    <div class="suggestion-row" role="status">
                      <div class="suggestion-text">
                        <strong>{{ suggestion.label }}</strong>
                        <span>{{ suggestion.rationale }}</span>
                      </div>
                      <div class="suggestion-actions">
                        <button type="button" class="suggestion-apply" [disabled]="applyingSuggestion() !== null" (click)="applySuggestion(key)">
                          {{ applyingSuggestion() === key ? 'Creating...' : 'Create and apply' }}
                        </button>
                        <button type="button" class="suggestion-dismiss" [disabled]="applyingSuggestion() !== null" (click)="dismissSuggestion(key)">Dismiss</button>
                      </div>
                    </div>
                  }
                </ng-template>

                <form #projectForm="ngForm" (ngSubmit)="onSubmitProject(projectForm)">
                  <p class="field-helper">
                    Fields marked * are required, including Effort. Choose a Portfolio before selecting its Program.
                    For new work, use Planning or Backlog; record start and completion dates from project details after saving.
                  </p>
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
                        <select class="form-select" [(ngModel)]="projectFields.portfolioKey" (ngModelChange)="onPortfolioChanged($event)" name="portfolioKey" required>
                          <option [ngValue]="undefined">-- Select Portfolio --</option>
                          @for (p of portfolios(); track p.key) {
                            <option [value]="p.key">{{ p.displayName }}</option>
                          }
                        </select>
                        <ng-container *ngTemplateOutlet="suggestionRow; context: { key: 'portfolioKey' }"></ng-container>
                      </div>

                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Program <span class="required">*</span></label>
                          @if (isAiFilled('programKey')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('programKey')" title="Clear field">&times;</button>
                        </div>
                        <select class="form-select" [(ngModel)]="projectFields.programKey" name="programKey" required [disabled]="!projectFields.portfolioKey">
                          <option [ngValue]="undefined">-- Select Program --</option>
                          @for (program of programsOf(projectFields.portfolioKey); track program.key) {
                            <option [value]="program.key">{{ programLabel(program) }}</option>
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
                        <ng-container *ngTemplateOutlet="suggestionRow; context: { key: 'businessUnit' }"></ng-container>
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
                        <ng-container *ngTemplateOutlet="suggestionRow; context: { key: 'site' }"></ng-container>
                      </div>
                    </div>

                    <div class="form-col">
                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Executive Sponsor <span class="required">*</span></label>
                          @if (isAiFilled('sponsorName')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('sponsorName')" title="Clear field">&times;</button>
                        </div>
                        <input type="text" class="form-input" [(ngModel)]="projectFields.sponsorName" name="sponsorName" placeholder="Full name of the executive sponsor" [minlength]="projectField('sponsorName')?.minLength ?? null" [maxlength]="projectField('sponsorName')?.maxLength ?? null" required />
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
                          [min]="projectField('userBase')?.min ?? null"
                          [max]="projectField('userBase')?.max ?? null"
                          step="1"
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
                        <input type="number" [min]="projectField('businessValue')?.min ?? null" [max]="projectField('businessValue')?.max ?? null" step="1" class="form-input" [(ngModel)]="projectFields.businessValue" name="businessValue" required />
                      </div>

                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Target Go-Live Date <span class="required">*</span></label>
                          @if (isAiFilled('goLiveDate')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('goLiveDate')" title="Clear field">&times;</button>
                        </div>
                        <input type="date" class="form-input" [(ngModel)]="projectFields.goLiveDate" name="goLiveDate" [min]="projectField('goLiveDate')?.minDate ?? null" [max]="projectField('goLiveDate')?.maxDate ?? null" required />
                        <span class="field-helper">Allowed dates: {{ projectField('goLiveDate')?.minDate }} to {{ projectField('goLiveDate')?.maxDate }}.</span>
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
                        <input type="number" step="0.1" [min]="projectField('skillDemandFte')?.min ?? null" [max]="projectField('skillDemandFte')?.max ?? null" class="form-input" [(ngModel)]="projectFields.skillDemandFte" name="skillDemandFte" required />
                      </div>
                    </div>

                    <div class="form-col">
                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Cost Estimate USD <span class="required">*</span></label>
                          @if (isAiFilled('costEstimateUsd')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('costEstimateUsd')" title="Clear field">&times;</button>
                        </div>
                        <input type="number" [min]="projectField('costEstimateUsd')?.min ?? null" [max]="projectField('costEstimateUsd')?.max ?? null" class="form-input" [(ngModel)]="projectFields.costEstimateUsd" name="costEstimateUsd" placeholder="e.g. 1500000" required />
                        <span class="field-helper">Allowed total cost: {{ projectField('costEstimateUsd')?.min | number }} to {{ projectField('costEstimateUsd')?.max | number }} USD.</span>
                      </div>

                      <div class="field-item">
                        <div class="field-label-row">
                          <label>Effort (Person-Weeks) <span class="required">*</span></label>
                          @if (isAiFilled('effortPersonWeeks')) { <span class="ai-badge">AI</span> }
                          <button type="button" class="clear-btn" (click)="clearField('effortPersonWeeks')" title="Clear field">&times;</button>
                        </div>
                        <input type="number" [min]="projectField('effortPersonWeeks')?.min ?? null" [max]="projectField('effortPersonWeeks')?.max ?? null" class="form-input" [(ngModel)]="projectFields.effortPersonWeeks" name="effortPersonWeeks" placeholder="e.g. 24" required />
                        <span class="field-helper">Required: {{ projectField('effortPersonWeeks')?.min }} to {{ projectField('effortPersonWeeks')?.max }} person-weeks of total estimated work.</span>
                      </div>
                    </div>
                  </div>

                  @if (submitError()) {
                    <div class="error-banner validation-summary" role="alert">
                      <strong>{{ submitError() }}</strong>
                      @if (submitIssues().length) {
                        <ul>
                          @for (issue of submitIssues(); track issue.field + issue.message) {
                            <li><strong>{{ issue.label }}:</strong> {{ issue.message }}</li>
                          }
                        </ul>
                      }
                      <p>Your entries have been kept. Correct the listed fields, then select Save & Submit Project again.</p>
                    </div>
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

                      <ion-button type="submit" color="primary" [disabled]="isSubmitting() || isPrefilling() || applyingSuggestion() !== null">
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
          @if (demoSettingsLoading()) {
            <p role="status">Checking demo controls...</p>
          }
          @if (demoError(); as message) {
            <div class="error-banner" role="alert">
              {{ message }}
              <ion-button size="small" fill="clear" (click)="loadDemoState()" [disabled]="demoBusy()">Retry demo controls</ion-button>
            </div>
          }
          @if (isDemo()) {
            <ion-card class="form-card demo-controls">
              <ion-card-header>
                <ion-card-title>Demo Project Data</ion-card-title>
                <ion-card-subtitle>
                  Synthetic data only. Loads replace the chosen scope, never append duplicates.
                  These actions are blocked when the global demo setting is off.
                </ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                @if (demoCatalog(); as catalog) {
                  <p class="import-note">
                    Approved database snapshot: {{ catalog.projectCount }} projects, with priority scores as of {{ catalog.asOfDate }}.
                    Loading reuses those scores. Original capacity and project-group summaries are hidden after a reset because they no longer describe the selected projects.
                  </p>
                  <div class="demo-load-actions">
                    <ion-button class="demo-load-all" [disabled]="demoBusy() || importing()" (click)="requestDemoAction('all')">
                      Load {{ catalog.projectCount }} Demo Projects
                    </ion-button>
                    <label class="field-item">
                      Portfolio subset
                      <select class="form-select" [(ngModel)]="demoPortfolioKey" [disabled]="demoBusy()">
                        <option value="">Select a demo portfolio</option>
                        @for (portfolio of catalog.portfolios; track portfolio.key) {
                          <option [value]="portfolio.key">{{ portfolio.displayName }} ({{ portfolio.projectCount }})</option>
                        }
                      </select>
                    </label>
                    <ion-button class="demo-load-portfolio" fill="outline"
                      [disabled]="!demoPortfolioKey || demoBusy() || importing()" (click)="requestDemoAction('portfolio')">
                      Load Selected Portfolio
                    </ion-button>
                  </div>
                }
                <div class="danger-zone">
                  <div>
                    <strong>Clear all projects</strong>
                    <p class="import-note">Removes every project from application views, including pending and deleted items. Original source files and audit history are retained in the database.</p>
                  </div>
                  <ion-button class="demo-clear" color="danger" fill="outline"
                    [disabled]="demoBusy() || importing()" (click)="requestDemoAction('clear')">Clear All Projects</ion-button>
                </div>
                @if (demoConfirmation(); as action) {
                  <div class="demo-confirmation" role="alertdialog" aria-label="Confirm demo project replacement">
                    <strong>{{ action === 'clear' ? 'Clear every project?' : 'Replace project data?' }}</strong>
                    <p>{{ demoConfirmationText() }}</p>
                    <ion-button class="demo-confirm" color="danger" [disabled]="demoBusy()" (click)="confirmDemoAction()">Confirm</ion-button>
                    <ion-button fill="clear" [disabled]="demoBusy()" (click)="demoConfirmation.set(null)">Cancel</ion-button>
                  </div>
                }
                @if (demoBusy()) {
                  <p role="status"><ion-spinner name="crescent"></ion-spinner> Saving the project selection in the database...</p>
                }
                @if (demoResult(); as result) {
                  <p class="import-result" role="status">
                    {{ result.action === 'clear' ? 'All projects cleared from application views.' : result.loadedProjects + ' demo projects loaded.' }}
                    {{ result.totalProjects }} projects now in the application.
                  </p>
                }
              </ion-card-content>
            </ion-card>
          }
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>Import Projects from Excel (.xlsx)</ion-card-title>
              <ion-card-subtitle>Each row is checked first. If any row is invalid, nothing is saved and every problem is listed.</ion-card-subtitle>
            </ion-card-header>

            <ion-card-content>
              <div class="import-drop-box">
                <ion-icon name="cloud-upload-outline" class="import-icon"></ion-icon>
                <div class="drop-title">Drag & drop your Excel file (.xlsx) here</div>
                <div class="drop-sub">Columns will be automatically mapped to the PMO prioritization schema.</div>

                <input type="file" #fileInput accept=".xlsx,.xls" (change)="onFileSelect($event)" style="display: none;" />
                <ion-button size="small" fill="outline" [disabled]="importing() || demoBusy()" (click)="fileInput.click()">
                  Browse Excel File
                </ion-button>
              </div>

              @if (importing()) {
                <p class="import-note">Checking and saving the workbook…</p>
              }

              @if (importError(); as message) {
                <div class="error-banner" role="alert">
                  <div>{{ message }}</div>
                  @for (issue of importIssues(); track issue) {
                    <div class="import-issue">{{ issue }}</div>
                  }
                </div>
              }

              @if (importResult(); as result) {
                <div class="import-result" role="status">
                  <div>Saved {{ result.count }} project{{ result.count === 1 ? '' : 's' }}. Scores and dashboards update when the analysis refresh finishes.</div>
                  <div class="import-ids">
                    @for (item of result.created; track item.projectId) {
                      <span class="project-pill">{{ item.projectId }}</span>
                    }
                  </div>
                  @for (warning of result.warnings; track warning) {
                    <div class="import-issue">{{ warning }}</div>
                  }
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
    .suggestion-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px 12px;
      background: #fffbeb;
      border: 1px dashed #f59e0b;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 12px;
      color: #78350f;
    }
    .suggestion-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .suggestion-text span {
      color: #92400e;
    }
    .suggestion-actions {
      display: flex;
      gap: 6px;
    }
    .suggestion-apply,
    .suggestion-dismiss {
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .suggestion-apply {
      background: #0078d4;
      border: 1px solid #0078d4;
      color: #ffffff;
    }
    .suggestion-dismiss {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .suggestion-apply:disabled,
    .suggestion-dismiss:disabled {
      opacity: 0.6;
      cursor: default;
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
    .import-note {
      color: #475569;
      font-size: 13px;
    }
    .demo-load-actions { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; }
    .demo-load-actions .field-item { min-width: 240px; flex: 1; margin: 0; }
    .demo-confirmation { border: 1px solid #fca5a5; background: #fff7ed; border-radius: 8px; padding: 16px; margin-top: 16px; }
    .import-result {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      font-size: 13px;
    }
    .import-ids {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 8px 0;
    }
    .import-issue {
      font-size: 12px;
      margin-top: 4px;
    }
  `],
})
export class DataEntryPageComponent implements OnInit {
  private readonly dataApi = inject(DataApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(PortfolioStore);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly options = signal<OptionsResponse | null>(null);
  readonly lookups = signal<any | null>(null);
  readonly portfolios = signal<PortfolioItem[]>([]);
  readonly importing = signal(false);
  readonly importResult = signal<ProjectImportResult | null>(null);
  readonly importError = signal<string | null>(null);
  readonly importIssues = signal<string[]>([]);
  readonly isDemo = signal(false);
  readonly demoSettingsLoading = signal(false);
  readonly demoCatalog = signal<DemoProjectCatalog | null>(null);
  readonly demoError = signal<string | null>(null);
  readonly demoBusy = signal(false);
  readonly demoResult = signal<DemoResetResult | null>(null);
  readonly demoConfirmation = signal<'all' | 'portfolio' | 'clear' | null>(null);
  demoPortfolioKey = '';
  private demoStateRequest?: Subscription;
  private confirmedPortfolioKey?: string;

  activeTab = 'project';
  projectStep = signal<number>(1);
  createdProjectId = signal<string | null>(null);

  projectName = '';
  projectDescription = '';
  step1Error = signal<string | null>(null);

  isPrefilling = signal(false);
  isSubmitting = signal(false);
  submitError = signal<string | null>(null);
  readonly submitIssues = signal<ProjectValidationIssue[]>([]);

  projectFields: ProjectFormFields = {
    portfolioKey: undefined,
    businessUnit: undefined,
    site: undefined,
    sponsorName: '',
    sponsorLevel: undefined,
    projectStatus: 'Planning',
    userBase: null,
    businessValue: null,
    goLiveDate: '',
    regulatorySecurity: false,
    dtAlignment: false,
    riskRating: undefined,
    primarySkill: undefined,
    skillDemandFte: null,
    costEstimateUsd: null,
    effortPersonWeeks: null,
  };

  aiFilledSet = signal<Set<string>>(new Set());
  readonly draftId = signal<string | null>(null);
  readonly suggestions = signal<Record<string, IntakeSuggestion>>({});
  readonly applyingSuggestion = signal<string | null>(null);
  private draftFields: Record<string, { value?: unknown } | undefined> = {};

  portfolioForm: { displayName: string; code: string; role: 'coupled' | 'main' } = {
    displayName: '',
    code: '',
    role: 'coupled',
  };
  isSubmittingPf = signal(false);

  ngOnInit(): void {
    this.loadOptions();
  }

  ionViewWillEnter(): void {
    this.loadDemoState();
  }

  loadDemoState(): void {
    this.demoStateRequest?.unsubscribe();
    this.isDemo.set(false);
    this.demoCatalog.set(null);
    this.demoConfirmation.set(null);
    this.demoSettingsLoading.set(true);
    this.demoError.set(null);
    this.demoStateRequest = this.dataApi.getAdminSettings().pipe(
      switchMap((settings) => {
        this.isDemo.set(settings.isDemoEnvironment);
        return settings.isDemoEnvironment ? this.dataApi.getDemoProjectCatalog() : of(null);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (catalog) => {
        this.demoCatalog.set(catalog);
        this.demoSettingsLoading.set(false);
        if (!catalog?.portfolios.some((item) => item.key === this.demoPortfolioKey)) this.demoPortfolioKey = '';
      },
      error: (err: unknown) => {
        this.demoSettingsLoading.set(false);
        if ((err as { status?: number } | null)?.status === 403) this.isDemo.set(false);
        this.demoError.set(problemMessage(err, 'Demo settings or the approved snapshot could not be loaded. No data was changed.'));
      },
    });
  }

  requestDemoAction(action: 'all' | 'portfolio' | 'clear'): void {
    if (!this.isDemo() || this.demoBusy() || this.importing()) return;
    if (action !== 'clear' && !this.demoCatalog()) return;
    if (action === 'portfolio' && !this.demoCatalog()?.portfolios.some((item) => item.key === this.demoPortfolioKey)) return;
    this.confirmedPortfolioKey = action === 'portfolio' ? this.demoPortfolioKey : undefined;
    this.demoConfirmation.set(action);
    this.demoResult.set(null);
  }

  demoConfirmationText(): string {
    if (this.demoConfirmation() === 'clear') {
      return 'Every current project will be removed from application views. Source records and audit files will be kept. You can reload the approved demo snapshot afterward.';
    }
    if (this.demoConfirmation() === 'portfolio') {
      const portfolio = this.demoCatalog()?.portfolios.find((item) => item.key === this.confirmedPortfolioKey);
      return `Replace all current projects in ${portfolio?.displayName} with its ${portfolio?.projectCount} demo projects? Other portfolios will not be changed.`;
    }
    return `Replace all current projects with the approved ${this.demoCatalog()?.projectCount}-project demo snapshot? This also removes projects added outside that snapshot.`;
  }

  confirmDemoAction(): void {
    const action = this.demoConfirmation();
    if (!action || !this.isDemo() || this.demoBusy()) return;
    this.demoBusy.set(true);
    this.demoError.set(null);
    const request = action === 'clear'
      ? this.dataApi.clearDemoProjects()
      : this.dataApi.loadDemoProjects(this.confirmedPortfolioKey);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.demoBusy.set(false);
        this.demoConfirmation.set(null);
        this.demoResult.set(result);
        this.importResult.set(null);
        this.store.refresh();
        this.store.reloadPortfolioItems();
      },
      error: (err: unknown) => {
        this.demoBusy.set(false);
        this.demoConfirmation.set(null);
        if ((err as { status?: number } | null)?.status === 403) this.isDemo.set(false);
        this.demoError.set(problemMessage(err, 'The demo operation could not be completed. Refresh the portfolio to check its current state.'));
      },
    });
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
  }

  onDownloadExcelTemplate(): void {
    this.importError.set(null);
    this.dataApi
      .downloadProjectImportTemplate()
      .catch(() => this.importError.set('The template could not be downloaded. Try again.'));
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
    this.submitIssues.set([]);
    this.draftId.set(null);
    this.suggestions.set({});

    // Call draft AI prefill endpoint on Python API
    this.dataApi.createIntakeDraft(this.projectName, this.projectDescription).subscribe({
      next: (draft) => {
        this.draftId.set(draft.draftId);
        this.dataApi.prefillIntakeDraft(draft.draftId).pipe(
          switchMap((prefilled) => this.refreshLists().pipe(map(() => prefilled))),
        ).subscribe({
          next: (prefilled) => {
            this.applyAiPrefillData(prefilled);
            this.rememberDraft(prefilled);
            this.isPrefilling.set(false);
          },
          error: (err) => {
            this.isPrefilling.set(false);
            this.submitError.set(problemMessage(err, 'Your assistant could not suggest missing project details. Please try again.'));
          },
        });
      },
      error: (err) => {
        this.isPrefilling.set(false);
        this.submitError.set(problemMessage(err, 'Unable to prepare this project for AI assistance.'));
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
    // CRITICAL: Only fill missing/blank fields, never overwrite manual entries!
    if (this.isBlankValue(current) && this.isListed(key, value)) {
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
    if (key === 'portfolioKey') this.onPortfolioChanged(undefined);
  }

  projectField(key: string): ProjectFieldDef | undefined {
    return this.options()?.projectFields.find((field) => field.key === key);
  }

  onSubmitProject(form?: NgForm): void {
    if (this.isSubmitting() || this.isPrefilling() || this.applyingSuggestion() !== null) return;
    this.submitError.set(null);
    form?.form.markAllAsTouched();
    const issues = [...this.basicsIssues(), ...this.formIssues(form)];
    this.submitIssues.set(issues);
    if (issues.length) {
      this.submitError.set('The project has not been saved. Please review these fields.');
      return;
    }
    this.isSubmitting.set(true);

    // Scope belongs to the existing Notes field; projectDescription is not an API field.
    const payload = {
      ...this.projectFields,
      projectName: this.projectName.trim(),
      notes: this.projectDescription.trim() || this.projectFields.notes,
    };

    this.dataApi.createProject(payload, true).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.suggestions.set({});
        this.createdProjectId.set(res.projectId);
      },
      error: (err: unknown) => {
        this.isSubmitting.set(false);
        this.submitError.set(problemMessage(err, 'The project could not be created.'));
        const problem = (err as { error?: ProblemDetail } | null)?.error;
        const invalid = problem?.errors?.length
          ? problem.errors
          : Object.entries(problem?.invalidFields ?? {}).map(([field, message]) => ({ field, message }));
        this.submitIssues.set(invalid.map(({ field, message }) => this.issue(field, businessText(message))));
      },
    });
  }

  private issue(field: string, message: string): ProjectValidationIssue {
    const key = field.split('.')[0].split('[')[0];
    const label = key === 'notes' ? 'Project scope & description (Step 1)'
      : this.projectField(key)?.label ?? key.replace(/([a-z])([A-Z])/g, '$1 $2');
    return { field, label, message };
  }

  private basicsIssues(): ProjectValidationIssue[] {
    const issues: ProjectValidationIssue[] = [];
    const name = this.projectName.trim();
    const rule = this.projectField('projectName');
    if (!name) issues.push(this.issue('projectName', 'is required (Step 1)'));
    else if (rule?.minLength !== undefined && name.length < rule.minLength) {
      issues.push(this.issue('projectName', `must be at least ${rule.minLength} characters (Step 1)`));
    } else if (rule?.maxLength !== undefined && name.length > rule.maxLength) {
      issues.push(this.issue('projectName', `must be at most ${rule.maxLength} characters (Step 1)`));
    }
    const notes = this.projectDescription.trim() || this.projectFields.notes || '';
    const limit = this.projectField('notes')?.maxLength;
    if (limit !== undefined && notes.length > limit) issues.push(this.issue('notes', `must be at most ${limit} characters`));
    return issues;
  }

  private formIssues(form?: NgForm): ProjectValidationIssue[] {
    return Object.entries(form?.controls ?? {}).filter(([, control]) => control.invalid).map(([field, control]) => {
      let message = 'Enter a valid value.';
      if (control.hasError('required')) message = 'is required';
      else if (control.hasError('min')) message = `must be at least ${control.getError('min').min}`;
      else if (control.hasError('max')) message = `must be at most ${control.getError('max').max}`;
      else if (control.hasError('minlength')) message = `must be at least ${control.getError('minlength').requiredLength} characters`;
      else if (control.hasError('maxlength')) message = `must be at most ${control.getError('maxlength').requiredLength} characters`;
      return this.issue(field, message);
    });
  }

  resetWizard(): void {
    this.createdProjectId.set(null);
    this.projectName = '';
    this.projectDescription = '';
    this.projectStep.set(1);
    this.aiFilledSet.set(new Set());
    this.draftId.set(null);
    this.suggestions.set({});
    this.draftFields = {};
    this.submitError.set(null);
    this.submitIssues.set([]);
  }

  /** The suggestion for a dropdown that is still blank: a value the AI proposed that the list does not have yet. */
  suggestionFor(key: string): IntakeSuggestion | null {
    const suggestion = this.suggestions()[key];
    return suggestion && this.isBlankValue((this.projectFields as any)[key]) ? suggestion : null;
  }

  applySuggestion(key: string): void {
    const draftId = this.draftId();
    if (!draftId || this.applyingSuggestion() !== null) return;
    this.applyingSuggestion.set(key);
    this.submitError.set(null);
    this.dataApi
      .applyIntakeSuggestion(draftId, key)
      .pipe(
        switchMap((draft) =>
          this.refreshLists().pipe(
            catchError(() => {
              this.submitError.set('The value was saved, but the dropdown lists could not be refreshed. Reload the page to see it.');
              return of(null);
            }),
            map(() => draft),
          ),
        ),
      )
      .subscribe({
        next: (draft) => {
          this.applyChangedFields(draft, this.trustedKeysFor(key));
          this.rememberDraft(draft);
          this.applyingSuggestion.set(null);
        },
        error: (err) => {
          this.applyingSuggestion.set(null);
          this.submitError.set(problemMessage(err, 'Unable to create the suggested value.'));
        },
      });
  }

  dismissSuggestion(key: string): void {
    this.suggestions.update((current) => Object.fromEntries(Object.entries(current).filter(([field]) => field !== key)));
    const draftId = this.draftId();
    if (!draftId) return;
    this.dataApi.dismissIntakeSuggestion(draftId, key).subscribe({
      next: (draft) => this.rememberDraft(draft),
      error: (err) => {
        if (err?.status !== 404) {
          this.submitError.set(problemMessage(err, 'Unable to dismiss the suggestion.'));
        }
      },
    });
  }

  onPortfolioChanged(portfolioKey: string | undefined): void {
    if (!this.programsOf(portfolioKey).some((program) => program.key === this.projectFields.programKey)) {
      this.clearField('programKey');
    }
  }

  programsOf(portfolioKey: string | undefined): PortfolioItem['programs'] {
    return this.portfolios().find((portfolio) => portfolio.key === portfolioKey)?.programs ?? [];
  }

  programLabel(program: PortfolioItem['programs'][number]): string {
    return program.displayName || program.name || program.key;
  }

  private refreshLists(): Observable<unknown> {
    return forkJoin({
      options: this.dataApi.getOptions(),
      lookups: this.dataApi.getLookups(),
      portfolios: this.dataApi.getPortfolios(),
    }).pipe(
      tap(({ options, lookups, portfolios }) => {
        this.options.set(options);
        this.lookups.set(lookups);
        this.portfolios.set(portfolios);
      }),
    );
  }

  private rememberDraft(draft: IntakeDraft): void {
    this.suggestions.set(draft.suggestions ?? {});
    this.draftFields = this.fieldValues(draft);
  }

  /** The API keys draft fields by name, but IntakeDraft types them as a list for the Quick Add page. */
  private fieldValues(draft: IntakeDraft): Record<string, { value?: unknown } | undefined> {
    return (draft.fields ?? {}) as unknown as Record<string, { value?: unknown } | undefined>;
  }

  /** Sets the fields that an applied suggestion changed. The server already saved the suggested keys, so they are trusted even if a list refresh failed. */
  private applyChangedFields(draft: IntakeDraft, trusted: string[] = []): void {
    for (const [key, field] of Object.entries(this.fieldValues(draft))) {
      const value = field?.value;
      if (value === undefined || value === null || this.draftFields[key]?.value === value) continue;
      if (this.isBlankValue((this.projectFields as any)[key]) && (trusted.includes(key) || this.isListed(key, value))) {
        (this.projectFields as any)[key] = value;
        this.aiFilledSet.update((s) => new Set([...s, key]));
      }
    }
  }

  private trustedKeysFor(key: string): string[] {
    return this.suggestions()[key]?.kind === 'portfolio' ? [key, 'programKey'] : [key];
  }

  /** A dropdown can show only the values in its list. Fields without a list accept any value. */
  private isListed(key: string, value: unknown): boolean {
    const source = this.options()?.projectFields.find((field) => field.key === key)?.source;
    const listed = source ? this.listedValues(source) : null;
    return listed === null || listed.includes(value);
  }

  private listedValues(source: string): unknown[] | null {
    const lists = this.lookups();
    switch (source) {
      case 'portfolios':
        return this.portfolios().map((portfolio) => portfolio.key);
      case 'programsOfPortfolio':
        return this.programsOf(this.projectFields.portfolioKey).map((program) => program.key);
      case 'options.businessUnits':
        return lists?.businessUnits ?? [];
      case 'options.sites':
        return lists?.sites ?? [];
      case 'options.sponsorLevels':
        return lists?.sponsorLevels ?? [];
      case 'options.projectStatuses':
        return lists?.projectStatuses ?? [];
      case 'options.riskRatings':
        return lists?.riskRatings ?? [];
      case 'options.skills':
        return (lists?.skills ?? []).map((skill: { key: unknown }) => skill.key);
      default:
        return null;
    }
  }

  private isBlankValue(current: unknown): boolean {
    return current === undefined || current === null || current === '' || current === 0;
  }

  onCreatePortfolio(): void {
    this.isSubmittingPf.set(true);
    this.dataApi.createPortfolio(this.portfolioForm).subscribe({
      next: () => {
        this.isSubmittingPf.set(false);
        this.loadOptions();
        this.store.reloadPortfolioItems();
      },
      error: () => this.isSubmittingPf.set(false),
    });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.importing.set(true);
    this.importResult.set(null);
    this.importError.set(null);
    this.importIssues.set([]);
    this.dataApi.importProjects(file, true).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.importResult.set(result);
        this.store.refresh();
      },
      error: (err: unknown) => {
        this.importing.set(false);
        this.importError.set(problemMessage(err, 'The workbook could not be imported.'));
        const issues = (err as { error?: ProblemDetail } | null)?.error?.errors ?? [];
        this.importIssues.set(issues.map((issue) => `${issue.field}: ${issue.message}`));
      },
    });
  }
}
