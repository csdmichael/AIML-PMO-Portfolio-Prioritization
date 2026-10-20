import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular';
import { PortfolioStore } from '../../services/portfolio.store';
import { DetailPanelComponent } from '../../components/detail-panel/detail-panel.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

@Component({
  selector: 'app-project-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, IonContent, IonButton, IonIcon, DetailPanelComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding project-detail-content">
      <div class="top-nav-bar">
        <ion-button fill="clear" size="small" routerLink="/prioritization">
          <ion-icon name="arrow-back-outline" slot="start"></ion-icon>
          Back to Prioritization
        </ion-button>
      </div>

      @if (store.selectedProject(); as p) {
        <app-detail-panel></app-detail-panel>
      } @else {
        <app-empty-state
          title="Project Not Found"
          message="The requested project could not be found in the database."
          icon="alert-circle-outline"
        >
          <ion-button routerLink="/prioritization">View All Projects</ion-button>
        </app-empty-state>
      }
    </ion-content>
  `,
  styles: [
    `
      .project-detail-content {
        --background: var(--pmo-bg, #f4f6f8);
      }
      .top-nav-bar {
        margin-bottom: 8px;
      }
    `,
  ],
})
export class ProjectDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(PortfolioStore);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('projectId');
    if (id) {
      this.store.selectProject(id);
    }
  }
}
