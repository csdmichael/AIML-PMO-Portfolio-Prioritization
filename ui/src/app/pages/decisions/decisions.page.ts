import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonTextarea,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular';
import { DataApiService } from '../../services/data-api.service';
import { PortfolioStore } from '../../services/portfolio.store';
import { LocalDecision, DecisionAction } from '../../models/portfolio.models';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

@Component({
  selector: 'app-decisions-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    LoadingSkeletonComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding decisions-content">
      <div class="page-header">
        <h2 class="page-title">PMO Decisions & Human Governance Log</h2>
        <p class="page-subtitle">
          Record human-approved decisions (Approve, Adjust, Reject) directly into OneLake with audit trails.
        </p>
      </div>

      <!-- Quick Record Form -->
      <ion-card class="decision-form-card">
        <ion-card-header>
          <ion-card-title>Record New Decision</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="form-row">
            <div class="form-col">
              <label class="input-label">Project</label>
              <select class="custom-select" [(ngModel)]="newDecisionProjectId">
                <option [ngValue]="null">-- Select Project --</option>
                @for (p of store.rawProjects(); track p.projectId) {
                  <option [value]="p.projectId">{{ p.projectId }} - {{ p.projectName }}</option>
                }
              </select>
            </div>

            <div class="form-col">
              <label class="input-label">Action</label>
              <select class="custom-select" [(ngModel)]="newDecisionAction">
                <option value="Approve">Approve</option>
                <option value="Adjust">Adjust</option>
                <option value="Reject">Reject</option>
              </select>
            </div>
          </div>

          <div class="form-row reason-row">
            <div class="form-col full-width">
              <label class="input-label">Mandatory Justification / Reason</label>
              <textarea
                class="custom-textarea"
                rows="2"
                [(ngModel)]="newDecisionReason"
              ></textarea>
            </div>
          </div>

          <div class="actions-row">
            <ion-button
              color="primary"
              [disabled]="!newDecisionProjectId || !newDecisionReason.trim() || isSubmitting()"
              (click)="onSubmitDecision()"
            >
              <ion-icon name="checkmark-done-outline" slot="start"></ion-icon>
              Save Decision to OneLake
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Decision History List -->
      <div class="history-section">
        <h3>Decision History</h3>

        @if (isLoading()) {
          <app-loading-skeleton [cards]="1" [rows]="5"></app-loading-skeleton>
        } @else if (error()) {
          <app-empty-state title="Error Loading Decisions" [message]="error()!" [isError]="true">
            <ion-button (click)="loadDecisions()">Retry</ion-button>
          </app-empty-state>
        } @else if (decisions().length === 0) {
          <app-empty-state
            title="No Decisions Recorded"
            message="No PMO governance decisions have been recorded yet in OneLake."
            icon="checkbox-outline"
          ></app-empty-state>
        } @else {
          <div class="decisions-list">
            @for (dec of decisions(); track dec.projectId + dec.timestamp) {
              <ion-card class="decision-item-card" [class]="dec.action.toLowerCase()">
                <ion-card-content>
                  <div class="dec-header">
                    <div class="dec-title">
                      <span class="project-pill">{{ dec.projectId }}</span>
                      <span class="action-tag" [class]="dec.action.toLowerCase()">{{ dec.action }}</span>
                    </div>
                    <span class="dec-time">{{ dec.timestamp | date:'medium' }}</span>
                  </div>
                  <div class="dec-reason-text">"{{ dec.reason }}"</div>
                </ion-card-content>
              </ion-card>
            }
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .decisions-content {
        --background: var(--pmo-bg, #f4f6f8);
      }
      .page-header {
        margin-bottom: 12px;
      }
      .page-title {
        font-size: 1.35rem;
        font-weight: 700;
        margin: 0;
        color: var(--pmo-text, #1a1a1a);
      }
      .page-subtitle {
        font-size: 0.85rem;
        color: var(--pmo-muted, #666666);
        margin: 2px 0 0 0;
      }
      .decision-form-card {
        margin: 0 0 16px 0;
        border-radius: 8px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        border: 1px solid var(--pmo-border, #e0e0e0);
        background: var(--pmo-surface, #ffffff);
      }
      .form-row {
        display: flex;
        gap: 12px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      .form-col {
        flex: 1;
        min-width: 200px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .full-width {
        width: 100%;
        flex: 1 1 100%;
      }
      .input-label {
        font-size: 0.78rem;
        font-weight: 600;
        color: #444444;
      }
      .custom-select,
      .custom-textarea {
        padding: 7px 10px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 6px;
        font-size: 0.85rem;
      }
      .actions-row {
        display: flex;
        justify-content: flex-end;
      }
      .history-section h3 {
        font-size: 1.05rem;
        font-weight: 700;
        margin: 16px 0 8px 0;
        color: var(--pmo-text, #1a1a1a);
      }
      .decisions-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .decision-item-card {
        margin: 0;
        border-radius: 6px;
        border: 1px solid var(--pmo-border, #e0e0e0);
      }
      .decision-item-card.approve {
        border-left: 4px solid #107c10;
      }
      .decision-item-card.adjust {
        border-left: 4px solid #c19c00;
      }
      .decision-item-card.reject {
        border-left: 4px solid #d13438;
      }
      .dec-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      .project-pill {
        font-weight: 700;
        font-size: 0.8rem;
        color: var(--pmo-primary, #0078d4);
        margin-right: 8px;
      }
      .action-tag {
        font-size: 0.72rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
      }
      .action-tag.approve {
        background: #dff6dd;
        color: #107c10;
      }
      .action-tag.adjust {
        background: #fff4ce;
        color: #795e00;
      }
      .action-tag.reject {
        background: #fed9cc;
        color: #a80000;
      }
      .dec-time {
        font-size: 0.72rem;
        color: #777777;
      }
      .dec-reason-text {
        font-size: 0.82rem;
        color: #333333;
        font-style: italic;
      }
    `,
  ],
})
export class DecisionsPageComponent implements OnInit {
  private readonly api = inject(DataApiService);
  readonly store = inject(PortfolioStore);

  readonly decisions = signal<LocalDecision[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);

  newDecisionProjectId: string | null = null;
  newDecisionAction: DecisionAction = 'Approve';
  newDecisionReason = '';

  ngOnInit(): void {
    this.loadDecisions();
  }

  loadDecisions(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.api.getDecisions().subscribe({
      next: (data) => {
        this.decisions.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to load decisions from OneLake');
        this.isLoading.set(false);
      },
    });
  }

  onSubmitDecision(): void {
    if (!this.newDecisionProjectId || !this.newDecisionReason.trim()) return;

    this.isSubmitting.set(true);
    const decision: LocalDecision = {
      projectId: this.newDecisionProjectId,
      action: this.newDecisionAction,
      reason: this.newDecisionReason.trim(),
      timestamp: new Date().toISOString(),
    };

    this.api.createDecision(decision).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.decisions.update((curr) => [created, ...curr]);
        this.store.recordDecision(created);
        this.newDecisionReason = '';
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(`Failed to save decision: ${err?.message || 'Unknown error'}`);
      },
    });
  }
}
