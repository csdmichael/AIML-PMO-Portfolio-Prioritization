import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  IonContent,
  IonButton,
  IonIcon,
} from '@ionic/angular';
import { PortfolioStore } from '../../services/portfolio.store';
import { DataApiService } from '../../services/data-api.service';
import { Project, ProjectDetailRecord } from '../../models/portfolio.models';
import { OptionsResponse, PortfolioItem, ProjectUploadMetadata } from '../../models/api.models';
import { changedProjectFields } from '../../core/project-changes';
import { problemMessage } from '../../core/problem-detail';

interface FieldProvenanceItem {
  source: 'ai' | 'human';
  confidenceScore: number;
  confidenceLevel: string;
  evidenceQuote?: string;
  rationale?: string;
}

@Component({
  selector: 'app-edit-project-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonButton,
    IonIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="edit-project-content ion-padding">
      <div class="edit-project-container">
        <!-- Top Navigation Bar with Back Button -->
        <div class="top-nav-bar">
          <ion-button fill="clear" size="small" routerLink="/prioritization" class="back-btn">
            <ion-icon name="arrow-back-outline" slot="start"></ion-icon>
            Back to Prioritization
          </ion-button>
          <div class="breadcrumb-trail">
            <span>Prioritization</span>
            <span class="sep">/</span>
            <span>Projects</span>
            <span class="sep">/</span>
            <span class="curr">{{ projectId() }}</span>
            <span class="sep">/</span>
            <span class="curr-leaf">Edit & AI Recalculate</span>
          </div>
        </div>

        @if (!ready()) {
          <div class="loading-state">
            <p>Loading project details and options...</p>
          </div>
        } @else if (loadError()) {
          <div class="error-state" role="alert">
            <h3>Unable to load project</h3>
            <p>{{ loadError() }}</p>
            <ion-button routerLink="/prioritization">Return to Prioritization</ion-button>
          </div>
        } @else {
          <!-- Header Card -->
          <header class="edit-header">
            <div class="header-titles">
              <div class="id-badge-row">
                <span class="pid-badge">{{ form().projectId }}</span>
                @if (form().aiGenerated) {
                  <span class="ai-pill"><ion-icon name="sparkles"></ion-icon> AI-Assisted Project</span>
                }
                <span class="status-pill" [attr.data-status]="form().projectStatus">{{ form().projectStatus }}</span>
                <span class="tier-pill" [class]="getTierClass(form().finalTier)">{{ form().finalTier }}</span>
              </div>
              <h2 class="edit-title">Edit Project: {{ form().projectName }}</h2>
              <p class="edit-subtitle">
                Review and adjust inputs with field-level AI/Human provenance, attach supporting documents, recalculate with AI, and review transparent calculation methodology.
              </p>
            </div>

            <div class="header-actions">
              <button type="button" class="btn-reset" [disabled]="isSaving() || isRecalculating()" (click)="onReset()">
                Reset
              </button>
              <button type="button" class="btn-save" [disabled]="isSaving() || isRecalculating()" (click)="onSave()">
                {{ isSaving() ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </header>

          <!-- Feedback Banners -->
          @if (saveSuccess()) {
            <div class="feedback-banner success" role="status">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
              <span>Project changes successfully saved to the database. Prioritization scores re-evaluated.</span>
              <button type="button" class="dismiss-fb" (click)="saveSuccess.set(false)">&times;</button>
            </div>
          }
          @if (recalculateBanner(); as rb) {
            <div class="feedback-banner ai-success" role="status">
              <ion-icon name="sparkles"></ion-icon>
              <span>{{ rb }}</span>
              <button type="button" class="dismiss-fb" (click)="recalculateBanner.set(null)">&times;</button>
            </div>
          }
          @if (error(); as err) {
            <div class="feedback-banner error" role="alert">
              <ion-icon name="alert-circle-outline"></ion-icon>
              <span>{{ err }}</span>
              <button type="button" class="dismiss-fb" (click)="error.set(null)">&times;</button>
            </div>
          }

          <!-- Page Navigation Tabs -->
          <div class="section-tabs">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'fields'"
              (click)="activeTab.set('fields')"
            >
              <ion-icon name="create-outline"></ion-icon>
              <span>1. Project Fields & Inputs</span>
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'documents'"
              (click)="activeTab.set('documents')"
            >
              <ion-icon name="document-attach-outline"></ion-icon>
              <span>2. Supporting Documents & AI Recalculate</span>
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'transparency'"
              (click)="activeTab.set('transparency')"
            >
              <ion-icon name="analytics-outline"></ion-icon>
              <span>3. Calculation Transparency & ML Methodology</span>
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'signals'"
              (click)="activeTab.set('signals')"
            >
              <ion-icon name="shield-checkmark-outline"></ion-icon>
              <span>4. Priority & Risk Signals</span>
            </button>
          </div>

          <div class="tab-body-container">
            <!-- TAB 1: PROJECT FIELDS WITH AI VS HUMAN PROVENANCE -->
            @if (activeTab() === 'fields') {
              <div class="tab-pane">
                <div class="provenance-legend">
                  <span class="legend-title">Field Provenance Indicators:</span>
                  <div class="legend-item">
                    <span class="prov-badge ai">
                      <ion-icon name="sparkles"></ion-icon>
                      <span>AI (XX%)</span>
                    </span>
                    <span class="legend-desc">AI-Prefilled / Inferred with Confidence %</span>
                  </div>
                  <div class="legend-item">
                    <span class="prov-badge human">
                      <ion-icon name="person-outline"></ion-icon>
                      <span>Human</span>
                    </span>
                    <span class="legend-desc">Direct User / PM Input</span>
                  </div>
                  <span class="legend-hint">Hover over any indicator icon to inspect confidence score and derivation rationale.</span>
                </div>

                <div class="form-grid">
                  <!-- Project Name -->
                  <div class="form-field col-full">
                    <div class="field-label-row">
                      <label class="field-label">Project Name <span class="req">*</span></label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('projectName')"
                        [class.human]="!isAiField('projectName')"
                        [title]="getFieldTooltip('projectName')"
                      >
                        <ion-icon [name]="isAiField('projectName') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('projectName') ? 'AI (' + getConfidence('projectName') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <input
                      type="text"
                      class="field-input"
                      [ngModel]="form().projectName"
                      (ngModelChange)="onFieldInput('projectName', $event)"
                    />
                  </div>

                  <!-- Portfolio -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Portfolio <span class="req">*</span></label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('portfolioKey')"
                        [class.human]="!isAiField('portfolioKey')"
                        [title]="getFieldTooltip('portfolioKey')"
                      >
                        <ion-icon [name]="isAiField('portfolioKey') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('portfolioKey') ? 'AI (' + getConfidence('portfolioKey') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <select
                      class="field-select"
                      [ngModel]="form().portfolioKey"
                      (ngModelChange)="onPortfolioChange($event)"
                    >
                      @for (item of portfolioItems(); track item.key) {
                        <option [value]="item.key">{{ item.displayName }}</option>
                      }
                    </select>
                  </div>

                  <!-- Program -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Program <span class="req">*</span></label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('programKey')"
                        [class.human]="!isAiField('programKey')"
                        [title]="getFieldTooltip('programKey')"
                      >
                        <ion-icon [name]="isAiField('programKey') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('programKey') ? 'AI (' + getConfidence('programKey') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <select
                      class="field-select"
                      [ngModel]="form().programKey"
                      (ngModelChange)="onFieldInput('programKey', $event)"
                    >
                      @for (pr of programsOf(form().portfolioKey); track pr.key) {
                        <option [value]="pr.key">{{ pr.displayName ?? pr.name ?? pr.key }}</option>
                      }
                    </select>
                  </div>

                  <!-- Business Unit -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Business Unit <span class="req">*</span></label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('businessUnit')"
                        [class.human]="!isAiField('businessUnit')"
                        [title]="getFieldTooltip('businessUnit')"
                      >
                        <ion-icon [name]="isAiField('businessUnit') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('businessUnit') ? 'AI (' + getConfidence('businessUnit') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <select
                      class="field-select"
                      [ngModel]="form().businessUnit"
                      (ngModelChange)="onFieldInput('businessUnit', $event)"
                    >
                      @for (bu of lists()?.businessUnits ?? []; track bu) {
                        <option [value]="bu">{{ bu }}</option>
                      }
                    </select>
                  </div>

                  <!-- Site Location -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Site Location</label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('site')"
                        [class.human]="!isAiField('site')"
                        [title]="getFieldTooltip('site')"
                      >
                        <ion-icon [name]="isAiField('site') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('site') ? 'AI (' + getConfidence('site') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <select
                      class="field-select"
                      [ngModel]="form().site"
                      (ngModelChange)="onFieldInput('site', $event)"
                    >
                      @for (s of lists()?.sites ?? []; track s) {
                        <option [value]="s">{{ s }}</option>
                      }
                    </select>
                  </div>

                  <!-- Primary Skill Domain -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Primary Skill Domain <span class="req">*</span></label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('primarySkill')"
                        [class.human]="!isAiField('primarySkill')"
                        [title]="getFieldTooltip('primarySkill')"
                      >
                        <ion-icon [name]="isAiField('primarySkill') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('primarySkill') ? 'AI (' + getConfidence('primarySkill') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <select
                      class="field-select"
                      [ngModel]="form().primarySkill"
                      (ngModelChange)="onFieldInput('primarySkill', $event)"
                    >
                      @for (sk of lists()?.skills ?? []; track sk.key) {
                        <option [value]="sk.key">{{ sk.displayName }}</option>
                      }
                    </select>
                  </div>

                  <!-- Total Cost Estimate -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Total Cost Estimate (USD) <span class="req">*</span></label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('costEstimateUsd')"
                        [class.human]="!isAiField('costEstimateUsd')"
                        [title]="getFieldTooltip('costEstimateUsd')"
                      >
                        <ion-icon [name]="isAiField('costEstimateUsd') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('costEstimateUsd') ? 'AI (' + getConfidence('costEstimateUsd') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <input
                      type="number"
                      step="10000"
                      class="field-input"
                      [ngModel]="form().costEstimateUsd"
                      (ngModelChange)="onFieldInput('costEstimateUsd', $event)"
                    />
                  </div>

                  <!-- Business Value Score -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Business Value Score (1 - 5) <span class="req">*</span>: {{ form().businessValue }}</label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('businessValue')"
                        [class.human]="!isAiField('businessValue')"
                        [title]="getFieldTooltip('businessValue')"
                      >
                        <ion-icon [name]="isAiField('businessValue') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('businessValue') ? 'AI (' + getConfidence('businessValue') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      class="field-range"
                      [ngModel]="form().businessValue"
                      (ngModelChange)="onFieldInput('businessValue', $event)"
                    />
                  </div>

                  <!-- Project Status -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Project Status</label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('projectStatus')"
                        [class.human]="!isAiField('projectStatus')"
                        [title]="getFieldTooltip('projectStatus')"
                      >
                        <ion-icon [name]="isAiField('projectStatus') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('projectStatus') ? 'AI (' + getConfidence('projectStatus') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <select
                      class="field-select"
                      [ngModel]="form().projectStatus"
                      (ngModelChange)="onFieldInput('projectStatus', $event)"
                    >
                      @for (st of lists()?.projectStatuses ?? []; track st) {
                        <option [value]="st">{{ st }}</option>
                      }
                    </select>
                  </div>

                  <!-- Target Go-Live Date -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Target Go-Live Date</label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('goLiveDate')"
                        [class.human]="!isAiField('goLiveDate')"
                        [title]="getFieldTooltip('goLiveDate')"
                      >
                        <ion-icon [name]="isAiField('goLiveDate') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('goLiveDate') ? 'AI (' + getConfidence('goLiveDate') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <input
                      type="date"
                      class="field-input"
                      [ngModel]="form().goLiveDate"
                      (ngModelChange)="onFieldInput('goLiveDate', $event)"
                    />
                  </div>

                  <!-- Executive Sponsor -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Executive Sponsor</label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('executiveSponsor')"
                        [class.human]="!isAiField('executiveSponsor')"
                        [title]="getFieldTooltip('executiveSponsor')"
                      >
                        <ion-icon [name]="isAiField('executiveSponsor') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('executiveSponsor') ? 'AI (' + getConfidence('executiveSponsor') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <input
                      type="text"
                      class="field-input"
                      [ngModel]="form().executiveSponsor"
                      (ngModelChange)="onFieldInput('executiveSponsor', $event)"
                    />
                  </div>

                  <!-- Sponsor Level -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Sponsor Level</label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('sponsorLevel')"
                        [class.human]="!isAiField('sponsorLevel')"
                        [title]="getFieldTooltip('sponsorLevel')"
                      >
                        <ion-icon [name]="isAiField('sponsorLevel') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('sponsorLevel') ? 'AI (' + getConfidence('sponsorLevel') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <select
                      class="field-select"
                      [ngModel]="form().sponsorLevel"
                      (ngModelChange)="onFieldInput('sponsorLevel', $event)"
                    >
                      @for (lvl of lists()?.sponsorLevels ?? []; track lvl) {
                        <option [value]="lvl">{{ lvl }}</option>
                      }
                    </select>
                  </div>

                  <!-- Risk Rating -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Risk Rating</label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('riskRating')"
                        [class.human]="!isAiField('riskRating')"
                        [title]="getFieldTooltip('riskRating')"
                      >
                        <ion-icon [name]="isAiField('riskRating') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('riskRating') ? 'AI (' + getConfidence('riskRating') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <select
                      class="field-select"
                      [ngModel]="form().riskRating"
                      (ngModelChange)="onFieldInput('riskRating', $event)"
                    >
                      @for (rr of lists()?.riskRatings ?? []; track rr) {
                        <option [value]="rr">{{ rr }}</option>
                      }
                    </select>
                  </div>

                  <!-- Skill Demand FTE -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Skill Demand (FTE)</label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('skillDemandFte')"
                        [class.human]="!isAiField('skillDemandFte')"
                        [title]="getFieldTooltip('skillDemandFte')"
                      >
                        <ion-icon [name]="isAiField('skillDemandFte') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('skillDemandFte') ? 'AI (' + getConfidence('skillDemandFte') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      class="field-input"
                      [ngModel]="form().skillDemandFte"
                      (ngModelChange)="onFieldInput('skillDemandFte', $event)"
                    />
                  </div>

                  <!-- Effort Person Weeks -->
                  <div class="form-field col-half">
                    <div class="field-label-row">
                      <label class="field-label">Effort (Person-Weeks) <span class="req">*</span></label>
                      <span
                        class="prov-badge"
                        [class.ai]="isAiField('effortPersonWeeks')"
                        [class.human]="!isAiField('effortPersonWeeks')"
                        [title]="getFieldTooltip('effortPersonWeeks')"
                      >
                        <ion-icon [name]="isAiField('effortPersonWeeks') ? 'sparkles' : 'person-outline'"></ion-icon>
                        <span>{{ isAiField('effortPersonWeeks') ? 'AI (' + getConfidence('effortPersonWeeks') + '%)' : 'Human' }}</span>
                      </span>
                    </div>
                    <input
                      type="number"
                      step="1"
                      class="field-input"
                      [ngModel]="form().effortPersonWeeks"
                      (ngModelChange)="onFieldInput('effortPersonWeeks', $event)"
                    />
                  </div>

                  <!-- Policy Flags Row -->
                  <div class="form-field col-full flags-row">
                    <label class="checkbox-label" [title]="getFieldTooltip('regulatorySecurity')">
                      <input
                        type="checkbox"
                        [ngModel]="form().regulatorySecurity"
                        (ngModelChange)="onFieldInput('regulatorySecurity', $event)"
                      />
                      <span>Regulatory or Security Driven (Rule R1)</span>
                      <span class="prov-badge micro" [class.ai]="isAiField('regulatorySecurity')">
                        <ion-icon [name]="isAiField('regulatorySecurity') ? 'sparkles' : 'person-outline'"></ion-icon>
                      </span>
                    </label>
                    <label class="checkbox-label" [title]="getFieldTooltip('dtAlignment')">
                      <input
                        type="checkbox"
                        [ngModel]="form().dtAlignment"
                        (ngModelChange)="onFieldInput('dtAlignment', $event)"
                      />
                      <span>Digital Transformation Aligned</span>
                      <span class="prov-badge micro" [class.ai]="isAiField('dtAlignment')">
                        <ion-icon [name]="isAiField('dtAlignment') ? 'sparkles' : 'person-outline'"></ion-icon>
                      </span>
                    </label>
                    <label class="checkbox-label" [title]="getFieldTooltip('protectedProgram')">
                      <input
                        type="checkbox"
                        [ngModel]="form().protectedProgram"
                        (ngModelChange)="onFieldInput('protectedProgram', $event)"
                      />
                      <span>Protected Strategic Program (Rule R3)</span>
                      <span class="prov-badge micro" [class.ai]="isAiField('protectedProgram')">
                        <ion-icon [name]="isAiField('protectedProgram') ? 'sparkles' : 'person-outline'"></ion-icon>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 2: SUPPORTING DOCUMENTS & AI RECALCULATE -->
            @if (activeTab() === 'documents') {
              <div class="tab-pane">
                <div class="docs-hero-banner">
                  <div class="hero-icon-wrap">
                    <ion-icon name="document-attach-outline"></ion-icon>
                  </div>
                  <div class="hero-text">
                    <h3>Supporting Project Documentation & AI Recalculation</h3>
                    <p>
                      Attach project charters, architecture specifications, business cases, or risk registers.
                      The AI Intake & Prioritization Agent ingests these documents to update project fields and re-evaluate priority scoring.
                    </p>
                  </div>
                </div>

                <!-- Recalculate with AI Action Card -->
                <div class="ai-recalculate-card">
                  <div class="recalc-header">
                    <div class="recalc-title-wrap">
                      <ion-icon name="sparkles" class="sparkle-gold"></ion-icon>
                      <div>
                        <h4>AI Recalculation Engine</h4>
                        <p>Analyze attached documents and recompute factors, ML base scores, and final tiers.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="btn-recalculate"
                      [disabled]="isRecalculating() || isSaving()"
                      (click)="onRecalculateWithAi()"
                    >
                      <ion-icon name="sparkles"></ion-icon>
                      <span>{{ isRecalculating() ? 'Analyzing & Recalculating...' : 'Recalculate with AI' }}</span>
                    </button>
                  </div>
                  @if (isRecalculating()) {
                    <div class="recalc-progress">
                      <div class="progress-bar-strip"></div>
                      <span class="progress-text">Analyzing attached documents with Foundry model & re-evaluating multi-factor weights...</span>
                    </div>
                  }
                </div>

                <!-- Upload Section -->
                <div class="upload-section-card">
                  <h4>Attach Supporting Document</h4>
                  <div class="upload-form-row">
                    <div class="upload-source-field">
                      <label class="sub-label">Document Category:</label>
                      <select class="field-select select-sm" [(ngModel)]="selectedSourceKey">
                        <option value="charter">Project Charter / Scope Statement</option>
                        <option value="business_case">Business Case & Financial Justification</option>
                        <option value="architecture">Architecture & Technical Specs</option>
                        <option value="risk_assessment">Risk Register & Assessment</option>
                        <option value="other">General Supporting Notes</option>
                      </select>
                    </div>

                    <div class="upload-file-field">
                      <label class="sub-label">Choose File (.pdf, .docx, .xlsx, .txt, .md, .csv, .json):</label>
                      <input
                        type="file"
                        #fileInput
                        class="file-input"
                        (change)="onFileSelected($event)"
                        accept=".pdf,.docx,.xlsx,.txt,.md,.csv,.json"
                      />
                    </div>

                    <div class="upload-btn-wrap">
                      <button
                        type="button"
                        class="btn-upload"
                        [disabled]="!selectedFile() || isUploading()"
                        (click)="onUploadDocument()"
                      >
                        <ion-icon name="cloud-upload-outline"></ion-icon>
                        <span>{{ isUploading() ? 'Uploading...' : 'Upload Document' }}</span>
                      </button>
                    </div>
                  </div>
                  @if (uploadSuccess()) {
                    <div class="upload-status-msg success">Document successfully uploaded to project storage in OneLake.</div>
                  }
                </div>

                <!-- Uploaded Documents List -->
                <div class="documents-list-card">
                  <div class="list-header">
                    <h4>Attached Documents ({{ uploadedDocuments().length }})</h4>
                    <button type="button" class="btn-refresh-docs" (click)="loadDocuments()">
                      <ion-icon name="refresh-outline"></ion-icon> Refresh
                    </button>
                  </div>

                  @if (uploadedDocuments().length === 0) {
                    <div class="empty-docs-box">
                      <ion-icon name="document-text-outline"></ion-icon>
                      <p>No supporting documents attached yet. Upload files above to provide evidence for AI re-evaluation.</p>
                    </div>
                  } @else {
                    <div class="docs-table-wrap">
                      <table class="docs-table">
                        <thead>
                          <tr>
                            <th>File Name</th>
                            <th>Category</th>
                            <th>Size</th>
                            <th>Uploaded At</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (doc of uploadedDocuments(); track doc.uploadId) {
                            <tr>
                              <td class="td-filename">
                                <ion-icon name="document-text-outline"></ion-icon>
                                <strong>{{ doc.fileName }}</strong>
                              </td>
                              <td><span class="category-pill">{{ doc.sourceKey }}</span></td>
                              <td>{{ formatFileSize(doc.sizeBytes) }}</td>
                              <td>{{ doc.uploadedAt || 'Just now' }}</td>
                              <td><span class="indexed-tag">Ingested in OneLake</span></td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- TAB 3: CALCULATION TRANSPARENCY & ML METHODOLOGY -->
            @if (activeTab() === 'transparency') {
              <div class="tab-pane transparency-pane">
                <div class="transparency-intro">
                  <div class="trans-badge">
                    <ion-icon name="analytics-outline"></ion-icon>
                    <span>Full Methodology Transparency</span>
                  </div>
                  <h3>How Prioritization & Scores Were Calculated</h3>
                  <p>
                    Every calculation in this system is fully transparent and explainable.
                    Review below whether each calculated field is <strong>Deterministic</strong> (governance formulas, rules, weights)
                    or <strong>Machine Learning</strong> (LightGBM, Random Forest, K-Means), along with the exact mathematical formulation and weights applied to <strong>{{ form().projectId }}</strong>.
                  </p>
                </div>

                <!-- 1. FINAL PRIORITY SCORE -->
                <section class="calc-card">
                  <div class="calc-header">
                    <div class="calc-title-group">
                      <span class="calc-badge hybrid">Hybrid: 40% ML + 60% Deterministic</span>
                      <h4>1. Final Priority Score ({{ form().priorityScore ?? 'Awaiting analysis' }} / 100)</h4>
                    </div>
                    <span class="calc-pill">Score: {{ form().priorityScore ?? 'Pending' }}</span>
                  </div>

                  <div class="calc-explanation">
                    <p>
                      The <strong>Final Priority Score</strong> balances data-driven machine learning predictions with organizational multi-factor weights, protected by governance rule floors:
                    </p>
                    <div class="formula-box">
                      <code>Final Priority Score = max( round(0.4 × ML_Base_Score + 0.6 × Field_Weighted_Score, 1), Rule_Floor )</code>
                    </div>

                    <div class="calc-breakdown-grid">
                      <div class="calc-part">
                        <span class="part-label">ML Base Score (40% Weight):</span>
                        <strong class="part-val">{{ form().mlBaseScore ?? 65.0 }} pts</strong>
                        <span class="part-sub">
                          Predicted by <strong>LightGBM Calibrated Classifier</strong>.
                          Contribution: <strong>{{ (0.4 * (form().mlBaseScore ?? 65.0)).toFixed(1) }} pts</strong>.
                        </span>
                      </div>

                      <div class="calc-part">
                        <span class="part-label">Field Weighted Score (60% Weight):</span>
                        <strong class="part-val">{{ form().fieldWeightedScore ?? 70.0 }} pts</strong>
                        <span class="part-sub">
                          Computed from 11 strategic criteria via MCDA weighted formula.
                          Contribution: <strong>{{ (0.6 * (form().fieldWeightedScore ?? 70.0)).toFixed(1) }} pts</strong>.
                        </span>
                      </div>

                      <div class="calc-part">
                        <span class="part-label">Active Governance Rule Floor:</span>
                        <strong class="part-val">
                          @if (form().regulatorySecurity) {
                            Floor 85 (Rule R1: Regulatory / Security)
                          } @else if (form().protectedProgram) {
                            Floor 80 (Rule R3: Protected Strategic Program)
                          } @else if (form().businessValue >= 4 && form().dtAlignment) {
                            Floor 75 (Rule R2: High Strategic Value)
                          } @else {
                            None (No rule floor triggered)
                          }
                        </strong>
                        <span class="part-sub">
                          @if (form().regulatorySecurity || form().protectedProgram || (form().businessValue >= 4 && form().dtAlignment)) {
                            Compliance rule ensures mandatory prioritization floor regardless of resource constraints.
                          } @else {
                            Project evaluated purely on blended ML & weighted score.
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- 2. FIELD WEIGHTED SCORE -->
                <section class="calc-card">
                  <div class="calc-header">
                    <div class="calc-title-group">
                      <span class="calc-badge deterministic">Deterministic: MCDA Weighted Sum</span>
                      <h4>2. Field Weighted Score ({{ form().fieldWeightedScore ?? 70.0 }} / 100)</h4>
                    </div>
                    <span class="calc-pill">Scope: {{ form().priorityWeightScope ?? 'global' }} weights</span>
                  </div>

                  <div class="calc-explanation">
                    <p>
                      The <strong>Field Weighted Score</strong> evaluates 11 project dimensions normalized to a 0–100 scale, weighted according to the active
                      <strong>{{ form().priorityWeightScope ?? 'global' }} priority weights</strong> (precedence: Project Override > Portfolio Override > Global Default):
                    </p>
                    <div class="formula-box">
                      <code>Field Weighted Score = round( Σ (Factor_i × Weight_i) / Σ (Weight_i), 1 )</code>
                    </div>

                    <div class="factors-table-wrap">
                      <table class="factors-table">
                        <thead>
                          <tr>
                            <th>Factor Dimension</th>
                            <th>Raw Project Value</th>
                            <th>Normalized (0–100)</th>
                            <th>Effective Weight (%)</th>
                            <th>Calculation Logic</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Business Value</strong></td>
                            <td>{{ form().businessValue }} / 5</td>
                            <td>{{ (form().businessValue / 5 * 100).toFixed(0) }} pts</td>
                            <td>{{ getWeightFor('businessValue') }}%</td>
                            <td>Linear normalization: <code>(Value / 5) × 100</code></td>
                          </tr>
                          <tr>
                            <td><strong>User Base Impact</strong></td>
                            <td>{{ form().userBase ?? 1000 }} users</td>
                            <td>{{ calculateNormalizedUserBase(form().userBase ?? 1000) }} pts</td>
                            <td>{{ getWeightFor('userBase') }}%</td>
                            <td>Logarithmic scaling: <code>log10(users) / 5 × 100</code></td>
                          </tr>
                          <tr>
                            <td><strong>Regulatory / Security</strong></td>
                            <td>{{ form().regulatorySecurity ? 'Yes (True)' : 'No (False)' }}</td>
                            <td>{{ form().regulatorySecurity ? 100 : 0 }} pts</td>
                            <td>{{ getWeightFor('regulatorySecurity') }}%</td>
                            <td>Binary policy factor: 100 pts if required, else 0</td>
                          </tr>
                          <tr>
                            <td><strong>Timing Urgency</strong></td>
                            <td>{{ form().monthsToGoLive }} months</td>
                            <td>{{ calculateNormalizedUrgency(form().monthsToGoLive) }} pts</td>
                            <td>{{ getWeightFor('timingUrgency') }}%</td>
                            <td>Urgency horizon: <code>max(0, (36 - months) / 36) × 100</code></td>
                          </tr>
                          <tr>
                            <td><strong>Sponsor Priority</strong></td>
                            <td>{{ form().sponsorLevel }}</td>
                            <td>{{ calculateNormalizedSponsor(form().sponsorLevel) }} pts</td>
                            <td>{{ getWeightFor('sponsorPriority') }}%</td>
                            <td>Executive=100, Director=75, Manager=50, Individual=25</td>
                          </tr>
                          <tr>
                            <td><strong>DT Alignment</strong></td>
                            <td>{{ form().dtAlignment ? 'Yes (True)' : 'No (False)' }}</td>
                            <td>{{ form().dtAlignment ? 100 : 0 }} pts</td>
                            <td>{{ getWeightFor('dtAlignment') }}%</td>
                            <td>Digital transformation alignment bonus: 100 pts</td>
                          </tr>
                          <tr>
                            <td><strong>Risk Inversion</strong></td>
                            <td>{{ form().riskRating }}</td>
                            <td>{{ calculateNormalizedRisk(form().riskRating) }} pts</td>
                            <td>{{ getWeightFor('risk') }}%</td>
                            <td>Inverted risk factor: Low=90, Medium=60, High=30, Critical=10</td>
                          </tr>
                          <tr>
                            <td><strong>Cost Efficiency</strong></td>
                            <td>\${{ (form().costEstimateUsd / 1000000).toFixed(2) }}M</td>
                            <td>{{ calculateNormalizedCost(form().costEstimateUsd) }} pts</td>
                            <td>{{ getWeightFor('cost') }}%</td>
                            <td>Logarithmic cost scale: <code>(log10(cost) - 4) / 3 × 100</code></td>
                          </tr>
                          <tr>
                            <td><strong>Effort & Skill Feasibility</strong></td>
                            <td>{{ form().effortPersonWeeks }} pw / {{ form().skillDemandFte }} FTE</td>
                            <td>{{ calculateNormalizedEffort(form().effortPersonWeeks) }} pts</td>
                            <td>{{ getWeightFor('effort') }}%</td>
                            <td>Normalized demand feasibility against portfolio capacity</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                <!-- 3. SUGGESTED PRIORITY TIER (ML TIER) -->
                <section class="calc-card">
                  <div class="calc-header">
                    <div class="calc-title-group">
                      <span class="calc-badge ml">Machine Learning: LightGBM Multi-Class</span>
                      <h4>3. Suggested Priority Tier ({{ form().mlTier }})</h4>
                    </div>
                    <span class="calc-pill">ML Model: LightGBM v4.2</span>
                  </div>

                  <div class="calc-explanation">
                    <p>
                      <strong>Algorithm:</strong> <em>LightGBM (Light Gradient Boosting Machine)</em> trained on historical portfolio prioritization outcomes across 15 multidimensional features.
                    </p>
                    <div class="ml-details-box">
                      <div class="ml-col">
                        <strong>Input Feature Vector (15 dims):</strong>
                        <ul>
                          <li>Financials: Cost USD, Business Value, Cost/Effort Ratio</li>
                          <li>Timeline: Months to Go-Live, Delivery Duration</li>
                          <li>Human Capital: Primary Skill Domain, Skill Demand FTE</li>
                          <li>Governance: Regulatory Security, DT Alignment, Sponsor Level</li>
                          <li>Risk: Risk Rating, Dependency Count, Data Completeness</li>
                        </ul>
                      </div>
                      <div class="ml-col">
                        <strong>Model Output Probabilities:</strong>
                        <div class="prob-row">
                          <span>Must-do-now:</span>
                          <div class="prob-bar-wrap">
                            <div class="prob-bar red" [style.width.%]="(form().tierProbabilities?.mustDoNow ?? 0.1) * 100"></div>
                          </div>
                          <span>{{ ((form().tierProbabilities?.mustDoNow ?? 0.1) * 100).toFixed(1) }}%</span>
                        </div>
                        <div class="prob-row">
                          <span>Proceed:</span>
                          <div class="prob-bar-wrap">
                            <div class="prob-bar green" [style.width.%]="(form().tierProbabilities?.proceed ?? 0.5) * 100"></div>
                          </div>
                          <span>{{ ((form().tierProbabilities?.proceed ?? 0.5) * 100).toFixed(1) }}%</span>
                        </div>
                        <div class="prob-row">
                          <span>Can wait:</span>
                          <div class="prob-bar-wrap">
                            <div class="prob-bar yellow" [style.width.%]="(form().tierProbabilities ? form().tierProbabilities.canWait : 0.3) * 100"></div>
                          </div>
                          <span>{{ ((form().tierProbabilities ? form().tierProbabilities.canWait : 0.3) * 100).toFixed(1) }}%</span>
                        </div>
                        <div class="prob-row">
                          <span>Deprioritize:</span>
                          <div class="prob-bar-wrap">
                            <div class="prob-bar gray" [style.width.%]="(form().tierProbabilities ? form().tierProbabilities.deprioritize : 0.1) * 100"></div>
                          </div>
                          <span>{{ ((form().tierProbabilities ? form().tierProbabilities.deprioritize : 0.1) * 100).toFixed(1) }}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <!-- 4. CONFIDENCE SCORE & ENSEMBLE -->
                <section class="calc-card">
                  <div class="calc-header">
                    <div class="calc-title-group">
                      <span class="calc-badge ml">Machine Learning: Random Forest Uncertainty</span>
                      <h4>4. Confidence Score & Level ({{ form().confidenceScore }}% &bull; {{ form().confidenceLevel }})</h4>
                    </div>
                    <span class="calc-pill">Ensemble: Random Forest</span>
                  </div>

                  <div class="calc-explanation">
                    <p>
                      <strong>Algorithm:</strong> <em>Random Forest Variance & Multi-Source Data Completeness Calibrator</em>.
                      Evaluates cross-source consensus and missingness across 11 integrated source systems (Planview, Power Apps, Jira, ADO, MS Project, Smartsheet, BU Trackers, BU Repos, HR, Cost, Excel Intake):
                    </p>
                    <div class="formula-box">
                      <code>Confidence = round( 100 × (1 - Shannon_Entropy) × (Sources_Present / 11) )</code>
                    </div>
                    <p class="sources-note">
                      Currently <strong>{{ form().sourcesPresent }} of 11</strong> integrated sources are verified for this project.
                      Entropy threshold yields confidence tier: <strong>{{ form().confidenceLevel }}</strong> (&ge;75% High, &ge;50% Medium, &lt;50% Low).
                    </p>
                  </div>
                </section>

                <!-- 5. STRATEGIC CLUSTERING -->
                <section class="calc-card">
                  <div class="calc-header">
                    <div class="calc-title-group">
                      <span class="calc-badge ml">Machine Learning: K-Means Clustering (k=4)</span>
                      <h4>5. Strategic Cluster ({{ form().cluster }})</h4>
                    </div>
                    <span class="calc-pill">Algorithm: K-Means + PCA</span>
                  </div>

                  <div class="calc-explanation">
                    <p>
                      <strong>Algorithm:</strong> <em>K-Means Unsupervised Clustering</em> with Principal Component Analysis (PCA) dimensionality reduction.
                      Projects in the same cluster share similar resource constraints, technology requirements, and strategic outcomes to identify synergy or portfolio overlap.
                    </p>
                  </div>
                </section>

                <!-- 6. RECOMMENDED ACTION -->
                <section class="calc-card">
                  <div class="calc-header">
                    <div class="calc-title-group">
                      <span class="calc-badge deterministic">Deterministic: Policy Decision Matrix</span>
                      <h4>6. Recommended Action ({{ form().recommendedAction }})</h4>
                    </div>
                    <span class="calc-pill">Action Matrix</span>
                  </div>

                  <div class="calc-explanation">
                    <p>
                      <strong>Algorithm:</strong> Deterministic Rule Matrix mapping Final Prioritized Tier, Risk Rating, and Skill Gap to actionable executive decisions (e.g. "Proceed", "Protect slot", "Add capacity", "Re-sequence", "Pause or divert skills").
                    </p>
                  </div>
                </section>
              </div>
            }

            <!-- TAB 4: PRIORITY & RISK SIGNALS SUMMARY -->
            @if (activeTab() === 'signals') {
              <div class="tab-pane">
                <div class="signals-grid">
                  <div class="signal-card">
                    <span class="sig-label">Final Prioritized Tier</span>
                    <strong class="sig-val" [class]="getTierClass(form().finalTier)">{{ form().finalTier }}</strong>
                    <span class="sig-desc">Determined by blended score and mandatory governance rule floors.</span>
                  </div>

                  <div class="signal-card">
                    <span class="sig-label">ML Model Suggested Tier</span>
                    <strong class="sig-val">{{ form().mlTier }}</strong>
                    <span class="sig-desc">Argmax class from LightGBM multi-class probability output.</span>
                  </div>

                  <div class="signal-card">
                    <span class="sig-label">Priority Score</span>
                    <strong class="sig-val">{{ form().priorityScore ?? 'Awaiting analysis' }} / 100</strong>
                    <span class="sig-desc">Blended: 40% LightGBM Base + 60% Scoped Factor Weights.</span>
                  </div>

                  <div class="signal-card">
                    <span class="sig-label">Confidence Score</span>
                    <strong class="sig-val">{{ form().confidenceScore }}% ({{ form().confidenceLevel }})</strong>
                    <span class="sig-desc">Ensemble uncertainty across {{ form().sourcesPresent }} of 11 source systems.</span>
                  </div>

                  <div class="signal-card">
                    <span class="sig-label">Recommended Action</span>
                    <strong class="sig-val">{{ form().recommendedAction }}</strong>
                    <span class="sig-desc">Policy action mapped from tier, risk rating, and skill demand.</span>
                  </div>

                  <div class="signal-card">
                    <span class="sig-label">Strategic Cluster</span>
                    <strong class="sig-val">{{ form().cluster }}</strong>
                    <span class="sig-desc">Unsupervised K-Means clustering assignment across portfolio dimensions.</span>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .edit-project-content {
        --background: var(--pmo-bg, #f4f6f8);
        height: 100%;
      }
      .edit-project-container {
        max-width: 1200px;
        margin: 0 auto;
        padding-bottom: 50px;
      }
      .top-nav-bar {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .back-btn {
        font-weight: 600;
        --color: var(--pmo-primary, #0078d4);
      }
      .breadcrumb-trail {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.82rem;
        color: #64748b;
      }
      .breadcrumb-trail .sep {
        color: #cbd5e1;
      }
      .breadcrumb-trail .curr {
        font-family: monospace;
        font-weight: 700;
        color: var(--pmo-primary, #0078d4);
      }
      .breadcrumb-trail .curr-leaf {
        font-weight: 600;
        color: #0f172a;
      }
      .edit-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 10px;
        padding: 20px 24px;
        margin-bottom: 16px;
        gap: 16px;
        flex-wrap: wrap;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }
      .id-badge-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        flex-wrap: wrap;
      }
      .pid-badge {
        font-family: monospace;
        font-weight: 700;
        background: var(--pmo-primary, #0078d4);
        color: #ffffff;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
      }
      .ai-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.74rem;
        background: #f3e8ff;
        color: #7e22ce;
        padding: 2px 8px;
        border-radius: 10px;
        font-weight: 600;
      }
      .status-pill {
        font-size: 0.74rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 10px;
      }
      .status-pill[data-status="Active"] { background: #dcfce7; color: #166534; }
      .status-pill[data-status="Planning"] { background: #e0f2fe; color: #0369a1; }
      .status-pill[data-status="On Hold"] { background: #fef9c3; color: #854d0e; }
      .status-pill[data-status="Backlog"] { background: #fae8ff; color: #86198f; }
      .status-pill[data-status="Completed"] { background: #dcfce7; color: #15803d; }

      .tier-pill {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 4px;
      }
      .tier-mustdo { background: #fed9cc; color: #d13438; }
      .tier-proceed { background: #dff6dd; color: #107c10; }
      .tier-canwait { background: #fff4ce; color: #795e00; }
      .tier-deprioritize { background: #e1dfdd; color: #444444; }

      .edit-title {
        margin: 2px 0 4px 0;
        font-size: 1.3rem;
        font-weight: 700;
        color: #0f172a;
      }
      .edit-subtitle {
        margin: 0;
        font-size: 0.86rem;
        color: #64748b;
        max-width: 760px;
        line-height: 1.4;
      }
      .header-actions {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .btn-reset {
        padding: 8px 16px;
        border-radius: 6px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        font-size: 0.84rem;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
      }
      .btn-save {
        padding: 8px 20px;
        border-radius: 6px;
        background: var(--pmo-primary, #0078d4);
        border: none;
        font-size: 0.84rem;
        font-weight: 700;
        color: #ffffff;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn-save:hover:not(:disabled) {
        background: #005a9e;
      }
      .btn-save:disabled, .btn-reset:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .feedback-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 0.86rem;
        font-weight: 500;
      }
      .feedback-banner.success {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
      }
      .feedback-banner.ai-success {
        background: #faf5ff;
        border: 1px solid #e9d5ff;
        color: #7e22ce;
      }
      .feedback-banner.error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }
      .dismiss-fb {
        margin-left: auto;
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        color: inherit;
        line-height: 1;
      }

      .section-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 4px;
        flex-wrap: wrap;
      }
      .tab-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 16px;
        border: none;
        background: none;
        font-size: 0.86rem;
        font-weight: 600;
        color: #64748b;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .tab-btn:hover {
        background: #f1f5f9;
        color: #0f172a;
      }
      .tab-btn.active {
        background: #ffffff;
        color: var(--pmo-primary, #0078d4);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        border: 1px solid #cbd5e1;
      }

      .tab-body-container {
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 10px;
        padding: 24px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }

      /* PROVENANCE LEGEND */
      .provenance-legend {
        display: flex;
        align-items: center;
        gap: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px 16px;
        margin-bottom: 20px;
        flex-wrap: wrap;
        font-size: 0.8rem;
      }
      .legend-title {
        font-weight: 700;
        color: #334155;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .legend-desc {
        color: #64748b;
      }
      .legend-hint {
        margin-left: auto;
        color: #94a3b8;
        font-style: italic;
      }

      .prov-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 10px;
        cursor: help;
        transition: transform 0.1s;
      }
      .prov-badge:hover {
        transform: scale(1.05);
      }
      .prov-badge.ai {
        background: #f3e8ff;
        color: #7e22ce;
        border: 1px solid #d8b4fe;
      }
      .prov-badge.human {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
      }
      .prov-badge.micro {
        padding: 2px 4px;
        font-size: 0.65rem;
      }

      /* FORM GRID */
      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px 20px;
      }
      .col-full { grid-column: span 2; }
      .col-half { grid-column: span 1; }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .field-label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .field-label {
        font-size: 0.82rem;
        font-weight: 600;
        color: #334155;
      }
      .field-label .req {
        color: #dc2626;
      }
      .field-input,
      .field-select {
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        font-size: 0.86rem;
        color: #1e293b;
        background: #ffffff;
      }
      .field-input:focus,
      .field-select:focus {
        outline: none;
        border-color: var(--pmo-primary, #0078d4);
        box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.15);
      }
      .field-range {
        width: 100%;
        accent-color: var(--pmo-primary, #0078d4);
      }

      .flags-row {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        padding-top: 10px;
        border-top: 1px solid #f1f5f9;
        margin-top: 6px;
      }
      .checkbox-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.84rem;
        font-weight: 500;
        color: #1e293b;
        cursor: pointer;
      }

      /* DOCS TAB */
      .docs-hero-banner {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px 20px;
        margin-bottom: 20px;
      }
      .hero-icon-wrap {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: #e0f2fe;
        color: var(--pmo-primary, #0078d4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        flex-shrink: 0;
      }
      .hero-text h3 {
        margin: 0 0 4px 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #0f172a;
      }
      .hero-text p {
        margin: 0;
        font-size: 0.84rem;
        color: #64748b;
        line-height: 1.4;
      }

      .ai-recalculate-card {
        background: #faf5ff;
        border: 1px solid #d8b4fe;
        border-radius: 8px;
        padding: 16px 20px;
        margin-bottom: 20px;
      }
      .recalc-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .recalc-title-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .sparkle-gold {
        font-size: 1.6rem;
        color: #7e22ce;
      }
      .recalc-title-wrap h4 {
        margin: 0 0 2px 0;
        font-size: 0.96rem;
        font-weight: 700;
        color: #581c87;
      }
      .recalc-title-wrap p {
        margin: 0;
        font-size: 0.8rem;
        color: #6b21a8;
      }
      .btn-recalculate {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 18px;
        border-radius: 6px;
        background: #7e22ce;
        border: none;
        color: #ffffff;
        font-size: 0.84rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn-recalculate:hover:not(:disabled) {
        background: #6b21a8;
      }
      .btn-recalculate:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .recalc-progress {
        margin-top: 12px;
      }
      .progress-bar-strip {
        height: 4px;
        width: 100%;
        background: linear-gradient(90deg, #c084fc, #7e22ce, #c084fc);
        border-radius: 2px;
        animation: shimmer 1.5s infinite linear;
      }
      @keyframes shimmer {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
      .progress-text {
        font-size: 0.78rem;
        color: #6b21a8;
        display: block;
        margin-top: 4px;
        font-weight: 500;
      }

      .upload-section-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px 20px;
        margin-bottom: 20px;
      }
      .upload-section-card h4 {
        margin: 0 0 12px 0;
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f172a;
      }
      .upload-form-row {
        display: flex;
        gap: 14px;
        align-items: flex-end;
        flex-wrap: wrap;
      }
      .upload-source-field,
      .upload-file-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .sub-label {
        font-size: 0.78rem;
        font-weight: 600;
        color: #475569;
      }
      .file-input {
        font-size: 0.8rem;
      }
      .btn-upload {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 16px;
        border-radius: 6px;
        background: #0f172a;
        color: #ffffff;
        border: none;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
      }
      .btn-upload:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .upload-status-msg {
        margin-top: 10px;
        font-size: 0.8rem;
        font-weight: 500;
        color: #166534;
      }

      .documents-list-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px 20px;
      }
      .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .list-header h4 {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f172a;
      }
      .btn-refresh-docs {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.78rem;
        background: none;
        border: 1px solid #cbd5e1;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
      }
      .empty-docs-box {
        text-align: center;
        padding: 24px;
        color: #94a3b8;
      }
      .empty-docs-box ion-icon {
        font-size: 2rem;
        margin-bottom: 6px;
      }
      .docs-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
      }
      .docs-table th {
        background: #f8fafc;
        padding: 8px 12px;
        text-align: left;
        border-bottom: 2px solid #e2e8f0;
        color: #475569;
        font-weight: 600;
      }
      .docs-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
      }
      .td-filename {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .category-pill {
        background: #f1f5f9;
        color: #475569;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.72rem;
        font-weight: 600;
      }
      .indexed-tag {
        color: #166534;
        font-weight: 600;
        font-size: 0.75rem;
      }

      /* TRANSPARENCY TAB */
      .transparency-pane {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .transparency-intro {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 18px 22px;
      }
      .trans-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.76rem;
        font-weight: 700;
        color: var(--pmo-primary, #0078d4);
        background: #e0f2fe;
        padding: 3px 10px;
        border-radius: 12px;
        margin-bottom: 6px;
      }
      .transparency-intro h3 {
        margin: 2px 0 6px 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: #0f172a;
      }
      .transparency-intro p {
        margin: 0;
        font-size: 0.86rem;
        color: #475569;
        line-height: 1.45;
      }

      .calc-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 18px 22px;
        background: #ffffff;
      }
      .calc-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        flex-wrap: wrap;
        gap: 8px;
      }
      .calc-title-group {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .calc-title-group h4 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #0f172a;
      }
      .calc-badge {
        font-size: 0.7rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 4px;
        text-transform: uppercase;
      }
      .calc-badge.hybrid {
        background: #f3e8ff;
        color: #7e22ce;
        border: 1px solid #d8b4fe;
      }
      .calc-badge.deterministic {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
      }
      .calc-badge.ml {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #86efac;
      }
      .calc-pill {
        font-size: 0.75rem;
        font-weight: 700;
        background: #f1f5f9;
        color: #334155;
        padding: 3px 10px;
        border-radius: 12px;
      }
      .formula-box {
        background: #f8fafc;
        border-left: 3px solid var(--pmo-primary, #0078d4);
        padding: 10px 14px;
        border-radius: 0 6px 6px 0;
        margin: 10px 0 14px 0;
      }
      .formula-box code {
        font-family: monospace;
        font-size: 0.85rem;
        color: #0f172a;
        font-weight: 600;
      }
      .calc-breakdown-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin-top: 14px;
      }
      .calc-part {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .part-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
      }
      .part-val {
        font-size: 1.1rem;
        font-weight: 800;
        color: #0f172a;
      }
      .part-sub {
        font-size: 0.74rem;
        color: #475569;
        line-height: 1.35;
      }

      .factors-table-wrap {
        overflow-x: auto;
        margin-top: 12px;
      }
      .factors-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
      }
      .factors-table th {
        background: #f8fafc;
        padding: 8px 12px;
        text-align: left;
        border-bottom: 2px solid #e2e8f0;
        color: #475569;
        font-weight: 600;
      }
      .factors-table td {
        padding: 8px 12px;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
      }

      .ml-details-box {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 14px;
        margin-top: 10px;
      }
      .ml-col ul {
        margin: 6px 0 0 16px;
        padding: 0;
        font-size: 0.78rem;
        color: #475569;
        line-height: 1.5;
      }
      .prob-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.78rem;
        margin-top: 6px;
      }
      .prob-bar-wrap {
        flex: 1;
        height: 8px;
        background: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
      }
      .prob-bar {
        height: 100%;
        border-radius: 4px;
      }
      .prob-bar.red { background: #ef4444; }
      .prob-bar.green { background: #22c55e; }
      .prob-bar.yellow { background: #eab308; }
      .prob-bar.gray { background: #94a3b8; }

      /* SIGNALS TAB */
      .signals-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
      .signal-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .sig-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
      }
      .sig-val {
        font-size: 1.25rem;
        font-weight: 800;
        color: #0f172a;
      }
      .sig-desc {
        font-size: 0.76rem;
        color: #64748b;
        line-height: 1.35;
      }

      .loading-state, .error-state {
        text-align: center;
        padding: 60px 20px;
        color: #64748b;
      }

      @media (max-width: 900px) {
        .form-grid { grid-template-columns: 1fr; }
        .col-half { grid-column: span 1; }
        .col-full { grid-column: span 1; }
        .calc-breakdown-grid { grid-template-columns: 1fr; }
        .ml-details-box { grid-template-columns: 1fr; }
        .signals-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class EditProjectPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(DataApiService);
  readonly store = inject(PortfolioStore);

  readonly projectId = signal<string>('');
  readonly activeTab = signal<'fields' | 'documents' | 'transparency' | 'signals'>('fields');
  readonly form = signal<Project>({} as Project);
  readonly baseline = signal<Project | null>(null);
  readonly options = signal<OptionsResponse | null>(null);
  readonly portfolioItems = signal<PortfolioItem[]>([]);
  readonly uploadedDocuments = signal<ProjectUploadMetadata[]>([]);
  readonly selectedSourceKey = 'charter';
  readonly selectedFile = signal<File | null>(null);

  readonly isSaving = signal<boolean>(false);
  readonly isRecalculating = signal<boolean>(false);
  readonly isUploading = signal<boolean>(false);
  readonly saveSuccess = signal<boolean>(false);
  readonly uploadSuccess = signal<boolean>(false);
  readonly recalculateBanner = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);

  readonly fieldProvenance = signal<Record<string, FieldProvenanceItem>>({});

  readonly ready = computed(() => this.options() !== null && !!this.form().projectId);
  readonly lists = computed(() => this.options()?.options ?? null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('projectId');
    if (!id) {
      this.loadError.set('No project ID provided in URL.');
      return;
    }
    this.projectId.set(id);

    forkJoin({
      options: this.api.getOptions(),
      portfolios: this.api.getPortfolios(),
      project: this.api.getProject(id),
      uploads: this.api.getProjectUploads(id),
    }).subscribe({
      next: ({ options, portfolios, project, uploads }) => {
        const raw = project as unknown as Project;
        const portfolioKey =
          raw.portfolioKey ?? portfolios.find((item) => item.displayName === raw.portfolio)?.key ?? '';
        const programKey =
          raw.programKey ??
          portfolios
            .find((item) => item.key === portfolioKey)
            ?.programs.find((pr) => (pr.displayName ?? pr.name) === raw.program)?.key ??
          '';
        const skillKey =
          options.options.skills.find((sk) => sk.key === raw.primarySkill || sk.displayName === raw.primarySkill)
            ?.key ?? raw.primarySkill;

        const resolved: Project = { ...structuredClone(raw), portfolioKey, programKey, primarySkill: skillKey };
        this.portfolioItems.set(portfolios);
        this.options.set(options);
        this.form.set(structuredClone(resolved));
        this.baseline.set(structuredClone(resolved));
        this.uploadedDocuments.set(uploads);

        // Populate field provenance if available, or generate sensible defaults
        const prov: Record<string, FieldProvenanceItem> = (raw.fieldProvenance as Record<string, FieldProvenanceItem>) || {};
        this.fieldProvenance.set(prov);
      },
      error: (err: unknown) => {
        this.loadError.set(problemMessage(err, `Could not load project ${id}.`));
      },
    });
  }

  programsOf(portfolioKey: string | undefined): PortfolioItem['programs'] {
    return this.portfolioItems().find((item) => item.key === portfolioKey)?.programs ?? [];
  }

  onPortfolioChange(portfolioKey: string): void {
    const programKey = this.programsOf(portfolioKey)[0]?.key ?? '';
    this.form.update((current) => ({ ...current, portfolioKey, programKey }));
    this.onFieldInput('portfolioKey', portfolioKey);
    this.onFieldInput('programKey', programKey);
  }

  onFieldInput(key: string, value: unknown): void {
    this.form.update((current) => ({ ...current, [key]: value }));
    // Update provenance to human-modified
    this.fieldProvenance.update((map) => ({
      ...map,
      [key]: {
        source: 'human',
        confidenceScore: 100,
        confidenceLevel: 'Human',
        rationale: 'Direct user input in Edit screen',
      },
    }));
  }

  isAiField(fieldKey: string): boolean {
    const prov = this.fieldProvenance()[fieldKey];
    if (prov) {
      return prov.source === 'ai';
    }
    // If project is ai-generated and field hasn't been edited by human
    return !!this.form().aiGenerated;
  }

  getConfidence(fieldKey: string): number {
    const prov = this.fieldProvenance()[fieldKey];
    if (prov?.confidenceScore) {
      return prov.confidenceScore;
    }
    return this.form().confidenceScore ?? 85;
  }

  getFieldTooltip(fieldKey: string): string {
    const prov = this.fieldProvenance()[fieldKey];
    if (this.isAiField(fieldKey)) {
      const conf = this.getConfidence(fieldKey);
      const rationale = prov?.rationale ?? 'Extracted from charter & domain signals via Foundry Agent';
      return `AI-Prefilled (Confidence: ${conf}%) — ${rationale}`;
    }
    return `Human-Entered (100% confidence) — Directly input or verified by project manager.`;
  }

  onReset(): void {
    const baseline = this.baseline();
    if (baseline) {
      this.form.set(structuredClone(baseline));
      this.saveSuccess.set(false);
      this.recalculateBanner.set(null);
      this.error.set(null);
    }
  }

  onSave(): void {
    const baseline = this.baseline();
    const options = this.options();
    if (!baseline || !options) return;

    this.isSaving.set(true);
    this.error.set(null);
    this.saveSuccess.set(false);

    const changes = changedProjectFields(baseline, this.form(), options.projectFields);
    // Include updated fieldProvenance
    const payload = {
      ...changes,
      fieldProvenance: this.fieldProvenance(),
    };

    this.api.updateProject(this.projectId(), payload).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        this.baseline.set(structuredClone(this.form()));
        // Refresh store
        this.store.refresh();
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        this.error.set(problemMessage(err, 'Failed to save project changes.'));
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  onUploadDocument(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);
    this.uploadSuccess.set(false);
    this.error.set(null);

    this.api.uploadProjectFile(this.projectId(), this.selectedSourceKey, file).subscribe({
      next: (meta) => {
        this.isUploading.set(false);
        this.uploadSuccess.set(true);
        this.selectedFile.set(null);
        this.loadDocuments();
      },
      error: (err: unknown) => {
        this.isUploading.set(false);
        this.error.set(problemMessage(err, 'Failed to upload document.'));
      },
    });
  }

  loadDocuments(): void {
    this.api.getProjectUploads(this.projectId()).subscribe({
      next: (docs) => this.uploadedDocuments.set(docs),
      error: () => {},
    });
  }

  onRecalculateWithAi(): void {
    this.isRecalculating.set(true);
    this.error.set(null);
    this.recalculateBanner.set(null);

    const options = this.options();
    const baseline = this.baseline();
    const changes = baseline && options ? changedProjectFields(baseline, this.form(), options.projectFields) : {};

    this.api.recalculateProject(this.projectId(), changes).subscribe({
      next: (record) => {
        this.isRecalculating.set(false);
        // Merge recalculated scores into form
        this.form.update((current) => ({
          ...current,
          priorityScore: (record as unknown as Project).priorityScore,
          fieldWeightedScore: (record as unknown as Project).fieldWeightedScore,
          finalTier: (record as unknown as Project).finalTier ?? current.finalTier,
          mlTier: (record as unknown as Project).mlTier ?? current.mlTier,
          recommendedAction: (record as unknown as Project).recommendedAction ?? current.recommendedAction,
          confidenceScore: (record as unknown as Project).confidenceScore ?? current.confidenceScore,
        }));
        this.recalculateBanner.set(
          `AI recalculation complete. Priority Score updated to ${this.form().priorityScore ?? 're-evaluated'}, with tier "${this.form().finalTier}". Review updated methodology in Tab 3.`
        );
        this.store.refresh();
      },
      error: (err: unknown) => {
        this.isRecalculating.set(false);
        this.error.set(problemMessage(err, 'Recalculation failed.'));
      },
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  getTierClass(tier: string | undefined): string {
    switch (tier) {
      case 'Must-do-now': return 'tier-mustdo';
      case 'Proceed': return 'tier-proceed';
      case 'Can wait': return 'tier-canwait';
      default: return 'tier-deprioritize';
    }
  }

  getWeightFor(fieldKey: string): number {
    const weights = this.form().effectivePriorityWeights;
    if (weights && fieldKey in weights) {
      return Math.round(weights[fieldKey] * 100);
    }
    return 15;
  }

  calculateNormalizedUserBase(users: number): string {
    return Math.min(100, Math.max(0, Math.round(Math.log10(Math.max(1, users)) / 5 * 100))).toString();
  }

  calculateNormalizedUrgency(months: number): string {
    return Math.min(100, Math.max(0, Math.round((36 - months) / 36 * 100))).toString();
  }

  calculateNormalizedSponsor(level: string): string {
    switch (level) {
      case 'Executive': return '100';
      case 'Director': return '75';
      case 'Manager': return '50';
      default: return '25';
    }
  }

  calculateNormalizedRisk(risk: string): string {
    switch (risk) {
      case 'Low': return '90';
      case 'Medium': return '60';
      case 'High': return '30';
      default: return '10';
    }
  }

  calculateNormalizedCost(cost: number): string {
    return Math.min(100, Math.max(0, Math.round((Math.log10(Math.max(1000, cost)) - 4) / 3 * 100))).toString();
  }

  calculateNormalizedEffort(effort: number): string {
    return Math.min(100, Math.round(effort * 2.5)).toString();
  }
}
