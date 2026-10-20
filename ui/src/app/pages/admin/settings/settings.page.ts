import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
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
  IonToggle,
  IonButton,
  IonIcon,
  IonBadge,
  IonNote,
  IonSpinner,
} from '@ionic/angular';
import { DataApiService } from '../../../services/data-api.service';
import { LoadingSkeletonComponent } from '../../../components/loading-skeleton/loading-skeleton.component';

@Component({
  selector: 'app-admin-settings-page',
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
    IonToggle,
    IonButton,
    IonIcon,
    IonBadge,
    IonNote,
    IonSpinner,
    LoadingSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding admin-page-content">
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">System Settings</h2>
          <p class="page-subtitle">Configure enterprise environment controls and platform governance.</p>
        </div>
      </div>

      @if (isLoading()) {
        <app-loading-skeleton [cards]="1" [rows]="4"></app-loading-skeleton>
      } @else {
        <ion-card class="settings-card">
          <ion-card-header>
            <div class="header-badge-row">
              <ion-card-title>Environment Configuration</ion-card-title>
              <ion-badge [color]="isDemo() ? 'warning' : 'success'">
                {{ isDemo() ? 'Demo / Sandbox Mode' : 'Production Mode' }}
              </ion-badge>
            </div>
            <ion-card-subtitle>
              Control sandbox demonstrations and data manipulation guardrails.
            </ion-card-subtitle>
          </ion-card-header>

          <ion-card-content>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Is Demo Environment</div>
                <div class="setting-description">
                  When enabled (<strong>Yes</strong>), every page shows a banner saying the portfolio data is synthetic demo data.
                                    When disabled (<strong>No</strong>), the banner is hidden.
                </div>
              </div>
              <div class="setting-control">
                <ion-toggle
                  [checked]="isDemo()"
                  (ionChange)="isDemo.set($event.detail.checked)"
                  color="primary"
                >
                  {{ isDemo() ? 'Yes (Demo Enabled)' : 'No (Production)' }}
                </ion-toggle>
              </div>
            </div>

            <div class="guardrail-box" [class.demo-box]="isDemo()" [class.prod-box]="!isDemo()">
              <ion-icon [name]="isDemo() ? 'alert-circle-outline' : 'shield-checkmark-outline'"></ion-icon>
              <div>
                <strong>{{ isDemo() ? 'Demo Mode Active' : 'Production Guardrails Active' }}</strong>
                <p>
                  {{ isDemo() 
                    ? 'Every page shows a synthetic demo data banner. Portfolio data is read from OneLake through the API.' 
                    : 'Portfolio records and data entries are protected. The demo banner is hidden.' }}
                </p>
              </div>
            </div>

            @if (saveSuccess()) {
              <div class="status-banner success">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                Settings saved successfully!
              </div>
            }

            <div class="actions-row">
              <ion-button color="primary" [disabled]="isSaving()" (click)="saveSettings()">
                @if (isSaving()) {
                  <ion-spinner name="crescent" slot="start"></ion-spinner>
                  Saving...
                } @else {
                  <ion-icon name="save-outline" slot="start"></ion-icon>
                  Save Settings
                }
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      }
    </ion-content>
  `,
  styles: [`
    .admin-page-content {
      --background: #f8fafc;
      max-width: 1000px;
      margin: 0 auto;
    }
    .page-header {
      margin-bottom: 24px;
    }
    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .page-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }
    .settings-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header-badge-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 0;
      border-bottom: 1px solid #f1f5f9;
      gap: 24px;
    }
    .setting-info {
      flex: 1;
    }
    .setting-title {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 6px;
    }
    .setting-description {
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
    }
    .setting-control {
      flex-shrink: 0;
      padding-top: 4px;
    }
    .guardrail-box {
      display: flex;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 8px;
      margin: 20px 0;
      align-items: flex-start;
      font-size: 13px;
    }
    .guardrail-box ion-icon {
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .guardrail-box p {
      margin: 4px 0 0 0;
      line-height: 1.4;
    }
    .demo-box {
      background: #fefce8;
      border: 1px solid #fef08a;
      color: #854d0e;
    }
    .prod-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }
    .status-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .status-banner.success {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .actions-row {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
  `],
})
export class SettingsPageComponent implements OnInit {
  private readonly dataApi = inject(DataApiService);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isDemo = signal(true);
  readonly saveSuccess = signal(false);

  ngOnInit(): void {
    this.dataApi.getAdminSettings().subscribe({
      next: (res) => {
        this.isDemo.set(res.isDemoEnvironment ?? true);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  saveSettings(): void {
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.dataApi.updateAdminSettings({ isDemoEnvironment: this.isDemo() }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3500);
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
  }
}
