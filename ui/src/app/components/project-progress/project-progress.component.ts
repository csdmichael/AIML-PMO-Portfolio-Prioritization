import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectDetailRecord, ProjectProgressRecord } from '../../models/portfolio.models';
import { PortfolioStore } from '../../services/portfolio.store';
import { problemMessage } from '../../core/problem-detail';

@Component({
  selector: 'app-project-progress',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="progress-editor" aria-label="Project progress">
      <h3>Project progress</h3>
      <p>Once work starts, it is a committed project and is excluded from priority recommendations.</p>
      @if (project().progressStatus === 'unconfirmed') {
        <p role="status">Confirm whether this project has started before it can enter the recommendation queue.</p>
      }
      <form #form="ngForm" (ngSubmit)="save()">
        <label class="check">
          <input type="checkbox" name="hasStarted" [(ngModel)]="hasStarted" [disabled]="wasStarted() || saving()" />
          Work has started
        </label>
        @if (hasStarted) {
          <div class="date-fields">
            <label>Actual start date
              <input type="date" name="startDate" [(ngModel)]="startDate" [max]="today" required [disabled]="saving()" />
            </label>
            <label>Estimated finish date
              <input type="date" name="estimatedFinishDate" [(ngModel)]="estimatedFinishDate" [min]="startDate"
                [required]="!completed || !wasStarted()" [disabled]="saving()" />
            </label>
          </div>
          <label class="check">
            <input type="checkbox" name="completed" [(ngModel)]="completed" [disabled]="wasCompleted() || saving()" />
            Project is complete
          </label>
          @if (completed) {
            <label>Actual completion date
              <input type="date" name="completionDate" [(ngModel)]="completionDate" [min]="startDate" [max]="today"
                required [disabled]="saving()" />
            </label>
          }
        }
        @if (wasStarted()) {
          <p>Started work cannot be returned to the not-started queue. Completed work cannot be reopened.</p>
        }
        @if (error(); as message) {
          <p role="alert" class="error">{{ message }}</p>
        }
        <div class="actions">
          <button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving...' : completed ? 'Save completion' : 'Save progress' }}</button>
          <button type="button" (click)="closed.emit()" [disabled]="saving()">Cancel</button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    .progress-editor { border: 1px solid #cbd5e1; border-radius: 8px; margin: 12px 0; padding: 16px; }
    h3 { margin-top: 0; font-size: 1rem; }
    p { font-size: .85rem; color: #475569; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: .85rem; margin: 12px 0; }
    .check { flex-direction: row; align-items: center; }
    .date-fields { display: flex; flex-wrap: wrap; gap: 16px; }
    input[type=date] { padding: 8px; border: 1px solid #94a3b8; border-radius: 4px; }
    .actions { display: flex; gap: 10px; margin-top: 12px; }
    button { padding: 8px 14px; border: 1px solid #64748b; border-radius: 4px; background: white; color: #0f172a; }
    button[type=submit] { background: #005a9e; color: white; }
    button:disabled { opacity: .6; }
    .error { color: #b91c1c; }
  `],
})
export class ProjectProgressComponent {
  readonly project = input.required<ProjectProgressRecord>();
  readonly saved = output<ProjectDetailRecord>();
  readonly closed = output<void>();
  private readonly store = inject(PortfolioStore);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly wasStarted = computed(() => this.project().hasStarted === true);
  readonly wasCompleted = computed(() => this.project().completed === true);
  readonly today = new Date().toISOString().slice(0, 10);
  hasStarted = false;
  completed = false;
  startDate = '';
  estimatedFinishDate = '';
  completionDate = '';

  constructor() {
    effect(() => {
      const project = this.project();
      this.hasStarted = project.hasStarted === true;
      this.completed = project.completed === true;
      this.startDate = project.startDate ?? '';
      this.estimatedFinishDate = project.estimatedFinishDate ?? '';
      this.completionDate = project.completionDate ?? this.today;
      this.error.set(null);
    });
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.store.updateProjectProgress(this.project().projectId, {
      hasStarted: this.hasStarted,
      startDate: this.hasStarted ? this.startDate || null : null,
      estimatedFinishDate: this.hasStarted ? this.estimatedFinishDate || null : null,
      completed: this.hasStarted && this.completed,
      completionDate: this.hasStarted && this.completed ? this.completionDate || null : null,
      expectedRevision: this.project().changeRevision ?? null,
    }).subscribe({
      next: (project) => {
        this.saving.set(false);
        this.saved.emit(project);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(problemMessage(err, 'Could not save progress. Reload the project if another person changed it.'));
      },
    });
  }
}
