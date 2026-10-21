import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonItem, IonLabel, IonRange, IonButton, IonIcon, IonBadge, IonSegment,
  IonSegmentButton, IonSelect, IonSelectOption, IonSpinner,
} from '@ionic/angular';
import { DataApiService } from '../../../services/data-api.service';
import { PortfolioStore } from '../../../services/portfolio.store';
import { Project } from '../../../models/portfolio.models';
import { problemMessage } from '../../../core/problem-detail';
import { LoadingSkeletonComponent } from '../../../components/loading-skeleton/loading-skeleton.component';
import {
  PriorityFieldWeight, PriorityScoreMetadata, PriorityWeightMap, PriorityWeightPreset,
  PriorityWeightsResponse, PriorityWeightsUpdateRequest,
} from './priority-weights.models';

type WeightedProject = Project & PriorityScoreMetadata;

@Component({
  selector: 'app-priority-weights-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonCard, IonCardHeader, IonCardTitle,
    IonCardSubtitle, IonCardContent, IonItem, IonLabel, IonRange, IonButton,
    IonIcon, IonBadge, IonSegment, IonSegmentButton, IonSelect, IonSelectOption,
    IonSpinner, LoadingSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding weights-page-content">
      <div class="page-header">
        <div>
          <h2>Project Priority Weights</h2>
          <p>Project overrides take precedence over portfolio overrides, then global defaults.</p>
          <p>Changes apply to saved analysis immediately after saving; future projects inherit their portfolio's weights.
            ML predictions, tiers, confidence, explanations, and project progress are not changed.</p>
        </div>
        <ion-button class="save-weights" [disabled]="!canSave()" (click)="saveWeights()">
          @if (isSaving()) {
            <ion-spinner name="crescent" slot="start"></ion-spinner> Saving...
          } @else {
            <ion-icon name="save-outline" slot="start"></ion-icon> Save Weights
          }
        </ion-button>
      </div>

      @if (loadError()) {
        <div role="alert" class="notice error load-error">
          {{ loadError() }}
          <ion-button fill="outline" size="small" (click)="loadWeights()">Retry loading weights</ion-button>
        </div>
      }
      @if (saveError()) {
        <div role="alert" class="notice error save-error">
          {{ saveError() }}
          <ion-button fill="outline" size="small" (click)="loadWeights()">Reload saved weights (discards edits)</ion-button>
        </div>
      }
      @if (saveSuccess()) {
        <div role="status" class="notice success">{{ saveSuccess() }}</div>
      }

      <ion-segment [(ngModel)]="activeTab" class="view-segment">
        <ion-segment-button value="global"><ion-label>Global Defaults</ion-label></ion-segment-button>
        <ion-segment-button value="portfolios"><ion-label>Portfolio Overrides</ion-label></ion-segment-button>
        <ion-segment-button value="overrides"><ion-label>Project Overrides</ion-label></ion-segment-button>
        <ion-segment-button value="results"><ion-label>Saved Results</ion-label></ion-segment-button>
      </ion-segment>

      @if (isLoading()) {
        <app-loading-skeleton [cards]="2" [rows]="5"></app-loading-skeleton>
      } @else if (!loadError()) {
        @if (validationError()) {
          <div role="alert" class="notice error validation-error">{{ validationError() }}</div>
        }
        @if (hasUnsavedChanges()) {
          <p class="unsaved-note">Unsaved changes. Save to apply them; saved results below do not simulate draft weights.</p>
        }

        @if (activeTab === 'global') {
          <ion-card>
            <ion-card-header>
              <ion-card-title>Global Field Weights</ion-card-title>
              <ion-card-subtitle>
                Weights are relative: each factor's effective percentage is its weight divided by the total.
                Priority uses 40% saved ML score and 60% field-weighted score, with recorded rule floors preserved.
              </ion-card-subtitle>
              <div class="total-row">
                <ion-badge [color]="totalWeight() > 0 ? 'primary' : 'danger'">Total weight: {{ totalWeight() }}</ion-badge>
                <ion-button fill="outline" size="small" (click)="autoBalance()" [disabled]="!!validationError()">
                  Normalize to 100
                </ion-button>
              </div>
              <div class="presets-bar">
                @for (preset of presets(); track preset.id) {
                  <ion-button fill="outline" size="small" (click)="applyPreset(preset)">{{ preset.name }}</ion-button>
                }
              </div>
            </ion-card-header>
            <ion-card-content>
              <div class="weights-grid">
                @for (field of fields(); track field.key) {
                  <div class="weight-item">
                    <label [for]="'global-' + field.key">{{ field.label }} <small>{{ field.category }}</small></label>
                    <p>{{ field.description }}</p>
                    <ion-range [min]="0" [max]="100" [step]="1" [value]="currentWeights()[field.key] ?? 0"
                      [attr.aria-label]="field.label + ' weight'"
                      (ionChange)="onWeightChange(field.key, $event.detail.value)"></ion-range>
                    <div class="weight-value">
                      <input [id]="'global-' + field.key" type="number" min="0" step="any"
                        [value]="currentWeights()[field.key] ?? 0" (change)="onWeightInputChange(field.key, $event)" />
                      <span>{{ percentage(currentWeights(), field.key) | number:'1.1-2' }}% effective</span>
                    </div>
                  </div>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }

        @if (activeTab === 'portfolios') {
          <ion-card>
            <ion-card-header>
              <ion-card-title>Portfolio Weight Overrides</ion-card-title>
              <ion-card-subtitle>
                Set only the factors this portfolio should override. Blank fields inherit global defaults.
                Current and future projects inherit these weights unless a project overrides a factor.
              </ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <ion-item lines="none">
                <ion-label position="stacked">Portfolio to customize</ion-label>
                <ion-select class="portfolio-selector" [value]="selectedPortfolioKey()" placeholder="Choose a portfolio"
                  interface="popover" (ionChange)="selectPortfolio($event.detail.value)">
                  @for (portfolio of portfolioItems(); track portfolio.key) {
                    <ion-select-option [value]="portfolio.key">{{ portfolio.displayName }}</ion-select-option>
                  }
                </ion-select>
              </ion-item>
              @if (selectedPortfolioKey(); as key) {
                <div class="scope-actions">
                  @if (hasPortfolioOverride(key)) {
                    <ion-button class="reset-portfolio" color="danger" fill="outline" (click)="removePortfolioOverride(key)">
                      Reset Portfolio to Global Defaults
                    </ion-button>
                  } @else {
                    <ion-button class="customize-portfolio" fill="outline" (click)="initPortfolioOverride(key)">
                      Customize Portfolio
                    </ion-button>
                  }
                  <span class="scope-summary">{{ hasPortfolioOverride(key) ? 'Portfolio overrides global factors' : 'Inherits global defaults' }}</span>
                </div>
                <div class="weights-grid compact">
                  @for (field of fields(); track field.key) {
                    <div class="weight-item">
                      <label [for]="'portfolio-' + field.key">{{ field.label }}</label>
                      <input [id]="'portfolio-' + field.key" type="number" min="0" step="any"
                        [disabled]="!hasPortfolioOverride(key)" [value]="portfolioOverrides()[key]?.[field.key] ?? ''"
                        [placeholder]="'Inherited: ' + (currentWeights()[field.key] ?? 0)"
                        (change)="onPortfolioWeightChange(key, field.key, $event)" />
                      <span class="effective-weight">{{ getPortfolioWeight(key, field.key) }} weight ·
                        {{ percentage(effectivePortfolioWeights(key), field.key) | number:'1.1-2' }}% effective
                        ({{ portfolioOverrides()[key]?.[field.key] !== undefined ? 'Portfolio' : 'Global' }})</span>
                    </div>
                  }
                </div>
              }
            </ion-card-content>
          </ion-card>
        }

        @if (activeTab === 'overrides') {
          <ion-card>
            <ion-card-header>
              <ion-card-title>Project Weight Overrides</ion-card-title>
              <ion-card-subtitle>
                A project overrides only the factors you enter. Blank fields inherit its portfolio, then global defaults.
              </ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <ion-item lines="none">
                <ion-label position="stacked">Project to customize</ion-label>
                <ion-select class="project-selector" [value]="selectedProjectId()" placeholder="Choose a project"
                  interface="popover" (ionChange)="selectProject($event.detail.value)">
                  @for (project of allProjects(); track project.projectId) {
                    <ion-select-option [value]="project.projectId">{{ project.projectId }} — {{ project.projectName }}</ion-select-option>
                  }
                </ion-select>
              </ion-item>
              @if (selectedProjectId(); as id) {
                <div class="scope-actions">
                  @if (hasOverride(id)) {
                    <ion-button class="reset-project" color="danger" fill="outline" (click)="removeOverride(id)">
                      Reset Project to Inherited Weights
                    </ion-button>
                  } @else {
                    <ion-button class="customize-project" fill="outline" (click)="initOverride(id)">Customize Project</ion-button>
                  }
                </div>
                <div class="weights-grid compact">
                  @for (field of fields(); track field.key) {
                    <div class="weight-item">
                      <label [for]="'project-' + field.key">{{ field.label }}</label>
                      <input [id]="'project-' + field.key" type="number" min="0" step="any" [disabled]="!hasOverride(id)"
                        [value]="projectOverrides()[id]?.[field.key] ?? ''"
                        [placeholder]="'Inherited: ' + inheritedProjectWeight(id, field.key)"
                        (change)="onProjectWeightChange(id, field.key, $event)" />
                      <span class="effective-weight">{{ getProjectWeight(id, field.key) }} weight ·
                        {{ percentage(effectiveProjectWeights(id), field.key) | number:'1.1-2' }}% effective
                        ({{ projectWeightSource(id, field.key) }})</span>
                    </div>
                  }
                </div>
              }
            </ion-card-content>
          </ion-card>
        }

        @if (activeTab === 'results') {
          <ion-card>
            <ion-card-header>
              <ion-card-title>Saved Prioritization Results</ion-card-title>
              <ion-card-subtitle>
                Scores are returned by the server from saved analysis, not simulated in this page.
                Unsaved weight edits are not included. Missing analysis is never given a fabricated score.
              </ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              @if (store.isLoading()) {
                <ion-spinner name="crescent"></ion-spinner>
              }
              @if (store.loadError()) {
                <p role="alert" class="notice error">{{ store.loadError() }}</p>
              }
              <div class="table-scroll">
                <table class="results-table">
                  <thead><tr><th>Project</th><th>Portfolio</th><th>Saved ML tier</th><th>Priority score</th><th>Weight scope</th><th>Scoring state</th></tr></thead>
                  <tbody>
                    @for (project of savedRanking(); track project.projectId) {
                      <tr>
                        <td><strong>{{ project.projectId }}</strong><div>{{ project.projectName }}</div></td>
                        <td>{{ project.portfolio }}</td>
                        <td>{{ project.mlTier || 'Awaiting analysis' }}</td>
                        <td class="saved-score">
                          @if (hasScore(project)) { {{ project.priorityScore | number:'1.1-1' }} } @else { — }
                        </td>
                        <td>{{ project.priorityWeightScope || 'Not recorded' }}</td>
                        <td>{{ scoreStateLabel(project) }}
                          @if (project.priorityScoreReason) { <small>{{ project.priorityScoreReason }}</small> }
                        </td>
                      </tr>
                    } @empty {
                      <tr><td colspan="6">No saved projects are available.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </ion-card-content>
          </ion-card>
        }
      }
    </ion-content>
  `,
  styles: [`
    .weights-page-content { --background: #f8fafc; }
    .page-header { display: flex; align-items: start; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; }
    .page-header > div { max-width: 850px; }
    h2 { color: #0f172a; margin: 0 0 8px; }
    p, ion-card-subtitle { color: #475569; font-size: 13px; line-height: 1.6; }
    .view-segment { margin-bottom: 20px; overflow-x: auto; }
    ion-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; }
    .notice { padding: 12px 16px; border: 1px solid; border-radius: 8px; margin-bottom: 12px; }
    .error { background: #fff1f2; border-color: #fecdd3; color: #9f1239; }
    .success { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .unsaved-note { color: #854d0e; }
    .total-row, .scope-actions, .presets-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
    .scope-summary { color: #475569; font-size: 13px; }
    .weights-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 16px; margin-top: 16px; }
    .compact { grid-template-columns: repeat(auto-fit, minmax(min(100%, 235px), 1fr)); }
    .weight-item { padding: 14px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px; display: flex; flex-direction: column; gap: 8px; }
    label { font-weight: 600; color: #1e293b; }
    label small { margin-left: 8px; color: #64748b; font-weight: 400; }
    .weight-item p { margin: 0; }
    .weight-value { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
    input { max-width: 180px; border: 1px solid #94a3b8; border-radius: 6px; padding: 8px; background: #fff; color: #0f172a; }
    input:focus { outline: 2px solid #0078d4; outline-offset: 2px; }
    .effective-weight, .weight-value span, td small { font-size: 12px; color: #475569; }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
    th { background: #f1f5f9; }
    td small { display: block; margin-top: 4px; }
  `],
})
export class PriorityWeightsPageComponent implements OnInit {
  private readonly dataApi = inject(DataApiService);
  readonly store = inject(PortfolioStore);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal<string | null>(null);
  activeTab = 'global';
  readonly fields = signal<PriorityFieldWeight[]>([]);
  readonly currentWeights = signal<PriorityWeightMap>({});
  readonly portfolioOverrides = signal<Record<string, PriorityWeightMap>>({});
  readonly projectOverrides = signal<Record<string, PriorityWeightMap>>({});
  readonly presets = signal<PriorityWeightPreset[]>([]);
  readonly selectedPortfolioKey = signal<string | null>(null);
  readonly selectedProjectId = signal<string | null>(null);
  readonly savedSettings = signal<PriorityWeightsResponse | null>(null);
  readonly portfolioItems = computed(() => this.store.portfolioItems());
  readonly allProjects = computed<WeightedProject[]>(() => (this.store.dataset()?.projects ?? []).filter(p => !p.isDeleted));
  readonly totalWeight = computed(() => this.roundTotal(this.currentWeights()));
  readonly hasUnsavedChanges = computed(() => {
    const saved = this.savedSettings();
    return !!saved && (
      !this.sameWeights(this.currentWeights(), saved.defaultWeights)
      || Object.keys(this.scopeChanges(this.portfolioOverrides(), saved.portfolioOverrides ?? {})).length > 0
      || Object.keys(this.scopeChanges(this.projectOverrides(), saved.projectOverrides ?? {})).length > 0
    );
  });
  readonly validationError = computed(() => {
    const maps = [this.currentWeights(), ...Object.values(this.portfolioOverrides()), ...Object.values(this.projectOverrides())];
    if (maps.some(weights => Object.values(weights).some(value => !Number.isFinite(value) || value < 0))) {
      return 'Weights must be finite, nonnegative numbers. Leave an override blank to inherit its parent.';
    }
    if (!this.validTotal(this.currentWeights())) return 'Global weights must have a positive, finite total.';
    if (Object.keys(this.portfolioOverrides()).some(key => !this.validTotal(this.effectivePortfolioWeights(key)))) {
      return 'Each portfolio must have a positive, finite effective weight total.';
    }
    if (Object.keys(this.projectOverrides()).some(id => !this.validTotal(this.effectiveProjectWeights(id)))) {
      return 'Each project must have a positive, finite effective weight total.';
    }
    return null;
  });
  readonly canSave = computed(() =>
    !this.isLoading() && !this.isSaving() && !this.loadError() && !!this.savedSettings()
    && !this.validationError() && this.hasUnsavedChanges(),
  );
  readonly savedRanking = computed(() => [...this.allProjects()].sort((a, b) => {
    if (this.hasScore(a) !== this.hasScore(b)) return this.hasScore(a) ? -1 : 1;
    return (this.hasScore(a) && this.hasScore(b) ? Number(b.priorityScore) - Number(a.priorityScore) : 0)
      || a.projectId.localeCompare(b.projectId);
  }));

  ngOnInit(): void { this.loadWeights(); }

  loadWeights(): void {
    if (this.isSaving()) return;
    this.isLoading.set(true);
    this.loadError.set(null);
    this.saveError.set(null);
    this.saveSuccess.set(null);
    this.dataApi.getPriorityWeights().subscribe({
      next: (response: PriorityWeightsResponse) => {
        this.installSettings(response);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(problemMessage(error, 'Priority weights could not be loaded. No settings were changed.'));
        this.isLoading.set(false);
      },
    });
  }

  selectPortfolio(value: string | null): void { this.selectedPortfolioKey.set(value || null); }
  selectProject(value: string | null): void { this.selectedProjectId.set(value || null); }

  onWeightChange(key: string, value: unknown): void {
    this.currentWeights.update(weights => ({ ...weights, [key]: Number(value) }));
    this.saveSuccess.set(null);
  }

  onWeightInputChange(key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.onWeightChange(key, value.trim() ? Number(value) : Number.NaN);
  }

  applyPreset(preset: PriorityWeightPreset): void {
    this.currentWeights.set({ ...preset.weights });
    this.saveSuccess.set(null);
  }

  autoBalance(): void {
    const total = Object.values(this.currentWeights()).reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || total <= 0 || Object.values(this.currentWeights()).some(value => value < 0)) return;
    const normalized = Object.fromEntries(Object.entries(this.currentWeights()).map(([key, value]) => [key, Math.round(value / total * 10000) / 100]));
    const largest = Object.keys(normalized).sort((a, b) => normalized[b] - normalized[a])[0];
    normalized[largest] = Math.round((normalized[largest] + 100 - this.roundTotal(normalized)) * 100) / 100;
    this.currentWeights.set(normalized);
    this.saveSuccess.set(null);
  }

  hasPortfolioOverride(key: string): boolean { return Object.hasOwn(this.portfolioOverrides(), key); }
  hasOverride(id: string): boolean { return Object.hasOwn(this.projectOverrides(), id); }

  initPortfolioOverride(key: string): void {
    this.portfolioOverrides.update(overrides => ({ ...overrides, [key]: overrides[key] ?? {} }));
  }
  initOverride(id: string): void {
    this.projectOverrides.update(overrides => ({ ...overrides, [id]: overrides[id] ?? {} }));
  }
  removePortfolioOverride(key: string): void {
    this.portfolioOverrides.update(overrides => this.withoutKey(overrides, key));
    this.saveSuccess.set(null);
  }
  removeOverride(id: string): void {
    this.projectOverrides.update(overrides => this.withoutKey(overrides, id));
    this.saveSuccess.set(null);
  }
  onPortfolioWeightChange(key: string, field: string, event: Event): void {
    this.portfolioOverrides.update(overrides => ({ ...overrides, [key]: this.editOverride(overrides[key] ?? {}, field, event) }));
    this.saveSuccess.set(null);
  }
  onProjectWeightChange(id: string, field: string, event: Event): void {
    this.projectOverrides.update(overrides => ({ ...overrides, [id]: this.editOverride(overrides[id] ?? {}, field, event) }));
    this.saveSuccess.set(null);
  }
  effectivePortfolioWeights(key: string | null): PriorityWeightMap {
    return { ...this.currentWeights(), ...(key ? this.portfolioOverrides()[key] : {}) };
  }
  effectiveProjectWeights(id: string): PriorityWeightMap {
    return { ...this.effectivePortfolioWeights(this.projectPortfolio(id)), ...this.projectOverrides()[id] };
  }
  getPortfolioWeight(key: string, field: string): number { return this.effectivePortfolioWeights(key)[field] ?? 0; }
  getProjectWeight(id: string, field: string): number { return this.effectiveProjectWeights(id)[field] ?? 0; }
  inheritedProjectWeight(id: string, field: string): number {
    return this.effectivePortfolioWeights(this.projectPortfolio(id))[field] ?? 0;
  }
  projectWeightSource(id: string, field: string): string {
    if (this.projectOverrides()[id]?.[field] !== undefined) return 'Project';
    const portfolio = this.projectPortfolio(id);
    return portfolio && this.portfolioOverrides()[portfolio]?.[field] !== undefined ? 'Portfolio' : 'Global';
  }
  percentage(weights: PriorityWeightMap, field: string): number {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    return Number.isFinite(total) && total > 0 ? (weights[field] ?? 0) / total * 100 : 0;
  }
  hasScore(project: WeightedProject): boolean {
    return project.priorityScoreState !== 'awaiting-analysis' && project.priorityScoreState !== 'requires-analysis'
      && typeof project.priorityScore === 'number' && Number.isFinite(project.priorityScore);
  }
  scoreStateLabel(project: WeightedProject): string {
    if (project.priorityScoreState === 'awaiting-analysis') return 'Awaiting analysis';
    if (project.priorityScoreState === 'requires-analysis') return 'Requires analysis';
    return this.hasScore(project) ? 'Saved analysis' : 'Awaiting analysis';
  }

  saveWeights(): void {
    if (!this.canSave()) return;
    const saved = this.savedSettings()!;
    const request: PriorityWeightsUpdateRequest = { etag: saved.etag ?? null };
    if (!this.sameWeights(this.currentWeights(), saved.defaultWeights)) request.defaultWeights = { ...this.currentWeights() };
    const portfolios = this.scopeChanges(this.portfolioOverrides(), saved.portfolioOverrides ?? {});
    const projects = this.scopeChanges(this.projectOverrides(), saved.projectOverrides ?? {});
    if (Object.keys(portfolios).length) request.portfolioOverrides = portfolios;
    if (Object.keys(projects).length) request.projectOverrides = projects;
    this.isSaving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);
    this.dataApi.updatePriorityWeights(request).subscribe({
      next: (response: PriorityWeightsResponse) => {
        this.installSettings(response);
        this.isSaving.set(false);
        this.saveSuccess.set('Priority weights saved. Refreshing scores from saved analysis; ML predictions and project progress are unchanged.');
        this.store.refresh();
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.saveError.set(problemMessage(error, 'Priority weights could not be saved. Your edits are still here; please retry.'));
      },
    });
  }

  private installSettings(response: PriorityWeightsResponse): void {
    this.savedSettings.set(response);
    this.fields.set(response.availableFields);
    this.currentWeights.set({ ...response.defaultWeights });
    this.portfolioOverrides.set(this.copyScopes(response.portfolioOverrides ?? {}));
    this.projectOverrides.set(this.copyScopes(response.projectOverrides ?? {}));
    this.presets.set(response.presets ?? []);
  }
  private projectPortfolio(id: string): string | null {
    return this.allProjects().find(project => project.projectId === id)?.portfolioKey ?? null;
  }
  private validTotal(weights: PriorityWeightMap): boolean {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    return Number.isFinite(total) && total > 0;
  }
  private roundTotal(weights: PriorityWeightMap): number {
    return Math.round(Object.values(weights).reduce((sum, value) => sum + value, 0) * 100) / 100;
  }
  private sameWeights(left: PriorityWeightMap, right: PriorityWeightMap): boolean {
    return JSON.stringify(Object.entries(left).sort()) === JSON.stringify(Object.entries(right).sort());
  }
  private scopeChanges(current: Record<string, PriorityWeightMap>, saved: Record<string, PriorityWeightMap>): Record<string, PriorityWeightMap> {
    const changes: Record<string, PriorityWeightMap> = {};
    for (const key of new Set([...Object.keys(saved), ...Object.keys(current)])) {
      if (!this.sameWeights(current[key] ?? {}, saved[key] ?? {})) changes[key] = { ...current[key] };
    }
    return changes;
  }
  private copyScopes(scopes: Record<string, PriorityWeightMap>): Record<string, PriorityWeightMap> {
    return Object.fromEntries(Object.entries(scopes).map(([key, weights]) => [key, { ...weights }]));
  }
  private withoutKey(scopes: Record<string, PriorityWeightMap>, key: string): Record<string, PriorityWeightMap> {
    const next = { ...scopes };
    delete next[key];
    return next;
  }
  private editOverride(weights: PriorityWeightMap, field: string, event: Event): PriorityWeightMap {
    const value = (event.target as HTMLInputElement).value.trim();
    const next = { ...weights };
    if (!value) delete next[field];
    else next[field] = Number(value);
    return next;
  }
}
