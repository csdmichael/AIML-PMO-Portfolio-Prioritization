import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonGrid, IonRow, IonCol, IonCard, IonCardContent } from '@ionic/angular';
import { PortfolioStore } from '../../services/portfolio.store';

@Component({
  selector: 'app-kpi-row',
  standalone: true,
  imports: [CommonModule, IonGrid, IonRow, IonCol, IonCard, IonCardContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-grid class="kpi-grid ion-no-padding">
      <ion-row>
        <!-- Filtered Projects Count -->
        <ion-col size="6" size-sm="4" size-lg="2">
          <ion-card class="kpi-card" tabindex="0" role="region" aria-label="Projects Filtered KPI">
            <ion-card-content>
              <div class="kpi-label">Projects Filtered</div>
              <div class="kpi-value text-primary">
                {{ store.metrics().count }}
                <span class="kpi-subtext">/ {{ store.rawProjects().length }}</span>
              </div>
            </ion-card-content>
          </ion-card>
        </ion-col>

        <!-- Must-do-now Count -->
        <ion-col size="6" size-sm="4" size-lg="2">
          <ion-card class="kpi-card" tabindex="0" role="region" aria-label="Must-do-now Count">
            <ion-card-content>
              <div class="kpi-label">Must-do-now</div>
              <div class="kpi-value text-mustdo">
                {{ store.metrics().mustDoNowCount }}
              </div>
            </ion-card-content>
          </ion-card>
        </ion-col>

        <!-- Proceed Count -->
        <ion-col size="6" size-sm="4" size-lg="2">
          <ion-card class="kpi-card" tabindex="0" role="region" aria-label="Proceed Count">
            <ion-card-content>
              <div class="kpi-label">Proceed</div>
              <div class="kpi-value text-proceed">
                {{ store.metrics().proceedCount }}
              </div>
            </ion-card-content>
          </ion-card>
        </ion-col>

        <!-- Avg Confidence -->
        <ion-col size="6" size-sm="4" size-lg="2">
          <ion-card class="kpi-card" tabindex="0" role="region" aria-label="Average Confidence">
            <ion-card-content>
              <div class="kpi-label">Avg Confidence</div>
              <div class="kpi-value text-confidence">
                {{ store.metrics().avgConfidence }}%
              </div>
            </ion-card-content>
          </ion-card>
        </ion-col>

        <!-- Avg Priority -->
        <ion-col size="6" size-sm="4" size-lg="2">
          <ion-card class="kpi-card" tabindex="0" role="region" aria-label="Average Priority Score">
            <ion-card-content>
              <div class="kpi-label">{{ store.metrics().avgPriorityUsesSavedScores ? 'Avg Priority (saved)' : 'Avg Priority' }}</div>
              <div class="kpi-value">
                {{ store.metrics().avgPriority ?? 'No scored projects' }}
              </div>
              <small>{{ store.metrics().scoredProjectCount }} projects with {{ store.metrics().avgPriorityUsesSavedScores ? 'saved' : 'current' }} scores</small>
              @if (store.metrics().avgPriorityUsesSavedScores) {
                <small>Current weighted scores need refreshed evidence. New unscored projects are excluded.</small>
              }
            </ion-card-content>
          </ion-card>
        </ion-col>

        <!-- Total Cost -->
        <ion-col size="6" size-sm="4" size-lg="2">
          <ion-card class="kpi-card" tabindex="0" role="region" aria-label="Total Cost USD">
            <ion-card-content>
              <div class="kpi-label">Total Cost (USD)</div>
              <div class="kpi-value text-cost">
                {{ formatCost(store.metrics().totalCost) }}
              </div>
            </ion-card-content>
          </ion-card>
        </ion-col>
      </ion-row>
    </ion-grid>
  `,
  styles: [
    `
      .kpi-grid {
        margin-bottom: 12px;
      }
      .kpi-card {
        margin: 4px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        border: 1px solid var(--ion-color-step-150, #e6e6e6);
        border-radius: 6px;
      }
      .kpi-card ion-card-content {
        padding: 10px 12px;
      }
      .kpi-label {
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--ion-color-step-500, #737373);
        margin-bottom: 4px;
      }
      .kpi-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--ion-text-color, #1a1a1a);
        line-height: 1.1;
      }
      .kpi-subtext {
        font-size: 0.8rem;
        font-weight: 500;
        color: #888888;
      }
      .text-primary {
        color: #0078d4;
      }
      .text-mustdo {
        color: #d13438;
      }
      .text-proceed {
        color: #107c10;
      }
      .text-confidence {
        color: #038387;
      }
      .text-cost {
        color: #4f6bed;
      }
      .kpi-card:focus-visible {
        outline: 2px solid #0078d4;
      }
    `,
  ],
})
export class KpiRowComponent {
  readonly store = inject(PortfolioStore);

  formatCost(usd: number): string {
    if (usd >= 1000000) {
      return `$${(usd / 1000000).toFixed(1)}M`;
    }
    if (usd >= 1000) {
      return `$${Math.round(usd / 1000)}K`;
    }
    return `$${usd}`;
  }
}
