import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card class="state-card" [class.error-variant]="isError()" role="status">
      <ion-card-content class="state-content">
        <div class="icon-wrap" [class.error-icon]="isError()">
          <ion-icon [name]="icon()"></ion-icon>
        </div>
        <h3 class="state-title">{{ title() }}</h3>
        <p class="state-message">{{ message() }}</p>
        @if (detail()) {
          <div class="state-detail">
            <code>{{ detail() }}</code>
          </div>
        }
        <ng-content></ng-content>
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      .state-card {
        margin: 24px auto;
        max-width: 640px;
        text-align: center;
        border-radius: 8px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        border: 1px solid var(--pmo-border, #e0e0e0);
        background: var(--pmo-surface, #ffffff);
      }
      .state-card.error-variant {
        border-color: #f6c8c8;
        background: #fdf7f7;
      }
      .state-content {
        padding: 32px 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      .icon-wrap {
        font-size: 42px;
        color: var(--pmo-primary, #0078d4);
        margin-bottom: 4px;
      }
      .icon-wrap.error-icon {
        color: var(--pmo-mustdo, #d13438);
      }
      .state-title {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--pmo-text, #1a1a1a);
      }
      .state-message {
        margin: 0;
        font-size: 0.9rem;
        color: var(--pmo-muted, #666666);
        max-width: 480px;
        line-height: 1.4;
      }
      .state-detail {
        margin-top: 10px;
        padding: 8px 12px;
        background: #f0f0f0;
        border-radius: 4px;
        font-size: 0.78rem;
        color: #333333;
        max-width: 100%;
        overflow-x: auto;
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly title = input<string>('No Data');
  readonly message = input<string>('No records to display.');
  readonly detail = input<string | null>(null);
  readonly icon = input<string>('information-circle-outline');
  readonly isError = input<boolean>(false);
}
