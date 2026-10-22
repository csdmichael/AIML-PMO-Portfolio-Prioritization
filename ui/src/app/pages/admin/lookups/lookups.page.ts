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
  IonInput,
  IonButton,
  IonIcon,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ionic/angular';
import { DataApiService } from '../../../services/data-api.service';
import { LoadingSkeletonComponent } from '../../../components/loading-skeleton/loading-skeleton.component';
import { problemMessage } from '../../../core/problem-detail';

@Component({
  selector: 'app-admin-lookups-page',
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
    IonButton,
    IonIcon,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    LoadingSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding lookups-page-content">
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (saved()) {
        <p role="status">Project options saved. Sponsor scores apply to current weighted priorities; run analysis to update ML predictions.</p>
      }
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">Project Options</h2>
          <p class="page-subtitle">
            Manage the site locations, business units, project statuses, and other choices available during project entry.
          </p>
        </div>
        <div class="header-right">
          <ion-button color="primary" [disabled]="isSaving()" (click)="saveLookups()">
            @if (isSaving()) {
              <ion-spinner name="crescent" slot="start"></ion-spinner>
              Saving...
            } @else {
              <ion-icon name="save-outline" slot="start"></ion-icon>
              Save Project Options
            }
          </ion-button>
        </div>
      </div>

      <ion-segment [(ngModel)]="activeCategory" class="category-segment">
        <ion-segment-button value="sites">
          <ion-label>Sites ({{ sites().length }})</ion-label>
        </ion-segment-button>
        <ion-segment-button value="businessUnits">
          <ion-label>Business Units ({{ businessUnits().length }})</ion-label>
        </ion-segment-button>
        <ion-segment-button value="projectStatuses">
          <ion-label>Statuses ({{ projectStatuses().length }})</ion-label>
        </ion-segment-button>
        <ion-segment-button value="sponsorLevels">
          <ion-label>Sponsors ({{ sponsorLevels().length }})</ion-label>
        </ion-segment-button>
        <ion-segment-button value="riskRatings">
          <ion-label>Risk Ratings ({{ riskRatings().length }})</ion-label>
        </ion-segment-button>
      </ion-segment>

      @if (isLoading()) {
        <app-loading-skeleton [cards]="1" [rows]="6"></app-loading-skeleton>
      } @else {
        <!-- SITES TAB -->
        @if (activeCategory === 'sites') {
          <ion-card class="lookup-card">
            <ion-card-header>
              <div class="card-header-row">
                <div>
                  <ion-card-title>Site Locations</ion-card-title>
                  <ion-card-subtitle>Facility, fab, and regional location options available during intake.</ion-card-subtitle>
                </div>
                <ion-badge color="primary">{{ sites().length }} Sites Configured</ion-badge>
              </div>
            </ion-card-header>

            <ion-card-content>
              <div class="add-row">
                <ion-item lines="none" class="add-input-item">
                  <ion-input
                    [(ngModel)]="newSiteName"
                    placeholder="Enter new site name (e.g. Austin, Villach)"
                    (keyup.enter)="addSite()"
                  ></ion-input>
                </ion-item>
                <ion-button color="primary" [disabled]="!newSiteName.trim()" (click)="addSite()">
                  <ion-icon name="add-outline" slot="start"></ion-icon>
                  Add Site
                </ion-button>
              </div>

              <div class="items-list">
                @for (site of sites(); track site; let idx = $index) {
                  <div class="item-row">
                    <span class="item-index">{{ idx + 1 }}</span>
                    <span class="item-name">{{ site }}</span>
                    <div class="item-actions">
                      <button type="button" class="action-btn delete" (click)="deleteSite(idx)">
                        <ion-icon name="trash-outline"></ion-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- BUSINESS UNITS TAB -->
        @if (activeCategory === 'businessUnits') {
          <ion-card class="lookup-card">
            <ion-card-header>
              <div class="card-header-row">
                <div>
                  <ion-card-title>Business Units</ion-card-title>
                  <ion-card-subtitle>Organizational business unit divisions.</ion-card-subtitle>
                </div>
                <ion-badge color="primary">{{ businessUnits().length }} Units Configured</ion-badge>
              </div>
            </ion-card-header>

            <ion-card-content>
              <div class="add-row">
                <ion-item lines="none" class="add-input-item">
                  <ion-input
                    [(ngModel)]="newBuName"
                    placeholder="Enter new business unit name"
                    (keyup.enter)="addBusinessUnit()"
                  ></ion-input>
                </ion-item>
                <ion-button color="primary" [disabled]="!newBuName.trim()" (click)="addBusinessUnit()">
                  <ion-icon name="add-outline" slot="start"></ion-icon>
                  Add Unit
                </ion-button>
              </div>

              <div class="items-list">
                @for (bu of businessUnits(); track bu; let idx = $index) {
                  <div class="item-row">
                    <span class="item-index">{{ idx + 1 }}</span>
                    <span class="item-name">{{ bu }}</span>
                    <div class="item-actions">
                      <button type="button" class="action-btn delete" (click)="deleteBusinessUnit(idx)">
                        <ion-icon name="trash-outline"></ion-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- STATUSES TAB -->
        @if (activeCategory === 'projectStatuses') {
          <ion-card class="lookup-card">
            <ion-card-header>
              <div class="card-header-row">
                <div>
                  <ion-card-title>Project Statuses</ion-card-title>
                  <ion-card-subtitle>Lifecycle statuses for projects.</ion-card-subtitle>
                </div>
                <ion-badge color="primary">{{ projectStatuses().length }} Statuses</ion-badge>
              </div>
            </ion-card-header>

            <ion-card-content>
              <div class="add-row">
                <ion-item lines="none" class="add-input-item">
                  <ion-input
                    [(ngModel)]="newStatusName"
                    placeholder="Enter new status"
                    (keyup.enter)="addStatus()"
                  ></ion-input>
                </ion-item>
                <ion-button color="primary" [disabled]="!newStatusName.trim()" (click)="addStatus()">
                  <ion-icon name="add-outline" slot="start"></ion-icon>
                  Add Status
                </ion-button>
              </div>

              <div class="items-list">
                @for (st of projectStatuses(); track st; let idx = $index) {
                  <div class="item-row">
                    <span class="item-index">{{ idx + 1 }}</span>
                    <span class="item-name">{{ st }}</span>
                    <div class="item-actions">
                      <button type="button" class="action-btn delete" (click)="deleteStatus(idx)">
                        <ion-icon name="trash-outline"></ion-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- SPONSOR LEVELS TAB -->
        @if (activeCategory === 'sponsorLevels') {
          <ion-card class="lookup-card">
            <ion-card-header>
              <div class="card-header-row">
                <div>
                  <ion-card-title>Sponsor Levels</ion-card-title>
                  <ion-card-subtitle>Higher scores mean higher sponsor priority. The highest configured score is 100% of the sponsor factor. For example, Executive = 4 and CEO = 5 makes Executive 80% and CEO 100%.</ion-card-subtitle>
                </div>
                <ion-badge color="primary">{{ sponsorLevels().length }} Levels</ion-badge>
              </div>
            </ion-card-header>

            <ion-card-content>
              <div class="add-row">
                <ion-item lines="none" class="add-input-item">
                  <ion-input
                    [(ngModel)]="newSponsorLevel"
                    placeholder="Enter new sponsor level"
                    (keyup.enter)="addSponsorLevel()"
                  ></ion-input>
                </ion-item>
                <ion-item lines="none">
                  <ion-input type="number" label="Relative score" min="0.01" step="any"
                    [(ngModel)]="newSponsorScore"></ion-input>
                </ion-item>
                <ion-button color="primary" [disabled]="!newSponsorLevel.trim()" (click)="addSponsorLevel()">
                  <ion-icon name="add-outline" slot="start"></ion-icon>
                  Add Level
                </ion-button>
              </div>

              <div class="items-list">
                @for (sl of sponsorLevels(); track sl; let idx = $index) {
                  <div class="item-row">
                    <span class="item-index">{{ idx + 1 }}</span>
                    <span class="item-name">{{ sl }}</span>
                    <ion-input type="number" [label]="sl + ' score'" min="0.01" step="any"
                      [ngModel]="sponsorLevelScores()[sl]" (ngModelChange)="setSponsorScore(sl, $event)"></ion-input>
                    <div class="item-actions">
                      <button type="button" class="action-btn delete" (click)="deleteSponsorLevel(idx)">
                        <ion-icon name="trash-outline"></ion-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- RISK RATINGS TAB -->
        @if (activeCategory === 'riskRatings') {
          <ion-card class="lookup-card">
            <ion-card-header>
              <div class="card-header-row">
                <div>
                  <ion-card-title>Risk Ratings</ion-card-title>
                  <ion-card-subtitle>Risk severity taxonomy.</ion-card-subtitle>
                </div>
                <ion-badge color="primary">{{ riskRatings().length }} Ratings</ion-badge>
              </div>
            </ion-card-header>

            <ion-card-content>
              <div class="add-row">
                <ion-item lines="none" class="add-input-item">
                  <ion-input
                    [(ngModel)]="newRiskRating"
                    placeholder="Enter new risk rating"
                    (keyup.enter)="addRiskRating()"
                  ></ion-input>
                </ion-item>
                <ion-button color="primary" [disabled]="!newRiskRating.trim()" (click)="addRiskRating()">
                  <ion-icon name="add-outline" slot="start"></ion-icon>
                  Add Rating
                </ion-button>
              </div>

              <div class="items-list">
                @for (rr of riskRatings(); track rr; let idx = $index) {
                  <div class="item-row">
                    <span class="item-index">{{ idx + 1 }}</span>
                    <span class="item-name">{{ rr }}</span>
                    <div class="item-actions">
                      <button type="button" class="action-btn delete" (click)="deleteRiskRating(idx)">
                        <ion-icon name="trash-outline"></ion-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }
      }
    </ion-content>
  `,
  styles: [`
    .lookups-page-content {
      --background: #f8fafc;
      max-width: 1000px;
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
    .category-segment {
      margin-bottom: 20px;
      background: #e2e8f0;
      border-radius: 8px;
    }
    .lookup-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .add-row {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 20px;
    }
    .add-input-item {
      flex: 1;
      --background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .item-row {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      gap: 12px;
    }
    .item-index {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      width: 24px;
    }
    .item-name {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }
    .action-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
      display: flex;
      align-items: center;
    }
    .action-btn.delete {
      color: #ef4444;
    }
    .action-btn.delete:hover {
      background: #fee2e2;
    }
  `],
})
export class LookupsPageComponent implements OnInit {
  private readonly dataApi = inject(DataApiService);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal(false);
  activeCategory = 'sites';

  readonly sites = signal<string[]>([]);
  readonly businessUnits = signal<string[]>([]);
  readonly projectStatuses = signal<string[]>([]);
  readonly sponsorLevels = signal<string[]>([]);
  readonly sponsorLevelScores = signal<Record<string, number>>({});
  readonly riskRatings = signal<string[]>([]);

  newSiteName = '';
  newBuName = '';
  newStatusName = '';
  newSponsorLevel = '';
  newSponsorScore: number | null = null;
  newRiskRating = '';

  ngOnInit(): void {
    this.dataApi.getLookups().subscribe({
      next: (res) => {
        this.sites.set(res.sites || []);
        this.businessUnits.set(res.businessUnits || []);
        this.projectStatuses.set(res.projectStatuses || []);
        this.sponsorLevels.set(res.sponsorLevels || []);
        this.sponsorLevelScores.set(res.sponsorLevelScores ?? {});
        this.riskRatings.set(res.riskRatings || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(problemMessage(err, 'Unable to load project options.'));
        this.isLoading.set(false);
      },
    });
  }

  addSite(): void {
    const val = this.newSiteName.trim();
    if (!val || this.sites().includes(val)) return;
    this.sites.update((list) => [...list, val]);
    this.newSiteName = '';
  }

  deleteSite(index: number): void {
    this.sites.update((list) => list.filter((_, i) => i !== index));
  }

  addBusinessUnit(): void {
    const val = this.newBuName.trim();
    if (!val || this.businessUnits().includes(val)) return;
    this.businessUnits.update((list) => [...list, val]);
    this.newBuName = '';
  }

  deleteBusinessUnit(index: number): void {
    this.businessUnits.update((list) => list.filter((_, i) => i !== index));
  }

  addStatus(): void {
    const val = this.newStatusName.trim();
    if (!val || this.projectStatuses().includes(val)) return;
    this.projectStatuses.update((list) => [...list, val]);
    this.newStatusName = '';
  }

  deleteStatus(index: number): void {
    this.projectStatuses.update((list) => list.filter((_, i) => i !== index));
  }

  addSponsorLevel(): void {
    const val = this.newSponsorLevel.trim();
    this.error.set(null);
    this.saved.set(false);
    if (!val || this.sponsorLevels().some(level => level.toLowerCase() === val.toLowerCase())) {
      this.error.set('Enter a unique sponsor level name.');
      return;
    }
    const score = Number(this.newSponsorScore);
    if (!Number.isFinite(score) || score <= 0) {
      this.error.set('Enter a positive relative score for the new sponsor level.');
      return;
    }
    this.sponsorLevels.update((list) => [...list, val]);
    this.sponsorLevelScores.update(scores => ({ ...scores, [val]: score }));
    this.newSponsorLevel = '';
    this.newSponsorScore = null;
  }

  setSponsorScore(level: string, value: number | string | null): void {
    this.sponsorLevelScores.update(scores => ({ ...scores, [level]: Number(value) }));
    this.saved.set(false);
  }

  deleteSponsorLevel(index: number): void {
    const level = this.sponsorLevels()[index];
    this.sponsorLevelScores.update(scores => {
      const updated = { ...scores };
      delete updated[level];
      return updated;
    });
    this.sponsorLevels.update((list) => list.filter((_, i) => i !== index));
  }

  addRiskRating(): void {
    const val = this.newRiskRating.trim();
    if (!val || this.riskRatings().includes(val)) return;
    this.riskRatings.update((list) => [...list, val]);
    this.newRiskRating = '';
  }

  deleteRiskRating(index: number): void {
    this.riskRatings.update((list) => list.filter((_, i) => i !== index));
  }

  saveLookups(): void {
    this.error.set(null);
    this.saved.set(false);
    if (this.sponsorLevels().some(level => !Number.isFinite(this.sponsorLevelScores()[level]) || this.sponsorLevelScores()[level] <= 0)) {
      this.error.set('Each sponsor level needs a positive relative score.');
      return;
    }
    this.isSaving.set(true);
    this.dataApi
      .updateLookups({
        sites: this.sites(),
        businessUnits: this.businessUnits(),
        projectStatuses: this.projectStatuses(),
        sponsorLevels: this.sponsorLevels(),
        sponsorLevelScores: this.sponsorLevelScores(),
        riskRatings: this.riskRatings(),
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.saved.set(true);
        },
        error: (err) => {
          this.error.set(problemMessage(err, 'Unable to save project options.'));
          this.isSaving.set(false);
        },
      });
  }
}
