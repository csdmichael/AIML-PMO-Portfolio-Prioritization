import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectProgressComponent } from './project-progress.component';
import { PortfolioStore } from '../../services/portfolio.store';
import { ProjectDetailRecord, ProjectProgressRecord, ProjectProgressUpdate } from '../../models/portfolio.models';

const notStarted: ProjectProgressRecord = {
  projectId: 'GIS-0001', projectStatus: 'Planning', progressStatus: 'notStarted', hasStarted: false,
  completed: false, changeRevision: null,
};

function render(
  project: ProjectProgressRecord = notStarted,
  update = vi.fn<(id: string, body: ProjectProgressUpdate) => Observable<ProjectProgressRecord>>(() => of(project)),
) {
  TestBed.configureTestingModule({
    imports: [ProjectProgressComponent],
    providers: [{ provide: PortfolioStore, useValue: { updateProjectProgress: update } }],
  });
  const fixture = TestBed.createComponent(ProjectProgressComponent);
  fixture.componentRef.setInput('project', project);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, update };
}

describe('Project progress', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('sends start dates and the saved revision to the API-backed store', () => {
    const { component, update } = render();
    component.hasStarted = true;
    component.startDate = '2020-01-01';
    component.estimatedFinishDate = '2020-12-31';
    component.save();
    expect(update).toHaveBeenCalledWith('GIS-0001', {
      hasStarted: true, completed: false, startDate: '2020-01-01', estimatedFinishDate: '2020-12-31',
      completionDate: null, expectedRevision: null,
    });
  });

  it('disables undoing a started commitment and preserves the revision on completion', async () => {
    const { fixture, component, update } = render({
      ...notStarted, projectStatus: 'Active', progressStatus: 'started', hasStarted: true,
      startDate: '2020-01-01', estimatedFinishDate: '2020-12-31', changeRevision: 'revision-1',
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[name=hasStarted]').disabled).toBe(true);
    component.completed = true;
    component.completionDate = '2020-10-01';
    component.save();
    expect(update.mock.calls[0][1]).toMatchObject({
      completed: true, completionDate: '2020-10-01', expectedRevision: 'revision-1',
    });
  });

  it('shows API conflicts explicitly and never reports a successful save', () => {
    const update = vi.fn(() => throwError(() => ({ error: { detail: 'The project changed. Reload before saving.' } })));
    const { fixture, component } = render(notStarted, update);
    const saved = vi.fn();
    component.saved.subscribe(saved);
    component.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Reload before saving');
    expect(component.saving()).toBe(false);
    expect(saved).not.toHaveBeenCalled();
  });

  it('prevents a second save while a request is running', () => {
    const response = new Subject<ProjectDetailRecord>();
    const update = vi.fn(() => response);
    const { component } = render(notStarted, update);
    component.save();
    component.save();
    expect(update).toHaveBeenCalledTimes(1);
    expect(component.saving()).toBe(true);
  });
});
