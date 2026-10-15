import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

interface FieldSpec {
  key: string;
  label: string;
  dataType: string;
  required: boolean;
  prefilledByAi: boolean;
  aiExtractionLogic: string;
  humanInputAllowed: boolean;
  humanInputMethod: string;
  defaultConfidence: string;
  constraints: string;
  allowedValues?: string[];
}

@Component({
  selector: 'app-docs-ai-prefill-confidence-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
          <span class="crumb-current">AI Prefill Fields & Confidence Calculation</span>
        </div>
        <h1 class="page-title">AI Prefill Fields & Confidence Calculation Methodology</h1>
        <p class="page-subtitle">
          Comprehensive reference of all 23 canonical PMO project intake fields: distinguishing AI-extracted fields from human input, detailing evidence-level mappings, and explaining the mathematics behind the composite confidence score.
        </p>
      </div>

      <!-- Quick Nav Jump Bar -->
      <div class="nav-jump-chips">
        <span class="jump-label">Jump to Section:</span>
        <a href="#confidence-math" class="jump-chip">Confidence Calculation Formula</a>
        <a href="#interactive-calculator" class="jump-chip">Live Confidence Simulator</a>
        <a href="#evidence-levels" class="jump-chip">Evidence Level Mappings</a>
        <a href="#project-fields-table" class="jump-chip">23 Project Fields Specification</a>
      </div>

      <!-- SECTION 1: HOW CONFIDENCE IS CALCULATED -->
      <ion-card class="docs-card" id="confidence-math">
        <ion-card-header>
          <div class="header-flex">
            <div>
              <ion-card-title>How Confidence Percentage is Calculated</ion-card-title>
              <ion-card-subtitle>Dual-tier formulation: Field-level AI extraction certainty and project-level composite confidence</ion-card-subtitle>
            </div>
            <div class="badge-group">
              <span class="conf-tag high">&ge; 75% High</span>
              <span class="conf-tag medium">50% - 74% Med</span>
              <span class="conf-tag low">&lt; 50% Low</span>
            </div>
          </div>
        </ion-card-header>

        <ion-card-content>
          <!-- Dual Level Architecture -->
          <div class="dual-tier-grid">
            <!-- Tier 1: Field Level -->
            <div class="tier-card">
              <div class="tier-badge">Tier 1: Field-Level Extraction</div>
              <h3 class="tier-title">AI Extraction Evidence Scoring</h3>
              <p class="tier-desc">
                When a user submits a project proposal via Quick Add, Azure OpenAI (GPT-5.4-mini in Microsoft Foundry) evaluates textual grounding to assign an evidence level to each of the 23 extracted fields.
              </p>
              <div class="evidence-pill-list">
                <div class="evidence-pill-item">
                  <div class="pill-head">
                    <span class="pill-name explicit">Explicit (90%)</span>
                    <span class="pill-score">Score: 0.90</span>
                  </div>
                  <div class="pill-desc">The text explicitly states the exact value (e.g., "$1.85M budget"). Direct quote preserved in audit provenance.</div>
                </div>
                <div class="evidence-pill-item">
                  <div class="pill-head">
                    <span class="pill-name inferred">Inferred (60%)</span>
                    <span class="pill-score">Score: 0.60</span>
                  </div>
                  <div class="pill-desc">The value follows clearly from surrounding context (e.g. "by Q4 2027" -> goLiveDate: 2027-12-31).</div>
                </div>
                <div class="evidence-pill-item">
                  <div class="pill-head">
                    <span class="pill-name estimated">Estimated (30%)</span>
                    <span class="pill-score">Score: 0.30</span>
                  </div>
                  <div class="pill-desc">Reasonable guess judged from business unit scope or team size heuristics (e.g. skillDemandFte: 4.5).</div>
                </div>
                <div class="evidence-pill-item">
                  <div class="pill-head">
                    <span class="pill-name not-provided">Not Provided (0%)</span>
                    <span class="pill-score">Score: 0.00</span>
                  </div>
                  <div class="pill-desc">No information or basis in source text; field defaults to null and triggers human review alert.</div>
                </div>
                <div class="evidence-pill-item">
                  <div class="pill-head">
                    <span class="pill-name human">Human Verified (100%)</span>
                    <span class="pill-score">Score: 1.00</span>
                  </div>
                  <div class="pill-desc">Explicitly entered or modified by a human project manager in the Step 2 review screen.</div>
                </div>
              </div>
            </div>

            <!-- Tier 2: Project Level Composite -->
            <div class="tier-card">
              <div class="tier-badge">Tier 2: Project-Level Composite</div>
              <h3 class="tier-title">Platt-Calibrated Composite Confidence Formula</h3>
              <p class="tier-desc">
                In the Fabric OneLake analytics pipeline (Notebook 02), every project receives a global composite confidence score (0 to 100%) combining three weighted pillars:
              </p>

              <!-- Formula Box -->
              <div class="formula-box">
                <div class="formula-latex">
                  <strong>Confidence Score (%)</strong> = 100 &times; [ (0.35 &times; <em>Completeness</em>) + (0.35 &times; <em>Data Quality</em>) + (0.30 &times; <em>Model Certainty</em>) ]
                </div>
              </div>

              <div class="factors-list">
                <div class="factor-item">
                  <div class="factor-icon comp">35%</div>
                  <div class="factor-content">
                    <div class="factor-title">Signal Completeness (Weight: 35%)</div>
                    <div class="factor-formula"><code>Completeness = Signals Present / 10 Canonical Features</code></div>
                    <div class="factor-text">Proportion of the 10 foundational PMO signals populated across the 11 integrated source systems. Projects with missing signals are penalized.</div>
                  </div>
                </div>

                <div class="factor-item">
                  <div class="factor-icon qual">35%</div>
                  <div class="factor-content">
                    <div class="factor-title">Data Quality Compliance (Weight: 35%)</div>
                    <div class="factor-formula"><code>Quality = Checks Passed / Checks Evaluated</code></div>
                    <div class="factor-text">Pass rate across 14 deterministic Lakehouse DQ checks (valid date formats, positive budgets, allowed taxonomy keys, referential integrity).</div>
                  </div>
                </div>

                <div class="factor-item">
                  <div class="factor-icon cert">30%</div>
                  <div class="factor-content">
                    <div class="factor-title">Platt-Calibrated Model Certainty (Weight: 30%)</div>
                    <div class="factor-formula"><code>Certainty = max(P_calibrated(Tier_k | X))</code></div>
                    <div class="factor-text">Maximum posterior class probability output by the LightGBM classifier after Platt Sigmoid calibration via <code>CalibratedClassifierCV</code>.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- SECTION 2: INTERACTIVE CONFIDENCE CALCULATOR -->
      <ion-card class="docs-card calc-card" id="interactive-calculator">
        <ion-card-header>
          <div class="header-flex">
            <div>
              <ion-card-title>
                <ion-icon name="sparkles" color="primary"></ion-icon> Live Interactive Confidence Calculator
              </ion-card-title>
              <ion-card-subtitle>Adjust the sliders below to see real-time calculation and tier transitions</ion-card-subtitle>
            </div>
            <button class="reset-btn" (click)="resetCalculator()">Reset to Defaults</button>
          </div>
        </ion-card-header>

        <ion-card-content>
          <div class="calculator-grid">
            <!-- Sliders Column -->
            <div class="sliders-col">
              <!-- Slider 1: Completeness -->
              <div class="slider-group">
                <div class="slider-header">
                  <span class="slider-label">1. Canonical Signals Present</span>
                  <span class="slider-val">{{ calcSignalsPresent() }} of 10 signals ({{ (calcSignalsPresent() / 10 * 100).toFixed(0) }}%)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  class="calc-range"
                  [ngModel]="calcSignalsPresent()"
                  (ngModelChange)="calcSignalsPresent.set(+$event)"
                />
                <div class="slider-hint">Weight: 35% &bull; Contributes {{ ((calcSignalsPresent() / 10) * 0.35 * 100).toFixed(1) }} points</div>
              </div>

              <!-- Slider 2: Quality Checks -->
              <div class="slider-group">
                <div class="slider-header">
                  <span class="slider-label">2. Data Quality Checks Passed</span>
                  <span class="slider-val">{{ calcDqPassed() }} of 14 checks ({{ (calcDqPassed() / 14 * 100).toFixed(0) }}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="14"
                  step="1"
                  class="calc-range"
                  [ngModel]="calcDqPassed()"
                  (ngModelChange)="calcDqPassed.set(+$event)"
                />
                <div class="slider-hint">Weight: 35% &bull; Contributes {{ ((calcDqPassed() / 14) * 0.35 * 100).toFixed(1) }} points</div>
              </div>

              <!-- Slider 3: Model Certainty -->
              <div class="slider-group">
                <div class="slider-header">
                  <span class="slider-label">3. Platt Model Certainty (Max Class Probability)</span>
                  <span class="slider-val">{{ (calcModelCertainty() * 100).toFixed(0) }}%</span>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="0.99"
                  step="0.01"
                  class="calc-range"
                  [ngModel]="calcModelCertainty()"
                  (ngModelChange)="calcModelCertainty.set(+$event)"
                />
                <div class="slider-hint">Weight: 30% &bull; Contributes {{ (calcModelCertainty() * 0.30 * 100).toFixed(1) }} points</div>
              </div>
            </div>

            <!-- Score Display Column -->
            <div class="score-display-col">
              <div class="gauge-card" [attr.data-tier]="calcConfidenceLevel()">
                <div class="gauge-number">{{ calcConfidenceScore().toFixed(1) }}%</div>
                <div class="gauge-tier-badge" [attr.data-tier]="calcConfidenceLevel()">
                  {{ calcConfidenceLevel() }} Confidence
                </div>
                <div class="gauge-formula-sum">
                  {{ ((calcSignalsPresent() / 10) * 0.35 * 100).toFixed(1) }} +
                  {{ ((calcDqPassed() / 14) * 0.35 * 100).toFixed(1) }} +
                  {{ (calcModelCertainty() * 0.30 * 100).toFixed(1) }} =
                  <strong>{{ calcConfidenceScore().toFixed(1) }}%</strong>
                </div>

                <!-- Weighted Progress Stack Bar -->
                <div class="stacked-bar">
                  <div
                    class="bar-segment seg-comp"
                    [style.width.%]="(calcSignalsPresent() / 10) * 35"
                    title="Completeness portion"
                  ></div>
                  <div
                    class="bar-segment seg-qual"
                    [style.width.%]="(calcDqPassed() / 14) * 35"
                    title="Quality portion"
                  ></div>
                  <div
                    class="bar-segment seg-cert"
                    [style.width.%]="calcModelCertainty() * 30"
                    title="Model certainty portion"
                  ></div>
                </div>

                <div class="bar-legend">
                  <span class="leg-item"><span class="dot comp"></span> Completeness</span>
                  <span class="leg-item"><span class="dot qual"></span> Quality</span>
                  <span class="leg-item"><span class="dot cert"></span> Certainty</span>
                </div>

                <div class="governance-recommendation">
                  <strong>Recommended Governance Action:</strong>
                  @if (calcConfidenceLevel() === 'High') {
                    <span>Direct executive approval authorized. Reliable telemetry.</span>
                  } @else if (calcConfidenceLevel() === 'Medium') {
                    <span>Standard PMO committee review required before capital commitment.</span>
                  } @else {
                    <span>Data remediation mandatory. Do not release funding without manual verification.</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- SECTION 3: PROJECT FIELDS SPECIFICATION TABLE -->
      <ion-card class="docs-card" id="project-fields-table">
        <ion-card-header>
          <div class="header-flex">
            <div>
              <ion-card-title>All 23 Project Intake Fields: AI-Prefill vs Human Input</ion-card-title>
              <ion-card-subtitle>
                Every field extracted by AI can be reviewed, edited, or inputted by human PMs.
              </ion-card-subtitle>
            </div>
            <div class="field-counts">
              <span class="count-pill ai">AI Prefills: 23/23</span>
              <span class="count-pill human">Human Editable: 23/23</span>
            </div>
          </div>
        </ion-card-header>

        <ion-card-content>
          <!-- Filter Controls -->
          <div class="table-filter-bar">
            <div class="search-wrap">
              <ion-icon name="funnel-outline" class="search-icon"></ion-icon>
              <input
                type="text"
                class="custom-search-input"
                placeholder="Filter fields by name, key, or data type..."
                [ngModel]="fieldSearchQuery()"
                (ngModelChange)="fieldSearchQuery.set($event)"
              />
              @if (fieldSearchQuery()) {
                <button class="clear-search-btn" (click)="fieldSearchQuery.set('')">&times;</button>
              }
            </div>

            <div class="quick-filter-radios">
              <button
                type="button"
                class="filter-pill"
                [class.active]="fieldFilterMode() === 'all'"
                (click)="fieldFilterMode.set('all')"
              >
                All 23 Fields
              </button>
              <button
                type="button"
                class="filter-pill"
                [class.active]="fieldFilterMode() === 'required'"
                (click)="fieldFilterMode.set('required')"
              >
                Required Only (16)
              </button>
              <button
                type="button"
                class="filter-pill"
                [class.active]="fieldFilterMode() === 'optional'"
                (click)="fieldFilterMode.set('optional')"
              >
                Optional Only (7)
              </button>
            </div>
          </div>

          <!-- Fields Table -->
          <div class="table-responsive">
            <table class="fields-table">
              <thead>
                <tr>
                  <th style="width: 18%;">Field Name & Key</th>
                  <th style="width: 14%;">Data Type & Rules</th>
                  <th style="width: 26%;">Prefilled by AI? (Extraction Method)</th>
                  <th style="width: 24%;">Inputted / Overridden by Human?</th>
                  <th style="width: 18%;">Confidence Mapping</th>
                </tr>
              </thead>
              <tbody>
                @for (f of filteredFields(); track f.key) {
                  <tr>
                    <!-- Field Name & Key -->
                    <td>
                      <div class="field-title-wrap">
                        <strong class="field-label">{{ f.label }}</strong>
                        <code class="field-key">{{ f.key }}</code>
                        @if (f.required) {
                          <span class="req-badge">Required</span>
                        } @else {
                          <span class="opt-badge">Optional</span>
                        }
                      </div>
                    </td>

                    <!-- Data Type & Rules -->
                    <td>
                      <div class="type-wrap">
                        <span class="data-type-pill">{{ f.dataType }}</span>
                        <span class="constraints-text">{{ f.constraints }}</span>
                      </div>
                    </td>

                    <!-- Prefilled by AI -->
                    <td>
                      <div class="ai-prefill-info">
                        <div class="yes-badge"><ion-icon name="checkmark-circle"></ion-icon> Yes (Azure OpenAI)</div>
                        <p class="ai-logic-text">{{ f.aiExtractionLogic }}</p>
                      </div>
                    </td>

                    <!-- Human Input -->
                    <td>
                      <div class="human-input-info">
                        <div class="human-badge"><ion-icon name="create-outline"></ion-icon> Yes (PM / Sponsor)</div>
                        <p class="human-method-text">{{ f.humanInputMethod }}</p>
                      </div>
                    </td>

                    <!-- Confidence Mapping -->
                    <td>
                      <div class="conf-mapping-wrap">
                        <span class="conf-tag-mini">{{ f.defaultConfidence }}</span>
                        <span class="conf-rule-hint">Human edit upgrades to 100% Human Verified</span>
                      </div>
                    </td>
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
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
      }
      .header-flex {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 10px;
      }
      .badge-group {
        display: flex;
        gap: 6px;
      }
      .conf-tag {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 10px;
      }
      .conf-tag.high { background: #dcfce7; color: #166534; }
      .conf-tag.medium { background: #fef9c3; color: #854d0e; }
      .conf-tag.low { background: #fee2e2; color: #991b1b; }

      .dual-tier-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 20px;
        margin-top: 10px;
      }
      .tier-card {
        background: #fcfcfc;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 8px;
        padding: 16px;
      }
      .tier-badge {
        display: inline-block;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--pmo-primary, #0078d4);
        background: rgba(0, 120, 212, 0.08);
        padding: 2px 8px;
        border-radius: 4px;
        margin-bottom: 6px;
      }
      .tier-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: #1a1a1a;
        margin: 0 0 6px 0;
      }
      .tier-desc {
        font-size: 0.85rem;
        color: #555;
        line-height: 1.45;
        margin: 0 0 14px 0;
      }

      .evidence-pill-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .evidence-pill-item {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 8px 10px;
      }
      .pill-head {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
      }
      .pill-name {
        font-size: 0.82rem;
        font-weight: 700;
      }
      .pill-name.explicit { color: #15803d; }
      .pill-name.inferred { color: #b45309; }
      .pill-name.estimated { color: #c2410c; }
      .pill-name.not-provided { color: #64748b; }
      .pill-name.human { color: var(--pmo-primary, #0078d4); }
      .pill-score {
        font-size: 0.75rem;
        font-weight: 600;
        color: #475569;
        font-family: monospace;
      }
      .pill-desc {
        font-size: 0.76rem;
        color: #64748b;
        line-height: 1.35;
      }

      .formula-box {
        background: #f0f7ff;
        border: 1px solid #cce3ff;
        border-radius: 6px;
        padding: 10px 12px;
        margin-bottom: 16px;
      }
      .formula-latex {
        font-size: 0.86rem;
        color: #004578;
        line-height: 1.4;
      }

      .factors-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .factor-item {
        display: flex;
        gap: 12px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 10px;
      }
      .factor-icon {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        font-weight: 800;
        flex-shrink: 0;
      }
      .factor-icon.comp { background: #e0f2fe; color: #0284c7; }
      .factor-icon.qual { background: #dcfce7; color: #16a34a; }
      .factor-icon.cert { background: #fef3c7; color: #d97706; }
      .factor-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .factor-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: #1a1a1a;
      }
      .factor-formula {
        font-size: 0.78rem;
        color: #475569;
        margin: 2px 0;
      }
      .factor-formula code {
        background: #f1f5f9;
        padding: 1px 4px;
        border-radius: 3px;
      }
      .factor-text {
        font-size: 0.76rem;
        color: #64748b;
        line-height: 1.35;
      }

      /* Calculator Styles */
      .calc-card {
        border-color: #cbd5e1;
        background: #ffffff;
      }
      .reset-btn {
        background: #f1f5f9;
        border: 1px solid #d1d5db;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.78rem;
        color: #475569;
        cursor: pointer;
        font-weight: 600;
      }
      .reset-btn:hover {
        background: #e2e8f0;
      }
      .calculator-grid {
        display: grid;
        grid-template-columns: 1.3fr 1fr;
        gap: 24px;
      }
      .sliders-col {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .slider-group {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px 14px;
      }
      .slider-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .slider-label {
        font-size: 0.84rem;
        font-weight: 700;
        color: #1e293b;
      }
      .slider-val {
        font-size: 0.84rem;
        font-weight: 700;
        color: var(--pmo-primary, #0078d4);
      }
      .calc-range {
        width: 100%;
        accent-color: var(--pmo-primary, #0078d4);
        cursor: pointer;
      }
      .slider-hint {
        font-size: 0.72rem;
        color: #64748b;
        margin-top: 4px;
      }

      .score-display-col {
        display: flex;
      }
      .gauge-card {
        flex: 1;
        background: #f8fafc;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s ease;
      }
      .gauge-card[data-tier="High"] {
        border-color: #86efac;
        background: #f0fdf4;
      }
      .gauge-card[data-tier="Medium"] {
        border-color: #fde047;
        background: #fefce8;
      }
      .gauge-card[data-tier="Low"] {
        border-color: #fca5a5;
        background: #fef2f2;
      }

      .gauge-number {
        font-size: 3rem;
        font-weight: 800;
        line-height: 1;
        color: #0f172a;
      }
      .gauge-tier-badge {
        font-size: 0.9rem;
        font-weight: 800;
        text-transform: uppercase;
        padding: 4px 14px;
        border-radius: 20px;
        letter-spacing: 0.5px;
      }
      .gauge-tier-badge[data-tier="High"] { background: #16a34a; color: #ffffff; }
      .gauge-tier-badge[data-tier="Medium"] { background: #ca8a04; color: #ffffff; }
      .gauge-tier-badge[data-tier="Low"] { background: #dc2626; color: #ffffff; }

      .gauge-formula-sum {
        font-size: 0.78rem;
        color: #475569;
        margin-top: 4px;
      }

      .stacked-bar {
        width: 100%;
        height: 14px;
        background: #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        margin: 8px 0 4px 0;
      }
      .bar-segment {
        height: 100%;
        transition: width 0.15s ease;
      }
      .bar-segment.seg-comp { background: #0284c7; }
      .bar-segment.seg-qual { background: #16a34a; }
      .bar-segment.seg-cert { background: #d97706; }

      .bar-legend {
        display: flex;
        gap: 12px;
        font-size: 0.72rem;
        color: #64748b;
      }
      .leg-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .dot.comp { background: #0284c7; }
      .dot.qual { background: #16a34a; }
      .dot.cert { background: #d97706; }

      .governance-recommendation {
        font-size: 0.78rem;
        color: #334155;
        background: rgba(255, 255, 255, 0.7);
        border-radius: 6px;
        padding: 6px 10px;
        margin-top: 6px;
      }

      /* Fields Table Styles */
      .field-counts {
        display: flex;
        gap: 6px;
      }
      .count-pill {
        font-size: 0.75rem;
        padding: 3px 8px;
        border-radius: 12px;
        font-weight: 600;
      }
      .count-pill.ai { background: #f3e8ff; color: #7e22ce; }
      .count-pill.human { background: #e0f2fe; color: #0284c7; }

      .table-filter-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 14px;
      }
      .quick-filter-radios {
        display: flex;
        gap: 6px;
      }
      .filter-pill {
        background: #f8fafc;
        border: 1px solid #d1d5db;
        border-radius: 14px;
        padding: 4px 10px;
        font-size: 0.78rem;
        color: #334155;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.15s ease;
      }
      .filter-pill:hover {
        background: #f1f5f9;
      }
      .filter-pill.active {
        background: var(--pmo-primary, #0078d4);
        color: #ffffff;
        border-color: var(--pmo-primary, #0078d4);
      }

      .search-wrap {
        display: flex;
        align-items: center;
        background: #f8fafc;
        border: 1px solid var(--pmo-border, #d1d5db);
        border-radius: 6px;
        padding: 4px 10px;
        min-width: 260px;
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

      .table-responsive {
        overflow-x: auto;
      }
      .fields-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
      }
      .fields-table th {
        background: #f8fafc;
        padding: 10px 12px;
        text-align: left;
        font-weight: 700;
        color: #333;
        border-bottom: 2px solid var(--pmo-border, #e0e0e0);
      }
      .fields-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: top;
      }

      .field-title-wrap {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .field-label {
        color: #0f172a;
        font-size: 0.86rem;
      }
      .field-key {
        font-family: monospace;
        font-size: 0.74rem;
        color: #64748b;
      }
      .req-badge {
        display: inline-block;
        font-size: 0.66rem;
        background: #fee2e2;
        color: #b91c1c;
        padding: 1px 6px;
        border-radius: 3px;
        font-weight: 700;
        width: fit-content;
      }
      .opt-badge {
        display: inline-block;
        font-size: 0.66rem;
        background: #f1f5f9;
        color: #64748b;
        padding: 1px 6px;
        border-radius: 3px;
        font-weight: 600;
        width: fit-content;
      }

      .type-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .data-type-pill {
        font-family: monospace;
        font-size: 0.72rem;
        background: #f1f5f9;
        color: #334155;
        padding: 1px 6px;
        border-radius: 3px;
        width: fit-content;
      }
      .constraints-text {
        font-size: 0.72rem;
        color: #64748b;
        line-height: 1.3;
      }

      .ai-prefill-info, .human-input-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .yes-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.74rem;
        font-weight: 700;
        color: #15803d;
      }
      .human-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.74rem;
        font-weight: 700;
        color: var(--pmo-primary, #0078d4);
      }
      .ai-logic-text, .human-method-text {
        font-size: 0.78rem;
        color: #475569;
        margin: 0;
        line-height: 1.4;
      }

      .conf-mapping-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .conf-tag-mini {
        font-size: 0.74rem;
        font-weight: 600;
        color: #334155;
        background: #f1f5f9;
        padding: 2px 6px;
        border-radius: 4px;
        width: fit-content;
      }
      .conf-rule-hint {
        font-size: 0.7rem;
        color: #64748b;
        line-height: 1.25;
      }

      @media (max-width: 860px) {
        .calculator-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DocsAiPrefillConfidencePageComponent {
  readonly fieldSearchQuery = signal<string>('');
  readonly fieldFilterMode = signal<'all' | 'required' | 'optional'>('all');

  // Calculator signals
  readonly calcSignalsPresent = signal<number>(8); // out of 10
  readonly calcDqPassed = signal<number>(13); // out of 14
  readonly calcModelCertainty = signal<number>(0.84); // 84%

  readonly calcConfidenceScore = computed(() => {
    const comp = (this.calcSignalsPresent() / 10) * 0.35;
    const qual = (this.calcDqPassed() / 14) * 0.35;
    const cert = this.calcModelCertainty() * 0.30;
    return Math.round((comp + qual + cert) * 1000) / 10;
  });

  readonly calcConfidenceLevel = computed(() => {
    const score = this.calcConfidenceScore();
    if (score >= 75) return 'High';
    if (score >= 50) return 'Medium';
    return 'Low';
  });

  readonly projectFields: FieldSpec[] = [
    {
      key: 'projectName',
      label: 'Project Name',
      dataType: 'text',
      required: true,
      constraints: 'Length 3 - 120 chars',
      prefilledByAi: true,
      aiExtractionLogic: 'Extracts clear title from proposal heading or lead sentence. Cleans company abbreviations.',
      humanInputAllowed: true,
      humanInputMethod: 'Editable text box in Step 2 review and Data Entry page.',
      defaultConfidence: 'Explicit (0.90) or Inferred (0.60)',
    },
    {
      key: 'portfolioKey',
      label: 'Portfolio Key',
      dataType: 'select',
      required: true,
      constraints: 'Allowed portfolios (e.g. it-infosec, ai-team, data-analytics)',
      prefilledByAi: true,
      aiExtractionLogic: 'Maps scope to standard portfolio taxonomy; security and compliance mapped to IT InfoSec.',
      humanInputAllowed: true,
      humanInputMethod: 'Dropdown selector matching registered portfolios in OneLake.',
      defaultConfidence: 'Inferred (0.60)',
    },
    {
      key: 'programKey',
      label: 'Program Key',
      dataType: 'select',
      required: true,
      constraints: 'Allowed programs of selected portfolio',
      prefilledByAi: true,
      aiExtractionLogic: 'Selects child program under target portfolio (e.g. Zero Trust and Identity under InfoSec).',
      humanInputAllowed: true,
      humanInputMethod: 'Cascading dropdown populated from selected portfolio programs.',
      defaultConfidence: 'Inferred (0.60)',
    },
    {
      key: 'businessUnit',
      label: 'Business Unit',
      dataType: 'select',
      required: true,
      constraints: '10 Allowed corporate BUs (e.g. Fab Ops, Semiconductor Process)',
      prefilledByAi: true,
      aiExtractionLogic: 'Detects sponsoring organizational division or plant mentions (e.g., Fab Operations).',
      humanInputAllowed: true,
      humanInputMethod: 'Standard business unit dropdown picker.',
      defaultConfidence: 'Explicit (0.90) or Inferred (0.60)',
    },
    {
      key: 'site',
      label: 'Site Location',
      dataType: 'select',
      required: true,
      constraints: '6 Allowed sites (Fremont, Tualatin, Singapore, Penang, Hsinchu, Global Remote)',
      prefilledByAi: true,
      aiExtractionLogic: 'Extracts physical facility name or defaults to Global Remote if cross-regional.',
      humanInputAllowed: true,
      humanInputMethod: 'Site dropdown picker.',
      defaultConfidence: 'Explicit (0.90) or Inferred (0.60)',
    },
    {
      key: 'sponsorName',
      label: 'Executive Sponsor Name',
      dataType: 'text',
      required: false,
      constraints: 'Max 80 chars; must be verified personnel',
      prefilledByAi: true,
      aiExtractionLogic: 'Extracted only when an explicit accountable owner or sponsor is named. Never hallucinated.',
      humanInputAllowed: true,
      humanInputMethod: 'Free-text input with company directory lookup.',
      defaultConfidence: 'Explicit (0.90) or Not Provided (0.00)',
    },
    {
      key: 'sponsorEmail',
      label: 'Sponsor Email Address',
      dataType: 'email',
      required: false,
      constraints: 'Valid corporate email format',
      prefilledByAi: true,
      aiExtractionLogic: 'Parsed regex when an email string is included in proposal text.',
      humanInputAllowed: true,
      humanInputMethod: 'Email text input.',
      defaultConfidence: 'Explicit (0.90) or Not Provided (0.00)',
    },
    {
      key: 'projectManager',
      label: 'Project Manager (PM)',
      dataType: 'text',
      required: false,
      constraints: 'Max 80 chars',
      prefilledByAi: true,
      aiExtractionLogic: 'Identified from "PM:", "Lead:", or delivery manager attribution.',
      humanInputAllowed: true,
      humanInputMethod: 'Text input with PM assignment.',
      defaultConfidence: 'Explicit (0.90) or Not Provided (0.00)',
    },
    {
      key: 'projectStatus',
      label: 'Project Status',
      dataType: 'select',
      required: true,
      constraints: 'Planning | Active | On Hold',
      prefilledByAi: true,
      aiExtractionLogic: 'Defaults to "Planning" for new proposals unless text explicitly notes inflight status.',
      humanInputAllowed: true,
      humanInputMethod: 'Status dropdown menu.',
      defaultConfidence: 'Inferred (0.60)',
    },
    {
      key: 'goLiveDate',
      label: 'Target Go-Live Date',
      dataType: 'date',
      required: true,
      constraints: 'YYYY-MM-DD (2026-01-01 to 2032-12-31)',
      prefilledByAi: true,
      aiExtractionLogic: 'Parses quarterly, monthly, or specific deadlines (e.g. "Q4 2027" -> 2027-12-31).',
      humanInputAllowed: true,
      humanInputMethod: 'Date picker with calendar interface.',
      defaultConfidence: 'Explicit (0.90) or Inferred (0.60)',
    },
    {
      key: 'businessValue',
      label: 'Business Value Score',
      dataType: 'integer',
      required: true,
      constraints: '1 (Low) to 5 (Very High)',
      prefilledByAi: true,
      aiExtractionLogic: 'Heuristic synthesis evaluating customer impact, user base size, and revenue uplift.',
      humanInputAllowed: true,
      humanInputMethod: 'Slider or segmented buttons (1 to 5).',
      defaultConfidence: 'Estimated (0.30)',
    },
    {
      key: 'userBase',
      label: 'Target User Base Count',
      dataType: 'integer',
      required: true,
      constraints: '0 to 100,000,000 users',
      prefilledByAi: true,
      aiExtractionLogic: 'Extracted integer count of affected engineers, operators, or end-customers.',
      humanInputAllowed: true,
      humanInputMethod: 'Numeric input field.',
      defaultConfidence: 'Explicit (0.90) or Estimated (0.30)',
    },
    {
      key: 'estimatedAnnualBenefitUsd',
      label: 'Annual Financial Benefit (USD)',
      dataType: 'number',
      required: false,
      constraints: 'USD currency amount',
      prefilledByAi: true,
      aiExtractionLogic: 'Extracted when monetary savings or projected revenue is stated in text.',
      humanInputAllowed: true,
      humanInputMethod: 'Currency input with USD formatting.',
      defaultConfidence: 'Explicit (0.90) or Not Provided (0.00)',
    },
    {
      key: 'sponsorLevel',
      label: 'Sponsor Seniority Level',
      dataType: 'select',
      required: true,
      constraints: 'Executive | Director | Manager | Individual',
      prefilledByAi: true,
      aiExtractionLogic: 'Inferred from sponsor title cues (VP/C-level -> Executive, Director -> Director).',
      humanInputAllowed: true,
      humanInputMethod: 'Seniority tier dropdown.',
      defaultConfidence: 'Inferred (0.60)',
    },
    {
      key: 'regulatorySecurity',
      label: 'Regulatory / Security Driven',
      dataType: 'boolean',
      required: true,
      constraints: 'True / False',
      prefilledByAi: true,
      aiExtractionLogic: 'Flagged true when audit, ISO, GDPR, NIST, cleanroom compliance, or cyber defense is mentioned.',
      humanInputAllowed: true,
      humanInputMethod: 'Toggle switch with justification note.',
      defaultConfidence: 'Explicit (0.90) or Inferred (0.60)',
    },
    {
      key: 'dtAlignment',
      label: 'Digital Transformation Alignment',
      dataType: 'boolean',
      required: true,
      constraints: 'True / False',
      prefilledByAi: true,
      aiExtractionLogic: 'Flagged true when cloud modernization, AI/ML, automation, or Fabric OneLake is involved.',
      humanInputAllowed: true,
      humanInputMethod: 'Toggle switch.',
      defaultConfidence: 'Explicit (0.90) or Inferred (0.60)',
    },
    {
      key: 'protectedProgram',
      label: 'Protected Strategic Program',
      dataType: 'boolean',
      required: false,
      constraints: 'True / False',
      prefilledByAi: true,
      aiExtractionLogic: 'Set true only when explicit executive board protection or CEO mandate is cited.',
      humanInputAllowed: true,
      humanInputMethod: 'Restricted toggle (requires PMO Director confirmation).',
      defaultConfidence: 'Explicit (0.90) or Estimated (0.30)',
    },
    {
      key: 'primarySkill',
      label: 'Primary Skill Domain',
      dataType: 'select',
      required: true,
      constraints: '8 Allowed Skill Families (APP, CLOUD, DATA, SEC, NET, UC, INT, PM)',
      prefilledByAi: true,
      aiExtractionLogic: 'Maps main work discipline to standard enterprise skill family taxonomy.',
      humanInputAllowed: true,
      humanInputMethod: 'Skill family dropdown picker.',
      defaultConfidence: 'Inferred (0.60)',
    },
    {
      key: 'skillDemandFte',
      label: 'Skill Demand (FTE)',
      dataType: 'number',
      required: true,
      constraints: '0.5 to 12.0 FTE',
      prefilledByAi: true,
      aiExtractionLogic: 'Estimated from team size mentions or delivery complexity scope.',
      humanInputAllowed: true,
      humanInputMethod: 'Decimal numeric input (e.g. 3.5 FTE).',
      defaultConfidence: 'Estimated (0.30)',
    },
    {
      key: 'costEstimateUsd',
      label: 'Total Cost Estimate (USD)',
      dataType: 'number',
      required: true,
      constraints: '$10,000 to $100,000,000',
      prefilledByAi: true,
      aiExtractionLogic: 'Parses stated budget ($1.5M -> 1500000). If omitted, estimates from FTE effort.',
      humanInputAllowed: true,
      humanInputMethod: 'Currency input field with currency prefix.',
      defaultConfidence: 'Explicit (0.90) or Estimated (0.30)',
    },
    {
      key: 'dependencies',
      label: 'Prerequisite Dependencies',
      dataType: 'array',
      required: false,
      constraints: 'List of valid GIS-#### project identifiers',
      prefilledByAi: true,
      aiExtractionLogic: 'Scans for referenced GIS-#### project codes or named predecessor systems.',
      humanInputAllowed: true,
      humanInputMethod: 'Multi-select project search token field.',
      defaultConfidence: 'Explicit (0.90) or Not Provided (0.00)',
    },
    {
      key: 'riskRating',
      label: 'Delivery Risk Rating',
      dataType: 'select',
      required: true,
      constraints: 'Low | Medium | High | Critical',
      prefilledByAi: true,
      aiExtractionLogic: 'Assessed from technical coupling, aggressive timelines, and unproven technologies.',
      humanInputAllowed: true,
      humanInputMethod: 'Risk rating segmented buttons.',
      defaultConfidence: 'Inferred (0.60)',
    },
    {
      key: 'effortPersonWeeks',
      label: 'Estimated Effort (Person-Weeks)',
      dataType: 'number',
      required: true,
      constraints: 'Positive integer weeks',
      prefilledByAi: true,
      aiExtractionLogic: 'Computed from FTE demand and estimated duration, or extracted from scope timeline.',
      humanInputAllowed: true,
      humanInputMethod: 'Person-weeks integer input.',
      defaultConfidence: 'Estimated (0.30)',
    },
  ];

  filteredFields = computed(() => {
    const q = this.fieldSearchQuery().toLowerCase().trim();
    const mode = this.fieldFilterMode();

    return this.projectFields.filter((f) => {
      if (mode === 'required' && !f.required) return false;
      if (mode === 'optional' && f.required) return false;

      if (!q) return true;

      return (
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.dataType.toLowerCase().includes(q) ||
        f.aiExtractionLogic.toLowerCase().includes(q)
      );
    });
  });

  resetCalculator(): void {
    this.calcSignalsPresent.set(8);
    this.calcDqPassed.set(13);
    this.calcModelCertainty.set(0.84);
  }
}
