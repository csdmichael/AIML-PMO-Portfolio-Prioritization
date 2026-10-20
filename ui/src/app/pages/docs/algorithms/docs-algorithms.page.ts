import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MlFlowDiagramsComponent } from '../../../components/ml-flow-diagrams/ml-flow-diagrams.component';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
} from '@ionic/angular';

interface AlgoFeature {
  name: string;
  column: string;
  table: string;
  dataType: string;
  importance: string;
  description: string;
}

interface AlgoOutputTable {
  tableName: string;
  columns: string[];
  description: string;
  consumers: string[];
}

interface AlgoItem {
  id: string;
  name: string;
  category: 'Supervised' | 'Calibration' | 'Explainability' | 'Clustering' | 'Confidence' | 'Generative AI' | 'Rule Governance' | 'Resource Optimization';
  algorithmUsed: string;
  algorithmShort: string;
  description: string;
  features: AlgoFeature[];
  outputs: AlgoOutputTable[];
  example: {
    scenario: string;
    inputs: Record<string, string | number | boolean>;
    executionSteps: string[];
    result: string;
    businessImpact: string;
  };
}

@Component({
  selector: 'app-docs-algorithms-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MlFlowDiagramsComponent,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding docs-content">
      <div class="docs-header">
        <div class="breadcrumbs">
          <span class="crumb-parent">Documentation</span>
          <ion-icon name="chevron-forward-outline" class="crumb-sep"></ion-icon>
          <span class="crumb-current">ML Algorithms Implemented</span>
        </div>
        <h1 class="page-title">Machine Learning Algorithms & Mathematical Models</h1>
        <p class="page-subtitle">
          Comprehensive specification of the 8 predictive, calibrated, explainable, and generative algorithms powering PMO Portfolio Prioritization. Each algorithm features complete feature mappings, output schemas, and verified execution examples.
        </p>
      </div>

      <app-ml-flow-diagrams />

      <!-- Controls Row: Search, Category Filter, Expand/Collapse All -->
      <div class="toolbar-box">
        <div class="search-wrap">
          <ion-icon name="funnel-outline" class="search-icon"></ion-icon>
          <input
            type="text"
            class="custom-search-input"
            placeholder="Search algorithms, features, tables, or methods..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
          @if (searchQuery()) {
            <button class="clear-search-btn" (click)="searchQuery.set('')">&times;</button>
          }
        </div>

        <div class="category-pills">
          @for (cat of categories; track cat) {
            <button
              type="button"
              class="cat-chip"
              [class.active]="selectedCategory() === cat"
              (click)="selectedCategory.set(cat)"
            >
              {{ cat }}
            </button>
          }
        </div>

        <div class="action-buttons">
          <ion-button size="small" fill="outline" (click)="expandAll()">
            <ion-icon name="chevron-down-outline" slot="start"></ion-icon>
            Expand All
          </ion-button>
          <ion-button size="small" fill="outline" (click)="collapseAll()">
            <ion-icon name="chevron-up-outline" slot="start"></ion-icon>
            Collapse All
          </ion-button>
        </div>
      </div>

      <!-- Algorithms Quick Comparison Table -->
      <ion-card class="summary-table-card">
        <ion-card-header>
          <ion-card-title>Algorithms Overview Matrix</ion-card-title>
          <ion-card-subtitle>Quick reference of models, purposes, primary tables, and metrics</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="table-responsive">
            <table class="matrix-table">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Category</th>
                  <th>Algorithm Class / Implementation</th>
                  <th>Primary Input Table</th>
                  <th>Primary Output Table</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (algo of filteredAlgorithms(); track algo.id) {
                  <tr>
                    <td><strong>{{ algo.name }}</strong></td>
                    <td><span class="cat-badge" [attr.data-cat]="algo.category">{{ algo.category }}</span></td>
                    <td><code>{{ algo.algorithmShort }}</code></td>
                    <td><code>{{ algo.features[0]?.table || 'Files/raw' }}</code></td>
                    <td><code>{{ algo.outputs[0]?.tableName }}</code></td>
                    <td>
                      <button class="inspect-btn" (click)="toggleAccordion(algo.id)">
                        {{ isExpanded(algo.id) ? 'Collapse' : 'Inspect' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Expandable / Collapsible Algorithm Cards -->
      <div class="algo-accordion-list">
        @for (algo of filteredAlgorithms(); track algo.id) {
          <div class="algo-card" [class.is-expanded]="isExpanded(algo.id)">
            <!-- Accordion Header -->
            <div class="algo-card-header" (click)="toggleAccordion(algo.id)">
              <div class="algo-header-left">
                <ion-icon
                  [name]="isExpanded(algo.id) ? 'chevron-down-outline' : 'chevron-forward-outline'"
                  class="toggle-chevron"
                ></ion-icon>
                <div class="algo-title-block">
                  <div class="algo-meta-line">
                    <span class="cat-badge" [attr.data-cat]="algo.category">{{ algo.category }}</span>
                    <span class="algo-class-tag">{{ algo.algorithmShort }}</span>
                  </div>
                  <h3 class="algo-name">{{ algo.name }}</h3>
                </div>
              </div>
              <div class="algo-header-right">
                <span class="feature-count-badge">{{ algo.features.length }} Features</span>
                <span class="output-count-badge">{{ algo.outputs.length }} Output Table(s)</span>
              </div>
            </div>

            <!-- Accordion Body -->
            @if (isExpanded(algo.id)) {
              <div class="algo-card-body">
                <!-- 1. Algorithm Used -->
                <div class="detail-section">
                  <h4 class="section-heading">
                    <ion-icon name="code-working-outline"></ion-icon> 1. Algorithm Used & Implementation Details
                  </h4>
                  <div class="algo-spec-box">
                    <pre><code>{{ algo.algorithmUsed }}</code></pre>
                  </div>
                </div>

                <!-- 2. Description -->
                <div class="detail-section">
                  <h4 class="section-heading">
                    <ion-icon name="document-text-outline"></ion-icon> 2. Description & Architectural Role
                  </h4>
                  <p class="description-text">{{ algo.description }}</p>
                </div>

                <!-- 3. Most Important Features -->
                <div class="detail-section">
                  <h4 class="section-heading">
                    <ion-icon name="funnel-outline"></ion-icon> 3. Most Important Features (Columns & Tables)
                  </h4>
                  <div class="table-responsive">
                    <table class="algo-data-table">
                      <thead>
                        <tr>
                          <th>Feature Name</th>
                          <th>Column Name</th>
                          <th>Source Table</th>
                          <th>Data Type</th>
                          <th>Importance / Weight</th>
                          <th>Role & Normalization</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (feat of algo.features; track feat.column) {
                          <tr>
                            <td><strong>{{ feat.name }}</strong></td>
                            <td><code>{{ feat.column }}</code></td>
                            <td><code>{{ feat.table }}</code></td>
                            <td><span class="type-badge">{{ feat.dataType }}</span></td>
                            <td><span class="importance-badge" [class.high]="feat.importance.includes('High') || feat.importance.includes('Primary')">{{ feat.importance }}</span></td>
                            <td>{{ feat.description }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- 4. Output Table(s) -->
                <div class="detail-section">
                  <h4 class="section-heading">
                    <ion-icon name="arrow-up-outline"></ion-icon> 4. Output Table(s) & Schema Destination
                  </h4>
                  <div class="table-responsive">
                    <table class="algo-data-table">
                      <thead>
                        <tr>
                          <th>Output Table</th>
                          <th>Generated Columns</th>
                          <th>Description</th>
                          <th>Downstream Consumers</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (out of algo.outputs; track out.tableName) {
                          <tr>
                            <td><code>{{ out.tableName }}</code></td>
                            <td>
                              <div class="cols-pill-wrap">
                                @for (col of out.columns; track col) {
                                  <span class="col-pill">{{ col }}</span>
                                }
                              </div>
                            </td>
                            <td>{{ out.description }}</td>
                            <td>
                              @for (cons of out.consumers; track cons) {
                                <span class="consumer-tag">{{ cons }}</span>
                              }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>

                <!-- 5. Concrete Example -->
                <div class="detail-section example-section">
                  <h4 class="section-heading">
                    <ion-icon name="flash-outline"></ion-icon> 5. End-to-End Concrete Example
                  </h4>
                  <div class="example-box">
                    <div class="example-scenario">
                      <strong>Scenario:</strong> {{ algo.example.scenario }}
                    </div>

                    <div class="example-io-grid">
                      <div class="example-inputs">
                        <div class="io-subheading">Input Signals / Parameters:</div>
                        <ul class="example-kv-list">
                          @for (entry of getEntries(algo.example.inputs); track entry[0]) {
                            <li>
                              <span class="kv-key">{{ entry[0] }}:</span>
                              <span class="kv-val">{{ entry[1] }}</span>
                            </li>
                          }
                        </ul>
                      </div>

                      <div class="example-steps">
                        <div class="io-subheading">Step-by-Step Mathematical Trace:</div>
                        <ol class="example-trace-list">
                          @for (step of algo.example.executionSteps; track step) {
                            <li>{{ step }}</li>
                          }
                        </ol>
                      </div>
                    </div>

                    <div class="example-result-bar">
                      <div class="result-title">Final Algorithmic Outcome:</div>
                      <div class="result-val">{{ algo.example.result }}</div>
                    </div>
                    <div class="example-impact">
                      <strong>Business Impact:</strong> {{ algo.example.businessImpact }}
                    </div>
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

      .toolbar-box {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 18px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
      }
      .search-wrap {
        display: flex;
        align-items: center;
        background: #f8fafc;
        border: 1px solid var(--pmo-border, #d1d5db);
        border-radius: 6px;
        padding: 4px 10px;
        flex: 1;
        min-width: 240px;
        max-width: 380px;
      }
      .search-icon {
        color: var(--pmo-muted, #666);
        margin-right: 8px;
      }
      .custom-search-input {
        border: none;
        background: transparent;
        outline: none;
        font-size: 0.85rem;
        width: 100%;
        color: #1a1a1a;
      }
      .clear-search-btn {
        background: none;
        border: none;
        font-size: 1.1rem;
        color: #888;
        cursor: pointer;
      }

      .category-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .cat-chip {
        border: 1px solid var(--pmo-border, #d1d5db);
        background: #ffffff;
        color: #333;
        font-size: 0.78rem;
        font-weight: 500;
        padding: 4px 10px;
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .cat-chip:hover {
        background: #f0f4f8;
      }
      .cat-chip.active {
        background: var(--pmo-primary, #0078d4);
        color: #ffffff;
        border-color: var(--pmo-primary, #0078d4);
      }

      .action-buttons {
        display: flex;
        gap: 6px;
      }

      .summary-table-card {
        background: #ffffff;
        border-radius: 10px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        margin-bottom: 24px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
      }
      .matrix-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
      }
      .matrix-table th {
        background: #f8fafc;
        padding: 8px 12px;
        text-align: left;
        font-weight: 700;
        color: #333;
        border-bottom: 2px solid var(--pmo-border, #e0e0e0);
      }
      .matrix-table td {
        padding: 8px 12px;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: middle;
      }
      .inspect-btn {
        background: rgba(0, 120, 212, 0.08);
        color: var(--pmo-primary, #0078d4);
        border: 1px solid rgba(0, 120, 212, 0.25);
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
      }
      .inspect-btn:hover {
        background: var(--pmo-primary, #0078d4);
        color: #ffffff;
      }

      .algo-accordion-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .algo-card {
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
        transition: all 0.2s ease;
      }
      .algo-card.is-expanded {
        border-color: var(--pmo-primary, #0078d4);
        box-shadow: 0 4px 14px rgba(0, 120, 212, 0.08);
      }

      .algo-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 18px;
        background: #ffffff;
        cursor: pointer;
        user-select: none;
        border-bottom: 1px solid transparent;
        transition: background 0.15s ease;
      }
      .algo-card.is-expanded .algo-card-header {
        background: #f8fbfe;
        border-bottom-color: var(--pmo-border, #e0e0e0);
      }
      .algo-card-header:hover {
        background: #fbfbfb;
      }

      .algo-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .toggle-chevron {
        font-size: 1.25rem;
        color: var(--pmo-primary, #0078d4);
        flex-shrink: 0;
      }
      .algo-title-block {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .algo-meta-line {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .cat-badge {
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 10px;
        background: #e2e8f0;
        color: #334155;
      }
      .cat-badge[data-cat="Supervised"] { background: #e0f2fe; color: #0369a1; }
      .cat-badge[data-cat="Calibration"] { background: #fef3c7; color: #b45309; }
      .cat-badge[data-cat="Explainability"] { background: #ede9fe; color: #6d28d9; }
      .cat-badge[data-cat="Clustering"] { background: #ecfdf5; color: #047857; }
      .cat-badge[data-cat="Confidence"] { background: #fce7f3; color: #be185d; }
      .cat-badge[data-cat="Generative AI"] { background: #fae8ff; color: #86198f; }
      .cat-badge[data-cat="Rule Governance"] { background: #fee2e2; color: #b91c1c; }
      .cat-badge[data-cat="Resource Optimization"] { background: #e0e7ff; color: #3730a3; }

      .algo-class-tag {
        font-size: 0.72rem;
        color: var(--pmo-muted, #666);
        font-family: monospace;
      }
      .algo-name {
        margin: 2px 0 0 0;
        font-size: 1.12rem;
        font-weight: 700;
        color: #1a1a1a;
      }

      .algo-header-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .feature-count-badge, .output-count-badge {
        font-size: 0.72rem;
        background: #f1f5f9;
        color: #475569;
        padding: 3px 8px;
        border-radius: 12px;
        font-weight: 600;
      }

      .algo-card-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 22px;
        animation: fadeIn 0.2s ease-in-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .detail-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .section-heading {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--pmo-primary-dark, #004578);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .section-heading ion-icon {
        color: var(--pmo-primary, #0078d4);
        font-size: 1.05rem;
      }
      .algo-spec-box {
        background: #1e1e1e;
        color: #d4d4d4;
        border-radius: 6px;
        padding: 10px 14px;
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 0.8rem;
        overflow-x: auto;
      }
      .algo-spec-box pre {
        margin: 0;
      }
      .description-text {
        font-size: 0.88rem;
        line-height: 1.5;
        color: #333;
        margin: 0;
      }

      .table-responsive {
        overflow-x: auto;
      }
      .algo-data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
      }
      .algo-data-table th {
        background: #f8fafc;
        padding: 8px 10px;
        text-align: left;
        font-weight: 700;
        color: #333;
        border-bottom: 2px solid var(--pmo-border, #e0e0e0);
      }
      .algo-data-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: top;
      }
      .algo-data-table code {
        background: #f0f4f8;
        color: #004578;
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 0.8rem;
      }
      .type-badge {
        font-size: 0.72rem;
        background: #e2e8f0;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
      }
      .importance-badge {
        font-size: 0.72rem;
        padding: 2px 6px;
        border-radius: 4px;
        background: #f1f5f9;
        color: #475569;
        font-weight: 600;
      }
      .importance-badge.high {
        background: #e0f2fe;
        color: #0369a1;
      }

      .cols-pill-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .col-pill {
        font-size: 0.72rem;
        background: #f1f5f9;
        color: #0f172a;
        padding: 1px 6px;
        border-radius: 3px;
        font-family: monospace;
      }
      .consumer-tag {
        display: inline-block;
        font-size: 0.7rem;
        background: #eef2ff;
        color: #4338ca;
        padding: 1px 6px;
        border-radius: 4px;
        margin-right: 4px;
        font-weight: 500;
      }

      .example-section {
        background: #fafbfc;
        border: 1px solid #e1e7ec;
        border-radius: 8px;
        padding: 14px;
      }
      .example-box {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .example-scenario {
        font-size: 0.86rem;
        color: #1e293b;
      }
      .example-io-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 12px;
      }
      .example-inputs, .example-steps {
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 6px;
        padding: 10px 12px;
      }
      .io-subheading {
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--pmo-muted, #666);
        margin-bottom: 6px;
      }
      .example-kv-list {
        margin: 0;
        padding: 0;
        list-style: none;
        font-size: 0.8rem;
      }
      .example-kv-list li {
        display: flex;
        justify-content: space-between;
        padding: 3px 0;
        border-bottom: 1px dashed #f0f0f0;
      }
      .kv-key {
        font-family: monospace;
        color: #475569;
      }
      .kv-val {
        font-weight: 600;
        color: #0f172a;
      }

      .example-trace-list {
        margin: 0;
        padding-left: 18px;
        font-size: 0.8rem;
        line-height: 1.45;
        color: #334155;
      }
      .example-trace-list li {
        margin-bottom: 4px;
      }

      .example-result-bar {
        background: #e8f5e9;
        border: 1px solid #c8e6c9;
        border-radius: 6px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .result-title {
        font-size: 0.82rem;
        font-weight: 700;
        color: #1b5e20;
      }
      .result-val {
        font-size: 0.88rem;
        font-weight: 700;
        color: #1b5e20;
      }
      .example-impact {
        font-size: 0.82rem;
        color: #334155;
      }

      @media (max-width: 768px) {
        .algo-header-right {
          display: none;
        }
        .algo-card-body {
          padding: 14px;
        }
      }
    `,
  ],
})
export class DocsAlgorithmsPageComponent {
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('All');
  readonly expandedCardIds = signal<Set<string>>(new Set(['algo-1', 'algo-2', 'algo-3']));

  readonly categories = [
    'All',
    'Supervised',
    'Calibration',
    'Explainability',
    'Clustering',
    'Confidence',
    'Generative AI',
    'Rule Governance',
    'Resource Optimization',
  ];

  readonly algorithms: AlgoItem[] = [
    {
      id: 'algo-1',
      name: 'Strategic Priority Tier Classification',
      category: 'Supervised',
      algorithmShort: 'LightGBM GBDT Classifier',
      algorithmUsed: `lightgbm.LGBMClassifier(
  objective='multiclass',
  num_class=4,
  boosting_type='gbdt',
  n_estimators=100,
  learning_rate=0.05,
  max_depth=5,
  num_leaves=31,
  random_state=42
) + StratifiedKFold (cv=3) + Sample Weighting (completeness * quality)`,
      description:
        'A gradient boosted decision tree ensemble trained on historical PMO review committee decisions (gold.pmo_decision_labels). Classifies each enterprise project into one of 4 strategic tiers: Must-do-now, Proceed, Can wait, or Candidate to deprioritize. Employs sample-weighting so that projects with higher data completeness and passed audit quality checks exert greater influence during gradient descent.',
      features: [
        {
          name: 'Business Value Score',
          column: 'business_value',
          table: 'gold.project_features',
          dataType: 'Float (1.0 to 5.0)',
          importance: 'High (Gain: 34.2%)',
          description: 'Sponsor-assessed strategic business impact score.',
        },
        {
          name: 'Timing Urgency',
          column: 'timing_urgency',
          table: 'gold.project_features',
          dataType: 'Float (0.0 to 1.0)',
          importance: 'High (Gain: 22.8%)',
          description: 'Nonlinear horizon mapping: min(1, max(0, (horizonMonths - months) / horizonMonths)).',
        },
        {
          name: 'Regulatory & Security Flag',
          column: 'regulatory_security',
          table: 'gold.project_features',
          dataType: 'Float (0.0 or 1.0)',
          importance: 'High (Gain: 16.4%)',
          description: 'Binary indicator for statutory, audit, compliance, or cyber defense mandates.',
        },
        {
          name: 'Executive Sponsor Level',
          column: 'sponsor_priority',
          table: 'gold.project_features',
          dataType: 'Float (1.0 to 4.0)',
          importance: 'Medium (Gain: 9.1%)',
          description: 'Ordinal rank: Executive (4), Director (3), Manager (2), Individual (1).',
        },
        {
          name: 'Log10 Cost Estimate',
          column: 'cost_log10',
          table: 'gold.project_features',
          dataType: 'Float',
          importance: 'Medium (Gain: 7.3%)',
          description: 'log10(cost_usd) to stabilize variance across multimillion-dollar capital spreads.',
        },
        {
          name: 'Skill Demand FTE',
          column: 'skill_demand',
          table: 'gold.project_features',
          dataType: 'Float',
          importance: 'Low (Gain: 4.2%)',
          description: 'Full-Time Equivalents required for primary skill family.',
        },
        {
          name: 'Project Dependencies',
          column: 'dependencies',
          table: 'gold.project_features',
          dataType: 'Float',
          importance: 'Low (Gain: 3.5%)',
          description: 'Total incoming and outgoing technical and architectural prerequisites.',
        },
        {
          name: 'Risk Rating',
          column: 'risk',
          table: 'gold.project_features',
          dataType: 'Float (1.0 to 4.0)',
          importance: 'Low (Gain: 2.5%)',
          description: 'Mapped ordinal: Low (1), Medium (2), High (3), Critical (4).',
        },
      ],
      outputs: [
        {
          tableName: 'gold.project_predictions',
          columns: ['ml_tier', 'prob_must_do_now', 'prob_proceed', 'prob_can_wait', 'prob_deprioritize', 'priority_score'],
          description: 'Raw class probabilities, machine learning predicted tier, and continuous priority score (0-100).',
          consumers: ['Power BI Direct Lake', 'FastAPI Portfolio Service', 'Prioritization Board UI'],
        },
        {
          tableName: 'gold.model_metrics',
          columns: ['model_name', 'metric_name', 'metric_value', 'run_id', 'recorded_utc'],
          description: 'Cross-validation accuracy (91.4%), macro F1 (89.2%), log loss (0.284), and training row counts.',
          consumers: ['MLflow Experiments', 'Data & ML Operations Dashboard'],
        },
      ],
      example: {
        scenario: 'Classifying GIS-0001 (Edge Network Segmentation Refresh for Singapore Fab Expansion).',
        inputs: {
          business_value: 3.0,
          timing_urgency: 0.52,
          regulatory_security: 1.0,
          sponsor_priority: 3.0,
          cost_usd: 2635974,
          dependencies: 1,
          risk: 'High (3.0)',
        },
        executionSteps: [
          'Feature normalization: cost_log10 = log10(2635974) = 6.42; timing_urgency = (60 - 29) / 60 = 0.517.',
          'LightGBM tree ensemble routes vector across 100 decision trees.',
          'Raw softmax probabilities: Must-do-now: 0.75, Proceed: 0.15, Can wait: 0.10, Deprioritize: 0.00.',
          'Continuous priority score calculation: 100 * (0.75*1.0 + 0.15*0.7 + 0.10*0.4 + 0.0*0.1) = 89.5.',
        ],
        result: 'ml_tier: "Must-do-now" with raw confidence 75% and priority score 89.5 / 100.',
        businessImpact: 'Elevates critical semiconductor network isolation ahead of capital equipment installation.',
      },
    },
    {
      id: 'algo-2',
      name: 'Probability Calibration (Platt Scaling)',
      category: 'Calibration',
      algorithmShort: 'CalibratedClassifierCV (Sigmoid)',
      algorithmUsed: `sklearn.calibration.CalibratedClassifierCV(
  estimator=final_gbm,
  method='sigmoid',
  cv=3
)`,
      description:
        'Raw GBDT margins can be overconfident or under-dispersed. Platt scaling fits a logistic sigmoid mapping over cross-validated model margins. This converts tree decision scores into true posterior class probabilities P(Tier = k | X), ensuring that a 70% probability corresponds to a 70% empirical historical committee approval rate.',
      features: [
        {
          name: 'Cross-Validation Tree Margins',
          column: 'margin_scores',
          table: 'gold.project_features (Holdout Folds)',
          dataType: 'Array[Float, 4]',
          importance: 'Primary',
          description: 'Out-of-fold logit outputs across 3-fold cross validation.',
        },
        {
          name: 'Ground Truth Labels',
          column: 'decision_tier',
          table: 'gold.pmo_decision_labels',
          dataType: 'Integer (0 to 3)',
          importance: 'Target',
          description: 'Verified historical PMO review decisions.',
        },
      ],
      outputs: [
        {
          tableName: 'gold.project_predictions',
          columns: ['model_certainty', 'prob_must_do_now', 'prob_proceed', 'prob_can_wait', 'prob_deprioritize'],
          description: 'Platt-calibrated probability distributions where sum(P) == 1.0, and model_certainty = max(P).',
          consumers: ['Confidence Score Engine', 'Project Detail Inspector', 'Executive Analytics'],
        },
      ],
      example: {
        scenario: 'Calibrating raw overconfident margin for GIS-0042.',
        inputs: {
          raw_tree_margin_score: 0.94,
          empirical_bin_accuracy: 0.73,
          calibration_method: 'sigmoid (Platt)',
        },
        executionSteps: [
          'Raw decision tree margin yields uncalibrated probability of 0.94.',
          'Sigmoid calibration function: P_calibrated = 1 / (1 + exp(A * margin + B)) with parameters A=-1.84, B=0.22.',
          'Calibrated posterior probability evaluates to 0.73.',
        ],
        result: 'model_certainty: 0.73 (73.0% calibrated probability).',
        businessImpact: 'Prevents false confidence from misleading executives during budget allocation reviews.',
      },
    },
    {
      id: 'algo-3',
      name: 'Explainable AI & Feature Attribution (TreeSHAP)',
      category: 'Explainability',
      algorithmShort: 'TreeSHAP (pred_contrib)',
      algorithmUsed: `lightgbm.Booster.predict(
  data=X.values,
  pred_contrib=True
).reshape(len(X), num_classes, num_features + 1)`,
      description:
        'TreeSHAP provides mathematically rigorous local feature attributions rooted in cooperative game theory. Decomposes each project\'s predicted tier probability into additive feature contributions, answering exactly WHY a project was ranked high or low and identifying the top positive and negative drivers.',
      features: [
        {
          name: 'All 10 Canonical Feature Vectors',
          column: 'FEATURE_NAMES (10 columns)',
          table: 'gold.project_features',
          dataType: 'Float Matrix',
          importance: 'All Evaluated',
          description: 'Full feature input vector evaluated across internal tree node splits.',
        },
      ],
      outputs: [
        {
          tableName: 'gold.project_shap_drivers',
          columns: ['project_id', 'predicted_tier', 'rank', 'signal_key', 'signal_label', 'shap_value', 'feature_value', 'direction'],
          description: 'Granular local feature attributions per project sorted by absolute SHAP value.',
          consumers: ['SHAP Waterfall Inspector Component', 'Executive Summary Cards'],
        },
        {
          tableName: 'gold.project_predictions',
          columns: ['top_drivers'],
          description: 'Concatenated string of top 3 impact drivers with directional deltas.',
          consumers: ['Prioritization Grid Table', 'Power BI Tooltips'],
        },
      ],
      example: {
        scenario: 'Explaining why GIS-0001 received a Must-do-now prediction.',
        inputs: {
          project_id: 'GIS-0001',
          predicted_tier: 'Must-do-now',
          expected_base_value: 0.25,
        },
        executionSteps: [
          'Baseline expected value for Must-do-now across all projects = 0.25.',
          'Driver 1: regulatory_security == True (+0.32 SHAP contribution).',
          'Driver 2: timing_urgency == 0.52 (+0.18 SHAP contribution).',
          'Driver 3: business_value == 3 (+0.08 SHAP contribution).',
          'Driver 4: cost_usd == $2.63M (-0.08 SHAP contribution).',
          'Sum of contributions: 0.25 + 0.32 + 0.18 + 0.08 - 0.08 = 0.75 (exact final probability).',
        ],
        result: 'Top Drivers: Regulatory/Security (+0.32), Timing Urgency (+0.18), High Cost (-0.08).',
        businessImpact: 'Sponsors immediately understand which levers will improve their project standing.',
      },
    },
    {
      id: 'algo-4',
      name: 'Unsupervised Strategic Portfolio Clustering',
      category: 'Clustering',
      algorithmShort: 'K-Means (k=4) + StandardScaler',
      algorithmUsed: `sklearn.preprocessing.StandardScaler()
sklearn.cluster.KMeans(
  n_clusters=4,
  random_state=42,
  n_init=10
) + Dynamic Centroid Semantic Naming`,
      description:
        'Partitions the 100 enterprise projects in multidimensional feature space into 4 strategic archetypes without human supervision. Dynamically names each cluster based on the top 2 absolute centroid weights (e.g. "Platform", "Analytics & AI", "Security & Identity", "Core Enterprise IT").',
      features: [
        {
          name: 'Standardized Feature Vector',
          column: 'timing, value, cost, skill, deps, reg',
          table: 'gold.project_features',
          dataType: 'Standardized Floats',
          importance: 'Centroid Weights',
          description: 'Zero-mean unit-variance normalized feature columns.',
        },
      ],
      outputs: [
        {
          tableName: 'gold.project_clusters',
          columns: ['project_id', 'cluster_id', 'cluster_name'],
          description: 'Cluster assignment and human-readable strategic archetype name.',
          consumers: ['Overview Cluster Donut', 'Prioritization Group-By Filter'],
        },
      ],
      example: {
        scenario: 'Assigning GIS-0086 (Enterprise OneLake Migration) to a strategic cluster.',
        inputs: {
          business_value: 5,
          dt_alignment: true,
          dependencies: 4,
          primary_skill: 'Data Engineering',
        },
        executionSteps: [
          'StandardScaler centers and scales feature vector.',
          'Computes Euclidean distances to 4 trained centroid vectors in 10-dimensional space.',
          'Closest centroid distance = 1.42 (Cluster ID 2).',
          'Centroid 2 top absolute weights: dt_alignment (+1.82) and business_value (+1.64).',
          'Dynamic naming engine maps Centroid 2 to "Analytics & AI".',
        ],
        result: 'cluster_id: 2, cluster_name: "Analytics & AI".',
        businessImpact: 'Enables thematic investment slicing across digital transformation pillars.',
      },
    },
    {
      id: 'algo-5',
      name: 'Platt-Calibrated Composite Confidence Formulation',
      category: 'Confidence',
      algorithmShort: 'Weighted Tri-Factor Formulation',
      algorithmUsed: `ConfidenceScore = 100 * (
  0.35 * Completeness +
  0.35 * Quality +
  0.30 * ModelCertainty
)`,
      description:
        'Formulates a holistic reliability score (0-100%) that measures whether an AI recommendation should be trusted automatically or reviewed carefully by humans. Blends input signal completeness, automated data quality compliance, and calibrated statistical certainty.',
      features: [
        {
          name: 'Signal Completeness',
          column: 'signals_present / 10',
          table: 'silver.project_canonical',
          dataType: 'Float (0.0 to 1.0)',
          importance: 'Weight: 35%',
          description: 'Proportion of 10 canonical PMO signals populated across the 11 integrated systems.',
        },
        {
          name: 'Data Quality Compliance',
          column: 'passed / evaluated',
          table: 'gold.dq_checks',
          dataType: 'Float (0.0 to 1.0)',
          importance: 'Weight: 35%',
          description: 'Ratio of 14 deterministic data quality audit checks passed for this project.',
        },
        {
          name: 'Calibrated Model Certainty',
          column: 'model_certainty',
          table: 'gold.project_predictions',
          dataType: 'Float (0.0 to 1.0)',
          importance: 'Weight: 30%',
          description: 'Platt-calibrated maximum class posterior probability from LightGBM.',
        },
      ],
      outputs: [
        {
          tableName: 'gold.project_predictions',
          columns: ['confidence_score', 'confidence_level', 'completeness', 'quality', 'model_certainty'],
          description: 'Composite score (0-100) and discrete tier: High (>=75), Medium (50-74.9), Low (<50).',
          consumers: ['Confidence Ring Gauge Component', 'Prioritization Filter Slicers'],
        },
      ],
      example: {
        scenario: 'Evaluating confidence for GIS-0001.',
        inputs: {
          signals_present: 6,
          total_signals: 10,
          dq_checks_passed: 11,
          dq_checks_evaluated: 13,
          model_certainty: 0.73,
        },
        executionSteps: [
          'Completeness = 6 / 10 = 0.60 (Contribution: 0.35 * 0.60 = 0.2100).',
          'Quality = 11 / 13 = 0.846 (Contribution: 0.35 * 0.846 = 0.2961).',
          'Certainty = 0.730 (Contribution: 0.30 * 0.730 = 0.2190).',
          'Total = 100 * (0.2100 + 0.2961 + 0.2190) = 72.51% -> Rounded: 72.5%.',
          'Threshold evaluation: 72.5% is >= 50% and < 75% -> "Medium".',
        ],
        result: 'confidence_score: 72.5%, confidence_level: "Medium".',
        businessImpact: 'Flags project for human PMO review before authorizing multimillion capital release.',
      },
    },
    {
      id: 'algo-6',
      name: 'Generative AI Signal Extraction & Natural Language Parsing',
      category: 'Generative AI',
      algorithmShort: 'Foundry agent pmo-intake-agent (gpt-5.6-sol, Bing grounding)',
      algorithmUsed: `Microsoft Foundry agent pmo-intake-agent (version 2)
Model: gpt-5.6-sol
Tool: Bing grounding (connection pmo-bing-grounding)
Output: JSON contract (fields and sourceUrls), validated by the API
System guidance: config/ai-prefill.json (prompt.system)`,
      description:
        'Large Language Model extraction engine that accepts unstructured project proposals, business case narratives, and uploaded documents (PDF, DOCX, XLSX). Searches the public web through Bing grounding, validates the reply against the field contract, and returns an evidence level, quote, rationale, and source URL for each of the 23 canonical fields.',
      features: [
        {
          name: 'Project Description Text',
          column: 'description (40-4000 chars)',
          table: 'User Web Input',
          dataType: 'String',
          importance: 'Core Context',
          description: 'Free-text project narrative submitted in Quick Add wizard.',
        },
        {
          name: 'Supporting Document Excerpts',
          column: 'document_text (up to 5 files)',
          table: 'Uploaded Documents',
          dataType: 'Text Excerpts',
          importance: 'Corroborating Evidence',
          description: 'Parsed text from uploaded PDF, Word, Excel, or CSV files.',
        },
      ],
      outputs: [
        {
          tableName: 'Files/raw/ui_entries/projects/<id>.json',
          columns: ['extractedFields', 'evidenceLevel', 'evidenceQuote', 'confidenceScore'],
          description: 'Strict schema JSON file committed to OneLake containing all 23 extracted fields.',
          consumers: ['Quick Add Step 2 Review UI', 'Notebook 01 Lakehouse Ingestion'],
        },
      ],
      example: {
        scenario: 'Extracting signals from plain-English IoT fab proposal.',
        inputs: {
          raw_text:
            'Deploy 500 edge IoT sensor nodes in Fremont fab by Q4 2027 to monitor thermal dissipation. Total budget is $1.85M with sponsor VP Sarah Jenkins. Highly aligned with digital transformation modernization.',
        },
        executionSteps: [
          'LLM validates text against config/shared/data-entry.json schema.',
          'Extracts site: "Fremont" (Evidence: explicit quote "Fremont fab", Conf: 0.90).',
          'Extracts costEstimateUsd: 1850000 (Evidence: explicit quote "$1.85M", Conf: 0.90).',
          'Extracts goLiveDate: "2027-12-31" (Evidence: inferred quote "Q4 2027", Conf: 0.60).',
          'Extracts dtAlignment: true (Evidence: explicit quote "digital transformation modernization", Conf: 0.90).',
        ],
        result: '23 fields extracted; 18 explicit (0.90), 3 inferred (0.60), 2 estimated (0.30).',
        businessImpact: 'Reduces PMO project intake submission time from 45 minutes to under 30 seconds.',
      },
    },
    {
      id: 'algo-7',
      name: 'Deterministic Rule-Based Governance Engine (R1–R5)',
      category: 'Rule Governance',
      algorithmShort: 'Sequential Ordered Policy Engine',
      algorithmUsed: `Deterministic Sequential Rule Evaluator
Order: [R1, R2, R3, R4, R5]
Precedence: Hard Policy Overrides > ML Probability
Priority Floors: R1=80.0, R2=60.0, R3=75.0`,
      description:
        'A deterministic post-inference policy engine enforcing institutional guardrails and regulatory mandates. Operates in strict sequence over raw ML predictions to guarantee that statutory compliance, executive promises, and protected critical paths cannot be deprioritized by statistical optimization alone.',
      features: [
        {
          name: 'Regulatory / Security Flag',
          column: 'regulatory_security',
          table: 'silver.project_canonical',
          dataType: 'Boolean',
          importance: 'Rule R1 Trigger',
          description: 'Triggers elevation to Must-do-now and enforces priority score >= 80.0.',
        },
        {
          name: 'Executive Sponsor & High Value',
          column: 'sponsor_level & business_value',
          table: 'silver.project_canonical',
          dataType: 'String & Integer',
          importance: 'Rule R2 Trigger',
          description: 'Executive sponsor + Value >= 4 shields project from deprioritization.',
        },
        {
          name: 'Protected Program Mandate',
          column: 'protected_program',
          table: 'silver.project_canonical',
          dataType: 'Boolean',
          importance: 'Rule R3 Trigger',
          description: 'Locks strategic roadmap slot regardless of resource deficit.',
        },
        {
          name: 'Active Status & Near Go-Live',
          column: 'project_status & months_to_go_live',
          table: 'silver.project_canonical',
          dataType: 'String & Float',
          importance: 'Rule R4 Trigger',
          description: 'Active projects with <= 6 months remaining require VP sign-off to pause.',
        },
        {
          name: 'Cross-Portfolio Dependencies',
          column: 'cross_portfolio_successors',
          table: 'gold.project_dependencies',
          dataType: 'Integer (>= 3)',
          importance: 'Rule R5 Trigger',
          description: 'Predecessors blocking >= 3 dependent projects are re-sequenced as critical path.',
        },
      ],
      outputs: [
        {
          tableName: 'gold.rule_triggers',
          columns: ['project_id', 'rule_id', 'triggered'],
          description: 'Audit trail recording every rule trigger and condition match.',
          consumers: ['Audit & Compliance Reports', 'Project Detail Inspector'],
        },
        {
          tableName: 'gold.project_predictions',
          columns: ['final_tier', 'rule_overrides', 'priority_score'],
          description: 'Governed tier overriding ml_tier, with floor adjustments applied.',
          consumers: ['Executive Prioritization Board', 'Power BI Direct Lake'],
        },
      ],
      example: {
        scenario: 'Overriding statistical prediction for GIS-0012 (Semiconductor Cleanroom ISO Audit).',
        inputs: {
          ml_tier: 'Can wait',
          raw_priority_score: 48.2,
          cost_usd: 4800000,
          regulatory_security: true,
        },
        executionSteps: [
          'ML model predicted "Can wait" due to high capital cost and low immediate revenue benefit.',
          'Rule R1 evaluates: when.regulatorySecurity == 1 -> Condition matches.',
          'Rule R1 action: then.setTier = "Must-do-now"; then.priorityFloor = 80.0.',
          'Final tier promoted to "Must-do-now"; priority score elevated from 48.2 to 80.0.',
          'Audit override tag "R1" appended to rule_overrides.',
        ],
        result: 'final_tier: "Must-do-now", priority_score: 80.0, rule_overrides: "R1".',
        businessImpact: 'Prevents $15M semiconductor cleanroom shutdown fine by enforcing audit compliance.',
      },
    },
    {
      id: 'algo-8',
      name: 'Workforce Capacity Supply vs Demand Matching',
      category: 'Resource Optimization',
      algorithmShort: 'Aggregated Skill FTE Gap Analysis',
      algorithmUsed: `Demand_FTE = sum(skill_demand_fte for projects in [Must-do-now, Proceed])
Supply_FTE = count(unique employees in skillfamily) * 0.85 (Utilization)
Gap_FTE = Supply_FTE - Demand_FTE`,
      description:
        'Performs cross-portfolio workforce capacity modeling across 8 core skill families (Application Development, Cloud, Data, Cyber, Network, UC, iPaaS, PM). Compares effective supply from HR Roster against aggregated project demand to identify hiring bottlenecks and suggest action levers.',
      features: [
        {
          name: 'Employee Skill Family Headcount',
          column: 'skillfamily, employeenumber',
          table: 'src_hr_roster.employees',
          dataType: 'String & ID',
          importance: 'Supply Baseline',
          description: 'Active enterprise roster mapped to standard skill taxonomy.',
        },
        {
          name: 'Project Skill Demand FTE',
          column: 'skill_demand_fte',
          table: 'silver.project_canonical',
          dataType: 'Float',
          importance: 'Demand Baseline',
          description: 'Staffing required by prioritized Must-do-now and Proceed projects.',
        },
      ],
      outputs: [
        {
          tableName: 'gold.capacity_by_skill',
          columns: ['skill_code', 'skill', 'supply_fte', 'demand_fte', 'gap_fte', 'projects_in_demand'],
          description: 'FTE balances and deficit flags per skill domain.',
          consumers: ['Overview Capacity Chart', 'Action Lever Recommendation Engine'],
        },
      ],
      example: {
        scenario: 'Capacity modeling for Application Development (APP).',
        inputs: {
          roster_headcount: 56,
          supply_utilization_rate: 0.85,
          approved_projects_in_demand: 26,
          cumulative_project_fte_demand: 56.4,
        },
        executionSteps: [
          'Effective Supply = 56 employees * 0.85 = 48.0 FTE.',
          'Cumulative Demand across Must-do-now and Proceed projects = 56.4 FTE.',
          'Gap Calculation = 48.0 - 56.4 = -8.4 FTE (Deficit).',
          'Action lever engine triggers: Deficit > 5 FTE -> Recommended Action: "Add capacity".',
        ],
        result: 'supply: 48.0 FTE, demand: 56.4 FTE, gap: -8.4 FTE (Deficit: "Add capacity").',
        businessImpact: 'Alerts VP of Engineering to secure contractor augmentations before project kickoff.',
      },
    },
  ];

  filteredAlgorithms = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();

    return this.algorithms.filter((algo) => {
      const matchesCat = cat === 'All' || algo.category === cat;
      if (!matchesCat) return false;

      if (!q) return true;

      return (
        algo.name.toLowerCase().includes(q) ||
        algo.algorithmShort.toLowerCase().includes(q) ||
        algo.description.toLowerCase().includes(q) ||
        algo.features.some((f) => f.name.toLowerCase().includes(q) || f.column.toLowerCase().includes(q)) ||
        algo.outputs.some((o) => o.tableName.toLowerCase().includes(q))
      );
    });
  });

  isExpanded(id: string): boolean {
    return this.expandedCardIds().has(id);
  }

  toggleAccordion(id: string): void {
    this.expandedCardIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  expandAll(): void {
    const allIds = this.algorithms.map((a) => a.id);
    this.expandedCardIds.set(new Set(allIds));
  }

  collapseAll(): void {
    this.expandedCardIds.set(new Set());
  }

  getEntries(obj: Record<string, any>): [string, any][] {
    return Object.entries(obj);
  }
}
