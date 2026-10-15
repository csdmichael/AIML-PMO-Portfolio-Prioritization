import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonProgressBar,
} from '@ionic/angular';
import { PortfolioStore } from '../../services/portfolio.store';
import { PortfolioImportService, SamplePortfolioFile } from '../../services/portfolio-import.service';
import { Project, ProjectStatus } from '../../models/portfolio.models';
import { EditProjectModalComponent } from '../../components/edit-project-modal/edit-project-modal.component';

@Component({
  selector: 'app-lifecycle-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonProgressBar,
    EditProjectModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding lifecycle-content">
      <div class="page-header">
        <div class="header-titles">
          <h2 class="page-title">Project Lifecycle, Deletion & Portfolio Import</h2>
          <p class="page-subtitle">
            Manage project statuses (Backlog, Active, Planning), perform soft or permanent deletions across portfolios, and import portfolio Excel (.xlsx) files to dynamically populate dashboards.
          </p>
        </div>

        <!-- Portfolio Reset & Ingestion Controls -->
        <div class="portfolio-actions-bar">
          <button
            type="button"
            class="ctrl-btn template-btn"
            (click)="importService.downloadProjectTemplate()"
            title="Download minimal Excel intake template (10 fields max with mandatory & optional highlighted)"
          >
            <ion-icon name="download-outline"></ion-icon>
            Export Project Template (.xlsx)
          </button>
          <button
            type="button"
            class="ctrl-btn danger"
            (click)="onConfirmClearAll()"
            title="Clear all projects to start fresh with a clean portfolio state"
          >
            <ion-icon name="trash-outline"></ion-icon>
            Clear All (Reset to 0 Projects)
          </button>
          <button
            type="button"
            class="ctrl-btn outline"
            (click)="onRestoreFactoryDefaults()"
            title="Restore default 100 sample projects"
          >
            <ion-icon name="refresh-outline"></ion-icon>
            Restore 100 Sample Projects
          </button>
        </div>
      </div>

      <!-- Notification Toast / Alert -->
      @if (actionMessage()) {
        <div class="notification-banner" [class]="actionMessageType()">
          <ion-icon
            [name]="actionMessageType() === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'"
          ></ion-icon>
          <span class="banner-text">{{ actionMessage() }}</span>
          <button type="button" class="close-banner-btn" (click)="actionMessage.set(null)">&times;</button>
        </div>
      }

      <!-- Status KPI Counter Strip -->
      <div class="kpi-strip">
        <div class="kpi-box active-kpi">
          <div class="kpi-num">{{ store.activeProjects().length }}</div>
          <div class="kpi-lbl">Active Projects</div>
        </div>
        <div class="kpi-box backlog-kpi">
          <div class="kpi-num">{{ store.backlogProjects().length }}</div>
          <div class="kpi-lbl">Backlog Projects</div>
        </div>
        <div class="kpi-box trash-kpi">
          <div class="kpi-num">{{ store.softDeletedProjects().length }}</div>
          <div class="kpi-lbl">Soft-Deleted (Trash)</div>
        </div>
        <div class="kpi-box total-kpi">
          <div class="kpi-num">{{ store.rawProjects().length }}</div>
          <div class="kpi-lbl">Total Tracked</div>
        </div>
        <div class="kpi-box pf-kpi">
          <div class="kpi-num">{{ store.portfolios().length }}</div>
          <div class="kpi-lbl">Portfolios Loaded</div>
        </div>
      </div>

      <!-- SECTION 1: EXCEL IMPORT PER PORTFOLIO -->
      <ion-card class="section-card import-card" id="import-section">
        <ion-card-header>
          <div class="header-flex">
            <div>
              <ion-card-title>Import Projects from Excel (.xlsx)</ion-card-title>
              <ion-card-subtitle>
                Upload an Excel file for a specific portfolio, or click a sample portfolio below to populate dashboards.
              </ion-card-subtitle>
            </div>
            <div class="card-badges">
              <ion-badge color="primary">Excel .XLSX</ion-badge>
              <ion-badge color="tertiary">Real-Time Refresh</ion-badge>
            </div>
          </div>
        </ion-card-header>

        <ion-card-content>
          <!-- Drag & Drop Zone -->
          <div
            class="drop-zone"
            [class.drag-over]="isDragOver()"
            (dragover)="onDragOver($event)"
            (dragleave)="isDragOver.set(false)"
            (drop)="onFileDrop($event)"
          >
            <ion-icon name="cloud-upload-outline" class="drop-icon"></ion-icon>
            <div class="drop-text">Drag & drop your Portfolio Excel file (.xlsx) here</div>
            <div class="drop-subtext">Supports single-portfolio or cross-portfolio registers &bull; Columns auto-mapped to PMO schema</div>

            <input
              type="file"
              #fileInput
              accept=".xlsx,.xls"
              (change)="onFileInputChange($event)"
              style="display: none;"
            />

            <div class="drop-actions">
              <div class="import-options">
                <label class="opt-label">Import Mode:</label>
                <select class="custom-select" [(ngModel)]="importMode">
                  <option value="append">Append / Merge (Keep Existing)</option>
                  <option value="replacePortfolio">Replace Portfolio Only</option>
                  <option value="replaceAll">Replace Entire Portfolio (Wipe Others)</option>
                </select>
              </div>

              <ion-button size="small" fill="outline" (click)="fileInput.click()">
                <ion-icon name="document-attach-outline" slot="start"></ion-icon>
                Browse Excel File
              </ion-button>

              <ion-button size="small" fill="outline" color="secondary" (click)="importService.downloadProjectTemplate()">
                <ion-icon name="download-outline" slot="start"></ion-icon>
                Download Template (.xlsx)
              </ion-button>
            </div>
          </div>

          @if (isImporting()) {
            <div class="import-progress-box">
              <span class="progress-msg">{{ importProgressMessage() }}</span>
              <ion-progress-bar type="indeterminate" color="primary"></ion-progress-bar>
            </div>
          }

          <!-- Quick Load Sample Portfolio Datasets -->
          <div class="quick-samples-section">
            <div class="samples-title">
              <ion-icon name="sparkles-outline"></ion-icon>
              <span>One-Click Portfolio Ingestion (Preconfigured Datasets in <code>data/portfolios/</code>):</span>
            </div>

            <div class="sample-cards-grid">
              @for (file of importService.sampleFiles; track file.id) {
                <div class="sample-file-card" [style.border-left-color]="file.color">
                  <div class="sample-card-head">
                    <span class="sample-code-tag">{{ file.code }}</span>
                    <span class="sample-count-badge">{{ file.projectCount }} Projects</span>
                  </div>
                  <h4 class="sample-pf-name">{{ file.portfolioName }}</h4>
                  <p class="sample-pf-desc">{{ file.description }}</p>

                  <div class="sample-card-actions">
                    <button
                      type="button"
                      class="quick-import-btn"
                      [style.background]="file.color"
                      [disabled]="isImporting()"
                      (click)="onQuickImportSample(file)"
                    >
                      <ion-icon name="add-circle-outline"></ion-icon>
                      Load {{ file.projectCount }} Projects
                    </button>
                    <a
                      [href]="'assets/data/portfolios/' + file.filename"
                      download
                      class="download-link"
                      title="Download Excel file to disk"
                    >
                      <ion-icon name="download-outline"></ion-icon>
                    </a>
                  </div>
                </div>
              }
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- SECTION 2: PROJECT LIFECYCLE & DELETION WORKSPACE -->
      <ion-card class="section-card management-card">
        <ion-card-header>
          <div class="header-flex">
            <div>
              <ion-card-title>Project Lifecycle & Deletion Workspace</ion-card-title>
              <ion-card-subtitle>
                Select individual or multiple projects to mark as Backlog, Soft Delete (Trash), or Permanently Delete.
              </ion-card-subtitle>
            </div>

            <!-- Tab Switcher: Active vs Soft-Deleted (Trash) -->
            <div class="tab-switcher">
              <button
                type="button"
                class="tab-btn"
                [class.active]="viewTab() === 'active'"
                (click)="switchViewTab('active')"
              >
                Active Projects ({{ store.activeProjects().length }})
              </button>
              <button
                type="button"
                class="tab-btn"
                [class.active]="viewTab() === 'trash'"
                (click)="switchViewTab('trash')"
              >
                Soft-Deleted / Trash ({{ store.softDeletedProjects().length }})
              </button>
            </div>
          </div>
        </ion-card-header>

        <ion-card-content>
          <!-- Filters & Scope Controls -->
          <div class="filters-toolbar">
            <div class="filter-col">
              <label class="filter-lbl">Scope by Portfolio:</label>
              <select class="custom-select" [(ngModel)]="selectedPortfolioFilter">
                <option value="ALL">All Portfolios ({{ store.portfolios().length }} loaded)</option>
                @for (pf of store.availablePortfolios(); track pf) {
                  <option [value]="pf">{{ pf }} ({{ getPortfolioCount(pf) }} projects)</option>
                }
              </select>
            </div>

            <div class="filter-col">
              <label class="filter-lbl">Filter Status:</label>
              <select class="custom-select" [(ngModel)]="selectedStatusFilter">
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Planning">Planning</option>
                <option value="On Hold">On Hold</option>
                <option value="Backlog">Backlog</option>
              </select>
            </div>

            <div class="filter-col search-col">
              <label class="filter-lbl">Search:</label>
              <div class="search-input-wrap">
                <ion-icon name="funnel-outline"></ion-icon>
                <input
                  type="text"
                  placeholder="Search project ID, name, PM..."
                  [(ngModel)]="searchQuery"
                  class="search-input"
                />
                @if (searchQuery) {
                  <button class="clear-search" (click)="searchQuery = ''">&times;</button>
                }
              </div>
            </div>
          </div>

          <!-- Bulk Actions Strip (Displayed when items are selected) -->
          <div class="bulk-actions-toolbar" [class.has-selection]="selectedIds().size > 0">
            <div class="selection-status">
              <label class="select-all-label">
                <input
                  type="checkbox"
                  [checked]="isAllSelected()"
                  [indeterminate]="isPartiallySelected()"
                  (change)="toggleSelectAll()"
                />
                <span>Select All Filtered ({{ displayedProjects().length }})</span>
              </label>
              @if (selectedIds().size > 0) {
                <span class="sel-count-pill">{{ selectedIds().size }} project(s) selected</span>
              }
            </div>

            <div class="bulk-buttons">
              @if (viewTab() === 'active') {
                <button
                  type="button"
                  class="action-btn backlog-btn"
                  [disabled]="selectedIds().size === 0"
                  (click)="bulkMarkAsBacklog()"
                >
                  <ion-icon name="file-tray-stacked-outline"></ion-icon>
                  Mark as Backlog
                </button>
                <button
                  type="button"
                  class="action-btn active-btn"
                  [disabled]="selectedIds().size === 0"
                  (click)="bulkSetStatus('Active')"
                >
                  <ion-icon name="play-outline"></ion-icon>
                  Set Active
                </button>
                <button
                  type="button"
                  class="action-btn soft-delete-btn"
                  [disabled]="selectedIds().size === 0"
                  (click)="bulkSoftDelete()"
                >
                  <ion-icon name="trash-outline"></ion-icon>
                  Soft Delete (Trash)
                </button>
                <button
                  type="button"
                  class="action-btn hard-delete-btn"
                  [disabled]="selectedIds().size === 0"
                  (click)="bulkPermanentDelete()"
                >
                  <ion-icon name="close-circle-outline"></ion-icon>
                  Permanently Delete
                </button>
              } @else {
                <button
                  type="button"
                  class="action-btn restore-btn"
                  [disabled]="selectedIds().size === 0"
                  (click)="bulkRestore()"
                >
                  <ion-icon name="refresh-outline"></ion-icon>
                  Restore Selected to Active
                </button>
                <button
                  type="button"
                  class="action-btn hard-delete-btn"
                  [disabled]="selectedIds().size === 0"
                  (click)="bulkPermanentDelete()"
                >
                  <ion-icon name="close-circle-outline"></ion-icon>
                  Permanently Delete Selected
                </button>
              }

              <!-- Portfolio Scope Delete Action -->
              @if (selectedPortfolioFilter !== 'ALL') {
                <div class="divider-v"></div>
                <button
                  type="button"
                  class="action-btn danger-outline"
                  (click)="onDeleteEntirePortfolio(selectedPortfolioFilter)"
                >
                  Delete All in {{ selectedPortfolioFilter }}
                </button>
              }
            </div>
          </div>

          <!-- Projects Table -->
          @if (displayedProjects().length === 0) {
            <div class="empty-table-state">
              <ion-icon name="file-tray-outline"></ion-icon>
              <h4>No projects found</h4>
              <p>
                @if (store.rawProjects().length === 0) {
                  Your portfolio has 0 projects. Use the Excel Import section above or click a sample portfolio to load data.
                } @else if (viewTab() === 'trash') {
                  Trash is empty. There are no soft-deleted projects.
                } @else {
                  No projects match your current portfolio, status, or search filters.
                }
              </p>
              @if (store.rawProjects().length === 0) {
                <div class="quick-import-empty-row">
                  <ion-button size="small" (click)="onQuickImportSample(importService.sampleFiles[0])">
                    Load IT InfoSec (40)
                  </ion-button>
                  <ion-button size="small" fill="outline" (click)="onRestoreFactoryDefaults()">
                    Load All 100 Projects
                  </ion-button>
                </div>
              }
            </div>
          } @else {
            <div class="table-responsive">
              <table class="projects-table">
                <thead>
                  <tr>
                    <th style="width: 4%;">
                      <input
                        type="checkbox"
                        [checked]="isAllSelected()"
                        [indeterminate]="isPartiallySelected()"
                        (change)="toggleSelectAll()"
                      />
                    </th>
                    <th style="width: 12%;">Project ID</th>
                    <th style="width: 24%;">Project Name</th>
                    <th style="width: 14%;">Portfolio</th>
                    <th style="width: 10%;">Status</th>
                    <th style="width: 12%;">Tier</th>
                    <th style="width: 8%;">Priority</th>
                    <th style="width: 8%;">Budget</th>
                    <th style="width: 8%;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of displayedProjects(); track p.projectId) {
                    <tr [class.selected-row]="selectedIds().has(p.projectId)" [class.soft-deleted-row]="p.isDeleted">
                      <td>
                        <input
                          type="checkbox"
                          [checked]="selectedIds().has(p.projectId)"
                          (change)="toggleSelect(p.projectId)"
                        />
                      </td>
                      <td>
                        <a [routerLink]="['/projects', p.projectId]" class="pid-link">
                          {{ p.projectId }}
                        </a>
                      </td>
                      <td>
                        <div class="name-cell">
                          <span class="pname-text">{{ p.projectName }}</span>
                          <span class="sub-meta">{{ p.businessUnit }} &bull; {{ p.site }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="pf-tag">{{ p.portfolio }}</span>
                      </td>
                      <td>
                        <span class="status-badge" [attr.data-status]="p.projectStatus">
                          {{ p.projectStatus }}
                        </span>
                      </td>
                      <td>
                        <span class="tier-badge" [attr.data-tier]="p.finalTier">
                          {{ p.finalTier }}
                        </span>
                      </td>
                      <td>
                        <span class="score-text">{{ p.priorityScore.toFixed(1) }}</span>
                      </td>
                      <td>
                        <span class="budget-text">\${{ (p.costEstimateUsd / 1000000).toFixed(2) }}M</span>
                      </td>
                      <td>
                        <div class="row-actions">
                          <button
                            type="button"
                            class="mini-btn edit"
                            title="Edit Project Details & AI Signals"
                            (click)="onOpenEditModal(p)"
                          >
                            Edit
                          </button>
                          @if (!p.isDeleted) {
                            @if (p.projectStatus !== 'Backlog') {
                              <button
                                type="button"
                                class="mini-btn backlog"
                                title="Mark as Backlog"
                                (click)="onSingleMarkBacklog(p)"
                              >
                                Backlog
                              </button>
                            } @else {
                              <button
                                type="button"
                                class="mini-btn active"
                                title="Activate Project"
                                (click)="onSingleSetActive(p)"
                              >
                                Activate
                              </button>
                            }
                            <button
                              type="button"
                              class="mini-btn soft"
                              title="Soft Delete (Move to Trash)"
                              (click)="onSingleSoftDelete(p)"
                            >
                              Soft Del
                            </button>
                            <button
                              type="button"
                              class="mini-btn hard"
                              title="Permanently Delete"
                              (click)="onSingleHardDelete(p)"
                            >
                              Purge
                            </button>
                          } @else {
                            <button
                              type="button"
                              class="mini-btn restore"
                              title="Restore to Active"
                              (click)="onSingleRestore(p)"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              class="mini-btn hard"
                              title="Permanently Delete"
                              (click)="onSingleHardDelete(p)"
                            >
                              Purge
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </ion-card-content>
      </ion-card>

      <!-- Edit Project Modal -->
      @if (editingProject(); as proj) {
        <app-edit-project-modal
          [project]="proj"
          (save)="onSaveEditedProject($event)"
          (cancel)="editingProject.set(null)"
        ></app-edit-project-modal>
      }
    </ion-content>
  `,
  styles: [
    `
      .lifecycle-content {
        --background: var(--pmo-bg, #f4f6f8);
        color: var(--pmo-text, #1a1a1a);
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 16px;
      }
      .page-title {
        font-size: 1.45rem;
        font-weight: 700;
        margin: 0 0 4px 0;
        color: var(--pmo-primary-dark, #004578);
      }
      .page-subtitle {
        font-size: 0.88rem;
        color: var(--pmo-muted, #555);
        margin: 0;
        max-width: 850px;
        line-height: 1.45;
      }

      .portfolio-actions-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .ctrl-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border-radius: 6px;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .ctrl-btn.danger {
        background: #fee2e2;
        color: #b91c1c;
        border: 1px solid #f87171;
      }
      .ctrl-btn.danger:hover {
        background: #dc2626;
        color: #ffffff;
      }
      .ctrl-btn.outline {
        background: #ffffff;
        color: var(--pmo-primary, #0078d4);
        border: 1px solid var(--pmo-primary, #0078d4);
      }
      .ctrl-btn.outline:hover {
        background: rgba(0, 120, 212, 0.08);
      }
      .ctrl-btn.template-btn {
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #86efac;
      }
      .ctrl-btn.template-btn:hover {
        background: #dcfce7;
      }

      .notification-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 6px;
        margin-bottom: 16px;
        font-size: 0.86rem;
        animation: fadeIn 0.2s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .notification-banner.success {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
      }
      .notification-banner.danger {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }
      .notification-banner.info {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        color: #1e40af;
      }
      .close-banner-btn {
        margin-left: auto;
        background: none;
        border: none;
        font-size: 1.2rem;
        color: inherit;
        cursor: pointer;
      }

      .kpi-strip {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }
      .kpi-box {
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 8px;
        padding: 12px;
        text-align: center;
        box-shadow: 0 1px 4px rgba(0,0,0,0.02);
      }
      .kpi-num {
        font-size: 1.6rem;
        font-weight: 800;
        line-height: 1;
        margin-bottom: 4px;
      }
      .kpi-lbl {
        font-size: 0.74rem;
        color: var(--pmo-muted, #666);
        text-transform: uppercase;
        font-weight: 600;
      }
      .active-kpi .kpi-num { color: #16a34a; }
      .backlog-kpi .kpi-num { color: #d97706; }
      .trash-kpi .kpi-num { color: #dc2626; }
      .total-kpi .kpi-num { color: #0284c7; }
      .pf-kpi .kpi-num { color: #7c3aed; }

      .section-card {
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 10px;
        margin-bottom: 20px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
      }
      .header-flex {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 12px;
      }
      .card-badges {
        display: flex;
        gap: 6px;
      }

      /* Drop Zone */
      .drop-zone {
        border: 2px dashed #93c5fd;
        border-radius: 8px;
        background: #f8fbff;
        padding: 24px 16px;
        text-align: center;
        transition: all 0.2s ease;
        margin-bottom: 18px;
      }
      .drop-zone.drag-over {
        border-color: var(--pmo-primary, #0078d4);
        background: #ebf5ff;
      }
      .drop-icon {
        font-size: 2.2rem;
        color: var(--pmo-primary, #0078d4);
        margin-bottom: 6px;
      }
      .drop-text {
        font-size: 0.95rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 4px;
      }
      .drop-subtext {
        font-size: 0.78rem;
        color: #64748b;
        margin-bottom: 14px;
      }
      .drop-actions {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 14px;
      }
      .import-options {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .opt-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #475569;
      }
      .custom-select {
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 5px 10px;
        font-size: 0.82rem;
        background: #ffffff;
        color: #1e293b;
        outline: none;
      }

      .import-progress-box {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 16px;
      }
      .progress-msg {
        font-size: 0.82rem;
        font-weight: 600;
        color: #166534;
        display: block;
        margin-bottom: 6px;
      }

      /* Quick Sample Files */
      .quick-samples-section {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 14px;
      }
      .samples-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.84rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 12px;
      }
      .samples-title code {
        background: #e2e8f0;
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 0.8rem;
      }

      .sample-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }
      .sample-file-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-left-width: 4px;
        border-radius: 6px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 1px 4px rgba(0,0,0,0.02);
      }
      .sample-card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      .sample-code-tag {
        font-size: 0.7rem;
        font-weight: 700;
        font-family: monospace;
        color: #64748b;
      }
      .sample-count-badge {
        font-size: 0.7rem;
        background: #f1f5f9;
        color: #475569;
        padding: 1px 6px;
        border-radius: 10px;
        font-weight: 600;
      }
      .sample-pf-name {
        margin: 2px 0 4px 0;
        font-size: 0.88rem;
        font-weight: 700;
        color: #0f172a;
      }
      .sample-pf-desc {
        font-size: 0.75rem;
        color: #64748b;
        line-height: 1.35;
        margin: 0 0 10px 0;
        flex: 1;
      }
      .sample-card-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .quick-import-btn {
        flex: 1;
        border: none;
        color: #ffffff;
        padding: 5px 8px;
        border-radius: 4px;
        font-size: 0.74rem;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: opacity 0.15s ease;
      }
      .quick-import-btn:hover {
        opacity: 0.9;
      }
      .download-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: #f1f5f9;
        color: #475569;
        border-radius: 4px;
        text-decoration: none;
      }
      .download-link:hover {
        background: #e2e8f0;
        color: #0f172a;
      }

      /* Management Tab Switcher */
      .tab-switcher {
        display: flex;
        background: #f1f5f9;
        border-radius: 6px;
        padding: 3px;
        gap: 2px;
      }
      .tab-btn {
        border: none;
        background: transparent;
        padding: 5px 12px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .tab-btn.active {
        background: #ffffff;
        color: var(--pmo-primary, #0078d4);
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      }

      /* Filters Toolbar */
      .filters-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f0f0f0;
      }
      .filter-col {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .filter-lbl {
        font-size: 0.78rem;
        font-weight: 600;
        color: #64748b;
      }
      .search-col {
        margin-left: auto;
      }
      .search-input-wrap {
        display: flex;
        align-items: center;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 3px 8px;
        width: 240px;
      }
      .search-input-wrap ion-icon {
        color: #94a3b8;
        margin-right: 6px;
      }
      .search-input {
        border: none;
        outline: none;
        font-size: 0.8rem;
        width: 100%;
      }
      .clear-search {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 1rem;
      }

      /* Bulk Actions Toolbar */
      .bulk-actions-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 12px;
        margin-bottom: 12px;
        transition: all 0.2s ease;
      }
      .bulk-actions-toolbar.has-selection {
        background: #eff6ff;
        border-color: #bfdbfe;
      }
      .selection-status {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .select-all-label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.82rem;
        font-weight: 600;
        color: #1e293b;
        cursor: pointer;
      }
      .sel-count-pill {
        font-size: 0.72rem;
        font-weight: 700;
        background: var(--pmo-primary, #0078d4);
        color: #ffffff;
        padding: 2px 8px;
        border-radius: 10px;
      }

      .bulk-buttons {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }
      .action-btn {
        border: none;
        border-radius: 4px;
        padding: 5px 10px;
        font-size: 0.76rem;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s ease;
      }
      .action-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .action-btn.backlog-btn {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
      }
      .action-btn.backlog-btn:hover:not(:disabled) {
        background: #fde68a;
      }
      .action-btn.active-btn {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
      .action-btn.active-btn:hover:not(:disabled) {
        background: #bbf7d0;
      }
      .action-btn.soft-delete-btn {
        background: #fee2e2;
        color: #b91c1c;
        border: 1px solid #fecaca;
      }
      .action-btn.soft-delete-btn:hover:not(:disabled) {
        background: #fecaca;
      }
      .action-btn.hard-delete-btn {
        background: #991b1b;
        color: #ffffff;
      }
      .action-btn.hard-delete-btn:hover:not(:disabled) {
        background: #7f1d1d;
      }
      .action-btn.restore-btn {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
      }
      .action-btn.restore-btn:hover:not(:disabled) {
        background: #bae6fd;
      }
      .divider-v {
        width: 1px;
        height: 20px;
        background: #cbd5e1;
        margin: 0 4px;
      }
      .action-btn.danger-outline {
        background: #ffffff;
        color: #dc2626;
        border: 1px solid #f87171;
      }
      .action-btn.danger-outline:hover {
        background: #fef2f2;
      }

      /* Table Styles */
      .table-responsive {
        overflow-x: auto;
      }
      .projects-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
      }
      .projects-table th {
        background: #f8fafc;
        padding: 8px 10px;
        text-align: left;
        font-weight: 700;
        color: #333;
        border-bottom: 2px solid var(--pmo-border, #e0e0e0);
      }
      .projects-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: middle;
      }
      .projects-table tr.selected-row {
        background: #f0fdf4;
      }
      .projects-table tr.soft-deleted-row {
        opacity: 0.65;
        background: #fff5f5;
      }

      .pid-link {
        font-family: monospace;
        font-weight: 700;
        color: var(--pmo-primary, #0078d4);
        text-decoration: none;
      }
      .pid-link:hover {
        text-decoration: underline;
      }
      .name-cell {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .pname-text {
        font-weight: 600;
        color: #0f172a;
      }
      .sub-meta {
        font-size: 0.72rem;
        color: #64748b;
      }
      .pf-tag {
        font-size: 0.72rem;
        background: #f1f5f9;
        color: #334155;
        padding: 2px 6px;
        border-radius: 4px;
      }

      .status-badge {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .status-badge[data-status="Active"] { background: #dcfce7; color: #15803d; }
      .status-badge[data-status="Planning"] { background: #e0f2fe; color: #0369a1; }
      .status-badge[data-status="On Hold"] { background: #fef9c3; color: #854d0e; }
      .status-badge[data-status="Backlog"] { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }

      .tier-badge {
        font-size: 0.7rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .tier-badge[data-tier="Must-do-now"] { background: #fee2e2; color: #b91c1c; }
      .tier-badge[data-tier="Proceed"] { background: #dcfce7; color: #15803d; }
      .tier-badge[data-tier="Can wait"] { background: #fef9c3; color: #854d0e; }
      .tier-badge[data-tier="Candidate to deprioritize"] { background: #f1f5f9; color: #475569; }

      .score-text {
        font-weight: 700;
        color: #0f172a;
      }
      .budget-text {
        color: #334155;
      }

      .row-actions {
        display: flex;
        gap: 4px;
      }
      .mini-btn {
        border: none;
        border-radius: 3px;
        padding: 2px 6px;
        font-size: 0.7rem;
        font-weight: 600;
        cursor: pointer;
      }
      .mini-btn.edit { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
      .mini-btn.backlog { background: #fef3c7; color: #92400e; }
      .mini-btn.active { background: #dcfce7; color: #166534; }
      .mini-btn.soft { background: #fee2e2; color: #b91c1c; }
      .mini-btn.restore { background: #e0f2fe; color: #0284c7; }
      .mini-btn.hard { background: #ef4444; color: #ffffff; }

      .empty-table-state {
        text-align: center;
        padding: 36px 16px;
        color: #64748b;
      }
      .empty-table-state ion-icon {
        font-size: 2.8rem;
        color: #cbd5e1;
        margin-bottom: 8px;
      }
      .empty-table-state h4 {
        margin: 0 0 4px 0;
        color: #1e293b;
      }
      .empty-table-state p {
        margin: 0 0 16px 0;
        font-size: 0.84rem;
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
      }
      .quick-import-empty-row {
        display: flex;
        justify-content: center;
        gap: 10px;
      }
    `,
  ],
})
export class LifecyclePageComponent {
  readonly store = inject(PortfolioStore);
  readonly importService = inject(PortfolioImportService);

  readonly viewTab = signal<'active' | 'trash'>('active');
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly editingProject = signal<Project | null>(null);
  readonly isDragOver = signal<boolean>(false);
  readonly isImporting = signal<boolean>(false);
  readonly importProgressMessage = signal<string>('');

  readonly actionMessage = signal<string | null>(null);
  readonly actionMessageType = signal<'success' | 'danger' | 'info'>('info');

  importMode: 'append' | 'replacePortfolio' | 'replaceAll' = 'append';
  selectedPortfolioFilter = 'ALL';
  selectedStatusFilter = 'ALL';
  searchQuery = '';

  readonly displayedProjects = computed<Project[]>(() => {
    const isTrash = this.viewTab() === 'trash';
    const base = isTrash ? this.store.softDeletedProjects() : this.store.activeProjects();
    const pf = this.selectedPortfolioFilter;
    const st = this.selectedStatusFilter;
    const q = this.searchQuery.toLowerCase().trim();

    return base.filter((p) => {
      if (pf !== 'ALL' && p.portfolio !== pf) return false;
      if (st !== 'ALL' && p.projectStatus !== st) return false;
      if (q) {
        const mId = p.projectId.toLowerCase().includes(q);
        const mName = p.projectName.toLowerCase().includes(q);
        const mPm = p.projectManager.toLowerCase().includes(q);
        const mSponsor = p.executiveSponsor.toLowerCase().includes(q);
        if (!mId && !mName && !mPm && !mSponsor) return false;
      }
      return true;
    });
  });

  isAllSelected(): boolean {
    const list = this.displayedProjects();
    if (list.length === 0) return false;
    return list.every((p) => this.selectedIds().has(p.projectId));
  }

  isPartiallySelected(): boolean {
    const list = this.displayedProjects();
    if (list.length === 0) return false;
    const count = list.filter((p) => this.selectedIds().has(p.projectId)).length;
    return count > 0 && count < list.length;
  }

  toggleSelectAll(): void {
    const list = this.displayedProjects();
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (this.isAllSelected()) {
        list.forEach((p) => next.delete(p.projectId));
      } else {
        list.forEach((p) => next.add(p.projectId));
      }
      return next;
    });
  }

  toggleSelect(projectId: string): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  switchViewTab(tab: 'active' | 'trash'): void {
    this.viewTab.set(tab);
    this.selectedIds.set(new Set());
  }

  getPortfolioCount(portfolio: string): number {
    return this.store.rawProjects().filter((p) => p.portfolio === portfolio && !p.isDeleted).length;
  }

  // Bulk Actions
  bulkMarkAsBacklog(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    this.store.markAsBacklog(ids);
    this.notify(`Marked ${ids.length} project(s) as Backlog.`, 'success');
    this.selectedIds.set(new Set());
  }

  bulkSetStatus(status: ProjectStatus): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    this.store.setProjectStatus(ids, status);
    this.notify(`Updated ${ids.length} project(s) to status "${status}".`, 'success');
    this.selectedIds.set(new Set());
  }

  bulkSoftDelete(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    this.store.softDeleteProjects(ids);
    this.notify(`Soft-deleted ${ids.length} project(s). Moved to Trash tab.`, 'info');
    this.selectedIds.set(new Set());
  }

  bulkRestore(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    this.store.restoreProjects(ids);
    this.notify(`Restored ${ids.length} project(s) to Active.`, 'success');
    this.selectedIds.set(new Set());
  }

  bulkPermanentDelete(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    if (confirm(`Are you sure you want to PERMANENTLY delete ${ids.length} project(s)? This action cannot be undone.`)) {
      this.store.permanentDeleteProjects(ids);
      this.notify(`Permanently deleted ${ids.length} project(s).`, 'danger');
      this.selectedIds.set(new Set());
    }
  }

  onDeleteEntirePortfolio(portfolio: string): void {
    const count = this.getPortfolioCount(portfolio);
    if (count === 0) {
      this.notify(`No active projects in portfolio ${portfolio}.`, 'info');
      return;
    }
    const choice = confirm(
      `Delete all ${count} project(s) in "${portfolio}"?\n\nClick OK for Soft Delete (move to Trash), or click Cancel to abort.`
    );
    if (choice) {
      this.store.deleteByPortfolio(portfolio, false);
      this.notify(`Soft-deleted all ${count} projects in "${portfolio}".`, 'info');
      this.selectedIds.set(new Set());
    }
  }

  // Single row actions
  onOpenEditModal(p: Project): void {
    this.editingProject.set(p);
  }

  onSaveEditedProject(updated: Project): void {
    const list = this.store.rawProjects().map((p) => (p.projectId === updated.projectId ? updated : p));
    this.store.updateDatasetProjects(list);
    this.editingProject.set(null);
    this.notify(`Successfully updated project ${updated.projectId} (${updated.projectName}).`, 'success');
  }

  onSingleMarkBacklog(p: Project): void {
    this.store.markAsBacklog(p.projectId);
    this.notify(`Project ${p.projectId} marked as Backlog.`, 'success');
  }

  onSingleSetActive(p: Project): void {
    this.store.setProjectStatus(p.projectId, 'Active');
    this.notify(`Project ${p.projectId} status set to Active.`, 'success');
  }

  onSingleSoftDelete(p: Project): void {
    this.store.softDeleteProjects(p.projectId);
    this.notify(`Project ${p.projectId} soft-deleted. Moved to Trash tab.`, 'info');
  }

  onSingleRestore(p: Project): void {
    this.store.restoreProjects(p.projectId);
    this.notify(`Project ${p.projectId} restored to Active.`, 'success');
  }

  onSingleHardDelete(p: Project): void {
    if (confirm(`Permanently delete project ${p.projectId} (${p.projectName})?`)) {
      this.store.permanentDeleteProjects(p.projectId);
      this.notify(`Project ${p.projectId} permanently deleted.`, 'danger');
    }
  }

  // Portfolio resets
  onConfirmClearAll(): void {
    if (confirm('CLEAR ALL PROJECTS? This sets the portfolio to 0 projects so you can import clean datasets.')) {
      this.store.clearAllProjects();
      this.selectedIds.set(new Set());
      this.notify('Portfolio cleared (0 projects). Ready for data import.', 'info');
    }
  }

  onRestoreFactoryDefaults(): void {
    this.store.resetToDefaultData();
    this.selectedIds.set(new Set());
    this.notify('Restored 100 sample projects across all 5 portfolios.', 'success');
  }

  // Quick import sample file
  async onQuickImportSample(file: SamplePortfolioFile): Promise<void> {
    this.isImporting.set(true);
    this.importProgressMessage.set(`Loading and parsing ${file.filename}...`);
    try {
      const parsed = await this.importService.fetchAndParseSample(file.filename);
      const res = this.store.importProjects(parsed.projects, this.importMode);
      this.notify(
        `Successfully imported ${res.added} project(s) for "${file.portfolioName}". Total portfolio projects: ${res.total}.`,
        'success'
      );
    } catch (err: any) {
      this.notify(`Failed to import ${file.filename}: ${err?.message || err}`, 'danger');
    } finally {
      this.isImporting.set(false);
      this.importProgressMessage.set('');
    }
  }

  // Drag and drop / file upload
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver.set(true);
  }

  onFileDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver.set(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processUploadedFile(files[0]);
    }
  }

  onFileInputChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processUploadedFile(input.files[0]);
      input.value = '';
    }
  }

  private async processUploadedFile(file: File): Promise<void> {
    this.isImporting.set(true);
    this.importProgressMessage.set(`Parsing Excel file: ${file.name}...`);
    try {
      const parsed = await this.importService.parseExcelFile(file);
      const res = this.store.importProjects(parsed.projects, this.importMode);
      this.notify(
        `Import complete: ${res.added} added, ${res.updated} updated from ${file.name}. Total projects: ${res.total}.`,
        'success'
      );
    } catch (err: any) {
      this.notify(`Import failed: ${err?.message || err}`, 'danger');
    } finally {
      this.isImporting.set(false);
      this.importProgressMessage.set('');
    }
  }

  private notify(message: string, type: 'success' | 'danger' | 'info'): void {
    this.actionMessage.set(message);
    this.actionMessageType.set(type);
    setTimeout(() => {
      if (this.actionMessage() === message) {
        this.actionMessage.set(null);
      }
    }, 6000);
  }
}
