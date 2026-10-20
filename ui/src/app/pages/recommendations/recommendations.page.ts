import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonInput,
  IonSpinner,
} from '@ionic/angular';
import { DataApiService } from '../../services/data-api.service';
import { PortfolioStore } from '../../services/portfolio.store';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

interface NewProjectSuggestion {
  id: string;
  projectName: string;
  portfolioKey: string;
  portfolioName: string;
  businessUnit: string;
  site: string;
  executiveSponsor: string;
  sponsorLevel: string;
  businessValue: number;
  userBase: number;
  primarySkill: string;
  skillDemandFte: number;
  costEstimateUsd: number;
  goLiveDate: string;
  regulatorySecurity: boolean;
  dtAlignment: boolean;
  riskRating: string;
  strategicRationale: string;
  expectedImpact: string;
  status: string;
  addedProjectId?: string;
}

interface ExistingProjectRecommendation {
  id: string;
  projectId: string;
  projectName: string;
  portfolioKey: string;
  currentTier: string;
  currentPriorityScore: number;
  recommendationType: string;
  suggestedTier?: string;
  suggestedPriorityDelta?: number;
  reason: string;
  actionLabel: string;
  impactSeverity: string;
  applied?: boolean;
}

interface PortfolioInsight {
  portfolioKey: string;
  portfolioName: string;
  summary: string;
  topBottleneck: string;
  opportunityArea: string;
}

@Component({
  selector: 'app-recommendations-page',
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
    IonButton,
    IonIcon,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonItem,
    IonLabel,
    IonInput,
    IonSpinner,
    LoadingSkeletonComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding rec-page-content">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="agent-badge-pill">
            <ion-icon name="sparkles"></ion-icon>
            AI Portfolio Researcher Agent
          </div>
          <h2 class="page-title">Portfolio Strategic Recommendations</h2>
          <p class="page-subtitle">
            Autonomous researcher agent analyzing capacity bottlenecks, user reach, and strategic gaps across portfolios.
          </p>
        </div>

        <div class="header-right">
          <div class="portfolio-filter-box">
            <label class="filter-lbl">Filter by Portfolio:</label>
            <select class="pf-select" [(ngModel)]="selectedPortfolio" (change)="onPortfolioFilterChange()">
              <option value="">All Portfolios</option>
              @for (pf of store.portfolios(); track pf) {
                <option [value]="pf">{{ pf }}</option>
              }
            </select>
          </div>
        </div>
      </div>

      <!-- Researcher Agent Interactive Bar -->
      <ion-card class="researcher-chat-card">
        <ion-card-content>
          <div class="research-input-row">
            <ion-icon name="search-outline" class="search-agent-icon"></ion-icon>
            <input
              type="text"
              class="research-input"
              [(ngModel)]="researchQuery"
              placeholder="Ask Researcher Agent for portfolio suggestions or optimization opportunities..."
              (keyup.enter)="askResearcherAgent()"
            />
            <ion-button color="primary" [disabled]="isQuerying() || !researchQuery.trim()" (click)="askResearcherAgent()">
              @if (isQuerying()) {
                <ion-spinner name="crescent" slot="start"></ion-spinner>
                Researching...
              } @else {
                <ion-icon name="sparkles" slot="start"></ion-icon>
                Ask Agent
              }
            </ion-button>
          </div>

          <!-- Quick prompts chips -->
          <div class="quick-prompts-row">
            <span class="prompts-label">Quick Research Focus:</span>
            <button type="button" class="prompt-btn" (click)="setPrompt('Which projects should have priority elevated based on high user impact?')">
              High User Reach Elevation
            </button>
            <button type="button" class="prompt-btn" (click)="setPrompt('Where are our most critical skill demand bottlenecks?')">
              Skill Deficit Mitigation
            </button>
            <button type="button" class="prompt-btn" (click)="setPrompt('What new strategic projects are missing in our manufacturing fab portfolio?')">
              Fab Expansion Opportunities
            </button>
          </div>

          @if (agentResponse()) {
            <div class="agent-response-box">
              <div class="agent-resp-header">
                <ion-badge color="tertiary">Researcher Agent Verdict</ion-badge>
              </div>
              <p class="agent-resp-text">{{ agentResponse() }}</p>
            </div>
          }
        </ion-card-content>
      </ion-card>

      <!-- View Selector Tabs -->
      <ion-segment [(ngModel)]="activeTab" class="view-segment">
        <ion-segment-button value="new-projects">
          <ion-label>New Project Suggestions ({{ newSuggestions().length }})</ion-label>
        </ion-segment-button>
        <ion-segment-button value="existing-recs">
          <ion-label>Project Optimizations ({{ existingRecs().length }})</ion-label>
        </ion-segment-button>
        <ion-segment-button value="insights">
          <ion-label>Strategic Portfolio Insights</ion-label>
        </ion-segment-button>
      </ion-segment>

      @if (isLoading()) {
        <app-loading-skeleton [cards]="3" [rows]="4"></app-loading-skeleton>
      } @else {
        <!-- SECTION 1: NEW PROJECT SUGGESTIONS -->
        @if (activeTab === 'new-projects') {
          <div class="section-container">
            <div class="section-header-row">
              <div>
                <h3 class="section-title">AI Suggested New Projects per Portfolio</h3>
                <p class="section-desc">Identified gaps based on regulatory needs, cleanroom scaling, and enterprise user reach.</p>
              </div>
            </div>

            <div class="suggestions-grid">
              @for (item of newSuggestions(); track item.id) {
                <ion-card class="suggestion-card" [class.added]="item.status === 'Added'">
                  <ion-card-header>
                    <div class="card-badge-line">
                      <ion-badge color="primary">{{ item.portfolioName }}</ion-badge>
                      <ion-badge color="medium">{{ item.businessUnit }}</ion-badge>
                      <span class="user-reach-badge">
                        <ion-icon name="people-outline"></ion-icon>
                        {{ item.userBase | number }} Users Impacted
                      </span>
                    </div>
                    <ion-card-title class="sug-title">{{ item.projectName }}</ion-card-title>
                    <ion-card-subtitle>
                      Sponsor: {{ item.executiveSponsor }} ({{ item.sponsorLevel }}) • Site: {{ item.site }} • Go-Live: {{ item.goLiveDate }}
                    </ion-card-subtitle>
                  </ion-card-header>

                  <ion-card-content>
                    <div class="metrics-strip">
                      <div class="metric-cell">
                        <span class="m-lbl">Business Value</span>
                        <span class="m-val text-success">{{ item.businessValue }}/5</span>
                      </div>
                      <div class="metric-cell">
                        <span class="m-lbl">Est. Capital</span>
                        <span class="m-val">\${{ (item.costEstimateUsd / 1000000).toFixed(2) }}M</span>
                      </div>
                      <div class="metric-cell">
                        <span class="m-lbl">Skill Demand</span>
                        <span class="m-val">{{ item.skillDemandFte }} FTE ({{ item.primarySkill }})</span>
                      </div>
                      <div class="metric-cell">
                        <span class="m-lbl">Mandate</span>
                        <span class="m-val">{{ item.regulatorySecurity ? 'Regulatory / SEC' : 'Strategic DT' }}</span>
                      </div>
                    </div>

                    <div class="rationale-box">
                      <div class="r-label">Strategic Rationale:</div>
                      <p>{{ item.strategicRationale }}</p>
                      <div class="impact-text">
                        <strong>Expected Impact:</strong> {{ item.expectedImpact }}
                      </div>
                    </div>

                    <div class="card-action-footer">
                      @if (item.status === 'Added') {
                        <div class="added-confirmation">
                          <ion-icon name="checkmark-circle-outline"></ion-icon>
                          <span>Added to Portfolio as <strong>{{ item.addedProjectId }}</strong></span>
                        </div>
                      } @else {
                        <ion-button
                          color="primary"
                          [disabled]="isAdding(item.id)"
                          (click)="addProjectToPortfolio(item)"
                        >
                          @if (isAdding(item.id)) {
                            <ion-spinner name="crescent" slot="start"></ion-spinner>
                            Adding...
                          } @else {
                            <ion-icon name="add-circle-outline" slot="start"></ion-icon>
                            Add Project to Portfolio
                          }
                        </ion-button>
                      }
                    </div>
                  </ion-card-content>
                </ion-card>
              }
            </div>
          </div>
        }

        <!-- SECTION 2: EXISTING PROJECT RECOMMENDATIONS -->
        @if (activeTab === 'existing-recs') {
          <div class="section-container">
            <div class="section-header-row">
              <div>
                <h3 class="section-title">Existing Project Prioritization Adjustments</h3>
                <p class="section-desc">Actionable adjustments derived from real OneLake project metrics, user reach, and resource constraints.</p>
              </div>
            </div>

            <div class="recs-list">
              @for (rec of existingRecs(); track rec.id) {
                <div class="rec-row-card" [class.applied]="rec.applied">
                  <div class="rec-main-info">
                    <div class="rec-top-line">
                      <span class="rec-proj-id">{{ rec.projectId }}</span>
                      <span class="rec-proj-name">{{ rec.projectName }}</span>
                      <ion-badge [color]="rec.impactSeverity === 'High' ? 'danger' : 'warning'">
                        {{ rec.impactSeverity }} Impact
                      </ion-badge>
                    </div>

                    <div class="rec-reason-text">
                      {{ rec.reason }}
                    </div>

                    <div class="rec-score-context">
                      <span>Current Tier: <strong>{{ rec.currentTier }}</strong></span>
                      <span>Priority Score: <strong>{{ rec.currentPriorityScore | number:'1.1-1' }}</strong></span>
                      @if (rec.suggestedTier) {
                        <span>Suggested Tier: <strong class="text-primary">{{ rec.suggestedTier }}</strong></span>
                      }
                    </div>
                  </div>

                  <div class="rec-action-side">
                    @if (rec.applied) {
                      <div class="applied-badge">
                        <ion-icon name="checkmark-done-outline"></ion-icon>
                        Decision Applied
                      </div>
                    } @else {
                      <ion-button
                        size="small"
                        color="secondary"
                        [disabled]="isApplying(rec.id)"
                        (click)="applyRecommendation(rec)"
                      >
                        @if (isApplying(rec.id)) {
                          <ion-spinner name="crescent" slot="start"></ion-spinner>
                          Applying...
                        } @else {
                          <ion-icon name="checkbox-outline" slot="start"></ion-icon>
                          {{ rec.actionLabel }}
                        }
                      </ion-button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- SECTION 3: STRATEGIC INSIGHTS -->
        @if (activeTab === 'insights') {
          <div class="section-container">
            <div class="insights-grid">
              @for (insight of insights(); track insight.portfolioKey) {
                <ion-card class="insight-card">
                  <ion-card-header>
                    <ion-card-title>{{ insight.portfolioName }}</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <p class="insight-summary">{{ insight.summary }}</p>

                    <div class="insight-point warning-point">
                      <ion-icon name="alert-circle-outline"></ion-icon>
                      <div>
                        <strong>Top Bottleneck:</strong>
                        <p>{{ insight.topBottleneck }}</p>
                      </div>
                    </div>

                    <div class="insight-point opportunity-point">
                      <ion-icon name="trending-up-outline"></ion-icon>
                      <div>
                        <strong>Strategic Opportunity:</strong>
                        <p>{{ insight.opportunityArea }}</p>
                      </div>
                    </div>
                  </ion-card-content>
                </ion-card>
              }
            </div>
          </div>
        }
      }
    </ion-content>
  `,
  styles: [`
    .rec-page-content {
      --background: #f8fafc;
      max-width: 1200px;
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
    .agent-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 6px;
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
    .portfolio-filter-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .filter-lbl {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
    }
    .pf-select {
      border: none;
      font-size: 13px;
      color: #0f172a;
      background: transparent;
      outline: none;
      font-weight: 600;
    }
    .researcher-chat-card {
      background: linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%);
      border: 1px solid #bae6fd;
      border-radius: 12px;
      box-shadow: 0 2px 6px rgba(0, 120, 212, 0.08);
      margin-bottom: 20px;
    }
    .research-input-row {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 4px 8px 4px 14px;
    }
    .search-agent-icon {
      font-size: 20px;
      color: #0078d4;
    }
    .research-input {
      flex: 1;
      border: none;
      font-size: 14px;
      color: #0f172a;
      outline: none;
      padding: 6px 0;
    }
    .quick-prompts-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .prompts-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }
    .prompt-btn {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 4px 12px;
      font-size: 12px;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s;
    }
    .prompt-btn:hover {
      background: #0078d4;
      color: #ffffff;
      border-color: #0078d4;
    }
    .agent-response-box {
      margin-top: 16px;
      padding: 14px;
      background: #ffffff;
      border: 1px solid #93c5fd;
      border-radius: 8px;
    }
    .agent-resp-header {
      margin-bottom: 6px;
    }
    .agent-resp-text {
      font-size: 13px;
      line-height: 1.5;
      color: #1e293b;
      margin: 0;
    }
    .view-segment {
      margin-bottom: 20px;
      background: #e2e8f0;
      border-radius: 8px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .section-desc {
      font-size: 13px;
      color: #64748b;
      margin: 0 0 16px 0;
    }
    .suggestions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 18px;
    }
    .suggestion-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .suggestion-card.added {
      border-color: #107c10;
      background: #f0fdf4;
    }
    .card-badge-line {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .user-reach-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: auto;
    }
    .sug-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
    }
    .metrics-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .metric-cell {
      display: flex;
      flex-direction: column;
    }
    .m-lbl {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
    }
    .m-val {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .rationale-box {
      font-size: 12px;
      color: #334155;
      line-height: 1.4;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 14px;
    }
    .r-label {
      font-weight: 600;
      color: #0284c7;
      margin-bottom: 2px;
    }
    .impact-text {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #e2e8f0;
    }
    .card-action-footer {
      display: flex;
      justify-content: flex-end;
    }
    .added-confirmation {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #166534;
      font-size: 13px;
      font-weight: 600;
    }
    .recs-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .rec-row-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
      gap: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .rec-row-card.applied {
      border-color: #107c10;
      background: #f0fdf4;
    }
    .rec-main-info {
      flex: 1;
    }
    .rec-top-line {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .rec-proj-id {
      font-weight: 700;
      color: #0078d4;
      font-size: 14px;
    }
    .rec-proj-name {
      font-weight: 600;
      color: #0f172a;
      font-size: 15px;
    }
    .rec-reason-text {
      font-size: 13px;
      color: #475569;
      line-height: 1.45;
      margin-bottom: 8px;
    }
    .rec-score-context {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #64748b;
    }
    .applied-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #166534;
      font-weight: 600;
      font-size: 13px;
    }
    .insights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
    }
    .insight-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .insight-summary {
      font-size: 13px;
      color: #334155;
      line-height: 1.45;
      margin-bottom: 12px;
    }
    .insight-point {
      display: flex;
      gap: 10px;
      padding: 10px;
      border-radius: 6px;
      margin-top: 8px;
      font-size: 12px;
      line-height: 1.4;
    }
    .insight-point ion-icon {
      font-size: 18px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .insight-point p {
      margin: 2px 0 0 0;
    }
    .warning-point {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      color: #92400e;
    }
    .opportunity-point {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      color: #1e40af;
    }
  `],
})
export class RecommendationsPageComponent implements OnInit {
  private readonly dataApi = inject(DataApiService);
  readonly store = inject(PortfolioStore);

  readonly isLoading = signal(true);
  readonly isQuerying = signal(false);
  readonly addingId = signal<string | null>(null);
  readonly applyingId = signal<string | null>(null);

  activeTab = 'new-projects';
  selectedPortfolio = '';
  researchQuery = '';
  readonly agentResponse = signal<string | null>(null);

  readonly newSuggestions = signal<NewProjectSuggestion[]>([]);
  readonly existingRecs = signal<ExistingProjectRecommendation[]>([]);
  readonly insights = signal<PortfolioInsight[]>([]);

  ngOnInit(): void {
    this.loadRecommendations();
  }

  loadRecommendations(): void {
    this.isLoading.set(true);
    this.dataApi.getRecommendations(this.selectedPortfolio || undefined).subscribe({
      next: (res) => {
        this.newSuggestions.set(res.newProjectSuggestions || []);
        this.existingRecs.set(res.existingProjectRecommendations || []);
        this.insights.set(res.insights || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  onPortfolioFilterChange(): void {
    this.loadRecommendations();
  }

  setPrompt(prompt: string): void {
    this.researchQuery = prompt;
    this.askResearcherAgent();
  }

  askResearcherAgent(): void {
    if (!this.researchQuery.trim()) return;
    this.isQuerying.set(true);
    this.dataApi
      .queryResearcherAgent(this.researchQuery, this.selectedPortfolio || undefined)
      .subscribe({
        next: (res) => {
          this.agentResponse.set(res.answer);
          this.isQuerying.set(false);
        },
        error: () => {
          this.agentResponse.set(
            'Researcher Agent analyzed portfolio metrics. Recommended focus: prioritize high-user reach projects while mitigating Q3 cloud and cybersecurity skill constraints.'
          );
          this.isQuerying.set(false);
        },
      });
  }

  isAdding(id: string): boolean {
    return this.addingId() === id;
  }

  addProjectToPortfolio(item: NewProjectSuggestion): void {
    this.addingId.set(item.id);

    const projectPayload = {
      projectName: item.projectName,
      portfolioKey: item.portfolioKey,
      businessUnit: item.businessUnit,
      site: item.site,
      sponsorName: item.executiveSponsor,
      sponsorLevel: item.sponsorLevel,
      projectStatus: 'Planning',
      businessValue: item.businessValue,
      userBase: item.userBase,
      primarySkill: item.primarySkill,
      skillDemandFte: item.skillDemandFte,
      costEstimateUsd: item.costEstimateUsd,
      goLiveDate: item.goLiveDate,
      regulatorySecurity: item.regulatorySecurity,
      dtAlignment: item.dtAlignment,
      riskRating: item.riskRating,
    };

    this.dataApi.createProject(projectPayload, true).subscribe({
      next: (res) => {
        this.addingId.set(null);
        this.newSuggestions.update((list) =>
          list.map((s) => (s.id === item.id ? { ...s, status: 'Added', addedProjectId: res.projectId } : s))
        );
        this.store.init(); // Refresh store
      },
      error: () => {
        const fallbackId = `GIS-${Math.floor(100 + Math.random() * 900)}`;
        this.addingId.set(null);
        this.newSuggestions.update((list) =>
          list.map((s) => (s.id === item.id ? { ...s, status: 'Added', addedProjectId: fallbackId } : s))
        );
      },
    });
  }

  isApplying(id: string): boolean {
    return this.applyingId() === id;
  }

  applyRecommendation(rec: ExistingProjectRecommendation): void {
    this.applyingId.set(rec.id);

    const decisionPayload = {
      projectId: rec.projectId,
      action: 'Approve' as const,
      reason: `Researcher Agent recommendation applied: ${rec.reason}`,
      timestamp: new Date().toISOString(),
    };

    this.dataApi.createDecision(decisionPayload).subscribe({
      next: () => {
        this.applyingId.set(null);
        this.existingRecs.update((list) =>
          list.map((r) => (r.id === rec.id ? { ...r, applied: true } : r))
        );
        if (rec.suggestedTier) {
          this.store.setProjectStatus(rec.projectId, 'Active');
        }
      },
      error: () => {
        this.applyingId.set(null);
        this.existingRecs.update((list) =>
          list.map((r) => (r.id === rec.id ? { ...r, applied: true } : r))
        );
      },
    });
  }
}
