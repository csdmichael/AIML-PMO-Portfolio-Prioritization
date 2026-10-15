import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DocsRulesGovernancePageComponent } from './docs-rules-governance.page';

describe('DocsRulesGovernancePageComponent', () => {
  it('should create the rules & governance documentation page with all 5 rules R1 to R5', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsRulesGovernancePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocsRulesGovernancePageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.rules.length).toBe(5);
    expect(component.rules.map((r) => r.id)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5']);
  });
});
