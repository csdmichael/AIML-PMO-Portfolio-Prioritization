import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import chartHelp from '../../../assets/config/overview-charts.json';

export interface ChartExplanation {
  title: string;
  summary: string;
  detail: string;
  example: string;
}

@Component({
  selector: 'app-chart-explanation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="chart-summary">{{ explanation().summary }}</p>
    <details class="chart-explanation">
      <summary [attr.aria-label]="labels.more + ': ' + explanation().title">{{ labels.more }}</summary>
      <div class="expanded-description">
        <p>{{ explanation().detail }}</p>
        <p class="chart-example"><strong>{{ labels.example }}:</strong> {{ explanation().example }}</p>
      </div>
    </details>
  `,
  styles: [`
    :host { display: block; font-size: 13px; line-height: 1.5; font-weight: 400; }
    .chart-summary { margin: 8px 0 4px; color: var(--ion-color-step-600, #595959); }
    summary { cursor: pointer; color: var(--ion-color-primary, #0078d4); padding: 6px 0; }
    summary:focus-visible { outline: 2px solid var(--ion-color-primary, #0078d4); outline-offset: 3px; border-radius: 2px; }
    .expanded-description { color: var(--ion-text-color, #222222); border-left: 3px solid #dbeafe; padding-left: 12px; }
    .expanded-description p { margin: 6px 0 10px; }
    .chart-example { background: var(--ion-color-step-50, #f8fafc); padding: 10px; border-radius: 6px; }
  `],
})
export class ChartExplanationComponent {
  readonly explanation = input.required<ChartExplanation>();
  readonly labels = chartHelp.labels;
}
