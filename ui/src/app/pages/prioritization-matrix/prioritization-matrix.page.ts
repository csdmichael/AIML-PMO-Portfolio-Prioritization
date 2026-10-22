import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
} from '@ionic/angular';
import { PortfolioStore } from '../../services/portfolio.store';
import { DataApiService } from '../../services/data-api.service';
import { FileExportService, ExportTableData } from '../../services/file-export.service';
import { Project, SignalDriver, PriorityTier } from '../../models/portfolio.models';
import { PriorityWeightsResponse, PriorityWeightMap } from '../admin/priority-weights/priority-weights.models';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

export type WeightBasis = 'final' | 'relative';

export interface ProjectMatrixRow {
  project: Project;
  overallScore: number | null;
  overallScoreDisplay: string;
  confidenceScore: number;
  confidenceLevel: string;
  confidenceDisplay: string;

  // ML Base Score (40% weight)
  mlBaseScore: number;
  mlBaseScoreDisplay: string;

  // Driver fields
  businessValue: number;
  businessValueDisplay: string;
  userBase: number;
  userBaseDisplay: string;
  regulatorySecurity: boolean;
  regulatorySecurityDisplay: string;
  timingUrgencyMonths: number;
  timingUrgencyDisplay: string;
  sponsorLevel: string;
  sponsorLevelDisplay: string;

  // Governance & ML Floor
  governanceFloor: number | null;
  governanceFloorDisplay: string;

  // Remaining driver fields
  dtAlignment: boolean;
  dtAlignmentDisplay: string;
  riskRating: string;
  riskRatingDisplay: string;
  costUsd: number;
  costDisplay: string;

  // ML Output fields
  topDriver: SignalDriver | null;
  topDriverDisplay: string;
  mlTier: PriorityTier;
  mlTierProb: number;
  mlTierDisplay: string;

  // Zero-weight or supplemental driver fields
  dependencies: number;
  dependenciesDisplay: string;
  effortWeeks: number;
  effortDisplay: string;
  skillDemandFte: number;
  skillDemandDisplay: string;

  // Weights breakdown
  effectiveWeights: PriorityWeightMap;
  weightsPct: Record<string, number>;
}

@Component({
  selector: 'app-prioritization-matrix-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonButton,
    IonIcon,
    LoadingSkeletonComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<ion-content class="ion-padding matrix-page-content">
  <!-- Page Header -->
  <div class="page-header">
    <div class="header-titles">
      <div class="breadcrumbs">
        <span class="crumb-parent">Portfolio Management</span>
        <ion-icon name="chevron-forward-outline" class="crumb-sep"></ion-icon>
        <span class="crumb-current">Prioritization Matrix</span>
      </div>
      <h1 class="page-title">Project Prioritization Matrix &amp; Comparative Analysis</h1>
      <p class="page-subtitle">
        Transparent multi-factor ranking matrix showing all projects across rows and prioritization drivers ordered by strategic influence across columns.
        Each cell displays the calculated metric and its effective weighted score contribution in parentheses, including calibrated ML model outputs.
      </p>
    </div>

    <!-- Summary KPI Pills -->
    <div class="kpi-pills-row">
      <div class="kpi-pill">
        <span class="kpi-val">{{ stats().total }}</span>
        <span class="kpi-lbl">Projects</span>
      </div>
      <div class="kpi-pill">
        <span class="kpi-val">{{ stats().avgScore }}</span>
        <span class="kpi-lbl">Avg Score</span>
      </div>
      <div class="kpi-pill">
        <span class="kpi-val">{{ stats().avgConfidence }}%</span>
        <span class="kpi-lbl">Avg Confidence</span>
      </div>
      <div class="kpi-pill must-do">
        <span class="kpi-val">{{ stats().mustDoCount }}</span>
        <span class="kpi-lbl">Must-Do-Now</span>
      </div>
      @if (selectedProjectIds().size > 0) {
        <div class="kpi-pill compare-pill" (click)="toggleCompareMode()">
          <span class="kpi-val">{{ selectedProjectIds().size }}</span>
          <span class="kpi-lbl">Selected to Compare</span>
        </div>
      }
    </div>
  </div>

  <!-- Main Toolbar -->
  <div class="matrix-toolbar">
    <div class="toolbar-filters">
      <!-- Portfolio Filter (Defaults to All) -->
      <div class="filter-group">
        <label for="portfolio-filter-select" class="filter-label">Portfolio:</label>
        <select
          id="portfolio-filter-select"
          class="custom-select"
          [value]="selectedPortfolio()"
          (change)="setPortfolioFilter($any($event.target).value)"
        >
          <option value="all" [selected]="selectedPortfolio() === 'all'">All Portfolios (Default)</option>
          @for (port of portfolioOptions(); track port) {
            <option [value]="port" [selected]="selectedPortfolio() === port">{{ port }}</option>
          }
        </select>
      </div>

      <!-- Quick Search -->
      <div class="search-box">
        <ion-icon name="funnel-outline" class="search-icon"></ion-icon>
        <input
          type="text"
          class="search-input"
          placeholder="Filter by ID, name, manager, or skill..."
          [ngModel]="searchQuery()"
          (ngModelChange)="searchQuery.set($event)"
        />
        @if (searchQuery()) {
          <button class="clear-search-btn" (click)="searchQuery.set('')">&times;</button>
        }
      </div>

      <!-- Weight Basis Toggle -->
      <div class="basis-toggle-group">
        <span class="filter-label">Weight Basis:</span>
        <div class="basis-pills">
          <button
            type="button"
            class="basis-chip"
            [class.active]="weightBasis() === 'final'"
            (click)="weightBasis.set('final')"
            title="Net percentage in the 40% ML / 60% Field Weights priority formula"
          >
            Final Score (40% ML / 60% Fields)
          </button>
          <button
            type="button"
            class="basis-chip"
            [class.active]="weightBasis() === 'relative'"
            (click)="weightBasis.set('relative')"
            title="Relative weight percentage within field-level weights (normalized to 100%)"
          >
            Field Weights (100% Relative)
          </button>
        </div>
      </div>
    </div>

    <!-- Toolbar Action Buttons -->
    <div class="toolbar-actions">
      @if (selectedProjectIds().size > 0) {
        <ion-button
          color="primary"
          [fill]="isCompareMode() ? 'solid' : 'outline'"
          size="small"
          (click)="toggleCompareMode()"
        >
          <ion-icon name="albums-outline" slot="start"></ion-icon>
          {{ isCompareMode() ? 'View Matrix' : 'Compare Side-by-Side (' + selectedProjectIds().size + ')' }}
        </ion-button>
        <ion-button fill="clear" color="medium" size="small" (click)="clearSelection()">
          Clear
        </ion-button>
      }

      <ion-button fill="outline" color="success" size="small" (click)="exportToExcel()">
        <ion-icon name="download-outline" slot="start"></ion-icon>
        Export to Excel
      </ion-button>
    </div>
  </div>

  <!-- Loading & Error States -->
  @if (store.isLoading()) {
    <app-loading-skeleton [cards]="1" [rows]="10"></app-loading-skeleton>
  } @else if (store.loadError()) {
    <app-empty-state
      title="Unable to load portfolio data"
      [message]="store.loadError()!"
      [isError]="true"
    >
      <ion-button (click)="store.init()">Retry</ion-button>
    </app-empty-state>
  } @else if (matrixRows().length === 0) {
    <app-empty-state
      title="No Projects Match the Filter"
      message="Try selecting 'All Portfolios' or clearing your search term."
      icon="funnel-outline"
    >
      <ion-button (click)="setPortfolioFilter('all'); searchQuery.set('')">Reset Filters</ion-button>
    </app-empty-state>
  } @else {
    <!-- VIEW MODE 1: SIDE-BY-SIDE COMPARISON VIEW -->
    @if (isCompareMode() && selectedProjects().length > 0) {
      <div class="comparison-card">
        <div class="comparison-header">
          <div>
            <h2 class="section-title">
              <ion-icon name="albums-outline"></ion-icon>
              Side-by-Side Project Comparison ({{ selectedProjects().length }} Projects)
            </h2>
            <p class="section-subtitle">
              Direct dimensional comparison of evaluated parameters, calculated metrics, weighted score contributions, and model explanations.
            </p>
          </div>
          <div class="comparison-header-actions">
            <ion-button fill="outline" color="success" size="small" (click)="exportComparisonToExcel()">
              <ion-icon name="download-outline" slot="start"></ion-icon>
              Export Comparison to Excel
            </ion-button>
            <ion-button fill="solid" color="primary" size="small" (click)="isCompareMode.set(false)">
              <ion-icon name="grid-outline" slot="start"></ion-icon>
              Back to Full Matrix
            </ion-button>
          </div>
        </div>

        <div class="comparison-table-scroll">
          <table class="comparison-table">
            <thead>
              <tr>
                <th class="dimension-col">Prioritization Dimension</th>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <th class="project-col" [class.winner]="isHighestScore(item)">
                    <div class="project-th-header">
                      <div class="project-th-top">
                        <span class="pid-tag">{{ item.project.projectId }}</span>
                        <button
                          type="button"
                          class="remove-compare-btn"
                          title="Remove from comparison"
                          (click)="removeProjectFromCompare(item.project.projectId)"
                        >
                          &times;
                        </button>
                      </div>
                      <div class="pname-tag">{{ item.project.projectName }}</div>
                      <div class="tier-badge-wrap">
                        <span class="tier-pill" [attr.data-tier]="item.project.finalTier">{{ item.project.finalTier }}</span>
                        @if (isHighestScore(item)) {
                          <span class="highest-score-pill">Top Score</span>
                        }
                      </div>
                    </div>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              <!-- Group 1: Strategic Scores & Confidence -->
              <tr class="group-row">
                <td [attr.colspan]="selectedProjects().length + 1">Priority &amp; Model Confidence</td>
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Overall Priority Score</strong>
                  <small>0 - 100 continuous ranking score</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td [class.winner-cell]="isHighestScore(item)">
                    <div class="score-callout">{{ item.overallScoreDisplay }}</div>
                  </td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Confidence % &amp; Level</strong>
                  <small>Evidence completeness, audit quality, certainty</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>
                    <span class="conf-badge" [attr.data-level]="item.confidenceLevel">
                      {{ item.confidenceDisplay }}
                    </span>
                  </td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>ML Base Score (40% Weight)</strong>
                  <small>LightGBM calibrated class probability blend</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>
                    <span class="cell-val">{{ item.mlBaseScoreDisplay }}</span>
                  </td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>ML Predicted Tier &amp; Probability</strong>
                  <small>Decision tree ensemble raw prediction</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>
                    <span class="tier-pill small" [attr.data-tier]="item.mlTier">{{ item.mlTierDisplay }}</span>
                  </td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Governance Rule Floor</strong>
                  <small>Deterministic statutory/cyber override floor</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>
                    <span class="floor-val">{{ item.governanceFloorDisplay }}</span>
                  </td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Top SHAP Feature Driver</strong>
                  <small>Greatest positive or negative priority influence</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>
                    <span class="shap-driver">{{ item.topDriverDisplay }}</span>
                  </td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Strategic K-Means Cluster</strong>
                  <small>Multi-dimensional behavioral grouping</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>{{ item.project.cluster || '—' }}</td>
                }
              </tr>

              <!-- Group 2: Prioritization Factors (60% Field Weights) -->
              <tr class="group-row">
                <td [attr.colspan]="selectedProjects().length + 1">Prioritization Factor Drivers (60% Field-Weighted)</td>
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Business Value Score</strong>
                  <small>1 - 5 stakeholder impact rating</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td><span class="cell-val">{{ item.businessValueDisplay }}</span></td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Impacted Users Base</strong>
                  <small>Adoption breadth &amp; user scale</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td><span class="cell-val">{{ item.userBaseDisplay }}</span></td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Regulatory &amp; Security Mandate</strong>
                  <small>Statutory compliance or cyber priority</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>
                    <span class="bool-pill" [class.yes]="item.regulatorySecurity">
                      {{ item.regulatorySecurityDisplay }}
                    </span>
                  </td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Timing Urgency (Go-Live)</strong>
                  <small>Months to target delivery date</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td><span class="cell-val">{{ item.timingUrgencyDisplay }}</span></td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Executive Sponsor Level</strong>
                  <small>Leadership commitment level</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td><span class="cell-val">{{ item.sponsorLevelDisplay }}</span></td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Digital Transformation (DT) Alignment</strong>
                  <small>Corporate digital road-map strategic fit</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>
                    <span class="bool-pill" [class.yes]="item.dtAlignment">
                      {{ item.dtAlignmentDisplay }}
                    </span>
                  </td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Risk Governance Level</strong>
                  <small>Complexity &amp; operational oversight requirement</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td><span class="cell-val">{{ item.riskRatingDisplay }}</span></td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Cost Scale (Budget USD)</strong>
                  <small>Total capital expenditure estimate</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td><span class="cell-val">{{ item.costDisplay }}</span></td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Critical Path Dependencies</strong>
                  <small>Architecture and predecessor prerequisites</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td><span class="cell-val">{{ item.dependenciesDisplay }}</span></td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Effort Demand (Weeks)</strong>
                  <small>Execution work estimate</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td><span class="cell-val">{{ item.effortDisplay }}</span></td>
                }
              </tr>
              <tr>
                <td class="dim-title">
                  <strong>Primary Skill &amp; Demand</strong>
                  <small>Specialized resource intensity</small>
                </td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>
                    <strong>{{ item.project.primarySkill }}</strong>
                    <div>{{ item.skillDemandDisplay }}</div>
                  </td>
                }
              </tr>

              <!-- Group 3: Organizational Context -->
              <tr class="group-row">
                <td [attr.colspan]="selectedProjects().length + 1">Project Governance &amp; Metadata</td>
              </tr>
              <tr>
                <td class="dim-title"><strong>Portfolio &amp; Program</strong></td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>
                    <div><strong>{{ item.project.portfolio }}</strong></div>
                    <small>{{ item.project.program || 'General Program' }}</small>
                  </td>
                }
              </tr>
              <tr>
                <td class="dim-title"><strong>Business Unit &amp; Site</strong></td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>{{ item.project.businessUnit }} · {{ item.project.site }}</td>
                }
              </tr>
              <tr>
                <td class="dim-title"><strong>Project Manager &amp; Sponsor</strong></td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>
                    <div>PM: {{ item.project.projectManager }}</div>
                    <small>Sponsor: {{ item.project.executiveSponsor }}</small>
                  </td>
                }
              </tr>
              <tr>
                <td class="dim-title"><strong>Recommended Action</strong></td>
                @for (item of selectedProjects(); track item.project.projectId) {
                  <td>
                    <span class="action-tag">{{ item.project.recommendedAction }}</span>
                  </td>
                }
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- VIEW MODE 2: PRIORITIZATION MATRIX TABLE -->
    <div class="matrix-card">
      <div class="matrix-table-container">
        <table class="prioritization-matrix-table">
          <thead>
            <tr>
              <!-- Multi-select checkbox column -->
              <th class="th-check">
                <input
                  type="checkbox"
                  title="Select all filtered projects"
                  [checked]="selectedProjectIds().size === matrixRows().length && matrixRows().length > 0"
                  (change)="selectAllFiltered()"
                />
              </th>

              <!-- Project Identification Column -->
              <th class="th-project sticky-col" (click)="toggleSort('projectId')">
                <div class="th-content">
                  <span>Project</span>
                  @if (sortColumn() === 'projectId') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- Portfolio & Tier Column -->
              <th class="th-meta" (click)="toggleSort('finalTier')">
                <div class="th-content">
                  <span>Portfolio / Tier</span>
                  @if (sortColumn() === 'finalTier') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- FIRST REQUIRED COLUMN: Overall Score -->
              <th class="th-score" (click)="toggleSort('overallScore')">
                <div class="th-content">
                  <span class="th-label">Overall Score</span>
                  <span class="th-sub">1st Col · 0-100</span>
                  @if (sortColumn() === 'overallScore') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- SECOND REQUIRED COLUMN: Confidence Percentage -->
              <th class="th-conf" (click)="toggleSort('confidenceScore')">
                <div class="th-content">
                  <span class="th-label">Confidence %</span>
                  <span class="th-sub">2nd Col · Quality</span>
                  @if (sortColumn() === 'confidenceScore') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- FIELDS IN ORDER OF INFLUENCE -->
              <!-- 1. ML Output: ML Base Score (40% Weight) -->
              <th class="th-driver" (click)="toggleSort('mlBaseScore')">
                <div class="th-content">
                  <span class="th-label">ML Base Score</span>
                  <span class="th-sub">ML (40.0% weight)</span>
                  @if (sortColumn() === 'mlBaseScore') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 2. Business Value (25% field wt -> 15.0% score) -->
              <th class="th-driver" (click)="toggleSort('businessValue')">
                <div class="th-content">
                  <span class="th-label">Business Value</span>
                  <span class="th-sub">Impact (15.0%)</span>
                  @if (sortColumn() === 'businessValue') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 3. Impacted Users Base (20% field wt -> 12.0% score) -->
              <th class="th-driver" (click)="toggleSort('userBase')">
                <div class="th-content">
                  <span class="th-label">User Base</span>
                  <span class="th-sub">Reach (12.0%)</span>
                  @if (sortColumn() === 'userBase') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 4. Regulatory & Security (15% field wt -> 9.0% score) -->
              <th class="th-driver" (click)="toggleSort('regulatorySecurity')">
                <div class="th-content">
                  <span class="th-label">Regulatory &amp; Sec</span>
                  <span class="th-sub">Compliance (9.0%)</span>
                  @if (sortColumn() === 'regulatorySecurity') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 5. Timing Urgency (15% field wt -> 9.0% score) -->
              <th class="th-driver" (click)="toggleSort('timingUrgencyMonths')">
                <div class="th-content">
                  <span class="th-label">Timing Urgency</span>
                  <span class="th-sub">Schedule (9.0%)</span>
                  @if (sortColumn() === 'timingUrgencyMonths') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 6. Executive Sponsor (10% field wt -> 6.0% score) -->
              <th class="th-driver" (click)="toggleSort('sponsorLevel')">
                <div class="th-content">
                  <span class="th-label">Executive Sponsor</span>
                  <span class="th-sub">Leadership (6.0%)</span>
                  @if (sortColumn() === 'sponsorLevel') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 7. ML & Rules: Governance Rule Floor -->
              <th class="th-driver" (click)="toggleSort('governanceFloor')">
                <div class="th-content">
                  <span class="th-label">Rule Floor</span>
                  <span class="th-sub">ML &amp; Rules Override</span>
                  @if (sortColumn() === 'governanceFloor') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 8. Digital Transformation Alignment (5% field wt -> 3.0% score) -->
              <th class="th-driver" (click)="toggleSort('dtAlignment')">
                <div class="th-content">
                  <span class="th-label">DT Alignment</span>
                  <span class="th-sub">Strategy (3.0%)</span>
                  @if (sortColumn() === 'dtAlignment') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 9. Risk Governance Level (5% field wt -> 3.0% score) -->
              <th class="th-driver" (click)="toggleSort('riskRating')">
                <div class="th-content">
                  <span class="th-label">Risk Level</span>
                  <span class="th-sub">Oversight (3.0%)</span>
                  @if (sortColumn() === 'riskRating') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 10. Cost Scale (5% field wt -> 3.0% score) -->
              <th class="th-driver" (click)="toggleSort('costUsd')">
                <div class="th-content">
                  <span class="th-label">Cost Scale</span>
                  <span class="th-sub">Budget (3.0%)</span>
                  @if (sortColumn() === 'costUsd') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 11. ML Output: Top SHAP Driver -->
              <th class="th-driver">
                <div class="th-content">
                  <span class="th-label">Top SHAP Driver</span>
                  <span class="th-sub">ML Explainability</span>
                </div>
              </th>

              <!-- 12. ML Output: Predicted Tier & Prob -->
              <th class="th-driver" (click)="toggleSort('mlTier')">
                <div class="th-content">
                  <span class="th-label">ML Predicted Tier</span>
                  <span class="th-sub">Class &amp; Prob</span>
                  @if (sortColumn() === 'mlTier') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 13. Critical Path Dependencies (0.0% default) -->
              <th class="th-driver" (click)="toggleSort('dependencies')">
                <div class="th-content">
                  <span class="th-label">Dependencies</span>
                  <span class="th-sub">Architecture (0.0%)</span>
                  @if (sortColumn() === 'dependencies') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 14. Effort Demand (0.0% default) -->
              <th class="th-driver" (click)="toggleSort('effortWeeks')">
                <div class="th-content">
                  <span class="th-label">Effort</span>
                  <span class="th-sub">Person-Wks (0.0%)</span>
                  @if (sortColumn() === 'effortWeeks') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>

              <!-- 15. Skill Demand FTE (0.0% default) -->
              <th class="th-driver" (click)="toggleSort('skillDemandFte')">
                <div class="th-content">
                  <span class="th-label">Skill Demand</span>
                  <span class="th-sub">FTE Load (0.0%)</span>
                  @if (sortColumn() === 'skillDemandFte') {
                    <ion-icon [name]="sortDirection() === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'"></ion-icon>
                  }
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (row of matrixRows(); track row.project.projectId) {
              <tr [class.selected-row]="isProjectSelected(row.project.projectId)">
                <!-- Checkbox -->
                <td class="td-check">
                  <input
                    type="checkbox"
                    [attr.aria-label]="'Select ' + row.project.projectId + ' for side-by-side comparison'"
                    [checked]="isProjectSelected(row.project.projectId)"
                    (change)="toggleProjectSelection(row.project.projectId)"
                  />
                </td>

                <!-- Project ID & Name -->
                <td class="td-project sticky-col">
                  <a [routerLink]="['/projects', row.project.projectId]" class="pid-link">
                    <strong>{{ row.project.projectId }}</strong>
                  </a>
                  <div class="pname-text" [title]="row.project.projectName">
                    {{ row.project.projectName }}
                  </div>
                </td>

                <!-- Portfolio / Tier -->
                <td class="td-meta">
                  <div class="port-name">{{ row.project.portfolio }}</div>
                  <span class="tier-pill small" [attr.data-tier]="row.project.finalTier">
                    {{ row.project.finalTier }}
                  </span>
                </td>

                <!-- FIRST COLUMN: Overall Score -->
                <td class="td-score">
                  <span class="score-badge">
                    {{ row.overallScoreDisplay }}
                  </span>
                </td>

                <!-- SECOND COLUMN: Confidence % -->
                <td class="td-conf">
                  <span class="conf-badge" [attr.data-level]="row.confidenceLevel">
                    {{ row.confidenceDisplay }}
                  </span>
                </td>

                <!-- ML Base Score (40% weight) -->
                <td class="td-cell ml-cell">
                  <strong>{{ row.mlBaseScoreDisplay }}</strong>
                </td>

                <!-- Business Value -->
                <td class="td-cell">
                  {{ row.businessValueDisplay }}
                </td>

                <!-- Impacted Users Base -->
                <td class="td-cell">
                  {{ row.userBaseDisplay }}
                </td>

                <!-- Regulatory & Security -->
                <td class="td-cell">
                  <span class="bool-pill" [class.yes]="row.regulatorySecurity">
                    {{ row.regulatorySecurityDisplay }}
                  </span>
                </td>

                <!-- Timing Urgency -->
                <td class="td-cell">
                  {{ row.timingUrgencyDisplay }}
                </td>

                <!-- Executive Sponsor -->
                <td class="td-cell">
                  {{ row.sponsorLevelDisplay }}
                </td>

                <!-- Governance Rule Floor -->
                <td class="td-cell floor-cell">
                  {{ row.governanceFloorDisplay }}
                </td>

                <!-- DT Alignment -->
                <td class="td-cell">
                  <span class="bool-pill" [class.yes]="row.dtAlignment">
                    {{ row.dtAlignmentDisplay }}
                  </span>
                </td>

                <!-- Risk Governance -->
                <td class="td-cell">
                  {{ row.riskRatingDisplay }}
                </td>

                <!-- Cost Scale -->
                <td class="td-cell">
                  {{ row.costDisplay }}
                </td>

                <!-- Top SHAP Driver -->
                <td class="td-cell shap-cell">
                  {{ row.topDriverDisplay }}
                </td>

                <!-- ML Predicted Tier -->
                <td class="td-cell">
                  <span class="tier-pill small" [attr.data-tier]="row.mlTier">
                    {{ row.mlTierDisplay }}
                  </span>
                </td>

                <!-- Dependencies -->
                <td class="td-cell">
                  {{ row.dependenciesDisplay }}
                </td>

                <!-- Effort -->
                <td class="td-cell">
                  {{ row.effortDisplay }}
                </td>

                <!-- Skill Demand FTE -->
                <td class="td-cell">
                  {{ row.skillDemandDisplay }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Sticky Comparison Floating Bar (when projects selected) -->
    @if (selectedProjectIds().size > 0 && !isCompareMode()) {
      <div class="compare-floating-bar">
        <div class="compare-bar-info">
          <ion-icon name="albums-outline"></ion-icon>
          <span><strong>{{ selectedProjectIds().size }} projects</strong> selected for side-by-side comparison</span>
        </div>
        <div class="compare-bar-actions">
          <ion-button color="light" size="small" (click)="clearSelection()">
            Deselect All
          </ion-button>
          <ion-button color="warning" size="small" (click)="toggleCompareMode()" [disabled]="selectedProjectIds().size < 2">
            <ion-icon name="analytics-outline" slot="start"></ion-icon>
            Compare Side-by-Side ({{ selectedProjectIds().size }})
          </ion-button>
        </div>
      </div>
    }
  }
</ion-content>
`,
  styles: [`
.matrix-page-content {
  --background: var(--pmo-bg, #f4f6f8);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.header-titles {
  max-width: 820px;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--pmo-muted, #666);
  margin-bottom: 4px;
}

.crumb-current {
  color: var(--pmo-primary, #0078d4);
  font-weight: 600;
}

.page-title {
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--pmo-primary-dark, #004578);
  margin: 0 0 6px 0;
}

.page-subtitle {
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--pmo-muted, #555);
  margin: 0;
}

.kpi-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.kpi-pill {
  background: #ffffff;
  border: 1px solid var(--pmo-border, #e0e0e0);
  border-radius: 8px;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 85px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.kpi-pill .kpi-val {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--pmo-primary-dark, #004578);
}

.kpi-pill .kpi-lbl {
  font-size: 0.72rem;
  color: var(--pmo-muted, #666);
  text-transform: uppercase;
  font-weight: 600;
}

.kpi-pill.must-do .kpi-val {
  color: var(--pmo-mustdo, #d13438);
}

.kpi-pill.compare-pill {
  background: #fff8e1;
  border-color: #ffe082;
  cursor: pointer;
}

.kpi-pill.compare-pill .kpi-val {
  color: #b45309;
}

.matrix-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  background: #ffffff;
  border: 1px solid var(--pmo-border, #e0e0e0);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
}

.toolbar-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  flex: 1;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #334155;
}

.custom-select {
  padding: 6px 12px;
  border: 1px solid var(--pmo-border, #cbd5e1);
  border-radius: 6px;
  font-size: 0.85rem;
  background: #ffffff;
  color: #0f172a;
  outline: none;
  cursor: pointer;
  min-width: 190px;
}

.custom-select:focus {
  border-color: var(--pmo-primary, #0078d4);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
}

.search-box {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid var(--pmo-border, #cbd5e1);
  border-radius: 6px;
  padding: 5px 10px;
  min-width: 240px;
  max-width: 340px;
}

.search-icon {
  color: #64748b;
  margin-right: 6px;
  font-size: 1rem;
}

.search-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.84rem;
  width: 100%;
  color: #0f172a;
}

.clear-search-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  color: #94a3b8;
  cursor: pointer;
}

.basis-toggle-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.basis-pills {
  display: flex;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
}

.basis-chip {
  padding: 5px 10px;
  border: none;
  background: #f8fafc;
  font-size: 0.76rem;
  color: #475569;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s ease;
}

.basis-chip.active {
  background: var(--pmo-primary, #0078d4);
  color: #ffffff;
  font-weight: 600;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.matrix-card {
  background: #ffffff;
  border: 1px solid var(--pmo-border, #e0e0e0);
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  margin-bottom: 24px;
}

.matrix-table-container {
  overflow-x: auto;
  max-height: calc(100vh - 280px);
}

.prioritization-matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.82rem;
  text-align: left;
}

.prioritization-matrix-table thead th {
  position: sticky;
  top: 0;
  background: #f1f5f9;
  color: #1e293b;
  font-weight: 700;
  padding: 10px 12px;
  border-bottom: 2px solid #cbd5e1;
  border-right: 1px solid #e2e8f0;
  z-index: 10;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.prioritization-matrix-table thead th.sticky-col {
  position: sticky;
  left: 38px;
  z-index: 20;
  background: #e2e8f0;
}

.prioritization-matrix-table thead th.th-check {
  position: sticky;
  left: 0;
  z-index: 20;
  background: #e2e8f0;
  width: 38px;
  text-align: center;
}

.th-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.th-label {
  font-size: 0.82rem;
  font-weight: 700;
}

.th-sub {
  font-size: 0.68rem;
  color: #64748b;
  font-weight: 500;
}

.th-score {
  background: #e0f2fe !important;
  color: #0369a1 !important;
}

.th-conf {
  background: #f0fdf4 !important;
  color: #15803d !important;
}

.prioritization-matrix-table tbody tr {
  transition: background 0.12s ease;
}

.prioritization-matrix-table tbody tr:hover {
  background: #f8fafc;
}

.prioritization-matrix-table tbody tr.selected-row {
  background: #eff6ff !important;
}

.prioritization-matrix-table tbody td {
  padding: 8px 12px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #f1f5f9;
  vertical-align: middle;
  color: #1e293b;
  white-space: nowrap;
}

.prioritization-matrix-table tbody td.td-check {
  position: sticky;
  left: 0;
  background: #ffffff;
  z-index: 5;
  text-align: center;
  width: 38px;
}

.selected-row td.td-check,
.selected-row td.sticky-col {
  background: #eff6ff !important;
}

.prioritization-matrix-table tbody td.sticky-col {
  position: sticky;
  left: 38px;
  background: #ffffff;
  z-index: 5;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.04);
}

.pid-link {
  color: var(--pmo-primary, #0078d4);
  text-decoration: none;
  font-weight: 700;
  font-family: monospace;
}

.pid-link:hover {
  text-decoration: underline;
}

.pname-text {
  font-size: 0.78rem;
  color: #475569;
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.port-name {
  font-size: 0.74rem;
  font-weight: 600;
  color: #334155;
}

.td-score {
  background: #f0f9ff;
  text-align: center;
}

.score-badge {
  display: inline-block;
  font-size: 0.92rem;
  font-weight: 800;
  color: #0284c7;
  padding: 3px 8px;
  background: #e0f2fe;
  border-radius: 6px;
}

.td-conf {
  background: #f0fdf4;
  text-align: center;
}

.conf-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}

.conf-badge[data-level='High'] {
  background: #dcfce7;
  color: #15803d;
}

.conf-badge[data-level='Medium'] {
  background: #fef9c3;
  color: #a16207;
}

.conf-badge[data-level='Low'] {
  background: #fee2e2;
  color: #b91c1c;
}

.tier-pill {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}

.tier-pill.small {
  font-size: 0.68rem;
  padding: 1px 5px;
}

.tier-pill[data-tier='Must-do-now'] {
  background: #fee2e2;
  color: var(--pmo-mustdo, #d13438);
}

.tier-pill[data-tier='Proceed'] {
  background: #dcfce7;
  color: var(--pmo-proceed, #107c10);
}

.tier-pill[data-tier='Can wait'] {
  background: #fef3c7;
  color: var(--pmo-canwait, #c19c00);
}

.tier-pill[data-tier='Candidate to deprioritize'] {
  background: #f1f5f9;
  color: var(--pmo-deprioritize, #737373);
}

.ml-cell {
  background: #fcfcfc;
  color: #0f172a;
}

.floor-cell {
  font-weight: 600;
  color: #b91c1c;
}

.shap-cell {
  font-size: 0.78rem;
  color: #475569;
}

.bool-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #64748b;
}

.bool-pill.yes {
  background: #dbeafe;
  color: #1d4ed8;
}

.compare-floating-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: #ffffff;
  border-radius: 30px;
  padding: 10px 22px;
  display: flex;
  align-items: center;
  gap: 18px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: slideUp 0.25s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.compare-bar-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
}

.compare-bar-info ion-icon {
  font-size: 1.2rem;
  color: #f59e0b;
}

.compare-bar-actions {
  display: flex;
  gap: 8px;
}

.comparison-card {
  background: #ffffff;
  border: 1px solid var(--pmo-border, #e0e0e0);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 14px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--pmo-primary-dark, #004578);
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-subtitle {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
}

.comparison-header-actions {
  display: flex;
  gap: 8px;
}

.comparison-table-scroll {
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.83rem;
}

.comparison-table th,
.comparison-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  vertical-align: top;
}

.comparison-table th.dimension-col {
  width: 260px;
  min-width: 240px;
  background: #f8fafc;
  font-weight: 700;
  color: #1e293b;
  border-right: 2px solid #cbd5e1;
}

.comparison-table th.project-col {
  min-width: 220px;
  background: #f1f5f9;
  text-align: left;
}

.comparison-table th.project-col.winner {
  background: #f0fdf4;
  border-top: 3px solid #16a34a;
}

.project-th-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-th-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pid-tag {
  font-weight: 800;
  font-family: monospace;
  color: var(--pmo-primary, #0078d4);
  font-size: 0.95rem;
}

.remove-compare-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #94a3b8;
  cursor: pointer;
  line-height: 1;
}

.remove-compare-btn:hover {
  color: #ef4444;
}

.pname-tag {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
}

.tier-badge-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.highest-score-pill {
  font-size: 0.68rem;
  font-weight: 700;
  background: #16a34a;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 10px;
}

.group-row td {
  background: #e2e8f0 !important;
  font-weight: 700;
  color: #0f172a;
  text-transform: uppercase;
  font-size: 0.74rem;
  letter-spacing: 0.5px;
  padding: 6px 12px;
}

.dim-title {
  background: #fafafa;
  border-right: 2px solid #cbd5e1 !important;
}

.dim-title strong {
  display: block;
  color: #1e293b;
}

.dim-title small {
  display: block;
  color: #64748b;
  font-size: 0.72rem;
}

.winner-cell {
  background: #f0fdf4 !important;
}

.score-callout {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0284c7;
}

.winner-cell .score-callout {
  color: #15803d;
}

.floor-val {
  font-weight: 600;
  color: #b91c1c;
}

.cell-val {
  font-size: 0.84rem;
  font-weight: 500;
  color: #0f172a;
}

.shap-driver {
  font-family: monospace;
  font-size: 0.8rem;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.action-tag {
  font-size: 0.78rem;
  font-weight: 600;
  color: #0284c7;
  background: #e0f2fe;
  padding: 3px 8px;
  border-radius: 4px;
}
`],
})
export class PrioritizationMatrixPageComponent implements OnInit {
  readonly store = inject(PortfolioStore);
  private readonly dataApi = inject(DataApiService);
  private readonly fileExport = inject(FileExportService);

  // Filter state
  readonly selectedPortfolio = signal<string>('all');
  readonly searchQuery = signal<string>('');
  readonly weightBasis = signal<WeightBasis>('final');

  // Multi-select for side-by-side comparison
  readonly selectedProjectIds = signal<Set<string>>(new Set());
  readonly isCompareMode = signal<boolean>(false);

  // Sorting
  readonly sortColumn = signal<string>('overallScore');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  // Saved weights state
  readonly weightsResponse = signal<PriorityWeightsResponse | null>(null);
  readonly weightsLoading = signal<boolean>(false);

  readonly defaultWeightsMap: PriorityWeightMap = {
    businessValue: 25.0,
    userBase: 20.0,
    regulatorySecurity: 15.0,
    timingUrgency: 15.0,
    sponsorPriority: 10.0,
    dtAlignment: 5.0,
    risk: 5.0,
    cost: 5.0,
    dependencies: 0.0,
    effort: 0.0,
    skillDemand: 0.0,
  };

  // Distinct portfolios for dropdown filter (defaults to 'all')
  readonly portfolioOptions = computed<string[]>(() => {
    const list = this.store.availablePortfolios();
    return Array.from(new Set(list)).sort();
  });

  // Base list of active projects
  readonly allProjects = computed<Project[]>(() => this.store.activeProjects());

  // Filtered projects by portfolio and search query
  readonly filteredProjects = computed<Project[]>(() => {
    const portfolio = this.selectedPortfolio();
    const query = this.searchQuery().trim().toLowerCase();
    let list = this.allProjects();

    if (portfolio && portfolio !== 'all') {
      list = list.filter((p) => p.portfolio === portfolio);
    }

    if (query) {
      list = list.filter(
        (p) =>
          p.projectId.toLowerCase().includes(query) ||
          p.projectName.toLowerCase().includes(query) ||
          p.projectManager?.toLowerCase().includes(query) ||
          p.primarySkill?.toLowerCase().includes(query)
      );
    }

    return list;
  });

  // Computed matrix rows with calculated values and weights
  readonly matrixRows = computed<ProjectMatrixRow[]>(() => {
    const projects = this.filteredProjects();
    const basis = this.weightBasis();
    const weightsConfig = this.weightsResponse();

    const rows: ProjectMatrixRow[] = projects.map((project) =>
      this.buildMatrixRow(project, basis, weightsConfig)
    );

    // Apply sorting
    const col = this.sortColumn();
    const dir = this.sortDirection();
    return rows.sort((a, b) => {
      let va: any = (a as any)[col];
      let vb: any = (b as any)[col];

      if (col === 'overallScore') {
        va = a.overallScore ?? -1;
        vb = b.overallScore ?? -1;
      }

      if (typeof va === 'string') {
        return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return dir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

  // Projects selected for side-by-side comparison
  readonly selectedProjects = computed<ProjectMatrixRow[]>(() => {
    const selectedIds = this.selectedProjectIds();
    const allRows = this.allProjects().map((p) =>
      this.buildMatrixRow(p, this.weightBasis(), this.weightsResponse())
    );
    return allRows.filter((r) => selectedIds.has(r.project.projectId));
  });

  // Summary statistics
  readonly stats = computed(() => {
    const rows = this.matrixRows();
    const total = rows.length;
    if (total === 0) {
      return { total: 0, avgScore: 0, avgConfidence: 0, mustDoCount: 0 };
    }
    const scored = rows.filter((r) => r.overallScore != null);
    const avgScore =
      scored.length > 0
        ? Math.round(
            (scored.reduce((sum, r) => sum + (r.overallScore ?? 0), 0) / scored.length) * 10
          ) / 10
        : 0;
    const avgConfidence = Math.round(
      rows.reduce((sum, r) => sum + r.confidenceScore, 0) / total
    );
    const mustDoCount = rows.filter((r) => r.project.finalTier === 'Must-do-now').length;
    return { total, avgScore, avgConfidence, mustDoCount };
  });

  ngOnInit(): void {
    if (this.store.rawProjects().length === 0) {
      this.store.init();
    }
    this.loadWeights();
  }

  loadWeights(): void {
    this.weightsLoading.set(true);
    this.dataApi.getPriorityWeights().subscribe({
      next: (resp) => {
        this.weightsResponse.set(resp);
        this.weightsLoading.set(false);
      },
      error: () => {
        this.weightsLoading.set(false);
      },
    });
  }

  setPortfolioFilter(portfolio: string): void {
    this.selectedPortfolio.set(portfolio || 'all');
  }

  toggleSort(column: string): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
  }

  toggleProjectSelection(projectId: string): void {
    this.selectedProjectIds.update((set) => {
      const next = new Set(set);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  isProjectSelected(projectId: string): boolean {
    return this.selectedProjectIds().has(projectId);
  }

  selectAllFiltered(): void {
    const ids = this.matrixRows().map((r) => r.project.projectId);
    this.selectedProjectIds.set(new Set(ids));
  }

  clearSelection(): void {
    this.selectedProjectIds.set(new Set());
    this.isCompareMode.set(false);
  }

  removeProjectFromCompare(projectId: string): void {
    this.selectedProjectIds.update((set) => {
      const next = new Set(set);
      next.delete(projectId);
      return next;
    });
  }

  toggleCompareMode(): void {
    this.isCompareMode.update((v) => !v);
  }

  // Calculation helpers
  private buildMatrixRow(
    project: Project,
    basis: WeightBasis,
    weightsConfig: PriorityWeightsResponse | null
  ): ProjectMatrixRow {
    const defaults = weightsConfig?.defaultWeights ?? this.defaultWeightsMap;
    const portfolioOverrides =
      (project.portfolioKey && weightsConfig?.portfolioOverrides?.[project.portfolioKey]) ||
      (project.portfolio && weightsConfig?.portfolioOverrides?.[project.portfolio]) ||
      {};
    const projectOverrides = weightsConfig?.projectOverrides?.[project.projectId] || {};

    const effectiveWeights: PriorityWeightMap = {
      ...defaults,
      ...portfolioOverrides,
      ...projectOverrides,
    };

    const totalWeight = Object.values(effectiveWeights).reduce(
      (sum, val) => sum + (Number.isFinite(val) && val > 0 ? val : 0),
      0
    );

    // Compute percentage of weighted score for each field
    // When basis is 'final': ML is 40%, fields account for 60% total.
    // When basis is 'relative': fields account for 100% of field weight.
    const multiplier = basis === 'final' ? 60.0 : 100.0;
    const weightsPct: Record<string, number> = {};
    for (const [key, val] of Object.entries(effectiveWeights)) {
      weightsPct[key] =
        totalWeight > 0 ? Math.round(((val / totalWeight) * multiplier) * 10) / 10 : 0;
    }

    // Overall Score
    const overallScore = project.priorityScore ?? project.recordedPriorityScore ?? null;
    const overallScoreDisplay = overallScore != null ? overallScore.toFixed(1) : '—';

    // Confidence
    const confidenceScore = project.confidenceScore ?? 0;
    const confidenceLevel = project.confidenceLevel ?? 'Low';
    const confidenceDisplay = `${confidenceScore}% (${confidenceLevel})`;

    // ML Base Score (calculated from class probabilities or recorded)
    let mlBaseScore = project.mlBaseScore;
    if (mlBaseScore == null && project.tierProbabilities) {
      const p = project.tierProbabilities;
      mlBaseScore = Math.round(
        (100 * ((p.mustDoNow ?? 0) * 1.0 + (p.proceed ?? 0) * 0.7 + (p.canWait ?? 0) * 0.35 + (p.deprioritize ?? 0) * 0.0)) *
          10
      ) / 10;
    }
    mlBaseScore = mlBaseScore ?? 0;
    const mlScorePct = basis === 'final' ? '40.0%' : '40.0% ML';
    const mlBaseScoreDisplay = `${mlBaseScore.toFixed(1)} (${mlScorePct})`;

    // Driver fields formatted with calculated values and (percentage of weighted score)
    const bvPct = `${weightsPct['businessValue']?.toFixed(1) ?? '15.0'}%`;
    const businessValue = project.businessValue ?? 1;
    const businessValueDisplay = `${businessValue} / 5 (${bvPct})`;

    const ubPct = `${weightsPct['userBase']?.toFixed(1) ?? '12.0'}%`;
    const userBase = project.userBase ?? 0;
    const userBaseDisplay = `${userBase.toLocaleString()} (${ubPct})`;

    const regPct = `${weightsPct['regulatorySecurity']?.toFixed(1) ?? '9.0'}%`;
    const regulatorySecurity = !!project.regulatorySecurity;
    const regulatorySecurityDisplay = `${regulatorySecurity ? 'Yes' : 'No'} (${regPct})`;

    const urgPct = `${weightsPct['timingUrgency']?.toFixed(1) ?? '9.0'}%`;
    const timingUrgencyMonths = project.monthsToGoLive ?? 0;
    const timingUrgencyDisplay = `${timingUrgencyMonths} mo (${urgPct})`;

    const spPct = `${weightsPct['sponsorPriority']?.toFixed(1) ?? '6.0'}%`;
    const sponsorLevel = project.sponsorLevel ?? 'Individual';
    const sponsorLevelDisplay = `${sponsorLevel} (${spPct})`;

    // Governance Floor
    const governanceFloor = project.priorityFloor ?? null;
    let governanceFloorDisplay = 'None (0.0%)';
    if (governanceFloor != null && governanceFloor > 0) {
      governanceFloorDisplay = `Floor ${governanceFloor.toFixed(1)}`;
    } else if (project.ruleOverrides && project.ruleOverrides.length > 0) {
      governanceFloorDisplay = `Active (${project.ruleOverrides.join(', ')})`;
    }

    const dtPct = `${weightsPct['dtAlignment']?.toFixed(1) ?? '3.0'}%`;
    const dtAlignment = !!project.dtAlignment;
    const dtAlignmentDisplay = `${dtAlignment ? 'Yes' : 'No'} (${dtPct})`;

    const riskPct = `${weightsPct['risk']?.toFixed(1) ?? '3.0'}%`;
    const riskRating = project.riskRating ?? 'Medium';
    const riskRatingDisplay = `${riskRating} (${riskPct})`;

    const costPct = `${weightsPct['cost']?.toFixed(1) ?? '3.0'}%`;
    const costUsd = project.costEstimateUsd ?? 0;
    const costDisplay = `$${(costUsd / 1_000_000).toFixed(2)}M (${costPct})`;

    // Top SHAP driver
    const topDriver = project.topDrivers?.[0] ?? null;
    let topDriverDisplay = '—';
    if (topDriver) {
      const sign = topDriver.direction === 'increases' ? '+' : '-';
      topDriverDisplay = `${topDriver.signalLabel} (${sign}${topDriver.shapValue.toFixed(2)})`;
    }

    // ML predicted tier & class prob
    const mlTier = project.mlTier ?? 'Proceed';
    let mlTierProb = 70;
    if (project.tierProbabilities) {
      if (mlTier === 'Must-do-now') mlTierProb = Math.round((project.tierProbabilities.mustDoNow ?? 0) * 100);
      else if (mlTier === 'Proceed') mlTierProb = Math.round((project.tierProbabilities.proceed ?? 0) * 100);
      else if (mlTier === 'Can wait') mlTierProb = Math.round((project.tierProbabilities.canWait ?? 0) * 100);
      else if (mlTier === 'Candidate to deprioritize') mlTierProb = Math.round((project.tierProbabilities.deprioritize ?? 0) * 100);
    }
    const mlTierDisplay = `${mlTier} (${mlTierProb}%)`;

    // Zero-weight or supplemental fields
    const depPct = `${weightsPct['dependencies']?.toFixed(1) ?? '0.0'}%`;
    const dependencies = project.dependencyCount ?? 0;
    const dependenciesDisplay = `${dependencies} deps (${depPct})`;

    const effPct = `${weightsPct['effort']?.toFixed(1) ?? '0.0'}%`;
    const effortWeeks = project.effortPersonWeeks ?? 0;
    const effortDisplay = `${effortWeeks} wks (${effPct})`;

    const skPct = `${weightsPct['skillDemand']?.toFixed(1) ?? '0.0'}%`;
    const skillDemandFte = project.skillDemandFte ?? 0;
    const skillDemandDisplay = `${skillDemandFte.toFixed(1)} FTE (${skPct})`;

    return {
      project,
      overallScore,
      overallScoreDisplay,
      confidenceScore,
      confidenceLevel,
      confidenceDisplay,
      mlBaseScore,
      mlBaseScoreDisplay,
      businessValue,
      businessValueDisplay,
      userBase,
      userBaseDisplay,
      regulatorySecurity,
      regulatorySecurityDisplay,
      timingUrgencyMonths,
      timingUrgencyDisplay,
      sponsorLevel,
      sponsorLevelDisplay,
      governanceFloor,
      governanceFloorDisplay,
      dtAlignment,
      dtAlignmentDisplay,
      riskRating,
      riskRatingDisplay,
      costUsd,
      costDisplay,
      topDriver,
      topDriverDisplay,
      mlTier,
      mlTierProb,
      mlTierDisplay,
      dependencies,
      dependenciesDisplay,
      effortWeeks,
      effortDisplay,
      skillDemandFte,
      skillDemandDisplay,
      effectiveWeights,
      weightsPct,
    };
  }

  exportToExcel(): void {
    const portfolioName =
      this.selectedPortfolio() === 'all' ? 'All Portfolios' : this.selectedPortfolio();
    const rows = this.matrixRows();

    const headers = [
      'Project ID',
      'Project Name',
      'Portfolio',
      'Final Tier',
      'Overall Score',
      'Confidence %',
      'ML Base Score (40% Weight)',
      'Business Value (Impact)',
      'Impacted Users Base (Reach)',
      'Regulatory & Security (Compliance)',
      'Timing Urgency (Schedule)',
      'Executive Sponsor (Leadership)',
      'Governance Rule Floor (Rules & ML)',
      'DT Alignment (Strategy)',
      'Risk Governance (Risk)',
      'Cost Scale (Financial)',
      'ML Top SHAP Driver',
      'ML Predicted Tier',
      'Dependencies (Architecture)',
      'Effort (Weeks)',
      'Skill Demand (FTE)',
    ];

    const dataRows = rows.map((r) => [
      r.project.projectId,
      r.project.projectName,
      r.project.portfolio,
      r.project.finalTier,
      r.overallScoreDisplay,
      r.confidenceDisplay,
      r.mlBaseScoreDisplay,
      r.businessValueDisplay,
      r.userBaseDisplay,
      r.regulatorySecurityDisplay,
      r.timingUrgencyDisplay,
      r.sponsorLevelDisplay,
      r.governanceFloorDisplay,
      r.dtAlignmentDisplay,
      r.riskRatingDisplay,
      r.costDisplay,
      r.topDriverDisplay,
      r.mlTierDisplay,
      r.dependenciesDisplay,
      r.effortDisplay,
      r.skillDemandDisplay,
    ]);

    const table: ExportTableData = {
      title: `PMO Prioritization Matrix - ${portfolioName}`,
      headers,
      rows: dataRows,
    };

    this.fileExport.exportToExcel(table, 'pmo-prioritization-matrix');
  }

  exportComparisonToExcel(): void {
    const selected = this.selectedProjects();
    if (selected.length === 0) return;

    const headers = ['Prioritization Dimension', ...selected.map((s) => `${s.project.projectId} - ${s.project.projectName}`)];

    const metrics: Array<{ label: string; extract: (r: ProjectMatrixRow) => string }> = [
      { label: 'Portfolio', extract: (r) => r.project.portfolio },
      { label: 'Business Unit / Site', extract: (r) => `${r.project.businessUnit} (${r.project.site})` },
      { label: 'Overall Priority Score', extract: (r) => r.overallScoreDisplay },
      { label: 'Confidence Score & Level', extract: (r) => r.confidenceDisplay },
      { label: 'ML Base Score (40% Weight)', extract: (r) => r.mlBaseScoreDisplay },
      { label: 'ML Predicted Tier & Prob', extract: (r) => r.mlTierDisplay },
      { label: 'Governance Rule Floor', extract: (r) => r.governanceFloorDisplay },
      { label: 'Top SHAP Driver', extract: (r) => r.topDriverDisplay },
      { label: 'Strategic Cluster', extract: (r) => r.project.cluster || '—' },
      { label: 'Business Value Score', extract: (r) => r.businessValueDisplay },
      { label: 'Impacted Users Base', extract: (r) => r.userBaseDisplay },
      { label: 'Regulatory & Security Mandate', extract: (r) => r.regulatorySecurityDisplay },
      { label: 'Timing Urgency (Go-Live)', extract: (r) => r.timingUrgencyDisplay },
      { label: 'Executive Sponsor Level', extract: (r) => r.sponsorLevelDisplay },
      { label: 'Digital Transformation (DT)', extract: (r) => r.dtAlignmentDisplay },
      { label: 'Risk Governance Level', extract: (r) => r.riskRatingDisplay },
      { label: 'Cost Estimate (USD)', extract: (r) => r.costDisplay },
      { label: 'Critical Path Dependencies', extract: (r) => r.dependenciesDisplay },
      { label: 'Effort Demand (Weeks)', extract: (r) => r.effortDisplay },
      { label: 'Primary Skill & Demand', extract: (r) => `${r.project.primarySkill} · ${r.skillDemandDisplay}` },
      { label: 'Recommended Action', extract: (r) => r.project.recommendedAction },
    ];

    const dataRows = metrics.map((m) => [
      m.label,
      ...selected.map((r) => m.extract(r)),
    ]);

    const table: ExportTableData = {
      title: 'PMO Side-by-Side Project Prioritization Comparison',
      headers,
      rows: dataRows,
    };

    this.fileExport.exportToExcel(table, 'pmo-project-comparison');
  }

  isHighestScore(row: ProjectMatrixRow): boolean {
    const selected = this.selectedProjects();
    if (selected.length < 2 || row.overallScore == null) return false;
    const maxScore = Math.max(...selected.map((s) => s.overallScore ?? -1));
    return row.overallScore === maxScore;
  }
}
