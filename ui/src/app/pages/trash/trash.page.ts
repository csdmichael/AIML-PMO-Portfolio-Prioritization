import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
} from '@ionic/angular';
import { PortfolioStore } from '../../services/portfolio.store';
import { Project } from '../../models/portfolio.models';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { problemMessage } from '../../core/problem-detail';

@Component({
  selector: 'app-trash-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonButton,
    IonIcon,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="trash-content ion-padding">
      <div class="trash-container">
        <!-- Top Navigation Bar -->
        <div class="top-nav-bar">
          <ion-button fill="clear" size="small" routerLink="/prioritization" class="back-btn">
            <ion-icon name="arrow-back-outline" slot="start"></ion-icon>
            Back to Prioritization
          </ion-button>
        </div>

        <!-- Header -->
        <header class="trash-header">
          <div class="header-text">
            <div class="title-row">
              <span class="trash-icon-badge">
                <ion-icon name="trash-outline"></ion-icon>
              </span>
              <h2 class="page-title">Trashed Projects</h2>
              <span class="count-pill">{{ trashedProjects().length }} trashed</span>
            </div>
            <p class="page-subtitle">
              Projects marked as deleted are retained here for audit compliance. You can restore them to active prioritization or permanently purge them from the database.
            </p>
          </div>

          @if (trashedProjects().length > 0) {
            <div class="header-actions">
              <button
                type="button"
                class="btn-restore-all"
                [disabled]="isBusy()"
                (click)="onRestoreAll()"
                title="Restore all trashed projects"
              >
                <ion-icon name="refresh-outline"></ion-icon>
                <span>Restore All</span>
              </button>
              <button
                type="button"
                class="btn-empty-trash"
                [disabled]="isBusy()"
                (click)="onPromptEmptyTrash()"
                title="Permanently delete all trashed projects"
              >
                <ion-icon name="trash-outline"></ion-icon>
                <span>Empty Trash</span>
              </button>
            </div>
          }
        </header>

        <!-- Notification Banner -->
        @if (feedback(); as fb) {
          <div class="feedback-banner" [class.success]="fb.type === 'success'" [class.error]="fb.type === 'error'" role="alert">
            <ion-icon [name]="fb.type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'"></ion-icon>
            <span>{{ fb.message }}</span>
            <button type="button" class="dismiss-fb" (click)="feedback.set(null)">&times;</button>
          </div>
        }

        <!-- Filter / Search Toolbar -->
        @if (trashedProjects().length > 0) {
          <div class="trash-toolbar">
            <div class="search-wrap">
              <input
                type="text"
                class="search-input"
                placeholder="Search trashed projects by ID, name, portfolio, or sponsor..."
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
              />
              @if (searchQuery()) {
                <button type="button" class="clear-search-btn" (click)="searchQuery.set('')">&times;</button>
              }
            </div>
            <span class="toolbar-count">
              Showing {{ filteredTrashed().length }} of {{ trashedProjects().length }}
            </span>
          </div>
        }

        <!-- Trashed List or Empty State -->
        @if (store.isLoading()) {
          <div class="loading-state">
            <p>Loading trashed projects...</p>
          </div>
        } @else if (trashedProjects().length === 0) {
          <app-empty-state
            title="Trash is Empty"
            message="No projects are currently in the trash. Soft-deleted projects will appear here where you can restore them or delete them permanently."
            icon="trash-outline"
          >
            <ion-button routerLink="/prioritization">
              <ion-icon name="arrow-back-outline" slot="start"></ion-icon>
              View Active Projects
            </ion-button>
          </app-empty-state>
        } @else if (filteredTrashed().length === 0) {
          <app-empty-state
            title="No Matching Trashed Projects"
            message="No trashed projects match your search query."
          >
            <ion-button fill="outline" (click)="searchQuery.set('')">Clear Search</ion-button>
          </app-empty-state>
        } @else {
          <div class="trash-table-card">
            <table class="trash-table">
              <thead>
                <tr>
                  <th>Project ID & Name</th>
                  <th>Portfolio / Program</th>
                  <th>Business Unit</th>
                  <th>Site</th>
                  <th>Cost (USD)</th>
                  <th>Prioritized Tier</th>
                  <th>Status</th>
                  <th class="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (p of filteredTrashed(); track p.projectId) {
                  <tr class="trash-row">
                    <td class="td-name">
                      <span class="pid-badge">{{ p.projectId }}</span>
                      <strong class="pname">{{ p.projectName }}</strong>
                      <span class="pm-meta">PM: {{ p.projectManager }} &bull; Sponsor: {{ p.executiveSponsor }}</span>
                    </td>
                    <td>
                      <div class="portfolio-info">
                        <strong>{{ p.portfolio }}</strong>
                        <span class="sub-prog">{{ p.program }}</span>
                      </div>
                    </td>
                    <td>{{ p.businessUnit }}</td>
                    <td>{{ p.site }}</td>
                    <td>\${{ (p.costEstimateUsd / 1000000).toFixed(2) }}M</td>
                    <td>
                      <span class="tier-tag">{{ p.finalTier }}</span>
                    </td>
                    <td>
                      <span class="status-tag">{{ p.projectStatus }}</span>
                    </td>
                    <td class="actions-col">
                      <div class="action-btn-group">
                        <button
                          type="button"
                          class="action-btn btn-restore"
                          [disabled]="isBusy()"
                          (click)="onRestore(p)"
                          title="Restore project to active prioritization"
                        >
                          <ion-icon name="refresh-outline"></ion-icon>
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          class="action-btn btn-delete-perm"
                          [disabled]="isBusy()"
                          (click)="onPromptPermanentDelete(p)"
                          title="Permanently delete project"
                        >
                          <ion-icon name="trash-outline"></ion-icon>
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Confirmation Modal for Permanent Delete -->
      @if (pendingDeleteProject(); as target) {
        <div class="modal-backdrop" (click)="onCancelDelete()">
          <div class="confirm-card" (click)="$event.stopPropagation()">
            <div class="confirm-header">
              <ion-icon name="alert-circle-outline" class="warn-icon"></ion-icon>
              <h3>Permanently Delete Project?</h3>
            </div>
            <div class="confirm-body">
              <p>
                Are you sure you want to permanently delete <strong>{{ target.projectId }} — {{ target.projectName }}</strong>?
              </p>
              <div class="confirm-alert-box">
                This action cannot be undone. The project will be permanently purged from all operational views.
              </div>
            </div>
            <div class="confirm-footer">
              <button type="button" class="btn-cancel" (click)="onCancelDelete()" [disabled]="isBusy()">Cancel</button>
              <button type="button" class="btn-confirm-delete" (click)="onConfirmPermanentDelete(target)" [disabled]="isBusy()">
                {{ isBusy() ? 'Deleting...' : 'Permanently Delete' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Confirmation Modal for Empty Trash -->
      @if (confirmEmptyTrashOpen()) {
        <div class="modal-backdrop" (click)="confirmEmptyTrashOpen.set(false)">
          <div class="confirm-card" (click)="$event.stopPropagation()">
            <div class="confirm-header">
              <ion-icon name="alert-circle-outline" class="warn-icon"></ion-icon>
              <h3>Empty Entire Trash?</h3>
            </div>
            <div class="confirm-body">
              <p>
                Are you sure you want to permanently delete all <strong>{{ trashedProjects().length }}</strong> trashed projects?
              </p>
              <div class="confirm-alert-box">
                This will permanently purge all trashed projects from the portfolio database.
              </div>
            </div>
            <div class="confirm-footer">
              <button type="button" class="btn-cancel" (click)="confirmEmptyTrashOpen.set(false)" [disabled]="isBusy()">Cancel</button>
              <button type="button" class="btn-confirm-delete" (click)="onConfirmEmptyTrash()" [disabled]="isBusy()">
                {{ isBusy() ? 'Purging...' : 'Yes, Empty Trash' }}
              </button>
            </div>
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .trash-content {
        --background: var(--pmo-bg, #f4f6f8);
        height: 100%;
      }
      .trash-container {
        max-width: 1280px;
        margin: 0 auto;
        padding-bottom: 40px;
      }
      .top-nav-bar {
        margin-bottom: 12px;
      }
      .back-btn {
        font-weight: 600;
        --color: var(--pmo-primary, #0078d4);
      }
      .trash-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 10px;
        padding: 20px 24px;
        margin-bottom: 16px;
        gap: 16px;
        flex-wrap: wrap;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }
      .title-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 6px;
      }
      .trash-icon-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: #fee2e2;
        color: #b91c1c;
        font-size: 1.25rem;
      }
      .page-title {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 700;
        color: #0f172a;
      }
      .count-pill {
        font-size: 0.75rem;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 12px;
        background: #f1f5f9;
        color: #475569;
      }
      .page-subtitle {
        margin: 0;
        font-size: 0.88rem;
        color: #64748b;
        line-height: 1.45;
        max-width: 760px;
      }
      .header-actions {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .btn-restore-all {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border-radius: 6px;
        background: #f0fdf4;
        border: 1px solid #86efac;
        color: #166534;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-restore-all:hover:not(:disabled) {
        background: #dcfce7;
      }
      .btn-empty-trash {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border-radius: 6px;
        background: #fef2f2;
        border: 1px solid #fca5a5;
        color: #991b1b;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-empty-trash:hover:not(:disabled) {
        background: #fee2e2;
      }
      .feedback-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 0.86rem;
        font-weight: 500;
      }
      .feedback-banner.success {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
      }
      .feedback-banner.error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }
      .dismiss-fb {
        margin-left: auto;
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        color: inherit;
        line-height: 1;
      }
      .trash-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
        gap: 12px;
        flex-wrap: wrap;
      }
      .search-wrap {
        position: relative;
        flex: 1;
        max-width: 480px;
      }
      .search-input {
        width: 100%;
        padding: 8px 32px 8px 12px;
        border: 1px solid var(--pmo-border, #cbd5e1);
        border-radius: 6px;
        font-size: 0.84rem;
        background: #ffffff;
      }
      .clear-search-btn {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        font-size: 1.1rem;
        color: #94a3b8;
        cursor: pointer;
      }
      .toolbar-count {
        font-size: 0.82rem;
        color: #64748b;
      }
      .trash-table-card {
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }
      .trash-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
      }
      .trash-table th {
        background: #f8fafc;
        padding: 10px 14px;
        text-align: left;
        border-bottom: 2px solid var(--pmo-border, #e2e8f0);
        color: #475569;
        font-weight: 600;
        font-size: 0.8rem;
      }
      .trash-table td {
        padding: 12px 14px;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
        vertical-align: middle;
      }
      .trash-row:hover {
        background: #f8fafc;
      }
      .td-name {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .pid-badge {
        font-family: monospace;
        font-weight: 700;
        font-size: 0.72rem;
        color: var(--pmo-primary, #0078d4);
        background: #e0f2fe;
        padding: 1px 6px;
        border-radius: 4px;
        width: fit-content;
      }
      .pname {
        font-size: 0.88rem;
        font-weight: 600;
        color: #0f172a;
      }
      .pm-meta {
        font-size: 0.72rem;
        color: #64748b;
      }
      .portfolio-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .sub-prog {
        font-size: 0.74rem;
        color: #64748b;
      }
      .tier-tag {
        font-size: 0.72rem;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 4px;
        background: #f1f5f9;
        color: #334155;
      }
      .status-tag {
        font-size: 0.72rem;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 4px;
        background: #fee2e2;
        color: #991b1b;
      }
      .actions-col {
        text-align: right;
      }
      .action-btn-group {
        display: inline-flex;
        gap: 8px;
        align-items: center;
      }
      .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 0.76rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-restore {
        background: #f0fdf4;
        border: 1px solid #86efac;
        color: #166534;
      }
      .btn-restore:hover:not(:disabled) {
        background: #dcfce7;
      }
      .btn-delete-perm {
        background: #fef2f2;
        border: 1px solid #fca5a5;
        color: #991b1b;
      }
      .btn-delete-perm:hover:not(:disabled) {
        background: #fee2e2;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 16px;
      }
      .confirm-card {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.25);
        width: 100%;
        max-width: 480px;
        padding: 24px;
        animation: scaleIn 0.18s ease-out;
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
      .confirm-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;
      }
      .warn-icon {
        font-size: 1.8rem;
        color: #dc2626;
        flex-shrink: 0;
      }
      .confirm-header h3 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: #0f172a;
      }
      .confirm-body p {
        margin: 0 0 12px 0;
        font-size: 0.88rem;
        color: #334155;
        line-height: 1.5;
      }
      .confirm-alert-box {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        padding: 10px 14px;
        font-size: 0.82rem;
        color: #991b1b;
        font-weight: 500;
      }
      .confirm-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
      }
      .btn-cancel {
        padding: 7px 16px;
        border-radius: 6px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        font-size: 0.82rem;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
      }
      .btn-confirm-delete {
        padding: 7px 18px;
        border-radius: 6px;
        background: #dc2626;
        border: none;
        font-size: 0.82rem;
        font-weight: 700;
        color: #ffffff;
        cursor: pointer;
      }
      .btn-confirm-delete:hover:not(:disabled) {
        background: #b91c1c;
      }
      .loading-state {
        padding: 40px;
        text-align: center;
        color: #64748b;
      }
    `,
  ],
})
export class TrashPageComponent {
  readonly store = inject(PortfolioStore);

  readonly searchQuery = signal<string>('');
  readonly isBusy = signal<boolean>(false);
  readonly feedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly pendingDeleteProject = signal<Project | null>(null);
  readonly confirmEmptyTrashOpen = signal<boolean>(false);

  readonly trashedProjects = computed<Project[]>(() => {
    return this.store.softDeletedProjects();
  });

  readonly filteredTrashed = computed<Project[]>(() => {
    const list = this.trashedProjects();
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      const text = `${p.projectId} ${p.projectName} ${p.portfolio} ${p.program} ${p.businessUnit} ${p.executiveSponsor}`.toLowerCase();
      return text.includes(q);
    });
  });

  onRestore(project: Project): void {
    this.isBusy.set(true);
    this.store.setSoftDeleted(project.projectId, false).subscribe({
      next: () => {
        this.isBusy.set(false);
        this.feedback.set({
          type: 'success',
          message: `Project ${project.projectId} (${project.projectName}) was successfully restored to active status.`,
        });
      },
      error: (err: unknown) => {
        this.isBusy.set(false);
        this.feedback.set({
          type: 'error',
          message: problemMessage(err, `Failed to restore project ${project.projectId}.`),
        });
      },
    });
  }

  onRestoreAll(): void {
    const projects = this.trashedProjects();
    if (projects.length === 0) return;
    this.isBusy.set(true);
    let count = 0;
    for (const p of projects) {
      this.store.setSoftDeleted(p.projectId, false).subscribe({
        next: () => {
          count++;
          if (count === projects.length) {
            this.isBusy.set(false);
            this.feedback.set({
              type: 'success',
              message: `Successfully restored all ${count} trashed projects to active status.`,
            });
          }
        },
        error: (err: unknown) => {
          this.isBusy.set(false);
          this.feedback.set({
            type: 'error',
            message: problemMessage(err, 'Failed to restore some trashed projects.'),
          });
        },
      });
    }
  }

  onPromptPermanentDelete(project: Project): void {
    this.pendingDeleteProject.set(project);
  }

  onCancelDelete(): void {
    this.pendingDeleteProject.set(null);
  }

  onConfirmPermanentDelete(project: Project): void {
    this.isBusy.set(true);
    this.store.permanentlyDelete(project.projectId).subscribe({
      next: () => {
        this.isBusy.set(false);
        this.pendingDeleteProject.set(null);
        this.feedback.set({
          type: 'success',
          message: `Project ${project.projectId} was permanently deleted from the database.`,
        });
      },
      error: (err: unknown) => {
        this.isBusy.set(false);
        this.pendingDeleteProject.set(null);
        this.feedback.set({
          type: 'error',
          message: problemMessage(err, `Failed to permanently delete project ${project.projectId}.`),
        });
      },
    });
  }

  onPromptEmptyTrash(): void {
    this.confirmEmptyTrashOpen.set(true);
  }

  onConfirmEmptyTrash(): void {
    const projects = this.trashedProjects();
    if (projects.length === 0) {
      this.confirmEmptyTrashOpen.set(false);
      return;
    }
    this.isBusy.set(true);
    let count = 0;
    for (const p of projects) {
      this.store.permanentlyDelete(p.projectId).subscribe({
        next: () => {
          count++;
          if (count === projects.length) {
            this.isBusy.set(false);
            this.confirmEmptyTrashOpen.set(false);
            this.feedback.set({
              type: 'success',
              message: `Successfully emptied the trash (${count} projects purged).`,
            });
          }
        },
        error: (err: unknown) => {
          this.isBusy.set(false);
          this.confirmEmptyTrashOpen.set(false);
          this.feedback.set({
            type: 'error',
            message: problemMessage(err, 'Failed to permanently delete some projects.'),
          });
        },
      });
    }
  }
}
