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
    path: 'hierarchy',
    loadComponent: () =>
      import('./pages/hierarchy/hierarchy.page').then((m) => m.HierarchyPageComponent),
  },
  {
    path: 'quick-add',
    loadComponent: () =>
      import('./pages/quick-add/quick-add.page').then((m) => m.QuickAddPageComponent),
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
