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
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full',
  },
];
