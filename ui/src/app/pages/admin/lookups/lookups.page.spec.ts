import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LookupsPageComponent } from './lookups.page';
import { DataApiService } from '../../../services/data-api.service';

describe('Sponsor lookup scores', () => {
  const options = {
    sites: [], businessUnits: [], projectStatuses: [], riskRatings: [],
    sponsorLevels: ['Executive', 'Director'], sponsorLevelScores: { Executive: 4, Director: 3 },
  };
  let api: { getLookups: ReturnType<typeof vi.fn>; updateLookups: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    TestBed.resetTestingModule();
    api = { getLookups: vi.fn(() => of(options)), updateLookups: vi.fn(() => of(options)) };
    TestBed.configureTestingModule({
      imports: [LookupsPageComponent],
      providers: [{ provide: DataApiService, useValue: api }],
    });
  });

  function render() {
    const fixture = TestBed.createComponent(LookupsPageComponent);
    fixture.componentInstance.activeCategory = 'sponsorLevels';
    fixture.detectChanges();
    return fixture;
  }

  it('adds CEO above Executive with its chosen score and saves the mapping', () => {
    const fixture = render();
    const page = fixture.componentInstance;
    page.newSponsorLevel = 'CEO';
    page.newSponsorScore = 5;
    page.addSponsorLevel();
    page.setSponsorScore('Director', 2.5);
    page.saveLookups();
    expect(api.updateLookups).toHaveBeenCalledWith(expect.objectContaining({
      sponsorLevels: ['Executive', 'Director', 'CEO'],
      sponsorLevelScores: { Executive: 4, Director: 2.5, CEO: 5 },
    }));
    expect(page.saved()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Executive = 4 and CEO = 5');
  });

  it('requires an explicit positive score rather than assigning a hidden default', () => {
    const page = render().componentInstance;
    page.newSponsorLevel = 'CEO';
    page.addSponsorLevel();
    expect(page.sponsorLevels()).not.toContain('CEO');
    expect(page.error()).toContain('positive relative score');
    page.setSponsorScore('Executive', 0);
    page.saveLookups();
    expect(api.updateLookups).not.toHaveBeenCalled();
  });

  it('surfaces persistence errors instead of displaying a successful save', () => {
    const page = render().componentInstance;
    api.updateLookups.mockReturnValue(throwError(() => ({ error: { detail: 'Options changed.' } })));
    page.saveLookups();
    expect(page.error()).toBe('Options changed.');
    expect(page.saved()).toBe(false);
  });
});
