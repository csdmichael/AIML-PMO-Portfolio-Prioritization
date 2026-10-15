import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DocsAiPrefillConfidencePageComponent } from './docs-ai-prefill-confidence.page';

describe('DocsAiPrefillConfidencePageComponent', () => {
  it('should create the AI prefill & confidence page with all 23 project fields', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsAiPrefillConfidencePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocsAiPrefillConfidencePageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.projectFields.length).toBe(23);
  });

  it('should accurately calculate confidence score and level', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsAiPrefillConfidencePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocsAiPrefillConfidencePageComponent);
    const component = fixture.componentInstance;

    // Test with High parameters (10 signals, 14 passed checks, 90% certainty)
    component.calcSignalsPresent.set(10);
    component.calcDqPassed.set(14);
    component.calcModelCertainty.set(0.90);

    // 100 * (0.35 * 1.0 + 0.35 * 1.0 + 0.30 * 0.90) = 100 * (0.35 + 0.35 + 0.27) = 97%
    expect(component.calcConfidenceScore()).toBe(97.0);
    expect(component.calcConfidenceLevel()).toBe('High');

    // Test with Low parameters (3 signals, 5 passed checks, 40% certainty)
    component.calcSignalsPresent.set(3);
    component.calcDqPassed.set(5);
    component.calcModelCertainty.set(0.40);

    expect(component.calcConfidenceLevel()).toBe('Low');
  });

  it('should filter fields by required and search query', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsAiPrefillConfidencePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocsAiPrefillConfidencePageComponent);
    const component = fixture.componentInstance;

    component.fieldFilterMode.set('required');
    expect(component.filteredFields().every((f) => f.required)).toBe(true);

    component.fieldSearchQuery.set('businessValue');
    expect(component.filteredFields().length).toBe(1);
    expect(component.filteredFields()[0].key).toBe('businessValue');
  });
});
