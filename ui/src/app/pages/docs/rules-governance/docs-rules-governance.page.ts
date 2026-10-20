import { Component, ChangeDetectionStrategy } from '@angular/core';
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

interface RuleDetail {
  id: string;
  name: string;
  condition: string;
  action: string;
  priorityFloor: string;
  rationale: string;
  auditTag: string;
  example: string;
}

@Component({
  selector: 'app-docs-rules-governance-page',
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
          <span class="crumb-current">Rules & Governance (R1–R5)</span>
        </div>
        <h1 class="page-title">Deterministic Business Rules & Human Governance</h1>
        <p class="page-subtitle">
          How enterprise governance policies (Rules R1 to R5) interface with LightGBM machine learning predictions to uphold statutory mandates, prevent deprioritization of mission-critical projects, and maintain human accountability.
        </p>
      </div>

      <!-- Core Principle Banner -->
      <div class="governance-principle-banner">
        <div class="banner-icon-box">
          <ion-icon name="shield-checkmark-outline"></ion-icon>
        </div>
        <div class="banner-text-box">
          <h2 class="banner-title">Core Proposal Principle: &ldquo;Keep People in Control&rdquo;</h2>
          <p class="banner-desc">
            AI recommendations serve as transparent advisory signals, never autonomous executive decrees. Machine learning ranks provide statistical efficiency; deterministic business rules enforce statutory compliance; and human committees hold final decision authority recorded in immutable OneLake audit trails.
          </p>
        </div>
      </div>

      <!-- Priority Score Formula Card -->
      <ion-card class="docs-card">
        <ion-card-header>
          <ion-card-title>Priority Score Mathematical Formulation</ion-card-title>
          <ion-card-subtitle>Continuous scoring across the 4 strategic priority tiers with rule floors</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="formula-box">
            <div class="formula-latex">
              <strong>Priority Score</strong> = max(
                <em>Rule Priority Floor</em>,
                100 &times; [ (1.0 &times; P<sub>Must-do-now</sub>) + (0.7 &times; P<sub>Proceed</sub>) + (0.4 &times; P<sub>Can wait</sub>) + (0.1 &times; P<sub>Deprioritize</sub>) ]
              )
            </div>
          </div>
          <div class="weights-explanation">
            <div class="weight-item">
              <span class="tier-pill mustdo">Must-do-now</span>
              <span class="weight-mult">&times; 1.0</span>
              <span class="weight-desc">Full priority contribution for urgent statutory or business requirements.</span>
            </div>
            <div class="weight-item">
              <span class="tier-pill proceed">Proceed</span>
              <span class="weight-mult">&times; 0.7</span>
              <span class="weight-desc">High priority contribution for standard value-generating initiatives.</span>
            </div>
            <div class="weight-item">
              <span class="tier-pill canwait">Can wait</span>
              <span class="weight-mult">&times; 0.4</span>
              <span class="weight-desc">Moderate priority score for deferrable or non-blocking projects.</span>
            </div>
            <div class="weight-item">
              <span class="tier-pill deprioritize">Deprioritize</span>
              <span class="weight-mult">&times; 0.1</span>
              <span class="weight-desc">Residual weight for deprioritization candidates.</span>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- R1 to R5 Rules Detailed Cards -->
      <div class="section-title-wrap">
        <h2 class="section-title">The 5 Deterministic Governance Rules (R1 to R5)</h2>
        <p class="section-subtitle">
          Executed in strict order (<code>ruleOrder: ["R1", "R2", "R3", "R4", "R5"]</code>) in Fabric Notebook 02 after ML scoring.
        </p>
      </div>

      <div class="rules-list">
        @for (rule of rules; track rule.id) {
          <div class="rule-card">
            <div class="rule-header">
              <div class="rule-id-badge">{{ rule.id }}</div>
              <div class="rule-title-group">
                <h3 class="rule-name">{{ rule.name }}</h3>
                <span class="audit-tag">Audit Override Tag: <code>[{{ rule.auditTag }}]</code></span>
              </div>
              <span class="floor-badge">Priority Floor: {{ rule.priorityFloor }}</span>
            </div>

            <div class="rule-grid">
              <div class="rule-col">
                <div class="col-lbl">WHEN (Condition):</div>
                <div class="code-box"><code>{{ rule.condition }}</code></div>
              </div>
              <div class="rule-col">
                <div class="col-lbl">THEN (Enforced Action):</div>
                <div class="action-box"><strong>{{ rule.action }}</strong></div>
              </div>
            </div>

            <div class="rule-rationale">
              <strong>Institutional Policy Rationale:</strong> {{ rule.rationale }}
            </div>

            <div class="rule-example">
              <strong>Production Example:</strong> {{ rule.example }}
            </div>
          </div>
        }
      </div>

      <!-- Human Governance Decision Workflow Card -->
      <ion-card class="docs-card" style="margin-top: 24px;">
        <ion-card-header>
          <ion-card-title>Human Review Committee Workflow & Audit Trail</ion-card-title>
          <ion-card-subtitle>The 3 standard governance actions and immutable OneLake logging</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="actions-grid">
            <div class="action-card approve">
              <div class="act-icon"><ion-icon name="checkmark-circle-outline"></ion-icon></div>
              <h4 class="act-title">Approve</h4>
              <p class="act-desc">
                Confirms the AI-recommended tier and priority score. Project is released to sprint planning or capital allocation.
              </p>
            </div>
            <div class="action-card adjust">
              <div class="act-icon"><ion-icon name="create-outline"></ion-icon></div>
              <h4 class="act-title">Adjust</h4>
              <p class="act-desc">
                Overrides the recommended tier (e.g. shifts from Proceed to Can wait) or moves timeline with mandatory written justification.
              </p>
            </div>
            <div class="action-card reject">
              <div class="act-icon"><ion-icon name="close-circle-outline"></ion-icon></div>
              <h4 class="act-title">Reject</h4>
              <p class="act-desc">
                Permanently pauses or declines the project proposal. Documented reason archived for audit and retrains future models.
              </p>
            </div>
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

      .governance-principle-banner {
        display: flex;
        align-items: center;
        gap: 16px;
        background: #f0f7ff;
        border: 2px solid #b8daff;
        border-radius: 10px;
        padding: 16px 20px;
        margin-bottom: 24px;
        box-shadow: 0 2px 8px rgba(0, 120, 212, 0.06);
      }
      .banner-icon-box {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--pmo-primary, #0078d4);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.7rem;
        flex-shrink: 0;
      }
      .banner-title {
        margin: 0 0 4px 0;
        font-size: 1.15rem;
        font-weight: 800;
        color: var(--pmo-primary-dark, #004578);
      }
      .banner-desc {
        margin: 0;
        font-size: 0.86rem;
        line-height: 1.45;
        color: #1e3a8a;
      }

      .docs-card {
        background: #ffffff;
        border-radius: 10px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        margin-bottom: 24px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
      }

      .formula-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 12px 16px;
        margin-bottom: 14px;
      }
      .formula-latex {
        font-size: 0.92rem;
        color: #0f172a;
        line-height: 1.4;
      }

      .weights-explanation {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }
      .weight-item {
        background: #fcfcfc;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .tier-pill {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 10px;
        width: fit-content;
      }
      .tier-pill.mustdo { background: #fee2e2; color: #b91c1c; }
      .tier-pill.proceed { background: #dcfce7; color: #15803d; }
      .tier-pill.canwait { background: #fef9c3; color: #854d0e; }
      .tier-pill.deprioritize { background: #f1f5f9; color: #475569; }
      .weight-mult {
        font-size: 0.95rem;
        font-weight: 800;
        color: #0f172a;
      }
      .weight-desc {
        font-size: 0.75rem;
        color: #64748b;
        line-height: 1.35;
      }

      .section-title-wrap {
        margin: 24px 0 14px 0;
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

      .rules-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .rule-card {
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 10px;
        padding: 16px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
      }
      .rule-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        border-bottom: 1px solid #f0f0f0;
        padding-bottom: 10px;
      }
      .rule-id-badge {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--pmo-primary, #0078d4);
        color: #ffffff;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        flex-shrink: 0;
      }
      .rule-title-group {
        flex: 1;
      }
      .rule-name {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #1a1a1a;
      }
      .audit-tag {
        font-size: 0.75rem;
        color: #64748b;
      }
      .audit-tag code {
        background: #f1f5f9;
        color: #0f172a;
        padding: 1px 4px;
        border-radius: 3px;
      }
      .floor-badge {
        font-size: 0.72rem;
        background: #fef3c7;
        color: #b45309;
        padding: 4px 10px;
        border-radius: 12px;
        font-weight: 700;
      }

      .rule-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 12px;
        margin-bottom: 10px;
      }
      .col-lbl {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 4px;
      }
      .code-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 10px;
      }
      .code-box code {
        color: #004578;
        font-size: 0.8rem;
      }
      .action-box {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 6px;
        padding: 8px 10px;
        font-size: 0.82rem;
        color: #15803d;
      }

      .rule-rationale, .rule-example {
        font-size: 0.82rem;
        color: #334155;
        line-height: 1.4;
        margin-top: 6px;
      }

      .actions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      .action-card {
        border-radius: 8px;
        padding: 16px;
        border: 1px solid;
      }
      .action-card.approve { background: #f0fdf4; border-color: #bbf7d0; }
      .action-card.adjust { background: #fefce8; border-color: #fef08a; }
      .action-card.reject { background: #fef2f2; border-color: #fecaca; }

      .act-icon {
        font-size: 1.6rem;
        margin-bottom: 6px;
      }
      .action-card.approve .act-icon { color: #16a34a; }
      .action-card.adjust .act-icon { color: #ca8a04; }
      .action-card.reject .act-icon { color: #dc2626; }

      .act-title {
        margin: 0 0 6px 0;
        font-size: 1rem;
        font-weight: 700;
        color: #1a1a1a;
      }
      .act-desc {
        margin: 0;
        font-size: 0.82rem;
        color: #475569;
        line-height: 1.4;
      }
    `,
  ],
})
export class DocsRulesGovernancePageComponent {
  readonly rules: RuleDetail[] = [
    {
      id: 'R1',
      name: 'Regulatory or Security First',
      condition: 'regulatory_security == 1 AND months_to_go_live <= 36 AND final_tier in ["Can wait", "Candidate to deprioritize"]',
      action: 'Promote final_tier to "Must-do-now"; Enforce priority floor >= 80.0',
      priorityFloor: '80.0 / 100',
      rationale:
        'Statutory compliance, SOX controls, cybersecurity defenses, and environmental safety cleanroom standards cannot be sacrificed for purely financial or discretionary business value optimizations.',
      auditTag: 'R1',
      example:
        'An example cleanroom audit classified by LightGBM as "Can wait" due to a high capital budget. R1 promotes it to "Must-do-now" with priority floor 80.0.',
    },
    {
      id: 'R2',
      name: 'Executive Sponsorship Protection',
      condition: 'sponsor_level == "Executive" AND business_value >= 4 AND final_tier == "Candidate to deprioritize"',
      action: 'Promote final_tier to "Proceed"; Enforce priority floor >= 60.0',
      priorityFloor: '60.0 / 100',
      rationale:
        'Protects high-value strategic commitments backed by C-level executives or Executive Committee sponsors from algorithmic deprioritization without formal committee escalation.',
      auditTag: 'R2',
      example:
        'An example enterprise AI platform sponsored by the CIO with Business Value 5 was slated for deprioritization due to missing skills. R2 elevates tier to "Proceed".',
    },
    {
      id: 'R3',
      name: 'Protected Strategic Program',
      condition: 'protected_program == 1 AND final_tier in ["Can wait", "Candidate to deprioritize"]',
      action: 'Promote final_tier to "Must-do-now"; Enforce priority floor >= 75.0',
      priorityFloor: '75.0 / 100',
      rationale:
        'Preserves board-mandated strategic initiatives (such as fab factory expansions or critical corporate divestitures) against short-term skill or budget deprioritization.',
      auditTag: 'R3',
      example:
        'An example fab cleanroom expansion tagged as a protected program. Automatically guarded in "Must-do-now" tier.',
    },
    {
      id: 'R4',
      name: 'Deprioritize Guard on Active In-Flight Projects',
      condition: 'project_status == "Active" AND months_to_go_live <= 6 AND final_tier == "Candidate to deprioritize"',
      action: 'Promote final_tier to "Can wait"; Enforce priority floor >= 45.0',
      priorityFloor: '45.0 / 100',
      rationale:
        'Halting an in-flight project within 6 months of scheduled go-live incurs massive sunk-cost penalties and demoralizes operational teams. Requires VP-level review.',
      auditTag: 'R4',
      example:
        'An example supply chain connector is active with four months until go-live. R4 elevates it from deprioritize to "Can wait" pending executive review.',
    },
    {
      id: 'R5',
      name: 'Cross-Portfolio Critical Path Coupling',
      condition: 'cross_portfolio_successors >= 3 AND final_tier in ["Can wait", "Candidate to deprioritize"]',
      action: 'Promote final_tier to "Proceed"; Enforce priority floor >= 65.0',
      priorityFloor: '65.0 / 100',
      rationale:
        'When an infrastructure or platform project is a hard technical prerequisite for 3 or more downstream initiatives in other portfolios, pausing it creates cascaded blockage.',
      auditTag: 'R5',
      example:
        'An example identity directory sync blocks five dependent customer portal applications. R5 ensures the prerequisite remains active in "Proceed".',
    },
  ];
}
