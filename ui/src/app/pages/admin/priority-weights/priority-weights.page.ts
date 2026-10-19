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
  IonItem,
  IonLabel,
  IonInput,
  IonRange,
  IonButton,
  IonIcon,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/angular';
import { DataApiService } from '../../../services/data-api.service';
import { PortfolioStore } from '../../../services/portfolio.store';
import { Project } from '../../../models/portfolio.models';
import { LoadingSkeletonComponent } from '../../../components/loading-skeleton/loading-skeleton.component';

interface FieldWeightDef {
  key: string;
  label: string;
  category: string;
  description: string;
  min: number;
  max: number;
  defaultWeight: number;
}

@Component({
  selector: 'app-priority-weights-page',
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
    IonItem,
    IonLabel,
    IonInput,
    IonRange,
    IonButton,
    IonIcon,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    LoadingSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding weights-page-content">
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">Project Priority Weights</h2>
          <p class="page-subtitle">
            Configure the percentage of impact each field has on project prioritization scores.
          </p>
        </div>
        <div class="header-right">
          <ion-button color="primary" [disabled]="isSaving() || totalWeight() !== 100" (click)="saveWeights()">
            @if (isSaving()) {
              <ion-spinner name="crescent" slot="start"></ion-spinner>
              Saving...
            } @else {
              <ion-icon name="save-outline" slot="start"></ion-icon>
              Save Weights
            }
          </ion-button>
        </div>
      </div>

      <ion-segment [(ngModel)]="activeTab" class="view-segment">
        <ion-segment-button value="global">
          <ion-label>Default Field Weights</ion-label>
        </ion-segment-button>
        <ion-segment-button value="overrides">
          <ion-label>Per-Project Overrides ({{ projectOverrideCount() }})</ion-label>
        </ion-segment-button>
        <ion-segment-button value="preview">
          <ion-label>Impact Preview</ion-label>
        </ion-segment-button>
      </ion-segment>

      @if (isLoading()) {
        <app-loading-skeleton [cards]="2" [rows]="5"></app-loading-skeleton>
      } @else {
        <!-- TAB 1: GLOBAL FIELD WEIGHTS -->
        @if (activeTab === 'global') {
          <ion-card class="config-card">
            <ion-card-header>
              <div class="header-row">
                <div>
                  <ion-card-title>Portfolio Impact Percentages</ion-card-title>
                  <ion-card-subtitle>Adjust how each factor contributes to the priority score.</ion-card-subtitle>
                </div>
                <div class="total-badge-container">
                  <span class="total-label">Total Weight:</span>
                  <ion-badge [color]="totalWeight() === 100 ? 'success' : 'danger'" class="total-badge">
                    {{ totalWeight() }}%
                  </ion-badge>
                  @if (totalWeight() !== 100) {
                    <ion-button size="small" fill="outline" color="warning" (click)="autoBalance()">
                      Auto-Balance to 100%
                    </ion-button>
                  }
                </div>
              </div>

              <!-- Preset Profiles -->
              <div class="presets-bar">
                <span class="presets-label">Preset Profiles:</span>
                @for (preset of presets(); track preset.id) {
                  <button type="button" class="preset-chip" (click)="applyPreset(preset)">
                    {{ preset.name }}
                  </button>
                }
              </div>
            </ion-card-header>

            <ion-card-content>
              <div class="weights-grid">
                @for (field of fields(); track field.key) {
                  <div class="weight-item" [class.highlight-field]="field.key === 'userBase'">
                    <div class="field-meta">
                      <div class="field-name-row">
                        <span class="field-label">{{ field.label }}</span>
                        @if (field.key === 'userBase') {
                          <ion-badge color="primary" class="star-badge">Key Reach Factor</ion-badge>
                        }
                        <span class="field-category">{{ field.category }}</span>
                      </div>
                      <div class="field-desc">{{ field.description }}</div>
                    </div>

                    <div class="slider-control">
                      <ion-range
                        [min]="0"
                        [max]="100"
                        [step]="5"
                        [ticks]="true"
                        [snaps]="true"
                        [value]="currentWeights()[field.key] || 0"
                        (ionChange)="onWeightChange(field.key, $event.detail.value)"
                        color="primary"
                        class="weight-range"
                      >
                      </ion-range>
                      <div class="percent-input-wrap">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          [value]="currentWeights()[field.key] || 0"
                          (change)="onWeightInputChange(field.key, $event)"
                          class="num-input"
                        />
                        <span class="pct-sign">%</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- TAB 2: PER-PROJECT OVERRIDES -->
        @if (activeTab === 'overrides') {
          <ion-card class="config-card">
            <ion-card-header>
              <ion-card-title>Project-Specific Weight Overrides</ion-card-title>
              <ion-card-subtitle>
                Select a specific project to apply custom weight percentages instead of default portfolio weights.
              </ion-card-subtitle>
            </ion-card-header>

            <ion-card-content>
              <div class="override-selector-row">
                <ion-item class="select-item" lines="none">
                  <ion-label position="stacked">Select Project to Customize</ion-label>
                  <ion-select
                    [value]="selectedProjectId()"
                    (ionChange)="selectedProjectId.set($event.detail.value)"
                    placeholder="Choose project (e.g. GIS-0001)"
                    interface="popover"
                  >
                    @for (p of allProjects(); track p.projectId) {
                      <ion-select-option [value]="p.projectId">
                        {{ p.projectId }} - {{ p.projectName }}
                      </ion-select-option>
                    }
                  </ion-select>
                </ion-item>

                @if (selectedProjectId()) {
                  <div class="override-actions">
                    @if (hasOverride(selectedProjectId()!)) {
                      <ion-button fill="outline" color="danger" (click)="removeOverride(selectedProjectId()!)">
                        Remove Custom Weights
                      </ion-button>
                    } @else {
                      <ion-button fill="outline" color="primary" (click)="initOverride(selectedProjectId()!)">
                        Create Custom Weights
                      </ion-button>
                    }
                  </div>
                }
              </div>

              @if (selectedProjectId() && hasOverride(selectedProjectId()!)) {
                <div class="override-editor-box">
                  <div class="editor-header">
                    <h4>Custom Weights for {{ selectedProjectId() }}</h4>
                    <span class="custom-badge">Custom Override</span>
                  </div>

                  <div class="weights-grid compact">
                    @for (field of fields(); track field.key) {
                      <div class="weight-item compact">
                        <span class="field-label">{{ field.label }}</span>
                        <div class="percent-input-wrap">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            [value]="getProjectWeight(selectedProjectId()!, field.key)"
                            (change)="onProjectWeightChange(selectedProjectId()!, field.key, $event)"
                            class="num-input"
                          />
                          <span class="pct-sign">%</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Overrides Table -->
              <div class="active-overrides-section">
                <h4>Active Project Overrides ({{ projectOverrideCount() }})</h4>
                @if (projectOverrideCount() === 0) {
                  <p class="empty-note">No project overrides configured. All projects currently use default weights.</p>
                } @else {
                  <table class="overrides-table">
                    <thead>
                      <tr>
                        <th>Project ID</th>
                        <th>Custom Weights Configured</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of projectOverridesList(); track item.projectId) {
                        <tr>
                          <td><strong>{{ item.projectId }}</strong></td>
                          <td>{{ formatWeightsSummary(item.weights) }}</td>
                          <td>
                            <ion-button size="small" fill="clear" color="primary" (click)="selectedProjectId.set(item.projectId)">
                              Edit
                            </ion-button>
                            <ion-button size="small" fill="clear" color="danger" (click)="removeOverride(item.projectId)">
                              Reset to Default
                            </ion-button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- TAB 3: IMPACT PREVIEW -->
        @if (activeTab === 'preview') {
          <ion-card class="config-card">
            <ion-card-header>
              <ion-card-title>Prioritization Impact Preview</ion-card-title>
              <ion-card-subtitle>
                Live simulation showing project scores re-ranked based on current configured weights.
              </ion-card-subtitle>
            </ion-card-header>

            <ion-card-content>
              <table class="preview-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Project</th>
                    <th>Business Unit</th>
                    <th>Impacted Users</th>
                    <th>Business Value</th>
                    <th>Original Score</th>
                    <th>Simulated Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of previewRanking(); track p.project.projectId; let i = $index) {
                    <tr>
                      <td class="rank-cell">#{{ i + 1 }}</td>
                      <td>
                        <strong>{{ p.project.projectId }}</strong>
                        <div class="p-name">{{ p.project.projectName }}</div>
                      </td>
                      <td>{{ p.project.businessUnit }}</td>
                      <td>
                        <ion-badge color="medium">{{ p.project.userBase || 350 | number }} users</ion-badge>
                      </td>
                      <td>{{ p.project.businessValue }} / 5</td>
                      <td>{{ p.project.priorityScore | number:'1.1-1' }}</td>
                      <td>
                        <strong class="sim-score">{{ p.simulatedScore | number:'1.1-1' }}</strong>
                      </td>
                      <td>
                        @if (p.simulatedScore > p.project.priorityScore) {
                          <span class="diff up">&uarr; +{{ (p.simulatedScore - p.project.priorityScore) | number:'1.1-1' }}</span>
                        } @else if (p.simulatedScore < p.project.priorityScore) {
                          <span class="diff down">&darr; {{ (p.simulatedScore - p.project.priorityScore) | number:'1.1-1' }}</span>
                        } @else {
                          <span class="diff same">&mdash;</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </ion-card-content>
          </ion-card>
        }
      }
    </ion-content>
  `,
  styles: [`
    .weights-page-content {
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
    .view-segment {
      margin-bottom: 20px;
      background: #e2e8f0;
      border-radius: 8px;
    }
    .config-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .total-badge-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .total-label {
      font-size: 14px;
      font-weight: 600;
      color: #475569;
    }
    .total-badge {
      font-size: 16px;
      padding: 6px 12px;
      border-radius: 6px;
    }
    .presets-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      flex-wrap: wrap;
    }
    .presets-label {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
    }
    .preset-chip {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 4px 12px;
      font-size: 12px;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s;
    }
    .preset-chip:hover {
      background: #0078d4;
      color: #ffffff;
      border-color: #0078d4;
    }
    .weights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 16px;
      padding: 8px 0;
    }
    .weights-grid.compact {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .weight-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .weight-item.highlight-field {
      border: 2px solid #0078d4;
      background: #f0f7ff;
    }
    .weight-item.compact {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
    .field-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .field-label {
      font-weight: 600;
      font-size: 14px;
      color: #1e293b;
    }
    .field-category {
      font-size: 11px;
      color: #64748b;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .star-badge {
      font-size: 11px;
    }
    .field-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }
    .slider-control {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .weight-range {
      flex: 1;
      padding: 0;
    }
    .percent-input-wrap {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 2px 6px;
      width: 70px;
    }
    .num-input {
      width: 44px;
      border: none;
      font-size: 14px;
      font-weight: 600;
      text-align: right;
      color: #0f172a;
      outline: none;
    }
    .pct-sign {
      font-size: 13px;
      color: #64748b;
      margin-left: 2px;
    }
    .override-selector-row {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .select-item {
      flex: 1;
      min-width: 280px;
      --background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .override-editor-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .editor-header h4 {
      margin: 0;
      font-size: 16px;
      color: #0f172a;
    }
    .custom-badge {
      background: #e0f2fe;
      color: #0369a1;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .overrides-table, .preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 10px;
    }
    .overrides-table th, .preview-table th {
      text-align: left;
      padding: 10px 12px;
      background: #f1f5f9;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 600;
    }
    .overrides-table td, .preview-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .rank-cell {
      font-weight: 700;
      color: #0078d4;
    }
    .p-name {
      font-size: 12px;
      color: #64748b;
    }
    .sim-score {
      color: #0078d4;
      font-size: 14px;
    }
    .diff.up {
      color: #107c10;
      font-weight: 600;
    }
    .diff.down {
      color: #d13438;
      font-weight: 600;
    }
    .diff.same {
      color: #94a3b8;
    }
    .empty-note {
      color: #64748b;
      font-style: italic;
      font-size: 13px;
    }
  `],
})
export class PriorityWeightsPageComponent implements OnInit {
  private readonly dataApi = inject(DataApiService);
  readonly store = inject(PortfolioStore);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  activeTab = 'global';

  readonly fields = signal<FieldWeightDef[]>([]);
  readonly currentWeights = signal<Record<string, number>>({});
  readonly projectOverrides = signal<Record<string, Record<string, number>>>({});
  readonly presets = signal<any[]>([]);
  readonly selectedProjectId = signal<string | null>(null);

  readonly allProjects = computed(() => this.store.dataset()?.projects || []);

  readonly totalWeight = computed(() => {
    const w = this.currentWeights();
    const sum = Object.values(w).reduce((acc, v) => acc + (Number(v) || 0), 0);
    return Math.round(sum);
  });

  readonly projectOverrideCount = computed(() => {
    return Object.keys(this.projectOverrides()).length;
  });

  readonly projectOverridesList = computed(() => {
    const po = this.projectOverrides();
    return Object.entries(po).map(([projectId, weights]) => ({ projectId, weights }));
  });

  readonly previewRanking = computed(() => {
    const projects = this.allProjects();
    const w = this.currentWeights();
    const totalW = this.totalWeight() || 1;

    return projects
      .map((p) => {
        const u = p.userBase || 350;
        const userFactor = Math.min(100, Math.max(0, (Math.log10(Math.max(1, u)) / 5.0) * 100));
        const valFactor = ((p.businessValue || 1) / 5.0) * 100;
        const regFactor = p.regulatorySecurity ? 100 : 0;
        const urgencyFactor = Math.min(100, Math.max(0, ((36 - (p.monthsToGoLive || 24)) / 36) * 100));
        const sponsorFactor = p.sponsorLevel === 'Executive' ? 100 : p.sponsorLevel === 'Director' ? 75 : 50;
        const dtFactor = p.dtAlignment ? 100 : 0;
        const riskFactor = p.riskRating === 'Critical' ? 100 : p.riskRating === 'High' ? 75 : 50;
        const costFactor = Math.min(100, Math.max(0, ((Math.log10(Math.max(1000, p.costEstimateUsd || 10000)) - 4) / 3) * 100));

        const factors: Record<string, number> = {
          businessValue: valFactor,
          userBase: userFactor,
          regulatorySecurity: regFactor,
          timingUrgency: urgencyFactor,
          sponsorPriority: sponsorFactor,
          dtAlignment: dtFactor,
          risk: riskFactor,
          cost: costFactor,
          dependencies: Math.min(100, (p.dependencyCount || 0) * 20),
          effort: Math.min(100, (p.effortPersonWeeks || 0) * 2.5),
          skillDemand: Math.min(100, (p.skillDemandFte || 0) * 10),
        };

        const score = Object.keys(w).reduce((acc, k) => acc + (factors[k] || 0) * (w[k] || 0), 0) / totalW;
        return {
          project: p,
          simulatedScore: Math.round(score * 10) / 10,
        };
      })
      .sort((a, b) => b.simulatedScore - a.simulatedScore)
      .slice(0, 15);
  });

  ngOnInit(): void {
    this.dataApi.getPriorityWeights().subscribe({
      next: (res) => {
        this.fields.set(res.availableFields || []);
        this.currentWeights.set(res.defaultWeights || {});
        this.projectOverrides.set(res.projectOverrides || {});
        this.presets.set(res.presets || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  onWeightChange(key: string, value: any): void {
    const val = Number(value) || 0;
    this.currentWeights.update((w) => ({ ...w, [key]: val }));
  }

  onWeightInputChange(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = Math.min(100, Math.max(0, Number(target.value) || 0));
    this.currentWeights.update((w) => ({ ...w, [key]: val }));
  }

  applyPreset(preset: any): void {
    if (preset.weights) {
      this.currentWeights.set({ ...preset.weights });
    }
  }

  autoBalance(): void {
    const w = { ...this.currentWeights() };
    const currentSum = Object.values(w).reduce((acc, v) => acc + (Number(v) || 0), 0);
    if (currentSum <= 0) return;
    const factor = 100 / currentSum;
    let newSum = 0;
    for (const k of Object.keys(w)) {
      w[k] = Math.round(w[k] * factor);
      newSum += w[k];
    }
    const diff = 100 - newSum;
    if (diff !== 0 && w['businessValue'] !== undefined) {
      w['businessValue'] += diff;
    }
    this.currentWeights.set(w);
  }

  hasOverride(projectId: string): boolean {
    return !!this.projectOverrides()[projectId];
  }

  initOverride(projectId: string): void {
    this.projectOverrides.update((po) => ({
      ...po,
      [projectId]: { ...this.currentWeights() },
    }));
  }

  removeOverride(projectId: string): void {
    this.projectOverrides.update((po) => {
      const next = { ...po };
      delete next[projectId];
      return next;
    });
  }

  getProjectWeight(projectId: string, fieldKey: string): number {
    return this.projectOverrides()[projectId]?.[fieldKey] ?? this.currentWeights()[fieldKey] ?? 0;
  }

  onProjectWeightChange(projectId: string, fieldKey: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = Math.min(100, Math.max(0, Number(target.value) || 0));
    this.projectOverrides.update((po) => {
      const cur = { ...(po[projectId] || this.currentWeights()) };
      cur[fieldKey] = val;
      return { ...po, [projectId]: cur };
    });
  }

  formatWeightsSummary(weights: Record<string, number>): string {
    const top = Object.entries(weights)
      .filter(([_, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}%`)
      .join(', ');
    return top || 'Custom balanced';
  }

  saveWeights(): void {
    this.isSaving.set(true);
    this.dataApi
      .updatePriorityWeights({
        defaultWeights: this.currentWeights(),
        projectOverrides: this.projectOverrides(),
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
        },
        error: () => this.isSaving.set(false),
      });
  }
}
