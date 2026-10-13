import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonFooter, IonToolbar } from '@ionic/angular';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, IonFooter, IonToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-footer class="app-global-footer">
      <ion-toolbar color="light">
        <div class="footer-content">
          <!-- Left: Author & LinkedIn from ui.json -->
          <div class="author-section">
            <span class="author-name">{{ footerConfig.authorName }}</span>
            <span class="role-separator">|</span>
            <span class="author-role">{{ footerConfig.authorRole }}</span>
            <span class="link-separator">&bull;</span>
            <a
              [href]="footerConfig.linkedInUrl"
              target="_blank"
              rel="noopener"
              class="footer-link"
              [attr.aria-label]="footerConfig.authorName + ' LinkedIn Profile'"
            >
              {{ footerConfig.linkedInLabel }}
            </a>
          </div>

          <!-- Right: GitHub repo link from ui.json -->
          <div class="repo-section">
            <a
              [href]="footerConfig.gitHubUrl"
              target="_blank"
              rel="noopener"
              class="footer-link repo-link"
              aria-label="GitHub Repository"
            >
              <svg class="gh-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              <span>{{ footerConfig.gitHubLabel }}</span>
            </a>
          </div>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [
    `
      .app-global-footer {
        border-top: 1px solid var(--ion-color-step-150, #e0e0e0);
      }
      .footer-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 16px;
        font-size: 0.8rem;
        color: var(--ion-color-step-600, #555555);
        flex-wrap: wrap;
        gap: 8px;
      }
      .author-section {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .author-name {
        font-weight: 600;
        color: var(--ion-text-color, #1a1a1a);
      }
      .role-separator,
      .link-separator {
        color: #999999;
      }
      .repo-section {
        display: flex;
        align-items: center;
      }
      .footer-link {
        color: var(--pmo-primary, #0078d4);
        text-decoration: none;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: color 0.2s ease;
      }
      .footer-link:hover,
      .footer-link:focus-visible {
        text-decoration: underline;
        color: var(--pmo-primary-dark, #004578);
        outline: 2px solid var(--pmo-primary, #0078d4);
        outline-offset: 2px;
      }
      .gh-icon {
        flex-shrink: 0;
      }
      @media (max-width: 600px) {
        .footer-content {
          font-size: 0.72rem;
          padding: 4px 10px;
        }
        .author-role {
          display: none;
        }
        .role-separator {
          display: none;
        }
      }
    `,
  ],
})
export class FooterComponent {
  private readonly configService = inject(ConfigService);

  get footerConfig() {
    return this.configService.config.footer;
  }
}
