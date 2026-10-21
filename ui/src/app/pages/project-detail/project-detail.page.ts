import { Component, ChangeDetectionStrategy, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular';
import { PortfolioStore } from '../../services/portfolio.store';
import { DetailPanelComponent } from '../../components/detail-panel/detail-panel.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { ProjectProgressComponent } from '../../components/project-progress/project-progress.component';
import { DataApiService } from '../../services/data-api.service';
import { ProjectDetailRecord } from '../../models/portfolio.models';
import { problemMessage } from '../../core/problem-detail';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-project-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, IonContent, IonButton, IonIcon, DetailPanelComponent, EmptyStateComponent, ProjectProgressComponent],
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
      } @else if (loading()) {
        <p role="status">Loading the project record...</p>
      } @else if (record(); as project) {
        <h2>{{ project.projectName || project.projectId }}</h2>
        <p>{{ project.projectId }} · {{ project.projectStatus }}</p>
        <p>Analysis is not available in the current portfolio view. You can still record project progress.</p>
        @if (editingProgress()) {
          <app-project-progress [project]="project" (saved)="record.set($event)" (closed)="editingProgress.set(false)" />
        } @else {
          <ion-button (click)="editingProgress.set(true)">Record project progress</ion-button>
        }
      } @else {
        <app-empty-state
          title="Project Not Found"
          message="The requested project could not be found in the database."
          icon="alert-circle-outline"
        >
          <ion-button routerLink="/prioritization">View All Projects</ion-button>
        </app-empty-state>
        @if (error(); as message) { <p role="alert">{{ message }}</p> }
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
  private readonly api = inject(DataApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly record = signal<ProjectDetailRecord | null>(null);
  readonly editingProgress = signal(true);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('projectId');
    if (id) {
      this.store.selectProject(id);
      if (!this.store.selectedProject()) {
        this.loading.set(true);
        this.api.getProject(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (project) => {
            this.record.set(project);
            this.loading.set(false);
          },
          error: (err: unknown) => {
            this.error.set(problemMessage(err, 'Could not load the project record.'));
            this.loading.set(false);
          },
        });
      }
    }
  }
}
