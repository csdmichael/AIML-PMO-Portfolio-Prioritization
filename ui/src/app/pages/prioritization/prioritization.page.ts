import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonBadge,
} from '@ionic/angular';
import { PortfolioStore } from '../../services/portfolio.store';
import { Project, SortField, GroupByOption } from '../../models/portfolio.models';
import { FilterPanelComponent } from '../../components/filter-panel/filter-panel.component';
import { DetailPanelComponent } from '../../components/detail-panel/detail-panel.component';
import { ConfidenceRingComponent } from '../../components/confidence-ring/confidence-ring.component';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { ResultBlockComponent } from '../../components/result-block/result-block.component';
import { ExportTableData } from '../../services/file-export.service';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-prioritization-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonButton,
    IonSelect,
    IonSelectOption,
    IonBadge,
    FilterPanelComponent,
    DetailPanelComponent,
    ConfidenceRingComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    ResultBlockComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="prioritization-content">
      <div class="prioritization-layout">
        <!-- LEFT FILTER PANEL -->
        <aside class="sidebar-filters">
          <app-filter-panel></app-filter-panel>
        </aside>

        <!-- CENTER WORKSPACE -->
        <main class="main-workspace">
          <!-- Top Toolbar: View switcher, Sort, GroupBy, Export/Result block toggle -->
          <div class="workspace-toolbar">
            <div class="toolbar-left">
              <ion-segment
                [value]="store.activeView()"
                (ionChange)="onViewChange($event)"
                class="view-segment"
              >
                <ion-segment-button value="board">
                  <ion-label>Board</ion-label>
                </ion-segment-button>
                <ion-segment-button value="table">
                  <ion-label>Table</ion-label>
                </ion-segment-button>
                <ion-segment-button value="hierarchy">
                  <ion-label>Hierarchy</ion-label>
                </ion-segment-button>
              </ion-segment>

              <span class="count-tag">
                {{ store.filteredProjects().length }} projects
              </span>
            </div>

            <div class="toolbar-right">
              <!-- Sort control -->
              <div class="control-wrap">
                <span class="control-label">Sort:</span>
                <select
                  class="select-sm"
                  [ngModel]="store.sortField()"
                  (ngModelChange)="store.setSort($event)"
                >
                  <option value="priority">Priority Score</option>
                  <option value="confidence">Confidence Score</option>
                  <option value="goLive">Go-Live Date</option>
                  <option value="cost">Cost Estimate</option>
                  <option value="sources">Sources Present</option>
                  <option value="name">Project Name</option>
                </select>
                <button
                  type="button"
                  class="dir-toggle-btn"
                  (click)="toggleSortDirection()"
                  [title]="'Direction: ' + store.sortDirection()"
                >
                  {{ store.sortDirection() === 'asc' ? '▲' : '▼' }}
                </button>
              </div>

              <!-- Group By control -->
              <div class="control-wrap">
                <span class="control-label">Group:</span>
                <select
                  class="select-sm"
                  [ngModel]="store.groupBy()"
                  (ngModelChange)="store.setGroupBy($event)"
                >
                  <option value="none">None</option>
                  <option value="finalTier">Priority Tier</option>
                  <option value="confidenceLevel">Confidence</option>
                  <option value="businessUnit">Business Unit</option>
                  <option value="cluster">Cluster</option>
                  <option value="recommendedAction">Action</option>
                </select>
              </div>

              <!-- Table Tools Toggle -->
              <button
                type="button"
                class="tools-btn"
                [class.active]="showTableTools()"
                (click)="showTableTools.update(v => !v)"
                title="Toggle Table Tools & Multi-Format Exports"
              >
                <ion-icon name="document-text-outline"></ion-icon>
                <span>Export Tools</span>
              </button>
            </div>
          </div>

          <!-- TABLE TOOLS / EXPORT BLOCK -->
          @if (showTableTools()) {
            <div class="table-tools-container">
              <app-result-block [table]="getExportTableData()"></app-result-block>
            </div>
          }

          <!-- MAIN VIEW AREA -->
          @if (store.isLoading()) {
            <app-loading-skeleton [cards]="3" [rows]="8"></app-loading-skeleton>
          } @else if (store.loadError()) {
            <app-empty-state
              title="No Data in OneLake"
              [message]="store.loadError()!"
              [detail]="store.problemDetail()"
              [isError]="true"
            >
              <ion-button (click)="store.init()">Retry</ion-button>
            </app-empty-state>
          } @else if (store.filteredProjects().length === 0) {
            <app-empty-state
              title="No Matching Projects"
              message="No projects match your current filter settings. Try resetting filters."
            >
              <ion-button fill="outline" (click)="store.resetFilters()">Reset Filters</ion-button>
            </app-empty-state>
          } @else {
            <!-- VIEW: BOARD (Kanban style by groups or tiers) -->
            @if (store.activeView() === 'board') {
              <div class="board-view-container">
                @for (grp of store.groupedProjects(); track grp.key) {
                  <div class="board-column">
                    <div class="board-column-header">
                      <div class="col-title-wrap">
                        <span class="col-title">{{ grp.label }}</span>
                        <span class="col-count">({{ grp.count }})</span>
                      </div>
                      <div class="col-meta">
                        <span>Avg: {{ grp.avgConfidence }}%</span>
                        <span>\${{ (grp.totalCost / 1000000).toFixed(1) }}M</span>
                      </div>
                    </div>

                    <div class="board-cards-list">
                      @for (p of grp.items; track p.projectId) {
                        <div
                          class="project-card"
                          [class.selected]="store.selectedProjectId() === p.projectId"
                          (click)="store.selectProject(p.projectId)"
                        >
                          <div class="card-top">
                            <div class="card-id-row">
                              <span class="card-id">{{ p.projectId }}</span>
                              @if (store.isPinned(p.projectId)) {
                                <span class="pin-star">&#9733;</span>
                              }
                            </div>
                            <span class="card-score">{{ p.priorityScore }}</span>
                          </div>

                          <div class="card-name">{{ p.projectName }}</div>

                          <div class="card-sub">{{ p.businessUnit }} &bull; {{ p.site }}</div>

                          <div class="card-bottom">
                            <span class="tier-pill" [class]="getTierClass(p.finalTier)">{{ p.finalTier }}</span>
                            <span class="cost-pill">\${{ (p.costEstimateUsd / 1000000).toFixed(2) }}M</span>
                            <span class="conf-pill">{{ p.confidenceScore }}%</span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <!-- VIEW: TABLE (Sortable, sticky header, virtual-scroll styling, pagination) -->
            @if (store.activeView() === 'table') {
              <div class="table-view-container">
                <table class="pmo-table">
                  <thead>
                    <tr>
                      <th (click)="store.setSort('priority')">Priority ↕</th>
                      <th (click)="store.setSort('name')">Project ID & Name ↕</th>
                      <th>Tier</th>
                      <th (click)="store.setSort('confidence')">Confidence ↕</th>
                      <th>Business Unit</th>
                      <th>Site</th>
                      <th (click)="store.setSort('cost')">Cost (USD) ↕</th>
                      <th (click)="store.setSort('goLive')">Go-Live ↕</th>
                      <th (click)="store.setSort('sources')">Sources ↕</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of paginatedProjects(); track p.projectId) {
                      <tr
                        [class.selected-row]="store.selectedProjectId() === p.projectId"
                        (click)="store.selectProject(p.projectId)"
                      >
                        <td class="td-priority">
                          <strong>{{ p.priorityScore }}</strong>
                        </td>
                        <td class="td-name">
                          <span class="pid">{{ p.projectId }}</span>
                          <span class="pname">{{ p.projectName }}</span>
                        </td>
                        <td>
                          <span class="tier-pill" [class]="getTierClass(p.finalTier)">{{ p.finalTier }}</span>
                        </td>
                        <td>
                          <span class="conf-pill">{{ p.confidenceScore }}% ({{ p.confidenceLevel }})</span>
                        </td>
                        <td>{{ p.businessUnit }}</td>
                        <td>{{ p.site }}</td>
                        <td>\${{ (p.costEstimateUsd / 1000000).toFixed(2) }}M</td>
                        <td>{{ p.goLiveDate }}</td>
                        <td>{{ p.sourcesPresent }}/11</td>
                        <td>
                          <span class="action-tag">{{ p.recommendedAction }}</span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>

                <!-- Pagination footer -->
                <div class="table-pagination-footer">
                  <div class="pagination-info">
                    Showing {{ paginationStart() }}-{{ paginationEnd() }} of {{ totalProjectsCount() }}
                  </div>
                  <div class="pagination-controls">
                    <span class="page-size-label">Rows per page:</span>
                    <select
                      class="page-size-select"
                      [ngModel]="pageSize()"
                      (ngModelChange)="onPageSizeChange($event)"
                    >
                      @for (sz of availablePageSizes(); track sz) {
                        <option [value]="sz">{{ sz }}</option>
                      }
                    </select>
                    <button
                      type="button"
                      class="page-btn"
                      [disabled]="currentPage() <= 1"
                      (click)="onPageChange(currentPage() - 1)"
                    >
                      ‹ Prev
                    </button>
                    <span class="current-page-num">{{ currentPage() }} / {{ totalPages() }}</span>
                    <button
                      type="button"
                      class="page-btn"
                      [disabled]="currentPage() >= totalPages()"
                      (click)="onPageChange(currentPage() + 1)"
                    >
                      Next ›
                    </button>
                  </div>
                </div>
              </div>
            }

            <!-- VIEW: HIERARCHY INLINE -->
            @if (store.activeView() === 'hierarchy') {
              <div class="hierarchy-inline-container">
                @for (bu of store.hierarchyTree(); track bu.id) {
                  <div class="bu-group">
                    <div class="bu-title-bar">
                      <strong>{{ bu.name }}</strong>
                      <span class="bu-meta">
                        {{ bu.count }} projects &bull; \${{ (bu.totalCost / 1000000).toFixed(2) }}M &bull; {{ bu.avgConfidence }}% avg conf
                      </span>
                    </div>
                    <div class="bu-items-grid">
                      @for (site of bu.children; track site.id) {
                        @for (proj of site.children; track proj.id) {
                          <div
                            class="inline-proj-pill"
                            [class.selected]="store.selectedProjectId() === proj.project?.projectId"
                            (click)="store.selectProject(proj.project?.projectId!)"
                          >
                            <span class="ip-id">{{ proj.project?.projectId }}</span>
                            <span class="ip-name">{{ proj.project?.projectName }}</span>
                            <span class="ip-tier">{{ proj.project?.finalTier }}</span>
                          </div>
                        }
                      }
                    </div>
                  </div>
                }
              </div>
            }
          }
        </main>

        <!-- RIGHT DETAIL PANEL (Side panel on web) -->
        <aside class="sidebar-detail">
          <app-detail-panel></app-detail-panel>
        </aside>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .prioritization-content {
        --background: var(--pmo-bg, #f4f6f8);
        height: 100%;
      }
      .prioritization-layout {
        display: grid;
        grid-template-columns: 280px 1fr 380px;
        height: 100%;
        overflow: hidden;
      }
      .sidebar-filters {
        border-right: 1px solid var(--pmo-border, #e0e0e0);
        background: var(--pmo-surface, #ffffff);
        overflow-y: auto;
        padding: 10px;
      }
      .main-workspace {
        overflow-y: auto;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .sidebar-detail {
        border-left: 1px solid var(--pmo-border, #e0e0e0);
        background: var(--pmo-surface, #ffffff);
        overflow-y: auto;
        padding: 10px;
      }
      .workspace-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--pmo-surface, #ffffff);
        padding: 6px 12px;
        border-radius: 8px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        flex-wrap: wrap;
        gap: 8px;
      }
      .toolbar-left,
      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .view-segment {
        width: 220px;
      }
      .count-tag {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--pmo-muted, #666666);
      }
      .control-wrap {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .control-label {
        font-size: 0.78rem;
        font-weight: 600;
        color: #555555;
      }
      .select-sm {
        padding: 4px 6px;
        font-size: 0.8rem;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 4px;
        background: #ffffff;
      }
      .dir-toggle-btn {
        padding: 3px 6px;
        font-size: 0.75rem;
        border: 1px solid var(--pmo-border, #e0e0e0);
        background: #ffffff;
        border-radius: 4px;
        cursor: pointer;
      }
      .tools-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        font-size: 0.8rem;
        font-weight: 600;
        border: 1px solid var(--pmo-primary, #0078d4);
        background: #ffffff;
        color: var(--pmo-primary, #0078d4);
        border-radius: 6px;
        cursor: pointer;
      }
      .tools-btn.active {
        background: var(--pmo-primary, #0078d4);
        color: #ffffff;
      }
      .table-tools-container {
        margin-bottom: 6px;
      }
      /* BOARD / KANBAN */
      .board-view-container {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 12px;
      }
      .board-column {
        min-width: 280px;
        max-width: 320px;
        background: #f0f2f5;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        border: 1px solid #e1e4e8;
      }
      .board-column-header {
        padding: 10px 12px;
        background: #e8ebef;
        border-radius: 8px 8px 0 0;
        border-bottom: 1px solid #d5d9de;
      }
      .col-title-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .col-title {
        font-weight: 700;
        font-size: 0.88rem;
        color: #1a1a1a;
      }
      .col-count {
        font-size: 0.78rem;
        color: #666666;
      }
      .col-meta {
        font-size: 0.72rem;
        color: #666666;
        display: flex;
        gap: 10px;
        margin-top: 2px;
      }
      .board-cards-list {
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        max-height: calc(100vh - 240px);
      }
      .project-card {
        background: #ffffff;
        padding: 10px;
        border-radius: 6px;
        border: 1px solid #e0e0e0;
        cursor: pointer;
        transition: box-shadow 0.15s ease, border-color 0.15s ease;
      }
      .project-card:hover {
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      }
      .project-card.selected {
        border-color: var(--pmo-primary, #0078d4);
        background: #f4f9fd;
      }
      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .card-id {
        font-weight: 700;
        font-size: 0.78rem;
        color: var(--pmo-primary, #0078d4);
      }
      .pin-star {
        color: #c19c00;
        font-size: 0.8rem;
        margin-left: 4px;
      }
      .card-score {
        font-size: 0.85rem;
        font-weight: 800;
        color: #222222;
      }
      .card-name {
        font-size: 0.84rem;
        font-weight: 600;
        color: #1a1a1a;
        margin: 4px 0 2px 0;
        line-height: 1.25;
      }
      .card-sub {
        font-size: 0.72rem;
        color: #666666;
      }
      .card-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
      }
      .tier-pill {
        font-size: 0.68rem;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 700;
      }
      .tier-mustdo {
        background: #fed9cc;
        color: #d13438;
      }
      .tier-proceed {
        background: #dff6dd;
        color: #107c10;
      }
      .tier-canwait {
        background: #fff4ce;
        color: #795e00;
      }
      .tier-deprioritize {
        background: #e1dfdd;
        color: #444444;
      }
      .cost-pill {
        font-size: 0.72rem;
        font-weight: 600;
        color: #333333;
      }
      .conf-pill {
        font-size: 0.72rem;
        font-weight: 600;
        color: #107c10;
      }

      /* TABLE VIEW */
      .table-view-container {
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        overflow-x: auto;
        max-height: calc(100vh - 220px);
      }
      .pmo-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
      }
      .pmo-table th {
        background: #f8f9fb;
        padding: 8px 12px;
        text-align: left;
        border-bottom: 2px solid var(--pmo-border, #e0e0e0);
        color: #555555;
        cursor: pointer;
        user-select: none;
        position: sticky;
        top: 0;
        z-index: 2;
      }
      .pmo-table td {
        padding: 8px 12px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
      }
      .pmo-table tr:hover {
        background: #f9fbfd;
      }
      .pmo-table tr.selected-row {
        background: #eaf3fb;
      }
      .td-name {
        display: flex;
        flex-direction: column;
      }
      .pid {
        font-weight: 700;
        font-size: 0.75rem;
        color: var(--pmo-primary, #0078d4);
      }
      .pname {
        font-weight: 600;
        color: #222222;
      }
      .action-tag {
        font-size: 0.7rem;
        background: #f0f0f0;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
      .table-pagination-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        background: #f8f9fb;
        border-top: 1px solid var(--pmo-border, #e0e0e0);
        flex-wrap: wrap;
        gap: 10px;
        font-size: 0.8rem;
      }
      .pagination-info {
        color: var(--pmo-muted, #666666);
      }
      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .page-size-label {
        color: #555555;
      }
      .page-size-select {
        padding: 3px 6px;
        font-size: 0.78rem;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 4px;
        background: #ffffff;
      }
      .page-btn {
        padding: 4px 8px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        background: #ffffff;
        color: #333333;
        border-radius: 4px;
        font-size: 0.75rem;
        cursor: pointer;
      }
      .page-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .current-page-num {
        font-weight: 600;
        padding: 0 4px;
      }

      /* HIERARCHY INLINE */
      .hierarchy-inline-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .bu-group {
        background: #ffffff;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 8px;
        padding: 12px;
      }
      .bu-title-bar {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid #f0f0f0;
        padding-bottom: 6px;
        margin-bottom: 8px;
      }
      .bu-meta {
        font-size: 0.78rem;
        color: #666666;
      }
      .bu-items-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 6px;
      }
      .inline-proj-pill {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 10px;
        background: #f8f9fa;
        border: 1px solid #e2e5e8;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.78rem;
      }
      .inline-proj-pill.selected {
        border-color: var(--pmo-primary, #0078d4);
        background: #eaf3fb;
      }
      .ip-id {
        font-weight: 700;
        color: var(--pmo-primary, #0078d4);
        margin-right: 6px;
      }
      .ip-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: 6px;
      }
      .ip-tier {
        font-size: 0.68rem;
        font-weight: 600;
        color: #555555;
      }

      /* Responsive adjustments */
      @media (max-width: 1200px) {
        .prioritization-layout {
          grid-template-columns: 260px 1fr;
        }
        .sidebar-detail {
          display: none;
        }
      }
      @media (max-width: 768px) {
        .prioritization-layout {
          grid-template-columns: 1fr;
        }
        .sidebar-filters {
          display: none;
        }
      }
    `,
  ],
})
export class PrioritizationPageComponent {
  readonly store = inject(PortfolioStore);
  private readonly configService = inject(ConfigService);
  readonly showTableTools = signal<boolean>(false);

  // Pagination state derived from ui.json config
  readonly pageSize = signal<number>(this.configService.config.table?.pageSize ?? 25);
  readonly currentPage = signal<number>(1);

  readonly availablePageSizes = computed<number[]>(() => {
    return this.configService.config.table?.pageSizes ?? [10, 25, 50, 100];
  });

  readonly totalProjectsCount = computed<number>(() => {
    return this.store.sortedFilteredProjects().length;
  });

  readonly totalPages = computed<number>(() => {
    const total = this.totalProjectsCount();
    const sz = this.pageSize();
    return Math.max(1, Math.ceil(total / sz));
  });

  readonly paginatedProjects = computed<Project[]>(() => {
    const all = this.store.sortedFilteredProjects();
    const page = Math.min(this.currentPage(), this.totalPages());
    const sz = this.pageSize();
    const start = (page - 1) * sz;
    return all.slice(start, start + sz);
  });

  readonly paginationStart = computed<number>(() => {
    const total = this.totalProjectsCount();
    if (total === 0) return 0;
    const page = Math.min(this.currentPage(), this.totalPages());
    return (page - 1) * this.pageSize() + 1;
  });

  readonly paginationEnd = computed<number>(() => {
    const total = this.totalProjectsCount();
    const page = Math.min(this.currentPage(), this.totalPages());
    return Math.min(page * this.pageSize(), total);
  });

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(newSize: number): void {
    const size = Number(newSize) || 25;
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  onViewChange(event: CustomEvent): void {
    const val = event.detail.value;
    if (val === 'board' || val === 'table' || val === 'hierarchy' || val === 'overview') {
      this.store.setActiveView(val);
    }
  }

  toggleSortDirection(): void {
    this.store.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
  }

  getTierClass(tier: string): string {
    switch (tier) {
      case 'Must-do-now':
        return 'tier-mustdo';
      case 'Proceed':
        return 'tier-proceed';
      case 'Can wait':
        return 'tier-canwait';
      default:
        return 'tier-deprioritize';
    }
  }

  getExportTableData(): ExportTableData {
    const projects = this.store.sortedFilteredProjects();
    const headers = [
      'Project ID',
      'Project Name',
      'Priority Score',
      'Final Tier',
      'Confidence Score',
      'Business Unit',
      'Site',
      'Cost USD',
      'Go-Live Date',
      'Recommended Action',
    ];

    const rows = projects.map((p) => [
      p.projectId,
      p.projectName,
      p.priorityScore.toString(),
      p.finalTier,
      `${p.confidenceScore}%`,
      p.businessUnit,
      p.site,
      `$${p.costEstimateUsd.toLocaleString()}`,
      p.goLiveDate,
      p.recommendedAction,
    ]);

    return {
      title: 'PMO Portfolio Prioritization',
      headers,
      rows,
    };
  }
}
