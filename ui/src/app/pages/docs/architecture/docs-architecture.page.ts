import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MlFlowDiagramsComponent } from '../../../components/ml-flow-diagrams/ml-flow-diagrams.component';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/angular';

interface ArchStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  layer: string;
  technologies: string[];
  inputs: string[];
  processing: string[];
  outputs: string[];
  icon: string;
}

@Component({
  selector: 'app-docs-architecture-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MlFlowDiagramsComponent,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonIcon,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding docs-content">
      <div class="docs-header">
        <div class="breadcrumbs">
          <span class="crumb-parent">Documentation</span>
          <ion-icon name="chevron-forward-outline" class="crumb-sep"></ion-icon>
          <span class="crumb-current">System Architecture & Pipeline Steps</span>
        </div>
        <h1 class="page-title">System Architecture & End-to-End Pipeline Steps</h1>
        <p class="page-subtitle">
          Portfolio data flows through Microsoft Fabric OneLake, LightGBM, calibration, SHAP, and deterministic rules. Foundry queries approved persisted evidence through governed APIM tools; people approve decisions.
        </p>
      </div>

      <ion-segment class="architecture-tabs" aria-label="Architecture documentation sections"
        [scrollable]="true" [selectOnFocus]="true" [value]="activeTab()"
        (ionChange)="selectTab($event.detail.value)">
        @for (tab of tabs; track tab.id) {
          <ion-segment-button [value]="tab.id" [id]="'arch-tab-' + tab.id"
            [attr.aria-controls]="'arch-panel-' + tab.id">
            <ion-label>{{ tab.label }}</ion-label>
          </ion-segment-button>
        }
      </ion-segment>

      <section id="arch-panel-solution" role="tabpanel" aria-labelledby="arch-tab-solution"
        tabindex="0" [hidden]="activeTab() !== 'solution'">
      <ion-card class="docs-card">
        <ion-card-header><ion-card-title>Current runtime: progress, priority policy and three agents</ion-card-title></ion-card-header>
        <ion-card-content>
          <img src="assets/architecture/pmo-runtime-architecture.svg"
            alt="Three read-only Foundry agents, private APIM OneLake tools, database-backed reports, protected project progress and scoped priority weights"
            style="width: 100%; height: auto;" />
          <p>Recommendations target only new or confirmed not-started work. Full-register searches include pending,
            started and completed projects to avoid duplicate proposals. Started work is a fixed commitment.</p>
          <p>Project start/completion and priority settings are conditional database records.
            Project overrides take precedence over portfolio overrides and global defaults.
            The API immediately rescores saved analysis with the shared 40% probability / 60% field-weight blend,
            retaining rule floors and recorded predictions. State-aware cached reports load before a fresh review.</p>
        </ion-card-content>
      </ion-card>
      <!-- Architecture Diagram Section -->
      <ion-card class="docs-card" id="arch-diagram">
        <ion-card-header>
          <div class="card-header-flex">
            <div>
              <ion-card-title>End-to-End Solution Architecture</ion-card-title>
              <ion-card-subtitle>
                Zero-ETL Medallion Lakehouse, Spark ML, Direct Lake Power BI, and Multi-Device Client Tier
              </ion-card-subtitle>
            </div>
            <div class="header-badges">
              <ion-badge color="primary">Fabric OneLake</ion-badge>
              <ion-badge color="success">Direct Lake</ion-badge>
              <ion-badge color="tertiary">LightGBM + SHAP</ion-badge>
            </div>
          </div>
        </ion-card-header>

        <ion-card-content>
          <!-- Layer Filter Controls -->
          <div class="layer-filter-bar">
            <span class="filter-label">Filter Layer Focus:</span>
            <button
              type="button"
              class="layer-chip"
              [class.active]="selectedLayer() === 'all'"
              (click)="selectedLayer.set('all')"
            >
              All Layers (Full View)
            </button>
            <button
              type="button"
              class="layer-chip"
              [class.active]="selectedLayer() === 'sources'"
              (click)="selectedLayer.set('sources')"
            >
              1. 11 Ingestion Sources
            </button>
            <button
              type="button"
              class="layer-chip"
              [class.active]="selectedLayer() === 'lakehouse'"
              (click)="selectedLayer.set('lakehouse')"
            >
              2. Medallion OneLake
            </button>
            <button
              type="button"
              class="layer-chip"
              [class.active]="selectedLayer() === 'ml'"
              (click)="selectedLayer.set('ml')"
            >
              3. Spark ML & Rules
            </button>
            <button
              type="button"
              class="layer-chip"
              [class.active]="selectedLayer() === 'api'"
              (click)="selectedLayer.set('api')"
            >
              4. Power BI & APIM
            </button>
            <button
              type="button"
              class="layer-chip"
              [class.active]="selectedLayer() === 'client'"
              (click)="selectedLayer.set('client')"
            >
              5. Frontend & Copilot
            </button>
          </div>

          <!-- Architecture Visual Card -->
          <div class="diagram-container">
            <div class="diagram-image-wrapper">
              <img
                src="assets/images/pmo-architecture.png"
                alt="AI-Powered PMO Portfolio Prioritization Technical Architecture Diagram"
                class="architecture-image"
                (error)="onImageError($event)"
              />
            </div>
            <div class="diagram-caption">
              <span>Figure 1: High-level architectural data flow from 11 enterprise connectors to Microsoft Fabric Lakehouse, Spark ML pipeline, Direct Lake semantic model, and multi-device Ionic SPA.</span>
              <a href="assets/images/pmo-architecture.png" target="_blank" class="open-raw-link">
                <ion-icon name="open-outline"></ion-icon> Open High-Res Diagram
              </a>
            </div>
          </div>

          <!-- Structured Layer Highlights -->
          <div class="layers-grid">
            <div
              class="layer-box layer-sources"
              [class.highlighted]="selectedLayer() === 'all' || selectedLayer() === 'sources'"
            >
              <div class="layer-header">
                <ion-icon name="cloud-upload-outline"></ion-icon>
                <div class="layer-title-wrap">
                  <span class="layer-num">Layer 1</span>
                  <span class="layer-name">11 Enterprise Ingestion Sources</span>
                </div>
              </div>
              <p class="layer-desc">
                Planview, Power Apps, Azure DevOps, JIRA, MS Project, Smartsheet, BU Trackers, BU Repos, HR Capacity, HR Roster, SAP Cost, and Excel Intake forms.
              </p>
              <div class="layer-meta">
                <span class="meta-pill">OneLake Files/raw</span>
                <span class="meta-pill">CSV / Parquet / XLSX</span>
              </div>
            </div>

            <div
              class="layer-box layer-lakehouse"
              [class.highlighted]="selectedLayer() === 'all' || selectedLayer() === 'lakehouse'"
            >
              <div class="layer-header">
                <ion-icon name="layers-outline"></ion-icon>
                <div class="layer-title-wrap">
                  <span class="layer-num">Layer 2</span>
                  <span class="layer-name">Medallion OneLake Lakehouse</span>
                </div>
              </div>
              <p class="layer-desc">
                Bronze raw schemas (<code>src_*</code>) cleansed and standardized into Silver (<code>silver.project_canonical</code>, <code>silver.signal_provenance</code>, and 14 automated DQ checks).
              </p>
              <div class="layer-meta">
                <span class="meta-pill">Fabric Lakehouse</span>
                <span class="meta-pill">Delta Parquet</span>
                <span class="meta-pill">V-Order</span>
              </div>
            </div>

            <div
              class="layer-box layer-ml"
              [class.highlighted]="selectedLayer() === 'all' || selectedLayer() === 'ml'"
            >
              <div class="layer-header">
                <ion-icon name="hardware-chip-outline"></ion-icon>
                <div class="layer-title-wrap">
                  <span class="layer-num">Layer 3</span>
                  <span class="layer-name">Spark ML & Governance Engine</span>
                </div>
              </div>
              <p class="layer-desc">
                Notebook 01 (Feature Engineering & LightGBM training with Platt calibration) + Notebook 02 (Inference, TreeSHAP, R1-R5 rules, K-Means clustering, and skill capacity matching).
              </p>
              <div class="layer-meta">
                <span class="meta-pill">LightGBM</span>
                <span class="meta-pill">TreeSHAP</span>
                <span class="meta-pill">K-Means</span>
                <span class="meta-pill">Rules R1-R5</span>
              </div>
            </div>

            <div
              class="layer-box layer-api"
              [class.highlighted]="selectedLayer() === 'all' || selectedLayer() === 'api'"
            >
              <div class="layer-header">
                <ion-icon name="server-outline"></ion-icon>
                <div class="layer-title-wrap">
                  <span class="layer-num">Layer 4</span>
                  <span class="layer-name">Direct Lake & API Gateway</span>
                </div>
              </div>
              <p class="layer-desc">
                Power BI Semantic Model reading Delta tables in zero-copy Direct Lake mode, alongside Azure APIM and FastAPI backend on Linux App Service.
              </p>
              <div class="layer-meta">
                <span class="meta-pill">Direct Lake</span>
                <span class="meta-pill">Azure APIM</span>
                <span class="meta-pill">FastAPI</span>
                <span class="meta-pill">Managed Identity</span>
              </div>
            </div>

            <div
              class="layer-box layer-client"
              [class.highlighted]="selectedLayer() === 'all' || selectedLayer() === 'client'"
            >
              <div class="layer-header">
                <ion-icon name="pie-chart-outline"></ion-icon>
                <div class="layer-title-wrap">
                  <span class="layer-num">Layer 5</span>
                  <span class="layer-name">Presentation & AI Copilot</span>
                </div>
              </div>
              <p class="layer-desc">
                Multi-device Ionic Angular SPA (Desktop, Tablet, Mobile) with embedded Power BI, interactive SHAP waterfall inspectors, and AI Copilot Agent FAB.
              </p>
              <div class="layer-meta">
                <span class="meta-pill">Ionic Angular</span>
                <span class="meta-pill">Copilot FAB</span>
                <span class="meta-pill">Power BI MSAL</span>
              </div>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card class="docs-card">
        <ion-card-header><ion-card-title>Governed Foundry-to-Fabric query path</ion-card-title></ion-card-header>
        <ion-card-content>
          <p>UI → application APIM API → backend orchestrator → Foundry agent.</p>
          <p>Foundry-native MCP call → private APIM MCP server → workload-authenticated query endpoint →
            approved OneLake export, pending entries and persisted changes → bounded tool result → Foundry answer →
            backend evidence and eligibility validation.</p>
          <p>Dedicated workload identity; JWT audience, issuer, caller, and role checks at APIM and
            the query endpoint; no arbitrary SQL, URLs, writes, or browser-supplied evidence.
            At most 25 rows per query and four tool calls per answer.</p>
          <p>This is a solution-specific OneLake MCP server exported by APIM over a read-only query adapter,
            not Fabric Core MCP or a general-purpose Fabric data agent.
            End-user RLS is not implemented. Private Fabric/Foundry connectivity must be verified
            for the target deployment; a private APIM alone does not make the entire application private.</p>
        </ion-card-content>
      </ion-card>
      </section>

      <section id="arch-panel-ml" role="tabpanel" aria-labelledby="arch-tab-ml"
        tabindex="0" [hidden]="activeTab() !== 'ml'">
        <app-ml-flow-diagrams />
      </section>

      <section id="arch-panel-pipeline" role="tabpanel" aria-labelledby="arch-tab-pipeline"
        tabindex="0" [hidden]="activeTab() !== 'pipeline'">
      <!-- Step-by-Step Architecture Explanation -->
      <div class="section-title-wrap" id="pipeline-steps">
        <h2 class="section-title">Step-by-Step Architecture Pipeline</h2>
        <p class="section-subtitle">
          Trace the transformation journey of portfolio data from raw operational records into calibrated executive recommendations.
        </p>
      </div>

      <div class="steps-timeline">
        @for (step of steps; track step.stepNumber) {
          <div class="step-card-wrapper">
            <div class="step-indicator-col">
              <div class="step-circle">{{ step.stepNumber }}</div>
              <div class="step-line"></div>
            </div>

            <div class="step-content-card">
              <div class="step-header">
                <div class="step-title-group">
                  <span class="step-tag">Step {{ step.stepNumber }} &bull; {{ step.layer }}</span>
                  <h3 class="step-title">{{ step.title }}</h3>
                  <p class="step-subtitle">{{ step.subtitle }}</p>
                </div>
                <div class="tech-pills">
                  @for (t of step.technologies; track t) {
                    <span class="tech-pill">{{ t }}</span>
                  }
                </div>
              </div>

              <div class="step-body-grid">
                <!-- Inputs -->
                <div class="io-box inputs-box">
                  <div class="io-label">
                    <ion-icon name="arrow-back-outline"></ion-icon> Inputs & Ingestion
                  </div>
                  <ul>
                    @for (inp of step.inputs; track inp) {
                      <li>{{ inp }}</li>
                    }
                  </ul>
                </div>

                <!-- Processing Logic -->
                <div class="io-box processing-box">
                  <div class="io-label">
                    <ion-icon name="hardware-chip-outline"></ion-icon> Core Processing & Algorithms
                  </div>
                  <ul>
                    @for (proc of step.processing; track proc) {
                      <li>{{ proc }}</li>
                    }
                  </ul>
                </div>

                <!-- Outputs -->
                <div class="io-box outputs-box">
                  <div class="io-label">
                    <ion-icon name="arrow-up-outline"></ion-icon> Artifacts & Output Tables
                  </div>
                  <ul>
                    @for (out of step.outputs; track out) {
                      <li><code>{{ out }}</code></li>
                    }
                  </ul>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      </section>

      <section id="arch-panel-onelake" role="tabpanel" aria-labelledby="arch-tab-onelake"
        tabindex="0" [hidden]="activeTab() !== 'onelake'">
      <!-- Medallion Lakehouse Storage Specs -->
      <ion-card class="docs-card" id="medallion-layers">
        <ion-card-header>
          <ion-card-title>Fabric OneLake Medallion Layer Schema</ion-card-title>
          <ion-card-subtitle>Contract and purpose of Bronze, Silver, and Gold delta tables</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="table-responsive">
            <table class="specs-table">
              <thead>
                <tr>
                  <th>Layer</th>
                  <th>Schema / Table</th>
                  <th>Format</th>
                  <th>Storage Path</th>
                  <th>Description & Contract</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span class="medallion-badge bronze">Bronze</span></td>
                  <td><code>src_planview</code>, <code>src_ado</code>, <code>src_jira</code>, <code>src_hr_*</code></td>
                  <td>Delta Parquet</td>
                  <td><code>Tables/src_*</code></td>
                  <td>Raw ingested mirrors of 11 source systems without schema alteration.</td>
                </tr>
                <tr>
                  <td><span class="medallion-badge silver">Silver</span></td>
                  <td><code>silver.project_canonical</code></td>
                  <td>Delta Parquet</td>
                  <td><code>Tables/silver/project_canonical</code></td>
                  <td>Reconciled single source of truth consolidating the 10 canonical PMO signals.</td>
                </tr>
                <tr>
                  <td><span class="medallion-badge silver">Silver</span></td>
                  <td><code>silver.signal_provenance</code></td>
                  <td>Delta Parquet</td>
                  <td><code>Tables/silver/signal_provenance</code></td>
                  <td>Granular audit log tracking source presence and tie-breaking rationale.</td>
                </tr>
                <tr>
                  <td><span class="medallion-badge gold">Gold</span></td>
                  <td><code>gold.project_features</code></td>
                  <td>Delta Parquet</td>
                  <td><code>Tables/gold/project_features</code></td>
                  <td>Normalized, scaled numerical feature vectors for model training and inference.</td>
                </tr>
                <tr>
                  <td><span class="medallion-badge gold">Gold</span></td>
                  <td><code>gold.project_predictions</code></td>
                  <td>Delta Parquet</td>
                  <td><code>Tables/gold/project_predictions</code></td>
                  <td>Final predicted tiers, calibrated probabilities, confidence scores, and rule overrides.</td>
                </tr>
                <tr>
                  <td><span class="medallion-badge gold">Gold</span></td>
                  <td><code>gold.project_shap_drivers</code></td>
                  <td>Delta Parquet</td>
                  <td><code>Tables/gold/project_shap_drivers</code></td>
                  <td>Per-project TreeSHAP local feature attribution waterfall values and ranks.</td>
                </tr>
                <tr>
                  <td><span class="medallion-badge gold">Gold</span></td>
                  <td><code>gold.capacity_by_skill</code></td>
                  <td>Delta Parquet</td>
                  <td><code>Tables/gold/capacity_by_skill</code></td>
                  <td>Aggregated supply vs demand FTE comparisons across 8 skill domains.</td>
                </tr>
                <tr>
                  <td><span class="medallion-badge gold">Gold</span></td>
                  <td><code>gold.project_clusters</code></td>
                  <td>Delta Parquet</td>
                  <td><code>Tables/gold/project_clusters</code></td>
                  <td>K-Means cluster assignments with dynamic semantic titles.</td>
                </tr>
                <tr>
                  <td><span class="medallion-badge gold">Gold</span></td>
                  <td><code>gold.rule_triggers</code></td>
                  <td>Delta Parquet</td>
                  <td><code>Tables/gold/rule_triggers</code></td>
                  <td>Audit log of all deterministic business rules triggered for each project.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ion-card-content>
      </ion-card>

      </section>

      <section id="arch-panel-services" role="tabpanel" aria-labelledby="arch-tab-services"
        tabindex="0" [hidden]="activeTab() !== 'services'">
      <!-- Azure Services & Infrastructure Inventory -->
      <ion-card class="docs-card" id="azure-services">
        <ion-card-header>
          <ion-card-title>Azure & Fabric Services Inventory</ion-card-title>
          <ion-card-subtitle>Cloud services, roles, and security boundaries</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="table-responsive">
            <table class="specs-table">
              <thead>
                <tr>
                  <th>Azure Service</th>
                  <th>Role in Architecture</th>
                  <th>Key Technologies</th>
                  <th>Security & Connectivity</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Microsoft Fabric</strong></td>
                  <td>Enterprise Lakehouse, Spark compute, scheduled data pipelines, and OneLake storage</td>
                  <td>Apache Spark, Delta Lake, Python 3.11, LightGBM</td>
                  <td>Fabric Workspace RBAC, Microsoft Entra ID</td>
                </tr>
                <tr>
                  <td><strong>Power BI (Direct Lake)</strong></td>
                  <td>Zero-ETL executive reporting reading directly from OneLake gold delta parquet</td>
                  <td>Direct Lake mode, DAX, Tabular Object Model</td>
                  <td>Entra ID MSAL Embedded Token, Row-Level Security</td>
                </tr>
                <tr>
                  <td><strong>Azure App Service</strong></td>
                  <td>Hosts the containerized FastAPI backend API and Ionic Angular SPA web application</td>
                  <td>Linux Containers, Python 3.12, Node.js 22</td>
                  <td>VNet Integration, System-Assigned Managed Identity</td>
                </tr>
                <tr>
                  <td><strong>Azure API Management (APIM)</strong></td>
                  <td>Central gateway routing traffic under <code>/pmo</code> with rate limiting and telemetry</td>
                  <td>APIM Policy Engine, Rate-limiting, Header inspection</td>
                  <td>Subscription Key authentication, TLS 1.3</td>
                </tr>
                <tr>
                  <td><strong>Microsoft Foundry (Azure AI)</strong></td>
                  <td>Powers Quick Add AI signal extraction and PMO Copilot Agent</td>
                  <td>Foundry agent pmo-intake-agent (gpt-5.6-sol), Bing grounding, validated JSON contract</td>
                  <td>Cognitive Services RBAC, Private Endpoint</td>
                </tr>
                <tr>
                  <td><strong>Azure Key Vault</strong></td>
                  <td>Centralized storage of application secrets and service principal credentials</td>
                  <td>Hardware Security Modules (HSM), Secret versioning</td>
                  <td>Private Endpoint, Secretless Managed Identity</td>
                </tr>
                <tr>
                  <td><strong>Azure Monitor & App Insights</strong></td>
                  <td>End-to-end distributed tracing, telemetry, performance metrics, and alert routing</td>
                  <td>OpenTelemetry, Kusto Query Language (KQL)</td>
                  <td>Diagnostic Settings, W3C Trace Context</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ion-card-content>
      </ion-card>
      </section>
    </ion-content>
  `,
  styles: [
    `
      .architecture-tabs {
        margin-bottom: 20px;
        border-bottom: 1px solid var(--pmo-border, #ddd);
      }
      .architecture-tabs ion-segment-button {
        text-transform: none;
        min-width: max-content;
        --padding-start: 16px;
        --padding-end: 16px;
      }
      [role="tabpanel"]:focus-visible {
        outline: 2px solid var(--ion-color-primary, #0078d4);
        outline-offset: 4px;
      }
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
        max-width: 900px;
      }

      .nav-jump-chips {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 18px;
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
        transition: all 0.15s ease;
      }
      .jump-chip:hover {
        background: rgba(0, 120, 212, 0.18);
      }

      .docs-card {
        background: #ffffff;
        border-radius: 10px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        margin-bottom: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }
      .card-header-flex {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 12px;
      }
      .header-badges {
        display: flex;
        gap: 6px;
      }

      .layer-filter-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--pmo-border, #e0e0e0);
      }
      .filter-label {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--pmo-muted, #666);
        margin-right: 4px;
      }
      .layer-chip {
        border: 1px solid var(--pmo-border, #d1d1d1);
        background: #fdfdfd;
        color: var(--pmo-text, #333);
        padding: 5px 12px;
        border-radius: 16px;
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .layer-chip:hover {
        background: #f0f4f8;
      }
      .layer-chip.active {
        background: var(--pmo-primary, #0078d4);
        color: #ffffff;
        border-color: var(--pmo-primary, #0078d4);
      }

      .diagram-container {
        margin: 16px 0;
        background: #fafafa;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 8px;
        padding: 16px;
        text-align: center;
      }
      .diagram-image-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        overflow-x: auto;
      }
      .architecture-image {
        max-width: 100%;
        height: auto;
        border-radius: 6px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      }
      .diagram-caption {
        margin-top: 12px;
        font-size: 0.82rem;
        color: var(--pmo-muted, #666);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        text-align: left;
      }
      .open-raw-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--pmo-primary, #0078d4);
        text-decoration: none;
        font-weight: 600;
      }

      .layers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-top: 20px;
      }
      .layer-box {
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 8px;
        padding: 12px;
        background: #fcfcfc;
        transition: all 0.2s ease;
        opacity: 0.45;
      }
      .layer-box.highlighted {
        opacity: 1;
        background: #ffffff;
        border-color: var(--pmo-primary, #0078d4);
        box-shadow: 0 3px 10px rgba(0, 120, 212, 0.08);
      }
      .layer-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;

        ion-icon {
          font-size: 1.4rem;
          color: var(--pmo-primary, #0078d4);
        }
      }
      .layer-title-wrap {
        display: flex;
        flex-direction: column;
      }
      .layer-num {
        font-size: 0.7rem;
        text-transform: uppercase;
        font-weight: 700;
        color: var(--pmo-muted, #777);
      }
      .layer-name {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--pmo-primary-dark, #004578);
      }
      .layer-desc {
        font-size: 0.78rem;
        line-height: 1.4;
        color: #444;
        margin: 0 0 10px 0;
      }
      .layer-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .meta-pill {
        font-size: 0.68rem;
        background: #eef4fa;
        color: var(--pmo-primary, #0078d4);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }

      .section-title-wrap {
        margin: 32px 0 16px 0;
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

      .steps-timeline {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .step-card-wrapper {
        display: flex;
        gap: 16px;
      }
      .step-indicator-col {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .step-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--pmo-primary, #0078d4);
        color: #ffffff;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
        box-shadow: 0 2px 6px rgba(0, 120, 212, 0.25);
        flex-shrink: 0;
      }
      .step-line {
        width: 2px;
        flex: 1;
        background: #d8e6f3;
        margin-top: 6px;
      }
      .step-content-card {
        flex: 1;
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 10px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
      }
      .step-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 10px;
        border-bottom: 1px solid #f0f0f0;
        padding-bottom: 10px;
        margin-bottom: 12px;
      }
      .step-tag {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--pmo-primary, #0078d4);
        letter-spacing: 0.3px;
      }
      .step-title {
        margin: 2px 0 4px 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: #1a1a1a;
      }
      .step-subtitle {
        margin: 0;
        font-size: 0.84rem;
        color: var(--pmo-muted, #666);
      }
      .tech-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .tech-pill {
        font-size: 0.72rem;
        padding: 2px 8px;
        background: #f0f4f9;
        color: #004578;
        border-radius: 10px;
        font-weight: 600;
      }

      .step-body-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;
      }
      .io-box {
        border-radius: 6px;
        padding: 10px 12px;
        font-size: 0.8rem;
      }
      .inputs-box {
        background: #f7fafc;
        border: 1px solid #e2e8f0;
      }
      .processing-box {
        background: #f0f7ff;
        border: 1px solid #d0e4ff;
      }
      .outputs-box {
        background: #f6fcf8;
        border: 1px solid #d4eed9;
      }
      .io-label {
        font-weight: 700;
        font-size: 0.76rem;
        text-transform: uppercase;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .inputs-box .io-label {
        color: #4a5568;
      }
      .processing-box .io-label {
        color: var(--pmo-primary, #0078d4);
      }
      .outputs-box .io-label {
        color: #107c10;
      }

      .io-box ul {
        margin: 0;
        padding-left: 16px;
        line-height: 1.45;
        color: #333;
      }
      .io-box li {
        margin-bottom: 4px;
      }

      .table-responsive {
        overflow-x: auto;
      }
      .specs-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
      }
      .specs-table th {
        background: #f8fafc;
        padding: 10px 12px;
        text-align: left;
        font-weight: 700;
        color: #333;
        border-bottom: 2px solid var(--pmo-border, #e0e0e0);
      }
      .specs-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: top;
      }
      .specs-table code {
        background: #f0f4f8;
        color: #004578;
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 0.8rem;
      }
      .medallion-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
      }
      .medallion-badge.bronze {
        background: #fdf3e7;
        color: #a35d12;
      }
      .medallion-badge.silver {
        background: #f1f3f5;
        color: #5c6873;
      }
      .medallion-badge.gold {
        background: #fef8e7;
        color: #b58105;
      }

      @media (max-width: 768px) {
        .step-card-wrapper {
          flex-direction: column;
          gap: 8px;
        }
        .step-indicator-col {
          flex-direction: row;
          gap: 8px;
        }
        .step-line {
          display: none;
        }
        .step-body-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DocsArchitecturePageComponent {
  readonly tabs = [
    { id: 'solution', label: 'Solution Architecture' },
    { id: 'ml', label: 'ML Algos' },
    { id: 'pipeline', label: 'Pipeline Steps' },
    { id: 'onelake', label: 'OneLake Layers' },
    { id: 'services', label: 'Services & Security' },
  ] as const;
  readonly activeTab = signal<typeof this.tabs[number]['id']>('solution');
  readonly selectedLayer = signal<string>('all');

  selectTab(value: unknown): void {
    const tab = this.tabs.find(tab => tab.id === value);
    if (!tab) throw new Error('Unknown architecture documentation tab.');
    this.activeTab.set(tab.id);
  }

  readonly steps: ArchStep[] = [
    {
      stepNumber: 1,
      title: 'Multi-Source Enterprise Ingestion',
      subtitle: 'Ingesting 11 disparate project management & financial systems into OneLake raw landing zone',
      layer: 'Layer 1: Data Ingestion',
      technologies: ['Fabric Pipelines', 'OneLake ADLS Gen2', 'FastAPI Ingestion', 'PySpark'],
      inputs: [
        'Planview project baselines and approved capital budgets',
        'Power Apps front-door project intake forms',
        'Azure DevOps & JIRA agile backlogs and sprint story points',
        'MS Project & Smartsheet milestone schedules and go-live dates',
        'BU spreadsheets, HR Capacity FTE allocations, and SAP financial commitments',
      ],
      processing: [
        'Fabric scheduled copy activities pull batch data into Files/raw/<source>/',
        'FastAPI intake endpoint writes new project submissions directly to Files/raw/ui_entries/',
        'Atomic SHA-256 integrity validation and file format verification (CSV, JSON, XLSX)',
        'Automatic partitioning by ingestion timestamp and source provider',
      ],
      outputs: [
        'Files/raw/<source>/*.csv',
        'Files/raw/ui_entries/projects/*.json',
        'Bronze tables: src_planview, src_ado, src_jira, src_hr_capacity, src_cost',
      ],
      icon: 'cloud-upload-outline',
    },
    {
      stepNumber: 2,
      title: 'Medallion Lakehouse Transformation & Quality Audit',
      subtitle: 'Converting raw schema mirrors to cleansed canonical models and logging audit lineage',
      layer: 'Layer 2: Lakehouse Medallion',
      technologies: ['Apache Spark', 'Delta Lake', 'V-Order Optimization', '14 DQ Checks'],
      inputs: [
        'All Bronze raw tables (src_*) in pmo_lakehouse',
        'Data dictionary and mapping contracts in config/data-sources.json',
      ],
      processing: [
        'Silver schema harmonization across 10 canonical PMO dimensions',
        'Deterministic conflict resolution rules with full signal provenance tracking',
        '14 automated Data Quality checks (format checks, range bounds, foreign-key relationships)',
        'Delta Lake V-Order sorting for sub-second parquet reads',
      ],
      outputs: [
        'silver.project_canonical (Single source of truth for 100 projects)',
        'silver.signal_provenance (Per-field lineage and source attribution)',
        'gold.dq_checks (Automated audit verdicts and pass/fail counts)',
      ],
      icon: 'layers-outline',
    },
    {
      stepNumber: 3,
      title: 'Spark ML Feature Engineering & Model Training',
      subtitle: 'Transforming canonical signals into feature vectors and training supervised LightGBM',
      layer: 'Layer 3: Machine Learning Training',
      technologies: ['Fabric Notebook 01', 'LightGBM GBDT', 'Platt CalibratedClassifierCV', 'MLflow'],
      inputs: [
        'silver.project_canonical records with 10 core PMO signals',
        'gold.pmo_decision_labels (historical review committee decisions)',
        'Sample weights formulated from signal completeness * quality',
      ],
      processing: [
        'Log10 cost scaling and nonlinear timing urgency horizon transformation',
        'Stratified K-Fold cross validation (accuracy 91.4%, macro F1 89.2%, log loss 0.284)',
        'Sigmoid Platt calibration via CalibratedClassifierCV to establish true model certainty',
        'Multinomial Logistic Regression baseline model comparison',
        'Model artifact serialization to Files/models/ and MLflow experiment logging',
      ],
      outputs: [
        'gold.project_features (Normalized feature matrices)',
        'gold.model_metrics (Cross-validated accuracy and loss tracking)',
        'Files/models/lightgbm_booster.txt and calibrated_classifier.joblib',
      ],
      icon: 'hardware-chip-outline',
    },
    {
      stepNumber: 4,
      title: 'Batch Inference, TreeSHAP & Rule Governance Engine',
      subtitle: 'Scoring projects, decomposing SHAP feature attributions, and applying R1-R5 policy rules',
      layer: 'Layer 3: Machine Learning Inference',
      technologies: ['Fabric Notebook 02', 'TreeSHAP', 'Ordered Rules Engine', 'K-Means Clustering'],
      inputs: [
        'gold.project_features feature matrix',
        'Trained LightGBM booster and calibrated probability model',
        'Deterministic business rule definitions R1 through R5',
        'src_hr_roster and src_hr_capacity workforce data',
      ],
      processing: [
        'Generates calibrated posterior class probabilities across 4 priority tiers',
        'Calculates exact TreeSHAP feature attributions decomposing each score driver',
        'Evaluates deterministic business rules (R1 to R5) in strict priority order',
        'Executes K-Means unsupervised clustering (k=4) with dynamic semantic naming',
        'Computes skill demand FTE vs supply FTE gap across 8 skill domains',
        'Computes Platt-calibrated composite confidence score (0-100%)',
      ],
      outputs: [
        'gold.project_predictions (Final operational rankings, tiers, and scores)',
        'gold.project_shap_drivers (Waterfall attribution values and directions)',
        'gold.capacity_by_skill (FTE demand and capacity deficit by skill)',
        'gold.project_clusters (Unsupervised strategic groupings)',
        'gold.rule_triggers (Complete audit trail of rule triggers)',
      ],
      icon: 'analytics-outline',
    },
    {
      stepNumber: 5,
      title: 'Power BI Direct Lake Semantic Modeling',
      subtitle: 'Zero-ETL analytical semantic model querying Gold Delta Parquet without caching',
      layer: 'Layer 4: Direct Lake Analytics',
      technologies: ['Power BI Direct Lake', 'Analysis Services Engine', 'DAX Measures', 'Delta Tables'],
      inputs: [
        'OneLake Delta Parquet tables in gold schema (gold.project_predictions, gold.capacity_by_skill)',
      ],
      processing: [
        'Direct Lake engine maps Delta Lake metadata directly into VertiPaq memory structures',
        'Zero data duplication or scheduled refresh latency; instant sync upon notebook completion',
        'Calculates dynamic executive KPI measures, priority matrices, and capacity deficit ratios',
        'Configures hierarchical relationships: Portfolio > Program > Project',
      ],
      outputs: [
        'PMO Portfolio Semantic Model in Fabric workspace',
        'Direct Lake reports: Executive Dashboard, Prioritization Board, ML Operations',
        'Paginated RDL reports: Portfolio Register and Capacity Plan',
      ],
      icon: 'bar-chart-outline',
    },
    {
      stepNumber: 6,
      title: 'FastAPI Backend & Azure APIM Gateway',
      subtitle: 'Secure REST microservices providing OneLake data access and Foundry AI prefill',
      layer: 'Layer 4: API & Integration Gateway',
      technologies: ['FastAPI (Python 3.12)', 'Azure APIM', 'Azure Key Vault', 'Microsoft Foundry agents (Bing grounding, OneLake via APIM)'],
      inputs: [
        'REST requests from UI client or external systems under /pmo',
        'OneLake Delta Parquet and JSON files accessed via ADLS Gen2 DFS endpoints',
        'Microsoft Entra ID bearer tokens and APIM subscription keys',
      ],
      processing: [
        'Azure API Management enforces rate-limiting, CORS, and request auditing',
        'System-assigned Managed Identity authenticates to Key Vault and OneLake without secrets',
        'AI Prefill endpoint calls the pmo-intake-agent in Microsoft Foundry, which searches the web with Bing grounding and returns a validated JSON contract',
        'Data entry and governance endpoints append approved records to OneLake with audit trails',
      ],
      outputs: [
        'GET /api/v1/portfolio (current project view with saved weight policy applied)',
        'POST /api/v1/intake/drafts/{draftId}/prefill (missing-only suggested fields with evidence)',
        'PATCH /api/v1/projects/{projectId}/progress (validated start and completion records)',
        'PUT /api/v1/admin/priority-weights (global, portfolio and project policy)',
        'POST /api/v1/decisions (Recorded human committee governance log)',
      ],
      icon: 'server-outline',
    },
    {
      stepNumber: 7,
      title: 'Multi-Device Client Application & AI Copilot Agent',
      subtitle: 'Responsive Ionic Angular SPA supporting Desktop, Tablet, and Mobile with Copilot FAB',
      layer: 'Layer 5: Presentation & Copilot',
      technologies: ['Ionic Framework', 'Angular 19+', 'ECharts Core', 'AI Copilot Agent FAB', 'MSAL Auth'],
      inputs: [
        'Portfolio dataset from backend API; saved recommendation reports from a database cache',
        'Direct Lake Power BI embed tokens generated via Microsoft Entra ID',
        'Natural language queries entered into PMO Portfolio Copilot',
      ],
      processing: [
        'Responsive split-pane navigation with collapsible left menu and responsive cards',
        'ECharts visualizations: Priority Tier Donut, Capacity Deficit Bars, Cost Treemap, Sunburst',
        'SHAP feature waterfall inspector explaining algorithmic drivers per project',
        'Human Governance decision recorder with mandatory justification logging',
        'Copilot Agent generates multi-format exports (Word .docx, Excel .xlsx, PowerPoint .pptx)',
      ],
      outputs: [
        'Desktop, Tablet, and Mobile executive prioritization interfaces',
        'Interactive project deep-dives with SHAP explainability',
        'Exported executive briefs (.docx, .xlsx, .pptx)',
      ],
      icon: 'pie-chart-outline',
    },
  ];

  onImageError(event: Event): void {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
  }
}
