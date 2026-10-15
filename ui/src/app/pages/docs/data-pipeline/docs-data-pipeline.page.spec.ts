import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DocsDataPipelinePageComponent } from './docs-data-pipeline.page';

describe('DocsDataPipelinePageComponent', () => {
  it('should create the data pipeline documentation page with 11 sources and 14 DQ checks', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsDataPipelinePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocsDataPipelinePageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.sources.length).toBe(11);
    expect(component.dqChecks.length).toBe(14);
  });
});
