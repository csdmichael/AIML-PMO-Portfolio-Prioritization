import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfidenceLevel } from '../../models/portfolio.models';
import { getConfidenceColor } from '../../core/portfolio-filter';

@Component({
  selector: 'app-confidence-ring',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ring-container" [style.width.px]="size()" [style.height.px]="size()">
      <svg class="ring-svg" [attr.viewBox]="'0 0 ' + size() + ' ' + size()">
        <circle
          class="ring-bg"
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          [attr.stroke-width]="strokeWidth()"
        />
        <circle
          class="ring-progress"
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          [attr.stroke-width]="strokeWidth()"
          [style.stroke]="ringColor()"
          [style.stroke-dasharray]="circumference()"
          [style.stroke-dashoffset]="dashOffset()"
        />
      </svg>
      <div class="ring-content">
        <span class="score-text">{{ scoreFormatted() }}</span>
        @if (showLevel()) {
          <span class="level-badge" [style.background-color]="ringColor()">{{ level() }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      .ring-container {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .ring-svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }
      .ring-bg {
        fill: transparent;
        stroke: var(--ion-color-step-150, #e0e0e0);
      }
      .ring-progress {
        fill: transparent;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.4s ease;
      }
      .ring-content {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      .score-text {
        font-weight: 700;
        font-size: 0.85rem;
        line-height: 1;
        color: var(--ion-text-color, #1f1f1f);
      }
      .level-badge {
        margin-top: 2px;
        font-size: 0.6rem;
        padding: 1px 4px;
        border-radius: 3px;
        color: #ffffff;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
    `,
  ],
})
export class ConfidenceRingComponent {
  readonly score = input.required<number>();
  readonly level = input.required<ConfidenceLevel>();
  readonly size = input<number>(64);
  readonly strokeWidth = input<number>(6);
  readonly showLevel = input<boolean>(true);

  get center(): () => number {
    return () => this.size() / 2;
  }

  get radius(): () => number {
    return () => (this.size() - this.strokeWidth()) / 2;
  }

  get circumference(): () => number {
    return () => 2 * Math.PI * this.radius();
  }

  get dashOffset(): () => number {
    return () => {
      const c = this.circumference();
      const pct = Math.max(0, Math.min(100, this.score()));
      return c - (pct / 100) * c;
    };
  }

  get ringColor(): () => string {
    return () => getConfidenceColor(this.level());
  }

  get scoreFormatted(): () => string {
    return () => Math.round(this.score()).toString();
  }
}
