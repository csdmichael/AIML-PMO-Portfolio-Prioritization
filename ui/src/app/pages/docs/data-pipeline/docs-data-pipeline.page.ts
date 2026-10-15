import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
} from '@ionic/angular';

interface DataSourceInfo {
  name: string;
  sourceKey: string;
  frequency: string;
  format: string;
  targetBronzeTable: string;
  canonicalSignalsProvided: string[];
  description: string;
  icon: string;
}

@Component({
  selector: 'app-docs-data-pipeline-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding docs-content">
      <div class="docs-header">
        <div class="breadcrumbs">
          <span class="crumb-parent">Documentation</span>
          <ion-icon name="chevron-forward-outline" class="crumb-sep"></ion-icon>
          <span class="crumb-current">Data Pipeline & 11 Enterprise Sources</span>
        </div>
        <h1 class="page-title">Enterprise Data Pipeline & Medallion Lakehouse</h1>
        <p class="page-subtitle">
          Architecture, schema contracts, and synchronization cadence connecting 11 enterprise IT platforms into Microsoft Fabric OneLake Delta tables.
        </p>
      </div>

      <!-- Quick Nav Jump Bar -->
      <div class="nav-jump-chips">
        <span class="jump-label">Jump to Section:</span>
        <a href="#sources-grid" class="jump-chip">11 Enterprise Sources</a>
        <a href="#medallion-pipeline" class="jump-chip">Medallion Ingestion Pipeline</a>
        <a href="#data-quality" class="jump-chip">14 Automated DQ Checks</a>
      </div>

      <!-- 11 Data Sources Grid -->
      <div class="section-heading-wrap" id="sources-grid">
        <h2 class="section-title">11 Integrated Enterprise Systems</h2>
        <p class="section-subtitle">
          Disparate operational systems reconciled into a single canonical portfolio schema without data silos.
        </p>
      </div>

      <div class="sources-grid">
        @for (src of sources; track src.sourceKey) {
          <div class="source-card">
            <div class="source-card-header">
              <div class="source-icon-box">
                <ion-icon [name]="src.icon"></ion-icon>
              </div>
              <div class="source-title-wrap">
                <h3 class="source-name">{{ src.name }}</h3>
                <span class="source-key"><code>{{ src.sourceKey }}</code></span>
              </div>
              <span class="freq-badge">{{ src.frequency }}</span>
            </div>

            <p class="source-desc">{{ src.description }}</p>

            <div class="source-meta-row">
              <div class="meta-item">
                <span class="meta-lbl">Bronze Table:</span>
                <code>{{ src.targetBronzeTable }}</code>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">Format:</span>
                <span class="format-pill">{{ src.format }}</span>
              </div>
            </div>

            <div class="signals-provided-box">
              <span class="signals-lbl">Canonical Signals Contributed:</span>
              <div class="signals-pills">
                @for (sig of src.canonicalSignalsProvided; track sig) {
                  <span class="sig-pill">{{ sig }}</span>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Medallion Lakehouse Transformation Specs -->
      <ion-card class="docs-card" id="medallion-pipeline">
        <ion-card-header>
          <ion-card-title>Medallion Architecture & Data Contracts</ion-card-title>
          <ion-card-subtitle>From unstructured files to governed analytical Delta tables</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="medallion-flow-grid">
            <!-- Bronze Box -->
            <div class="flow-box bronze-box">
              <div class="flow-badge bronze">Bronze Layer (Raw)</div>
              <h4 class="flow-title">Operational Mirrors</h4>
              <p class="flow-desc">Direct 1:1 replication of external files into Delta Parquet under <code>src_*</code> schemas. No business logic or schema changes.</p>
              <ul class="flow-list">
                <li>Preserves raw source timestamps</li>
                <li>Appends ingestion batch ID</li>
                <li>Immutable append-only history</li>
              </ul>
            </div>

            <!-- Arrow -->
            <div class="flow-arrow">
              <ion-icon name="arrow-forward-outline"></ion-icon>
            </div>

            <!-- Silver Box -->
            <div class="flow-box silver-box">
              <div class="flow-badge silver">Silver Layer (Cleansed)</div>
              <h4 class="flow-title">Canonical Consolidation</h4>
              <p class="flow-desc">Reconciles 11 sources into <code>silver.project_canonical</code> across 10 core PMO signals with full lineage in <code>silver.signal_provenance</code>.</p>
              <ul class="flow-list">
                <li>Deterministic conflict resolution</li>
                <li>Type validation and string trimming</li>
                <li>14 Automated DQ checks evaluation</li>
              </ul>
            </div>

            <!-- Arrow -->
            <div class="flow-arrow">
              <ion-icon name="arrow-forward-outline"></ion-icon>
            </div>

            <!-- Gold Box -->
            <div class="flow-box gold-box">
              <div class="flow-badge gold">Gold Layer (Curated)</div>
              <h4 class="flow-title">Machine Learning & Decisions</h4>
              <p class="flow-desc">Stores normalized feature matrices, trained model predictions, SHAP attribution drivers, and capacity balances in <code>gold.*</code>.</p>
              <ul class="flow-list">
                <li>V-Order optimized parquet</li>
                <li>Zero-ETL Direct Lake query target</li>
                <li>Historical review committee audit log</li>
              </ul>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- 14 Automated Data Quality Checks -->
      <ion-card class="docs-card" id="data-quality">
        <ion-card-header>
          <ion-card-title>14 Automated Data Quality Checks</ion-card-title>
          <ion-card-subtitle>Automated integrity tests evaluated on every ingestion pipeline run</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="table-responsive">
            <table class="dq-table">
              <thead>
                <tr>
                  <th>Check ID</th>
                  <th>Target Dimension</th>
                  <th>Rule Description</th>
                  <th>Severity</th>
                  <th>Remediation Action</th>
                </tr>
              </thead>
              <tbody>
                @for (dq of dqChecks; track dq.id) {
                  <tr>
                    <td><code>{{ dq.id }}</code></td>
                    <td><strong>{{ dq.dimension }}</strong></td>
                    <td>{{ dq.rule }}</td>
                    <td><span class="sev-badge" [attr.data-sev]="dq.severity">{{ dq.severity }}</span></td>
                    <td>{{ dq.remediation }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styles: [
    `
      .docs-content {
        --background: var(--pmo-bg, #f4f6f8);
        color: var(--pmo-text, #1a1a1a);
      }
      .docs-header {
        margin-bottom: 16px;
      }
      .breadcrumbs {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8rem;
        color: var(--pmo-muted, #666);
        margin-bottom: 6px;
      }
      .crumb-current {
        color: var(--pmo-primary, #0078d4);
        font-weight: 600;
      }
      .page-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 6px 0;
        color: var(--pmo-primary-dark, #004578);
      }
      .page-subtitle {
        font-size: 0.92rem;
        line-height: 1.45;
        color: var(--pmo-muted, #555);
        margin: 0;
        max-width: 950px;
      }

      .nav-jump-chips {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 24px;
        padding: 10px 14px;
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid var(--pmo-border, #e0e0e0);
      }
      .jump-label {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--pmo-muted, #666);
      }
      .jump-chip {
        font-size: 0.82rem;
        color: var(--pmo-primary, #0078d4);
        text-decoration: none;
        padding: 4px 10px;
        border-radius: 12px;
        background: rgba(0, 120, 212, 0.08);
        font-weight: 500;
      }

      .section-heading-wrap {
        margin: 20px 0 14px 0;
      }
      .section-title {
        font-size: 1.35rem;
        font-weight: 700;
        color: var(--pmo-primary-dark, #004578);
        margin: 0 0 4px 0;
      }
      .section-subtitle {
        font-size: 0.88rem;
        color: var(--pmo-muted, #666);
        margin: 0;
      }

      .sources-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .source-card {
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 10px;
        padding: 16px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .source-card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .source-icon-box {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: rgba(0, 120, 212, 0.08);
        color: var(--pmo-primary, #0078d4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        flex-shrink: 0;
      }
      .source-title-wrap {
        flex: 1;
      }
      .source-name {
        margin: 0;
        font-size: 0.96rem;
        font-weight: 700;
        color: #1a1a1a;
      }
      .source-key code {
        font-size: 0.72rem;
        color: #64748b;
      }
      .freq-badge {
        font-size: 0.68rem;
        background: #f1f5f9;
        color: #475569;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
      }
      .source-desc {
        font-size: 0.82rem;
        color: #475569;
        line-height: 1.4;
        margin: 0 0 12px 0;
      }
      .source-meta-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.78rem;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid #f0f0f0;
      }
      .meta-lbl {
        color: #64748b;
        margin-right: 4px;
      }
      .format-pill {
        background: #f1f5f9;
        padding: 1px 6px;
        border-radius: 4px;
        font-family: monospace;
      }
      .signals-provided-box {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .signals-lbl {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
      }
      .signals-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .sig-pill {
        font-size: 0.7rem;
        background: #eef2ff;
        color: #3730a3;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 500;
      }

      .docs-card {
        background: #ffffff;
        border-radius: 10px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        margin-bottom: 24px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
      }

      .medallion-flow-grid {
        display: flex;
        align-items: stretch;
        gap: 12px;
      }
      .flow-box {
        flex: 1;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 8px;
        padding: 16px;
        background: #fcfcfc;
      }
      .flow-badge {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 10px;
        display: inline-block;
        margin-bottom: 6px;
      }
      .flow-badge.bronze { background: #fdf3e7; color: #a35d12; }
      .flow-badge.silver { background: #f1f3f5; color: #5c6873; }
      .flow-badge.gold { background: #fef8e7; color: #b58105; }

      .flow-title {
        margin: 0 0 6px 0;
        font-size: 1rem;
        font-weight: 700;
        color: #1a1a1a;
      }
      .flow-desc {
        font-size: 0.8rem;
        color: #555;
        line-height: 1.4;
        margin: 0 0 10px 0;
      }
      .flow-list {
        margin: 0;
        padding-left: 16px;
        font-size: 0.76rem;
        color: #475569;
        line-height: 1.4;
      }
      .flow-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--pmo-muted, #94a3b8);
        font-size: 1.4rem;
      }

      .table-responsive {
        overflow-x: auto;
      }
      .dq-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
      }
      .dq-table th {
        background: #f8fafc;
        padding: 8px 12px;
        text-align: left;
        font-weight: 700;
        color: #333;
        border-bottom: 2px solid var(--pmo-border, #e0e0e0);
      }
      .dq-table td {
        padding: 8px 12px;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: top;
      }
      .sev-badge {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .sev-badge[data-sev="Critical"] { background: #fee2e2; color: #b91c1c; }
      .sev-badge[data-sev="Major"] { background: #fef3c7; color: #b45309; }
      .sev-badge[data-sev="Minor"] { background: #e0f2fe; color: #0369a1; }

      @media (max-width: 768px) {
        .medallion-flow-grid {
          flex-direction: column;
        }
        .flow-arrow {
          transform: rotate(90deg);
          margin: 4px 0;
        }
      }
    `,
  ],
})
export class DocsDataPipelinePageComponent {
  readonly sources: DataSourceInfo[] = [
    {
      name: 'Planview Enterprise Portfolio',
      sourceKey: 'planview',
      description: 'Approved enterprise capital budgets, planned project milestones, and sponsor baselines.',
      frequency: 'Daily Batch',
      format: 'CSV Export',
      targetBronzeTable: 'src_planview.projects',
      canonicalSignalsProvided: ['cost_usd', 'go_live_date', 'business_value'],
      icon: 'briefcase-outline',
    },
    {
      name: 'Power Apps Front-Door Intake',
      sourceKey: 'powerapps',
      description: 'Initial project intake proposals submitted by department business sponsors.',
      frequency: 'Real-time Webhook',
      format: 'JSON / REST',
      targetBronzeTable: 'src_powerapps.submissions',
      canonicalSignalsProvided: ['project_name', 'business_unit', 'sponsor_level'],
      icon: 'create-outline',
    },
    {
      name: 'Azure DevOps (ADO)',
      sourceKey: 'ado',
      description: 'Agile epics, active features, sprint iterations, and technical backlog items.',
      frequency: 'Hourly Sync',
      format: 'REST API / CSV',
      targetBronzeTable: 'src_ado.work_items',
      canonicalSignalsProvided: ['effort_person_weeks', 'dependencies', 'dt_alignment'],
      icon: 'git-network-outline',
    },
    {
      name: 'Atlassian JIRA',
      sourceKey: 'jira',
      description: 'Software engineering sprint boards, story point estimates, and component tracking.',
      frequency: 'Hourly Sync',
      format: 'REST API',
      targetBronzeTable: 'src_jira.issues',
      canonicalSignalsProvided: ['effort_person_weeks', 'primary_skill'],
      icon: 'layers-outline',
    },
    {
      name: 'Microsoft Project Online',
      sourceKey: 'ms_project',
      description: 'Enterprise Gantt schedules, work breakdown structures (WBS), and critical paths.',
      frequency: 'Daily Batch',
      format: 'OData Feed',
      targetBronzeTable: 'src_ms_project.tasks',
      canonicalSignalsProvided: ['go_live_date', 'dependencies'],
      icon: 'calendar-outline',
    },
    {
      name: 'Smartsheet Operations Tracker',
      sourceKey: 'smartsheet',
      description: 'Manufacturing fab operational checklists and site go-live tracker sheets.',
      frequency: 'Every 6 Hours',
      format: 'CSV Feed',
      targetBronzeTable: 'src_smartsheet.golive_tracker',
      canonicalSignalsProvided: ['site', 'regulatory_security'],
      icon: 'grid-outline',
    },
    {
      name: 'Business Unit Trackers',
      sourceKey: 'bu_trackers',
      description: 'Custom division-specific project lists for Semiconductor, Fab Ops, and Supply Chain.',
      frequency: 'Daily Batch',
      format: 'Excel (.xlsx)',
      targetBronzeTable: 'src_spreadsheets.bu_trackers',
      canonicalSignalsProvided: ['business_value', 'risk'],
      icon: 'document-text-outline',
    },
    {
      name: 'BU Code Repositories',
      sourceKey: 'bu_repositories',
      description: 'Repository commits, architectural blueprints, and engineering metadata.',
      frequency: 'Daily Batch',
      format: 'Git Metadata JSON',
      targetBronzeTable: 'src_git.repo_metadata',
      canonicalSignalsProvided: ['dt_alignment', 'primary_skill'],
      icon: 'code-working-outline',
    },
    {
      name: 'HR Workforce Capacity',
      sourceKey: 'hr_capacity',
      description: 'Planned team allocations and engineering department utilization forecasts.',
      frequency: 'Weekly Batch',
      format: 'CSV Export',
      targetBronzeTable: 'src_hr_capacity.allocations',
      canonicalSignalsProvided: ['skill_demand_fte'],
      icon: 'people-outline',
    },
    {
      name: 'HR Employee Roster',
      sourceKey: 'hr_roster',
      description: 'Enterprise active employee directory with mapped skill families and locations.',
      frequency: 'Weekly Batch',
      format: 'CSV Export',
      targetBronzeTable: 'src_hr_roster.employees',
      canonicalSignalsProvided: ['supply_fte (by skill)'],
      icon: 'person-outline',
    },
    {
      name: 'Finance & SAP Cost System',
      sourceKey: 'cost',
      description: 'Monthly financial actuals, capital commitments, and purchase order expenditures.',
      frequency: 'Monthly Batch',
      format: 'CSV Feed',
      targetBronzeTable: 'src_cost.monthly_actuals',
      canonicalSignalsProvided: ['cost_usd (reconciliation)'],
      icon: 'cash-outline',
    },
  ];

  readonly dqChecks = [
    {
      id: 'DQ-01',
      dimension: 'Project Identification',
      rule: 'Project ID matches regex GIS-\\d{4} and is unique across all source systems.',
      severity: 'Critical',
      remediation: 'Quarantine record; alert system administrator.',
    },
    {
      id: 'DQ-02',
      dimension: 'Go-Live Horizon',
      rule: 'Go-live date is valid ISO-8601 between 2026-01-01 and 2032-12-31.',
      severity: 'Critical',
      remediation: 'Impute quarterly endpoint date or flag for PM review.',
    },
    {
      id: 'DQ-03',
      dimension: 'Cost Feasibility',
      rule: 'cost_usd is strictly greater than 0 and less than $100,000,000.',
      severity: 'Critical',
      remediation: 'Fallback to Planview baseline or require PM input.',
    },
    {
      id: 'DQ-04',
      dimension: 'Business Value Range',
      rule: 'business_value is an integer between 1 and 5.',
      severity: 'Major',
      remediation: 'Clip out-of-range floats to nearest integer in [1, 5].',
    },
    {
      id: 'DQ-05',
      dimension: 'Taxonomy Adherence',
      rule: 'businessUnit exists in the 10 approved corporate business units.',
      severity: 'Major',
      remediation: 'Map to closest phonetic match or Corporate IT.',
    },
    {
      id: 'DQ-06',
      dimension: 'Site Validity',
      rule: 'site belongs to [Fremont, Tualatin, Singapore, Penang, Hsinchu, Global Remote].',
      severity: 'Major',
      remediation: 'Default to Global Remote.',
    },
    {
      id: 'DQ-07',
      dimension: 'Skill Domain Taxonomy',
      rule: 'primarySkill matches one of the 8 approved skill family keys.',
      severity: 'Major',
      remediation: 'Classify via JIRA component heuristic or set to Application Development.',
    },
    {
      id: 'DQ-08',
      dimension: 'FTE Bounds',
      rule: 'skill_demand_fte is positive and does not exceed 25 FTE.',
      severity: 'Minor',
      remediation: 'Cap at 12 FTE and flag for committee audit.',
    },
    {
      id: 'DQ-09',
      dimension: 'Sponsor Seniority',
      rule: 'sponsorLevel in [Executive, Director, Manager, Individual].',
      severity: 'Minor',
      remediation: 'Map from corporate HR directory title.',
    },
    {
      id: 'DQ-10',
      dimension: 'Dependency Integrity',
      rule: 'All referenced predecessor project IDs exist in the portfolio register.',
      severity: 'Critical',
      remediation: 'Prune dangling dependency references and log warning.',
    },
    {
      id: 'DQ-11',
      dimension: 'Effort Alignment',
      rule: 'effort_person_weeks is consistent with skill_demand_fte and schedule duration.',
      severity: 'Minor',
      remediation: 'Flag statistical outlier in Data & ML Operations report.',
    },
    {
      id: 'DQ-12',
      dimension: 'Digital Transformation',
      rule: 'dt_alignment is boolean true/false without nulls.',
      severity: 'Minor',
      remediation: 'Impute false if omitted in source tracker.',
    },
    {
      id: 'DQ-13',
      dimension: 'Protected Program Tag',
      rule: 'protected_program can only be true if accompanied by CEO/CIO mandate record.',
      severity: 'Major',
      remediation: 'Revert to false unless verified by PMO Secretariat.',
    },
    {
      id: 'DQ-14',
      dimension: 'Regulatory Audit',
      rule: 'regulatory_security == true must link to ISO, SOX, or Cyber compliance milestone.',
      severity: 'Major',
      remediation: 'Require compliance reference code in PM review.',
    },
  ];
}
