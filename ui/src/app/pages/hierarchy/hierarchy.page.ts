import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonButton,
} from '@ionic/angular';
import { PortfolioStore } from '../../services/portfolio.store';
import { HierarchyNode } from '../../models/portfolio.models';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

@Component({
  selector: 'app-hierarchy-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonButton,
    LoadingSkeletonComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding hierarchy-content">
      <div class="page-header">
        <h2 class="page-title">Organizational Hierarchy & Rollups</h2>
        <p class="page-subtitle">
          Explore portfolio rollups by Business Unit &gt; Site &gt; Project, with aggregated spend, counts, and average confidence.
        </p>
      </div>

      @if (store.isLoading()) {
        <app-loading-skeleton [cards]="1" [rows]="8"></app-loading-skeleton>
      } @else if (store.loadError()) {
        <app-empty-state
          title="No Data in OneLake"
          [message]="store.loadError()!"
          [detail]="store.problemDetail()"
          [isError]="true"
        >
          <ion-button (click)="store.init()">Retry</ion-button>
        </app-empty-state>
      } @else if (store.rawProjects().length === 0) {
        <app-empty-state
          title="No Projects in Portfolio"
          message="Your portfolio currently has 0 projects loaded. Go to the Lifecycle & Import page to import a portfolio Excel file or load baseline datasets."
          icon="file-tray-outline"
        >
          <ion-button routerLink="/data-entry">
            <ion-icon name="cloud-upload-outline" slot="start"></ion-icon>
            Go to Project & Portfolio Data Entry
          </ion-button>
        </app-empty-state>
      } @else if (store.hierarchyTree().length === 0) {
        <app-empty-state
          title="No Projects Available"
          message="No projects found matching the current criteria in OneLake."
        ></app-empty-state>
      } @else {
        <div class="tree-container">
          @for (bu of store.hierarchyTree(); track bu.id) {
            <ion-card class="bu-card">
              <ion-card-header class="node-header bu-header" (click)="toggleNode(bu)">
                <div class="header-main">
                  <ion-icon
                    [name]="bu.expanded ? 'chevron-down-outline' : 'chevron-forward-outline'"
                    class="toggle-icon"
                  ></ion-icon>
                  <span class="node-name bu-name">{{ bu.name }}</span>
                </div>
                <div class="node-metrics">
                  <span class="metric-pill count-pill">{{ bu.count }} projects</span>
                  <span class="metric-pill cost-pill">\${{ (bu.totalCost / 1000000).toFixed(2) }}M</span>
                  <span class="metric-pill conf-pill">{{ bu.avgConfidence }}% conf</span>
                </div>
              </ion-card-header>

              @if (bu.expanded) {
                <ion-card-content class="bu-content">
                  @for (site of bu.children; track site.id) {
                    <div class="site-section">
                      <div class="node-header site-header" (click)="toggleNode(site)">
                        <div class="header-main">
                          <ion-icon
                            [name]="site.expanded ? 'chevron-down-outline' : 'chevron-forward-outline'"
                            class="toggle-icon"
                          ></ion-icon>
                          <span class="node-name site-name">{{ site.name }}</span>
                        </div>
                        <div class="node-metrics">
                          <span class="metric-pill count-pill">{{ site.count }} projects</span>
                          <span class="metric-pill cost-pill">\${{ (site.totalCost / 1000000).toFixed(2) }}M</span>
                          <span class="metric-pill conf-pill">{{ site.avgConfidence }}% conf</span>
                        </div>
                      </div>

                      @if (site.expanded) {
                        <div class="projects-list">
                          @for (proj of site.children; track proj.id) {
                            <div class="project-row" (click)="selectProject(proj.project?.projectId)">
                              <div class="proj-info">
                                <span class="proj-id">{{ proj.project?.projectId }}</span>
                                <span class="proj-name">{{ proj.project?.projectName }}</span>
                              </div>
                              <div class="proj-meta">
                                <span class="tier-tag">{{ proj.project?.finalTier }}</span>
                                <span class="proj-cost">\${{ ((proj.project?.costEstimateUsd ?? 0) / 1000000).toFixed(2) }}M</span>
                                <span class="proj-conf">{{ proj.project?.confidenceScore }}%</span>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </ion-card-content>
              }
            </ion-card>
          }
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .hierarchy-content {
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
      .tree-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .bu-card {
        margin: 0;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        border: 1px solid var(--pmo-border, #e0e0e0);
        background: var(--pmo-surface, #ffffff);
      }
      .node-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        user-select: none;
        padding: 10px 14px;
      }
      .bu-header {
        background: #f8f9fb;
        border-bottom: 1px solid #f0f0f0;
      }
      .header-main {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .toggle-icon {
        font-size: 16px;
        color: #666666;
      }
      .node-name {
        font-weight: 700;
        color: var(--pmo-text, #1a1a1a);
      }
      .bu-name {
        font-size: 0.95rem;
      }
      .site-name {
        font-size: 0.88rem;
      }
      .node-metrics {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .metric-pill {
        font-size: 0.72rem;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 600;
      }
      .count-pill {
        background: #e8f1f8;
        color: var(--pmo-primary, #0078d4);
      }
      .cost-pill {
        background: #f0f0f0;
        color: #333333;
      }
      .conf-pill {
        background: #dff6dd;
        color: #107c10;
      }
      .bu-content {
        padding: 0 14px 10px 14px;
      }
      .site-section {
        margin-top: 8px;
        border: 1px solid #f0f0f0;
        border-radius: 6px;
        overflow: hidden;
      }
      .site-header {
        background: #ffffff;
        border-bottom: 1px solid #f5f5f5;
        padding: 8px 12px;
      }
      .projects-list {
        display: flex;
        flex-direction: column;
        background: #fafafa;
      }
      .project-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 12px;
        border-bottom: 1px solid #eeeeee;
        cursor: pointer;
        font-size: 0.8rem;
      }
      .project-row:hover {
        background: #f0f7fd;
      }
      .proj-id {
        font-weight: 700;
        color: var(--pmo-primary, #0078d4);
        margin-right: 8px;
      }
      .proj-name {
        color: #333333;
      }
      .proj-meta {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .tier-tag {
        font-size: 0.7rem;
        background: #e0e0e0;
        padding: 1px 6px;
        border-radius: 3px;
        font-weight: 600;
      }
    `,
  ],
})
export class HierarchyPageComponent {
  readonly store = inject(PortfolioStore);

  toggleNode(node: HierarchyNode): void {
    node.expanded = !node.expanded;
  }

  selectProject(projectId?: string): void {
    if (projectId) {
      this.store.selectProject(projectId);
    }
  }
}
