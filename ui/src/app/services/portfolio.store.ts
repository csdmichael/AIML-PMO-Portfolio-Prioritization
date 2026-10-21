import { Injectable, computed, signal, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  PortfolioDataset,
  Project,
  ProjectStatus,
  ProjectProgressUpdate,
  ProjectDetailRecord,
  FilterCriteria,
  SortField,
  SortDirection,
  GroupByOption,
  ConfidenceLevel,
  PriorityTier,
  SavedView,
} from '../models/portfolio.models';
import { PortfolioItem } from '../models/api.models';
import {
  DEFAULT_FILTER_CRITERIA,
  filterProjects,
  sortProjects,
  groupProjects,
  buildHierarchyTree,
  exportProjectsToCsv,
  isScoredProject,
} from '../core/portfolio-filter';
import { PortfolioService } from './portfolio.service';
import { DataApiService } from './data-api.service';
import { problemMessage } from '../core/problem-detail';

const SAVED_VIEWS_STORAGE_KEY = 'pmo_portfolio_saved_views_v1';
const PINNED_STORAGE_KEY = 'pmo_portfolio_pinned_v1';

export interface PortfolioDefinition {
  name: string;
  code?: string;
  role?: 'main' | 'coupled';
}

@Injectable({
  providedIn: 'root',
})
export class PortfolioStore {
  private readonly portfolioService = inject(PortfolioService);
  private readonly api = inject(DataApiService);

  // Raw dataset signal
  readonly dataset = signal<PortfolioDataset | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);

  // Selected project for detail view
  readonly selectedProjectId = signal<string | null>(null);

  // Filter state signal
  readonly filters = signal<FilterCriteria>({ ...DEFAULT_FILTER_CRITERIA });

  // Sort & Group signals
  readonly sortField = signal<SortField>('priority');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly groupBy = signal<GroupByOption>('none');

  // Active view switcher: 'board' | 'hierarchy' | 'table' | 'overview'
  readonly activeView = signal<'board' | 'hierarchy' | 'table' | 'overview'>('board');

  // Local storage state signals
  readonly savedViews = signal<SavedView[]>(this.loadSavedViews());
  readonly pinnedProjectIds = signal<string[]>(this.loadPinned());

  // Available unique facet values derived from dataset
  readonly rawProjects = computed<Project[]>(() => this.dataset()?.projects ?? []);

  // Derived project subsets
  readonly activeProjects = computed<Project[]>(() =>
    this.rawProjects().filter((p) => !p.isDeleted)
  );

  readonly softDeletedProjects = computed<Project[]>(() =>
    this.rawProjects().filter((p) => !!p.isDeleted)
  );

  readonly backlogProjects = computed<Project[]>(() =>
    this.activeProjects().filter((p) => p.projectStatus === 'Backlog')
  );

  readonly portfolioItems = signal<PortfolioItem[]>([]);
  readonly portfolioDefinitions = computed<PortfolioDefinition[]>(() =>
    this.portfolioItems().map((item) => ({ name: item.displayName, code: item.code, role: item.role })),
  );

  readonly availablePortfolios = computed<string[]>(() => {
    const list = this.portfolioDefinitions().map((p) => p.name);
    // Also include any portfolio that exists in active projects
    for (const p of this.activeProjects()) {
      if (p.portfolio && !list.includes(p.portfolio)) {
        list.push(p.portfolio);
      }
    }
    return list;
  });

  readonly businessUnits = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of this.activeProjects()) set.add(p.businessUnit);
    return Array.from(set).sort();
  });

  readonly sites = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of this.activeProjects()) set.add(p.site);
    return Array.from(set).sort();
  });

  readonly portfolios = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of this.activeProjects()) set.add(p.portfolio);
    return Array.from(set).sort();
  });

  readonly primarySkills = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of this.activeProjects()) set.add(p.primarySkill);
    return Array.from(set).sort();
  });

  readonly clusters = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of this.activeProjects()) set.add(p.cluster);
    return Array.from(set).sort();
  });

  // Confidence counts across active dataset
  readonly confidenceCounts = computed<{ high: number; medium: number; low: number }>(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const p of this.activeProjects()) {
      if (p.confidenceLevel === 'High') high++;
      else if (p.confidenceLevel === 'Medium') medium++;
      else if (p.confidenceLevel === 'Low') low++;
    }
    return { high, medium, low };
  });

  // Filtered projects
  readonly filteredProjects = computed<Project[]>(() => {
    return filterProjects(this.rawProjects(), this.filters());
  });

  // Filtered & sorted projects
  readonly sortedFilteredProjects = computed<Project[]>(() => {
    return sortProjects(this.filteredProjects(), this.sortField(), this.sortDirection());
  });

  // Grouped projects
  readonly groupedProjects = computed(() => {
    return groupProjects(this.sortedFilteredProjects(), this.groupBy());
  });

  // Hierarchy tree for hierarchy view
  readonly hierarchyTree = computed(() => {
    return buildHierarchyTree(this.sortedFilteredProjects());
  });

  // Selected project model
  readonly selectedProject = computed<Project | null>(() => {
    const id = this.selectedProjectId();
    if (!id) return this.sortedFilteredProjects()[0] ?? null;
    return this.rawProjects().find((p) => p.projectId === id) ?? null;
  });

  // Aggregate KPI metrics over filtered projects
  readonly metrics = computed(() => {
    const projects = this.filteredProjects();
    const count = projects.length;
    const totalCost = projects.reduce((s, p) => s + p.costEstimateUsd, 0);
    const avgConfidence =
      count === 0 ? 0 : Math.round((projects.reduce((s, p) => s + p.confidenceScore, 0) / count) * 10) / 10;
    const scored = projects.filter(isScoredProject);
    const avgPriority = count === 0 ? 0 : scored.length === 0 ? null
      : Math.round((scored.reduce((sum, project) => sum + project.priorityScore, 0) / scored.length) * 10) / 10;
    const mustDoNowCount = projects.filter((p) => p.finalTier === 'Must-do-now').length;
    const proceedCount = projects.filter((p) => p.finalTier === 'Proceed').length;
    const canWaitCount = projects.filter((p) => p.finalTier === 'Can wait').length;
    const deprioritizeCount = projects.filter((p) => p.finalTier === 'Candidate to deprioritize').length;

    return {
      count,
      totalCost,
      avgConfidence,
      avgPriority,
      scoredProjectCount: scored.length,
      mustDoNowCount,
      proceedCount,
      canWaitCount,
      deprioritizeCount,
    };
  });

  readonly problemDetail = signal<string | null>(null);

  constructor() {
    this.init();
  }

  init(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.problemDetail.set(null);

    this.api.getPortfolios().subscribe({
      next: (items) => this.portfolioItems.set(items),
      error: () => this.portfolioItems.set([]),
    });
    this.loadDataset();
  }

  /** Reloads the dataset after a change, keeping the current view and selection. */
  refresh(): void {
    this.loadDataset();
  }

  private loadDataset(): void {
    const normalizePf = (p: Project): Project =>
      p.portfolio === 'IT InfoSec' ? { ...p, portfolio: 'IT - InfoSec' } : p;

    this.portfolioService.getPortfolioData().subscribe({
      next: (data) => {
        if (data && data.projects) {
          const normProjects = data.projects.map(normalizePf);
          this.dataset.set({ ...data, projects: normProjects });
        } else {
          this.dataset.set(data || null);
        }
        this.isLoading.set(false);
        this.loadError.set(null);
        this.problemDetail.set(null);
        if (!this.selectedProjectId() && this.dataset()?.projects?.length) {
          this.selectedProjectId.set(this.dataset()!.projects[0].projectId);
        }
      },
      error: (err) => {
        this.dataset.set(null);
        this.isLoading.set(false);
        const detail = problemMessage(err, 'Unable to load portfolio data from the database. Please try again.');
        this.loadError.set(detail);
        this.problemDetail.set(detail);
      },
    });
  }

  // Selection
  selectProject(projectId: string): void {
    this.selectedProjectId.set(projectId);
  }

  // Filter mutations
  updateFilters(updater: (current: FilterCriteria) => FilterCriteria): void {
    this.filters.update(updater);
  }

  setSearch(search: string): void {
    this.filters.update((f) => ({ ...f, search }));
  }

  toggleConfidenceLevel(level: ConfidenceLevel): void {
    this.filters.update((f) => {
      const exists = f.confidenceLevels.includes(level);
      const next = exists ? f.confidenceLevels.filter((c) => c !== level) : [...f.confidenceLevels, level];
      return { ...f, confidenceLevels: next };
    });
  }

  toggleFinalTier(tier: PriorityTier): void {
    this.filters.update((f) => {
      const exists = f.finalTiers.includes(tier);
      const next = exists ? f.finalTiers.filter((t) => t !== tier) : [...f.finalTiers, tier];
      return { ...f, finalTiers: next };
    });
  }

  resetFilters(): void {
    this.filters.set({ ...DEFAULT_FILTER_CRITERIA });
  }

  // Sort & Group
  setSort(field: SortField, direction?: SortDirection): void {
    if (direction) {
      this.sortField.set(field);
      this.sortDirection.set(direction);
    } else if (this.sortField() === field) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDirection.set('desc');
    }
  }

  setGroupBy(groupBy: GroupByOption): void {
    this.groupBy.set(groupBy);
  }

  setActiveView(view: 'board' | 'hierarchy' | 'table' | 'overview'): void {
    this.activeView.set(view);
  }

  // Shortlist / Pin toggle
  togglePin(projectId: string): void {
    this.pinnedProjectIds.update((current) => {
      const exists = current.includes(projectId);
      const updated = exists ? current.filter((id) => id !== projectId) : [...current, projectId];
      this.persistPinned(updated);
      return updated;
    });
  }

  isPinned(projectId: string): boolean {
    return this.pinnedProjectIds().includes(projectId);
  }

  // Saved views are browser preferences, kept in localStorage.
  saveCurrentView(name: string): SavedView {
    const view: SavedView = {
      id: 'view_' + Date.now(),
      name,
      criteria: { ...this.filters() },
      sortField: this.sortField(),
      sortDirection: this.sortDirection(),
      groupBy: this.groupBy(),
      createdAt: new Date().toISOString(),
    };
    this.savedViews.update((list) => {
      const updated = [view, ...list];
      this.persistSavedViews(updated);
      return updated;
    });
    return view;
  }

  applySavedView(view: SavedView): void {
    this.filters.set({ ...view.criteria });
    this.sortField.set(view.sortField);
    this.sortDirection.set(view.sortDirection);
    this.groupBy.set(view.groupBy);
  }

  deleteSavedView(id: string): void {
    this.savedViews.update((list) => {
      const updated = list.filter((v) => v.id !== id);
      this.persistSavedViews(updated);
      return updated;
    });
  }

  // Lifecycle changes go through the API. The dataset is reloaded afterwards, so the screen shows what was saved.
  updateProject(projectId: string, changes: Record<string, unknown>): Observable<unknown> {
    return this.api.updateProject(projectId, changes).pipe(tap(() => this.refresh()));
  }

  setProjectStatus(projectId: string, status: ProjectStatus): Observable<unknown> {
    return this.updateProject(projectId, { projectStatus: status });
  }

  updateProjectProgress(projectId: string, progress: ProjectProgressUpdate): Observable<ProjectDetailRecord> {
    return this.api.updateProjectProgress(projectId, progress).pipe(tap(() => this.refresh()));
  }

  setSoftDeleted(projectId: string, isDeleted: boolean): Observable<unknown> {
    return this.updateProject(projectId, { isDeleted });
  }

  permanentlyDelete(projectId: string): Observable<unknown> {
    return this.api.deleteProject(projectId).pipe(tap(() => this.refresh()));
  }

  recalculateProject(projectId: string, fields?: Record<string, unknown>): Observable<ProjectDetailRecord> {
    return this.api.recalculateProject(projectId, fields).pipe(tap(() => this.refresh()));
  }

  /** Reloads the portfolio list after a portfolio is created elsewhere in the app. */
  reloadPortfolioItems(): void {
    this.api.getPortfolios().subscribe({
      next: (items) => this.portfolioItems.set(items),
      error: () => this.portfolioItems.set([]),
    });
  }

  // CSV export
  exportCsv(): string {
    return exportProjectsToCsv(this.sortedFilteredProjects());
  }

  private loadSavedViews(): SavedView[] {
    try {
      const raw = localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persistSavedViews(views: SavedView[]): void {
    try {
      localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(views));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  private loadPinned(): string[] {
    try {
      const raw = localStorage.getItem(PINNED_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persistPinned(pinned: string[]): void {
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinned));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }
}
