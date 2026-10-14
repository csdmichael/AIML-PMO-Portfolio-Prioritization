import { Component, ChangeDetectionStrategy, input, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonChip,
  IonLabel,
} from '@ionic/angular';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonChip, IonLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="app-global-header">
      <ion-toolbar color="light">
        <ion-buttons slot="start">
          <ion-menu-button
            auto-hide="false"
            class="menu-toggle-btn"
            [attr.aria-label]="navigationCollapsed() ? 'Expand navigation menu' : 'Collapse navigation menu'"
            (click)="navigationToggle.emit()"
          ></ion-menu-button>
        </ion-buttons>

        <div class="header-brand-wrap">
          <!-- Microsoft 4-square inline SVG logo with colors from ui.json -->
          <div class="msft-logo-container" aria-label="Microsoft Logo">
            <svg class="msft-logo-svg" viewBox="0 0 21 21" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" [attr.fill]="logoConfig.squareRed" />
              <rect x="11" y="1" width="9" height="9" [attr.fill]="logoConfig.squareGreen" />
              <rect x="1" y="11" width="9" height="9" [attr.fill]="logoConfig.squareBlue" />
              <rect x="11" y="11" width="9" height="9" [attr.fill]="logoConfig.squareYellow" />
            </svg>
            <span class="msft-text" [style.color]="logoConfig.wordmarkColor">{{ logoConfig.wordmark }}</span>
          </div>

          <div class="divider"></div>

          <!-- App Title and AI Subtitle from config -->
          <div class="titles-container">
            <h1 class="app-title">{{ brandConfig.title }}</h1>
            <span class="app-subtitle">{{ brandConfig.subtitle }}</span>
          </div>
        </div>

        <ion-buttons slot="end">
          @if (asOfDate()) {
            <ion-chip color="primary" class="as-of-chip" outline="true">
              <ion-label>As of {{ asOfDate() }}</ion-label>
            </ion-chip>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
  `,
  styles: [
    `
      .app-global-header {
        border-bottom: 1px solid var(--ion-color-step-150, #e0e0e0);
      }
      .header-brand-wrap {
        display: flex;
        align-items: center;
        gap: 12px;
        padding-left: 4px;
      }
      .msft-logo-container {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .msft-logo-svg {
        flex-shrink: 0;
      }
      .msft-text {
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        font-size: 1.05rem;
        font-weight: 600;
        letter-spacing: -0.2px;
      }
      .divider {
        width: 1px;
        height: 24px;
        background: #d1d1d1;
      }
      .titles-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .app-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--ion-text-color, #1a1a1a);
        line-height: 1.2;
      }
      .app-subtitle {
        font-size: 0.72rem;
        color: var(--pmo-primary, #0078d4);
        font-weight: 600;
        letter-spacing: 0.2px;
        line-height: 1.2;
      }
      .as-of-chip {
        font-size: 0.75rem;
        font-weight: 600;
        margin-right: 8px;
        height: 26px;
      }
      @media (max-width: 600px) {
        .msft-text {
          display: none;
        }
        .divider {
          display: none;
        }
        .app-title {
          font-size: 0.9rem;
        }
        .app-subtitle {
          font-size: 0.65rem;
        }
        .as-of-chip {
          display: none;
        }
      }
    `,
  ],
})
export class HeaderComponent {
  private readonly configService = inject(ConfigService);
  readonly asOfDate = input<string | null>('');
  readonly navigationCollapsed = input(false);
  readonly navigationToggle = output<void>();

  get brandConfig() {
    return this.configService.config.brand;
  }

  get logoConfig() {
    return this.configService.config.brand.logo;
  }
}
