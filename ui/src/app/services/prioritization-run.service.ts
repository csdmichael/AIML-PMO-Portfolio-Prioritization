import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { exhaustMap, takeUntil, takeWhile, tap, timer } from 'rxjs';
import { isScoredProject } from '../core/portfolio-filter';
import { problemMessage } from '../core/problem-detail';
import { ConfigService } from './config.service';
import { DataApiService } from './data-api.service';
import { PortfolioStore } from './portfolio.store';

@Injectable({ providedIn: 'root' })
export class PrioritizationRunService {
  private readonly api = inject(DataApiService);
  private readonly config = inject(ConfigService);
  private readonly store = inject(PortfolioStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly running = signal(false);
  readonly runId = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly completed = signal(false);
  readonly unscored = computed(() => this.store.activeProjects().filter(project => !isScoredProject(project)));

  start(): void {
    if (this.running()) return;
    this.error.set(null);
    this.completed.set(false);
    this.running.set(true);
    const existing = this.runId();
    if (existing) {
      this.monitor(existing, 0);
      return;
    }
    if (!this.unscored().length) {
      this.message.set('All active projects already have priority scores.');
      this.running.set(false);
      return;
    }
    this.message.set('Starting analysis for all unscored projects across portfolios...');
    this.api.startPipelineRun().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (run) => {
        this.runId.set(run.runId);
        this.message.set('Analysis queued. Project inputs, ML predictions and weighted priorities will be saved by the pipeline.');
        this.monitor(run.runId, Math.max(0, run.retryAfterSeconds ?? 0) * 1000);
      },
      error: (err) => {
        this.error.set(problemMessage(err, 'Unable to start the analysis pipeline.'));
        this.running.set(false);
      },
    });
  }

  private monitor(runId: string, delay: number): void {
    timer(delay, this.config.config.api.pipelinePollIntervalMs).pipe(
      exhaustMap(() => this.api.getPipelineRunStatus(runId)),
      takeWhile(run => run.status === 'NotStarted' || run.status === 'InProgress', true),
      takeUntil(timer(30 * 60 * 1000).pipe(tap(() => {
        this.error.set('Status checking reached its 30-minute limit. The pipeline may still be running; resume status checking to continue.');
        this.running.set(false);
      }))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (run) => {
        if (run.status === 'NotStarted' || run.status === 'InProgress') {
          this.message.set(`Analysis ${run.status === 'NotStarted' ? 'queued' : 'running'}. You can leave this page; status checking continues.`);
          return;
        }
        this.running.set(false);
        this.runId.set(null);
        if (run.status === 'Completed') {
          this.completed.set(true);
          this.message.set('Analysis completed. Reloading saved priorities and weighted scores.');
          this.store.refresh();
        } else {
          this.error.set(run.failureReason?.message ?? `Analysis ended with status ${run.status}. No successful prioritization is claimed.`);
        }
      },
      error: (err) => {
        this.error.set(`${problemMessage(err, 'Unable to read the analysis status.')} The analysis may still be running. Resume status checking instead of starting another run.`);
        this.running.set(false);
      },
    });
  }
}
