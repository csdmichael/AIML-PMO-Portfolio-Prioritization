import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { PortfolioStore } from '../../services/portfolio.store';
import { TrashPageComponent } from './trash.page';
import { Project } from '../../models/portfolio.models';

const sampleTrashedProject: Partial<Project> = {
  projectId: 'GIS-0099',
  projectName: 'Legacy Decommissioned System',
  portfolio: 'IT Operations',
  program: 'Infrastructure',
  businessUnit: 'Engineering',
  site: 'HQ',
  projectManager: 'Alex Smith',
  executiveSponsor: 'David Chen',
  costEstimateUsd: 250000,
  finalTier: 'Candidate to deprioritize',
  projectStatus: 'Planning',
  isDeleted: true,
};

describe('TrashPageComponent', () => {
  let mockStore: {
    softDeletedProjects: ReturnType<typeof signal<Project[]>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    setSoftDeleted: ReturnType<typeof vi.fn>;
    permanentlyDelete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockStore = {
      softDeletedProjects: signal<Project[]>([sampleTrashedProject as Project]),
      isLoading: signal(false),
      setSoftDeleted: vi.fn().mockReturnValue(of({})),
      permanentlyDelete: vi.fn().mockReturnValue(of({})),
    };

    TestBed.configureTestingModule({
      imports: [TrashPageComponent],
      providers: [
        provideRouter([]),
        { provide: PortfolioStore, useValue: mockStore },
      ],
    });
  });

  it('renders trashed projects table and count', () => {
    const fixture = TestBed.createComponent(TrashPageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.page-title')?.textContent).toContain('Trashed Projects');
    expect(el.querySelector('.count-pill')?.textContent).toContain('1 trashed');
    expect(el.querySelector('.pid-badge')?.textContent).toContain('GIS-0099');
    expect(el.querySelector('.pname')?.textContent).toContain('Legacy Decommissioned System');
  });

  it('restores a soft-deleted project when Restore is clicked', () => {
    const fixture = TestBed.createComponent(TrashPageComponent);
    fixture.detectChanges();
    const restoreBtn = fixture.nativeElement.querySelector('.btn-restore') as HTMLButtonElement;
    expect(restoreBtn).toBeTruthy();
    restoreBtn.click();
    fixture.detectChanges();
    expect(mockStore.setSoftDeleted).toHaveBeenCalledWith('GIS-0099', false);
    expect(fixture.nativeElement.querySelector('.feedback-banner')?.textContent).toContain('successfully restored');
  });

  it('prompts confirmation and permanently deletes project', () => {
    const fixture = TestBed.createComponent(TrashPageComponent);
    fixture.detectChanges();
    const deleteBtn = fixture.nativeElement.querySelector('.btn-delete-perm') as HTMLButtonElement;
    expect(deleteBtn).toBeTruthy();
    deleteBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.confirm-card')).toBeTruthy();
    const confirmBtn = fixture.nativeElement.querySelector('.btn-confirm-delete') as HTMLButtonElement;
    confirmBtn.click();
    fixture.detectChanges();

    expect(mockStore.permanentlyDelete).toHaveBeenCalledWith('GIS-0099');
    expect(fixture.nativeElement.querySelector('.feedback-banner')?.textContent).toContain('permanently deleted');
  });

  it('shows empty state when no projects are in the trash', () => {
    mockStore.softDeletedProjects.set([]);
    const fixture = TestBed.createComponent(TrashPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeTruthy();
  });
});
