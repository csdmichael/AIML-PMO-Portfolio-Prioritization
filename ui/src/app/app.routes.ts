import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'overview',
    loadComponent: () =>
      import('./pages/overview/overview.page').then((m) => m.OverviewPageComponent),
  },
  {
    path: 'prioritization',
    loadComponent: () =>
      import('./pages/prioritization/prioritization.page').then((m) => m.PrioritizationPageComponent),
  },
  {
    path: 'trash',
    loadComponent: () =>
      import('./pages/trash/trash.page').then((m) => m.TrashPageComponent),
  },
  {
    path: 'projects/:projectId/edit',
    loadComponent: () =>
      import('./pages/edit-project/edit-project.page').then((m) => m.EditProjectPageComponent),
  },
  {
    path: 'prioritization/edit/:projectId',
    redirectTo: 'projects/:projectId/edit',
    pathMatch: 'full',
  },
  {
    path: 'recommendations',
    loadComponent: () =>
      import('./pages/recommendations/recommendations.page').then(
        (m) => m.RecommendationsPageComponent
      ),
  },
  {
    path: 'matrix',
    loadComponent: () =>
      import('./pages/prioritization-matrix/prioritization-matrix.page').then(
        (m) => m.PrioritizationMatrixPageComponent
      ),
  },
  {
    path: 'prioritization-matrix',
    redirectTo: 'matrix',
    pathMatch: 'full',
  },
  {
    path: 'hierarchy',
    loadComponent: () =>
      import('./pages/hierarchy/hierarchy.page').then((m) => m.HierarchyPageComponent),
  },
  {
    path: 'quick-add',
    redirectTo: 'data-entry',
    pathMatch: 'full',
  },
  {
    path: 'data-entry',
    loadComponent: () =>
      import('./pages/data-entry/data-entry.page').then((m) => m.DataEntryPageComponent),
  },
  {
    path: 'powerbi',
    loadComponent: () =>
      import('./pages/powerbi/powerbi.page').then((m) => m.PowerBiPageComponent),
  },
  {
    path: 'decisions',
    loadComponent: () =>
      import('./pages/decisions/decisions.page').then((m) => m.DecisionsPageComponent),
  },
  {
    path: 'lifecycle',
    redirectTo: 'data-entry',
    pathMatch: 'full',
  },
  {
    path: 'admin',
    children: [
      {
        path: '',
        redirectTo: 'settings',
        pathMatch: 'full',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/admin/settings/settings.page').then((m) => m.SettingsPageComponent),
      },
      {
        path: 'priority-weights',
        loadComponent: () =>
          import('./pages/admin/priority-weights/priority-weights.page').then(
            (m) => m.PriorityWeightsPageComponent
          ),
      },
      {
        path: 'lookups',
        loadComponent: () =>
          import('./pages/admin/lookups/lookups.page').then((m) => m.LookupsPageComponent),
      },
    ],
  },
  {
    path: 'projects/:projectId',
    loadComponent: () =>
      import('./pages/project-detail/project-detail.page').then((m) => m.ProjectDetailPageComponent),
  },
  {
    path: 'docs',
    children: [
      {
        path: '',
        redirectTo: 'architecture',
        pathMatch: 'full',
      },
      {
        path: 'architecture',
        loadComponent: () =>
          import('./pages/docs/architecture/docs-architecture.page').then((m) => m.DocsArchitecturePageComponent),
      },
      {
        path: 'agents',
        loadComponent: () =>
          import('./pages/docs/agents/docs-agents.page').then((m) => m.DocsAgentsPageComponent),
      },
      {
        path: 'project-fields',
        loadComponent: () =>
          import('./pages/docs/project-fields/docs-project-fields.page').then((m) => m.DocsProjectFieldsPageComponent),
      },
      {
        path: 'algorithms',
        loadComponent: () =>
          import('./pages/docs/algorithms/docs-algorithms.page').then((m) => m.DocsAlgorithmsPageComponent),
      },
      {
        path: 'ai-prefill-confidence',
        loadComponent: () =>
          import('./pages/docs/ai-prefill-confidence/docs-ai-prefill-confidence.page').then(
            (m) => m.DocsAiPrefillConfidencePageComponent
          ),
      },
      {
        path: 'data-pipeline',
        loadComponent: () =>
          import('./pages/docs/data-pipeline/docs-data-pipeline.page').then(
            (m) => m.DocsDataPipelinePageComponent
          ),
      },
      {
        path: 'rules-governance',
        loadComponent: () =>
          import('./pages/docs/rules-governance/docs-rules-governance.page').then(
            (m) => m.DocsRulesGovernancePageComponent
          ),
      },
    ],
  },
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full',
  },
];
