import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DocsArchitecturePageComponent } from './docs-architecture.page';

describe('DocsArchitecturePageComponent', () => {
  it('should create the architecture documentation page', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsArchitecturePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocsArchitecturePageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.steps.length).toBe(7);
  });

  it('should switch layer focus filter', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsArchitecturePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocsArchitecturePageComponent);
    const component = fixture.componentInstance;

    expect(component.selectedLayer()).toBe('all');
    component.selectedLayer.set('ml');
    expect(component.selectedLayer()).toBe('ml');
  });
});
