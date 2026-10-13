import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonSkeletonText } from '@ionic/angular';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule, IonSkeletonText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-container" role="status" aria-label="Loading content">
      <div class="skeleton-header">
        <ion-skeleton-text [animated]="true" style="width: 40%; height: 28px;"></ion-skeleton-text>
        <ion-skeleton-text [animated]="true" style="width: 25%; height: 18px;"></ion-skeleton-text>
      </div>

      <div class="skeleton-cards-row">
        @for (i of cardArray(); track i) {
          <div class="skeleton-card">
            <ion-skeleton-text [animated]="true" style="width: 50%; height: 14px; margin-bottom: 8px;"></ion-skeleton-text>
            <ion-skeleton-text [animated]="true" style="width: 80%; height: 24px;"></ion-skeleton-text>
          </div>
        }
      </div>

      <div class="skeleton-body">
        @for (r of rowArray(); track r) {
          <div class="skeleton-row">
            <ion-skeleton-text [animated]="true" style="width: 15%; height: 16px;"></ion-skeleton-text>
            <ion-skeleton-text [animated]="true" style="width: 45%; height: 16px;"></ion-skeleton-text>
            <ion-skeleton-text [animated]="true" style="width: 20%; height: 16px;"></ion-skeleton-text>
            <ion-skeleton-text [animated]="true" style="width: 10%; height: 16px;"></ion-skeleton-text>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .skeleton-container {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .skeleton-header {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .skeleton-cards-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
      }
      .skeleton-card {
        padding: 12px;
        background: var(--pmo-surface, #ffffff);
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 6px;
      }
      .skeleton-body {
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: var(--pmo-surface, #ffffff);
        padding: 16px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 6px;
      }
      .skeleton-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 6px 0;
        border-bottom: 1px solid #f0f0f0;
      }
    `,
  ],
})
export class LoadingSkeletonComponent {
  readonly cards = input<number>(4);
  readonly rows = input<number>(6);

  get cardArray() {
    return () => Array.from({ length: this.cards() }, (_, i) => i);
  }

  get rowArray() {
    return () => Array.from({ length: this.rows() }, (_, i) => i);
  }
}
