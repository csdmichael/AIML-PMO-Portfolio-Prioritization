import { Injectable, computed, signal, inject } from '@angular/core';
import {
  PortfolioDataset,
  Project,
  FilterCriteria,
  SortField,
  SortDirection,
  GroupByOption,
  ConfidenceLevel,
  PriorityTier,
  LocalDecision,
  SavedView,
} from '../models/portfolio.models';
import {
  DEFAULT_FILTER_CRITERIA,
  filterProjects,
  sortProjects,
  groupProjects,
  buildHierarchyTree,
  exportProjectsToCsv,
} from '../core/portfolio-filter';
import { PortfolioService } from './portfolio.service';

const SAVED_VIEWS_STORAGE_KEY = 'pmo_portfolio_saved_views_v1';
const DECISIONS_STORAGE_KEY = 'pmo_portfolio_decisions_v1';
const PINNED_STORAGE_KEY = 'pmo_portfolio_pinned_v1';

@Injectable({
  providedIn: 'root',
})
export class PortfolioStore {
  private readonly portfolioService = inject(PortfolioService);

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
  readonly decisions = signal<Record<string, LocalDecision>>(this.loadDecisions());
  readonly pinnedProjectIds = signal<string[]>(this.loadPinned());

  // Available unique facet values derived from dataset
  readonly rawProjects = computed<Project[]>(() => this.dataset()?.projects ?? []);

  readonly businessUnits = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of this.rawProjects()) set.add(p.businessUnit);
    return Array.from(set).sort();
  });

  readonly sites = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of this.rawProjects()) set.add(p.site);
    return Array.from(set).sort();
  });

  readonly portfolios = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of this.rawProjects()) set.add(p.portfolio);
    return Array.from(set).sort();
  });

  readonly primarySkills = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of this.rawProjects()) set.add(p.primarySkill);
    return Array.from(set).sort();
  });

  readonly clusters = computed<string[]>(() => {
    const set = new Set<string>();
    for (const p of this.rawProjects()) set.add(p.cluster);
    return Array.from(set).sort();
  });

  // Confidence counts across unfiltered dataset
  readonly confidenceCounts = computed<{ high: number; medium: number; low: number }>(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const p of this.rawProjects()) {
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
    const avgPriority =
      count === 0 ? 0 : Math.round((projects.reduce((s, p) => s + p.priorityScore, 0) / count) * 10) / 10;
    const mustDoNowCount = projects.filter((p) => p.finalTier === 'Must-do-now').length;
    const proceedCount = projects.filter((p) => p.finalTier === 'Proceed').length;
    const canWaitCount = projects.filter((p) => p.finalTier === 'Can wait').length;
    const deprioritizeCount = projects.filter((p) => p.finalTier === 'Candidate to deprioritize').length;

    return {
      count,
      totalCost,
      avgConfidence,
      avgPriority,
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
    this.portfolioService.getPortfolioData().subscribe({
      next: (data) => {
        this.dataset.set(data);
        this.isLoading.set(false);
        if (data.projects.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(data.projects[0].projectId);
        }
      },
      error: (err) => {
        const status = err?.status;
        const problem = err?.error;
        if (status === 404) {
          const detail =
            problem?.detail ||
            'No data in OneLake yet. Run the PMO Full Pipeline from the Fabric workspace, or create a project to start it.';
          this.problemDetail.set(detail);
          this.loadError.set(
            'No data in OneLake yet. Run the PMO Full Pipeline from the Fabric workspace, or create a project to start it.',
          );
        } else {
          this.loadError.set(err?.message ?? 'Failed to load portfolio dataset from OneLake');
        }
        this.isLoading.set(false);
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

  // Decision actions
  recordDecision(decision: LocalDecision): void {
    this.decisions.update((curr) => {
      const updated = { ...curr, [decision.projectId]: decision };
      this.persistDecisions(updated);
      return updated;
    });
  }

  getDecision(projectId: string): LocalDecision | undefined {
    return this.decisions()[projectId];
  }

  // Saved Views
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

  // CSV export
  exportCsv(): string {
    return exportProjectsToCsv(this.sortedFilteredProjects());
  }

  // Storage helpers
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

  private loadDecisions(): Record<string, LocalDecision> {
    try {
      const raw = localStorage.getItem(DECISIONS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private persistDecisions(decisions: Record<string, LocalDecision>): void {
    try {
      localStorage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify(decisions));
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
