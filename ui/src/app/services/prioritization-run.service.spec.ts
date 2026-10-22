import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrioritizationRunService } from './prioritization-run.service';
import { PortfolioStore } from './portfolio.store';
import { DataApiService } from './data-api.service';
import { ConfigService } from './config.service';
import { PipelineRunStarted, PipelineRunStatus } from '../models/api.models';

describe('PrioritizationRunService', () => {
  const run = { runId: 'run-1', jobInstanceId: 'job-1', status: 'NotStarted', retryAfterSeconds: 0 };
  let store: { activeProjects: ReturnType<typeof signal<{ projectId: string; priorityScore: number | null }[]>>; refresh: ReturnType<typeof vi.fn> };
  let api: { startPipelineRun: ReturnType<typeof vi.fn>; getPipelineRunStatus: ReturnType<typeof vi.fn> };
  let service: PrioritizationRunService;

  beforeEach(() => {
    vi.useFakeTimers();
    store = {
      activeProjects: signal([{ projectId: 'NEW-1', priorityScore: null }, { projectId: 'SCORED', priorityScore: 80 }]),
      refresh: vi.fn(),
    };
    api = {
      startPipelineRun: vi.fn(() => of(run)),
      getPipelineRunStatus: vi.fn(() => of({ status: 'InProgress' })),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: PortfolioStore, useValue: store },
        { provide: DataApiService, useValue: api },
        { provide: ConfigService, useValue: { config: { api: { pipelinePollIntervalMs: 1000 } } } },
      ],
    });
    service = TestBed.inject(PrioritizationRunService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('starts once for the full unscored register, polls and reloads persisted results on completion', async () => {
    api.getPipelineRunStatus.mockReturnValueOnce(of({ status: 'InProgress' })).mockReturnValue(of({ status: 'Completed' }));
    expect(service.unscored().map(project => project.projectId)).toEqual(['NEW-1']);
    service.start();
    service.start();
    expect(api.startPipelineRun).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(service.running()).toBe(false);
    expect(service.completed()).toBe(true);
    expect(service.runId()).toBeNull();
    expect(store.refresh).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10000);
    expect(api.getPipelineRunStatus).toHaveBeenCalledTimes(2);
    expect(service.unscored()).toHaveLength(1);
  });

  it.each(['Failed', 'Cancelled'])('surfaces %s without claiming success or refreshing the store', async (status) => {
    api.getPipelineRunStatus.mockReturnValue(of({ status, failureReason: { message: 'Notebook could not finish.' } }));
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(service.error()).toContain('Notebook could not finish.');
    expect(service.completed()).toBe(false);
    expect(store.refresh).not.toHaveBeenCalled();
  });

  it('resumes polling the same run after a status-read failure without submitting another pipeline', async () => {
    api.getPipelineRunStatus.mockReturnValueOnce(throwError(() => ({ error: { detail: 'Status unavailable.' } })))
      .mockReturnValue(of({ status: 'Completed' }));
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(service.error()).toContain('Status unavailable.');
    expect(service.runId()).toBe('run-1');
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.startPipelineRun).toHaveBeenCalledOnce();
    expect(service.completed()).toBe(true);
  });

  it('does not overlap status requests and bounds monitoring to 30 minutes', async () => {
    api.getPipelineRunStatus.mockReturnValue(new Subject<PipelineRunStatus>());
    service.start();
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    expect(api.getPipelineRunStatus).toHaveBeenCalledOnce();
    expect(service.running()).toBe(false);
    expect(service.error()).toContain('30-minute limit');
    expect(service.runId()).toBe('run-1');
  });

  it('reports kickoff errors and does not poll', () => {
    api.startPipelineRun.mockReturnValue(throwError(() => ({ error: { detail: 'Pipeline unavailable.' } })));
    service.start();
    expect(service.error()).toContain('analysis refresh unavailable.');
    expect(service.running()).toBe(false);
    expect(api.getPipelineRunStatus).not.toHaveBeenCalled();
  });

  it('does not submit another pipeline while the initial start request is outstanding', () => {
    api.startPipelineRun.mockReturnValue(new Subject<PipelineRunStarted>());
    service.start();
    service.start();
    expect(api.startPipelineRun).toHaveBeenCalledOnce();
  });

  it('does not start analysis when no active project is unscored', () => {
    store.activeProjects.set([{ projectId: 'SCORED', priorityScore: 80 }]);
    service.start();
    expect(api.startPipelineRun).not.toHaveBeenCalled();
    expect(service.running()).toBe(false);
  });
});
