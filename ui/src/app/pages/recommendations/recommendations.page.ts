import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription, map } from 'rxjs';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular';
import { DataApiService } from '../../services/data-api.service';
import { PortfolioStore } from '../../services/portfolio.store';
import { ConfigService } from '../../services/config.service';
import { RecommendationAction, RecommendationReport } from '../../models/recommendation.models';

type ActionStatus = 'running' | 'done' | 'failed';

interface ActionState {
  status: ActionStatus;
  message: string;
}

/** Turns an API problem response into the text a person needs to act on it. */
function problemText(err: unknown): string {
  const problem = (err as { error?: { detail?: string; errors?: { field: string; message: string }[] } })?.error;
  const issues = (problem?.errors ?? []).map((issue) => `${issue.field}: ${issue.message}`);
  const detail = problem?.detail ?? (err as { message?: string })?.message ?? 'The request failed.';
  return issues.length ? `${detail} ${issues.join('; ')}` : detail;
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
    IonSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding rec-page">
      <div class="page-header">
        <div class="header-text">
          <div class="agent-pill"><ion-icon name="sparkles-outline"></ion-icon> Recommendation agent</div>
          <h2 class="page-title">{{ report()?.title || ui.title }}</h2>
          <p class="page-subtitle">{{ ui.subtitle }}</p>
        </div>
        <div class="header-controls">
          <label class="portfolio-filter">
            <span>Portfolio</span>
            <select [(ngModel)]="portfolioKey" (change)="loadDefault()" [disabled]="loading()">
              <option value="">All portfolios</option>
              @for (pf of store.portfolios(); track pf) {
                <option [value]="pf">{{ pf }}</option>
              }
            </select>
          </label>
          <ion-button fill="outline" [disabled]="loading()" (click)="loadDefault()">Refresh</ion-button>
        </div>
      </div>

      <ion-card class="research-card">
        <ion-card-content>
          <form class="research-row" (ngSubmit)="ask()">
            <input
              type="text"
              name="query"
              class="research-input"
              [(ngModel)]="researchQuery"
              [placeholder]="ui.researchPlaceholder"
              [disabled]="loading()"
            />
            <ion-button type="submit" color="primary" [disabled]="loading() || researchQuery.trim().length < 3">
              <ion-icon name="sparkles-outline" slot="start"></ion-icon>
              {{ ui.askLabel }}
            </ion-button>
          </form>
          <div class="quick-prompts">
            @for (quick of ui.quickPrompts; track quick.label) {
              <button type="button" class="prompt-chip" [disabled]="loading()" (click)="ask(quick.prompt)">
                {{ quick.label }}
              </button>
            }
          </div>
        </ion-card-content>
      </ion-card>

      @if (loading()) {
        <div class="state-line">
          <ion-spinner name="crescent"></ion-spinner>
          <span>The recommendation agent is querying OneLake and searching the web. This can take up to two minutes.</span>
        </div>
      } @else if (error(); as message) {
        <ion-card class="error-card">
          <ion-card-content>
            <strong>The recommendation agent could not complete the report.</strong>
            <p class="error-text">{{ message }}</p>
            <ion-button fill="outline" size="small" (click)="retry()">Try again</ion-button>
          </ion-card-content>
        </ion-card>
      } @else if (report(); as r) {
        <ion-card class="summary-card">
          <ion-card-content>
            @if (r.query) {
              <div class="query-line">Research question: <strong>{{ r.query }}</strong></div>
            }
            <p class="summary-text">{{ r.summary }}</p>
            <div class="provenance-row">
              <span>{{ r.provenance.agentName }} v{{ r.provenance.agentVersion }}</span>
              <span>{{ r.provenance.queryIds.length }} OneLake {{ r.provenance.queryIds.length === 1 ? 'query' : 'queries' }}</span>
              <span>{{ r.provenance.webSearches }} web {{ r.provenance.webSearches === 1 ? 'search' : 'searches' }}</span>
              <span>{{ r.sourceProjectIds.length }} projects cited</span>
              <span>Generated {{ r.generatedAtUtc | date: 'medium' }}</span>
            </div>
            @if (r.sourceUrls.length) {
              <div class="source-row">
                <span class="source-label">Web sources:</span>
                @for (url of r.sourceUrls; track $index) {
                  <a class="source-link" [href]="url" target="_blank" rel="noopener noreferrer">{{ url }}</a>
                }
              </div>
            }
          </ion-card-content>
        </ion-card>

        @for (section of r.sections; track $index; let s = $index) {
          <section class="section-block">
            <h3 class="section-title">{{ section.title }}</h3>
            @if (section.description) {
              <p class="section-desc">{{ section.description }}</p>
            }
            <div class="item-grid">
              @for (item of section.items; track $index; let i = $index) {
                <ion-card class="item-card">
                  <ion-card-header>
                    @if (item.badges.length) {
                      <div class="badge-row">
                        @for (badge of item.badges; track $index) {
                          <ion-badge color="medium">{{ badge }}</ion-badge>
                        }
                      </div>
                    }
                    <ion-card-title class="item-title">{{ item.title }}</ion-card-title>
                    @if (item.subtitle) {
                      <ion-card-subtitle>{{ item.subtitle }}</ion-card-subtitle>
                    }
                  </ion-card-header>
                  <ion-card-content>
                    <p class="item-summary">{{ item.summary }}</p>
                    @if (item.metrics.length) {
                      <dl class="metric-grid">
                        @for (metric of item.metrics; track $index) {
                          <div>
                            <dt>{{ metric.label }}</dt>
                            <dd>{{ metric.value }}</dd>
                          </div>
                        }
                      </dl>
                    }
                    @if (item.sourceProjectIds.length) {
                      <div class="source-row">
                        <span class="source-label">OneLake:</span>
                        @for (projectId of item.sourceProjectIds; track $index) {
                          <span class="source-chip">{{ projectId }}</span>
                        }
                      </div>
                    }
                    @if (item.sourceUrls.length) {
                      <div class="source-row">
                        <span class="source-label">Web:</span>
                        @for (url of item.sourceUrls; track $index) {
                          <a class="source-link" [href]="url" target="_blank" rel="noopener noreferrer">{{ url }}</a>
                        }
                      </div>
                    }
                    @if (item.actions.length) {
                      <div class="action-row">
                        @for (action of item.actions; track $index; let a = $index) {
                          <div class="action-item">
                            <ion-button
                              size="small"
                              [color]="action.type === 'addProject' ? 'primary' : 'secondary'"
                              [disabled]="stateOf(s, i, a)?.status === 'running' || stateOf(s, i, a)?.status === 'done'"
                              (click)="runAction(s, i, a, action)"
                            >
                              {{ action.label }}
                            </ion-button>
                            @if (stateOf(s, i, a); as state) {
                              <span class="action-status" [class.failed]="state.status === 'failed'">{{ state.message }}</span>
                            }
                          </div>
                        }
                      </div>
                    }
                  </ion-card-content>
                </ion-card>
              } @empty {
                <p class="empty-note">No items in this section.</p>
              }
            </div>
          </section>
        } @empty {
          <ion-card>
            <ion-card-content>
              <p class="empty-note">The agent returned no recommendations for this request.</p>
            </ion-card-content>
          </ion-card>
        }
      }
    </ion-content>
  `,
  styles: [`
    .rec-page { --rec-muted: #5b6573; }
    .page-header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
    .agent-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #5b2ea6; background: #f3edfc; border-radius: 999px; padding: 4px 10px; }
    .page-title { margin: 6px 0 4px; font-size: 1.5rem; }
    .page-subtitle { margin: 0; color: var(--rec-muted); max-width: 720px; }
    .header-controls { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
    .portfolio-filter { display: flex; flex-direction: column; font-size: 12px; color: var(--rec-muted); gap: 4px; }
    .portfolio-filter select { min-width: 220px; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fff; }
    .research-card { margin: 0 0 16px; }
    .research-row { display: flex; gap: 12px; align-items: center; }
    .research-input { flex: 1; padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; }
    .quick-prompts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .prompt-chip { border: 1px solid #d0d7e2; background: #fff; border-radius: 999px; padding: 6px 12px; font-size: 13px; cursor: pointer; }
    .prompt-chip:disabled { opacity: 0.5; cursor: default; }
    .state-line { display: flex; align-items: center; gap: 10px; color: var(--rec-muted); padding: 16px 0; }
    .error-card { border-left: 4px solid #d13438; }
    .error-text { color: #a4262c; margin: 6px 0 12px; }
    .summary-card { margin: 0 0 16px; }
    .summary-text { font-size: 15px; margin: 0 0 10px; }
    .query-line { font-size: 13px; color: var(--rec-muted); margin-bottom: 6px; }
    .provenance-row { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: var(--rec-muted); }
    .source-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; font-size: 12px; }
    .source-label { color: var(--rec-muted); font-weight: 600; margin-right: 4px; }
    .source-chip { background: #eef2f7; border-radius: 6px; padding: 2px 6px; font-family: monospace; }
    .source-link { color: #0a58ca; word-break: break-all; }
    .section-block { margin: 20px 0; }
    .section-title { margin: 0 0 4px; font-size: 1.15rem; }
    .section-desc { margin: 0 0 12px; color: var(--rec-muted); }
    .item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .item-card { margin: 0; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
    .item-title { font-size: 1rem; }
    .item-summary { margin: 0 0 10px; font-size: 14px; }
    .metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 0 0 10px; }
    .metric-grid div { background: #f7f9fc; border-radius: 6px; padding: 6px 8px; }
    .metric-grid dt { font-size: 11px; color: var(--rec-muted); }
    .metric-grid dd { margin: 0; font-weight: 600; }
    .action-row { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
    .action-item { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .action-status { font-size: 12px; color: #107c10; }
    .action-status.failed { color: #a4262c; }
    .empty-note { color: var(--rec-muted); font-size: 14px; }
  `],
})
export class RecommendationsPageComponent implements OnInit, OnDestroy {
  private readonly dataApi = inject(DataApiService);
  private readonly configService = inject(ConfigService);
  readonly store = inject(PortfolioStore);
  readonly ui = this.configService.config.recommendations;

  readonly report = signal<RecommendationReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeQuery = signal<string | null>(null);
  readonly actionStates = signal<Record<string, ActionState>>({});

  portfolioKey = '';
  researchQuery = '';
  private request?: Subscription;

  ngOnInit(): void {
    this.loadDefault();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  loadDefault(): void {
    this.activeQuery.set(null);
    this.run(this.dataApi.getRecommendations(this.portfolioKey || undefined));
  }

  ask(prompt?: string): void {
    const query = (prompt ?? this.researchQuery).trim();
    if (query.length < 3) return;
    this.researchQuery = query;
    this.activeQuery.set(query);
    this.run(this.dataApi.queryResearcherAgent(query, this.portfolioKey || undefined));
  }

  retry(): void {
    const query = this.activeQuery();
    if (query) {
      this.ask(query);
    } else {
      this.loadDefault();
    }
  }

  stateOf(section: number, item: number, action: number): ActionState | undefined {
    return this.actionStates()[`${section}.${item}.${action}`];
  }

  runAction(section: number, item: number, index: number, action: RecommendationAction): void {
    const key = `${section}.${item}.${index}`;
    this.setState(key, { status: 'running', message: 'Working' });
    const write$: Observable<string> =
      action.type === 'addProject'
        ? this.dataApi.createProject(action.payload, true).pipe(map((res) => `Added as ${res.projectId}`))
        : this.dataApi.postDecision(action.payload).pipe(map((res) => `Recorded ${res.decisionId}`));
    write$.subscribe({
      next: (message) => {
        this.setState(key, { status: 'done', message });
        if (action.type === 'addProject') {
          this.store.init();
        }
      },
      error: (err) => this.setState(key, { status: 'failed', message: problemText(err) }),
    });
  }

  private run(request$: Observable<RecommendationReport>): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.actionStates.set({});
    this.request = request$.subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err) => {
        this.report.set(null);
        this.error.set(problemText(err));
        this.loading.set(false);
      },
    });
  }

  private setState(key: string, state: ActionState): void {
    this.actionStates.update((states) => ({ ...states, [key]: state }));
  }
}
