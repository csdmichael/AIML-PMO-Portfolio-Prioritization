import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DocsAlgorithmsPageComponent } from './docs-algorithms.page';

describe('DocsAlgorithmsPageComponent', () => {
  it('should create the algorithms documentation page with all 8 algorithms', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsAlgorithmsPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocsAlgorithmsPageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.algorithms.length).toBe(8);
  });

  it('should filter algorithms by search query and category', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsAlgorithmsPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocsAlgorithmsPageComponent);
    const component = fixture.componentInstance;

    component.searchQuery.set('LightGBM');
    expect(component.filteredAlgorithms().length).toBeGreaterThan(0);

    component.searchQuery.set('');
    component.selectedCategory.set('Explainability');
    const filtered = component.filteredAlgorithms();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('algo-3');
  });

  it('should support expand all, collapse all, and single accordion toggle', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsAlgorithmsPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocsAlgorithmsPageComponent);
    const component = fixture.componentInstance;

    component.collapseAll();
    expect(component.isExpanded('algo-1')).toBe(false);

    component.toggleAccordion('algo-1');
    expect(component.isExpanded('algo-1')).toBe(true);

    component.expandAll();
    expect(component.isExpanded('algo-1')).toBe(true);
    expect(component.isExpanded('algo-8')).toBe(true);
  });
});
