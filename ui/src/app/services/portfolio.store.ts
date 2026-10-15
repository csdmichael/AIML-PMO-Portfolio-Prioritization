import { Injectable, computed, signal, inject } from '@angular/core';
import {
  PortfolioDataset,
  Project,
  ProjectStatus,
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
import { recalculateDatasetRollups } from '../core/portfolio-normalizer';
import { PortfolioService } from './portfolio.service';
import { SAMPLE_PORTFOLIO_DATASET } from '../data/sample-portfolio.data';

const SAVED_VIEWS_STORAGE_KEY = 'pmo_portfolio_saved_views_v1';
const DECISIONS_STORAGE_KEY = 'pmo_portfolio_decisions_v1';
const PINNED_STORAGE_KEY = 'pmo_portfolio_pinned_v1';
const DATASET_STORAGE_KEY = 'pmo_portfolio_dataset_override_v2';
const PORTFOLIOS_STORAGE_KEY = 'pmo_portfolio_definitions_v3';

export interface PortfolioDefinition {
  name: string;
  code?: string;
  description?: string;
  color?: string;
  role?: 'main' | 'coupled';
}

const DEFAULT_PORTFOLIO_DEFINITIONS: PortfolioDefinition[] = [
  {
    name: 'IT - InfoSec',
    code: 'INFOSEC',
    description: 'Zero Trust architecture, identity, SOC operations, compliance, and cleanroom cyber defense.',
    color: '#0078D4',
    role: 'main',
  },
  {
    name: 'IT Software Development',
    code: 'SWDEV',
    description: 'Core business application platforms, microservices, enterprise APIs, and supplier portals.',
    color: '#107C10',
    role: 'coupled',
  },
  {
    name: 'IT Infrastructure',
    code: 'INFRA',
    description: 'Global fab networks, hybrid cloud landing zones, datacenter compute, and unified communications.',
    color: '#0284C7',
    role: 'coupled',
  },
  {
    name: 'AI Team',
    code: 'AI',
    description: 'Microsoft Foundry AI agents, wafer defect computer vision, and predictive yield models.',
    color: '#8B5CF6',
    role: 'coupled',
  },
  {
    name: 'Data and Analytics',
    code: 'DATA',
    description: 'Microsoft Fabric OneLake medallion lakehouse, Delta lake ETL pipelines, and Direct Lake Power BI.',
    color: '#D97706',
    role: 'coupled',
  },
];

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

  readonly portfolioDefinitions = signal<PortfolioDefinition[]>(this.loadPortfolioDefinitions());

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

    const normalizePf = (p: Project): Project =>
      p.portfolio === 'IT InfoSec' ? { ...p, portfolio: 'IT - InfoSec' } : p;

    const stored = this.loadStoredDataset();
    if (stored) {
      const normStored = {
        ...stored,
        projects: (stored.projects || []).map(normalizePf),
      };
      this.dataset.set(normStored);
      this.isLoading.set(false);
      const active = normStored.projects.filter((p) => !p.isDeleted);
      if (active.length > 0) {
        this.selectedProjectId.set(active[0].projectId);
      } else {
        this.selectedProjectId.set(null);
      }
      return;
    }

    this.portfolioService.getPortfolioData().subscribe({
      next: (data) => {
        if (data && data.projects && data.projects.length > 0) {
          const normProjects = data.projects.map(normalizePf);
          this.dataset.set({ ...data, projects: normProjects });
        } else {
          const normProjects = SAMPLE_PORTFOLIO_DATASET.projects.map(normalizePf);
          this.dataset.set({ ...SAMPLE_PORTFOLIO_DATASET, projects: normProjects });
        }
        this.isLoading.set(false);
        if (!this.selectedProjectId() && this.dataset()?.projects?.length) {
          this.selectedProjectId.set(this.dataset()!.projects[0].projectId);
        }
      },
      error: (_err) => {
        // Fallback to comprehensive realistic 100-project dataset so screens always have full data
        const normProjects = SAMPLE_PORTFOLIO_DATASET.projects.map(normalizePf);
        this.dataset.set({ ...SAMPLE_PORTFOLIO_DATASET, projects: normProjects });
        this.loadError.set(null);
        this.problemDetail.set(null);
        this.isLoading.set(false);
        if (!this.selectedProjectId() && normProjects.length > 0) {
          this.selectedProjectId.set(normProjects[0].projectId);
        }
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

  // Lifecycle & Deletion operations
  updateDatasetProjects(updatedProjects: Project[]): void {
    const current = this.dataset() ?? { ...SAMPLE_PORTFOLIO_DATASET, projects: [] };
    const normProjects = updatedProjects.map((p) =>
      p.portfolio === 'IT InfoSec' ? { ...p, portfolio: 'IT - InfoSec' } : p
    );
    const rollups = recalculateDatasetRollups(normProjects);
    const updated: PortfolioDataset = {
      ...current,
      projects: normProjects,
      capacityBySkill: rollups.capacityBySkill,
      clusters: rollups.clusters,
      asOfDate: new Date().toISOString().slice(0, 10),
    };
    this.dataset.set(updated);
    this.persistDataset(updated);

    // If current selected project is deleted or removed, pick first active
    const active = normProjects.filter((p) => !p.isDeleted);
    const selId = this.selectedProjectId();
    if (!selId || !active.some((p) => p.projectId === selId)) {
      this.selectedProjectId.set(active[0]?.projectId ?? null);
    }
  }

  addPortfolio(def: PortfolioDefinition): void {
    const name = def.name.trim();
    if (!name) return;
    const current = this.portfolioDefinitions();
    if (current.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return;
    }
    const updated = [...current, { ...def, name }];
    this.portfolioDefinitions.set(updated);
    this.persistPortfolioDefinitions(updated);
  }

  deletePortfolio(portfolioName: string, deleteAssociatedProjects = true): void {
    const current = this.portfolioDefinitions();
    const updated = current.filter((p) => p.name.toLowerCase() !== portfolioName.toLowerCase());
    this.portfolioDefinitions.set(updated);
    this.persistPortfolioDefinitions(updated);

    if (deleteAssociatedProjects) {
      this.deleteByPortfolio(portfolioName, true);
    }
  }

  setProjectStatus(projectIds: string | string[], status: ProjectStatus): void {
    const ids = Array.isArray(projectIds) ? projectIds : [projectIds];
    const projects = this.rawProjects().map((p) =>
      ids.includes(p.projectId) ? { ...p, projectStatus: status } : p
    );
    this.updateDatasetProjects(projects);
  }

  markAsBacklog(projectIds: string | string[]): void {
    this.setProjectStatus(projectIds, 'Backlog');
  }

  softDeleteProjects(projectIds: string | string[]): void {
    const ids = Array.isArray(projectIds) ? projectIds : [projectIds];
    const now = new Date().toISOString();
    const projects = this.rawProjects().map((p) =>
      ids.includes(p.projectId) ? { ...p, isDeleted: true, deletedAt: now } : p
    );
    this.updateDatasetProjects(projects);
  }

  restoreProjects(projectIds: string | string[]): void {
    const ids = Array.isArray(projectIds) ? projectIds : [projectIds];
    const projects = this.rawProjects().map((p) =>
      ids.includes(p.projectId) ? { ...p, isDeleted: false, deletedAt: undefined } : p
    );
    this.updateDatasetProjects(projects);
  }

  permanentDeleteProjects(projectIds: string | string[]): void {
    const ids = new Set(Array.isArray(projectIds) ? projectIds : [projectIds]);
    const projects = this.rawProjects().filter((p) => !ids.has(p.projectId));
    this.updateDatasetProjects(projects);
  }

  deleteByPortfolio(portfolio: string, permanent = false): void {
    if (permanent) {
      const projects = this.rawProjects().filter((p) => p.portfolio !== portfolio);
      this.updateDatasetProjects(projects);
    } else {
      const now = new Date().toISOString();
      const projects = this.rawProjects().map((p) =>
        p.portfolio === portfolio ? { ...p, isDeleted: true, deletedAt: now } : p
      );
      this.updateDatasetProjects(projects);
    }
  }

  clearAllProjects(): void {
    this.updateDatasetProjects([]);
  }

  resetToDefaultData(): void {
    this.clearDatasetStorage();
    this.dataset.set(SAMPLE_PORTFOLIO_DATASET);
    if (SAMPLE_PORTFOLIO_DATASET.projects.length > 0) {
      this.selectedProjectId.set(SAMPLE_PORTFOLIO_DATASET.projects[0].projectId);
    }
  }

  importProjects(
    newProjects: Project[],
    mode: 'append' | 'replacePortfolio' | 'replaceAll' = 'append'
  ): { added: number; updated: number; total: number } {
    let resultProjects: Project[] = [];
    let added = 0;
    let updated = 0;

    if (mode === 'replaceAll') {
      resultProjects = [...newProjects];
      added = newProjects.length;
    } else if (mode === 'replacePortfolio') {
      const importedPortfolios = new Set(newProjects.map((p) => p.portfolio));
      const kept = this.rawProjects().filter((p) => !importedPortfolios.has(p.portfolio));
      resultProjects = [...kept, ...newProjects];
      added = newProjects.length;
    } else {
      // Append / Merge
      const existingMap = new Map<string, Project>();
      for (const p of this.rawProjects()) {
        existingMap.set(p.projectId, p);
      }
      for (const p of newProjects) {
        if (existingMap.has(p.projectId)) {
          existingMap.set(p.projectId, p);
          updated++;
        } else {
          existingMap.set(p.projectId, p);
          added++;
        }
      }
      resultProjects = Array.from(existingMap.values());
    }

    this.updateDatasetProjects(resultProjects);
    return { added, updated, total: resultProjects.length };
  }

  // CSV export
  exportCsv(): string {
    return exportProjectsToCsv(this.sortedFilteredProjects());
  }

  // Storage helpers
  private loadStoredDataset(): PortfolioDataset | null {
    try {
      const raw = localStorage.getItem(DATASET_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private persistDataset(dataset: PortfolioDataset): void {
    try {
      localStorage.setItem(DATASET_STORAGE_KEY, JSON.stringify(dataset));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  private clearDatasetStorage(): void {
    try {
      localStorage.removeItem(DATASET_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  private loadPortfolioDefinitions(): PortfolioDefinition[] {
    try {
      const raw = localStorage.getItem(PORTFOLIOS_STORAGE_KEY);
      if (!raw) return DEFAULT_PORTFOLIO_DEFINITIONS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PORTFOLIO_DEFINITIONS;
    } catch {
      return DEFAULT_PORTFOLIO_DEFINITIONS;
    }
  }

  private persistPortfolioDefinitions(defs: PortfolioDefinition[]): void {
    try {
      localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(defs));
    } catch {
      // Storage unavailable or quota exceeded
    }
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
