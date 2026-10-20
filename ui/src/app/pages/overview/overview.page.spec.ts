import { Component, Directive, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgxEchartsDirective } from 'ngx-echarts';
import { beforeEach, describe, expect, it } from 'vitest';
import { KpiRowComponent } from '../../components/kpi-row/kpi-row.component';
import { PortfolioStore } from '../../services/portfolio.store';
import { OverviewPageComponent } from './overview.page';
import chartHelp from '../../../assets/config/overview-charts.json';

// eslint-disable-next-line @angular-eslint/directive-selector -- The test double must match the chart library selector.
@Directive({ selector: '[echarts]', standalone: true })
class ChartStubDirective {
  readonly options = input<unknown>();
}

@Component({ selector: 'app-kpi-row', standalone: true, template: '' })
class KpiStubComponent {}

function render() {
  TestBed.configureTestingModule({
    imports: [OverviewPageComponent],
    providers: [{
      provide: PortfolioStore,
      useValue: {
        isLoading: signal(false), loadError: signal(null),
        rawProjects: signal([{ projectId: 'GIS-0001' }]), filteredProjects: signal([]), dataset: signal(null),
      },
    }],
  });
  TestBed.overrideComponent(OverviewPageComponent, {
    remove: { imports: [NgxEchartsDirective, KpiRowComponent] },
    add: { imports: [ChartStubDirective, KpiStubComponent] },
  });
  const fixture = TestBed.createComponent(OverviewPageComponent);
  fixture.detectChanges();
  return fixture;
}

describe('Overview chart descriptions', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('puts a JSON-configured business description directly beneath each of the six chart titles', () => {
    const fixture = render();
    const cards = [...fixture.nativeElement.querySelectorAll('.chart-card')] as HTMLElement[];
    const explanations = Object.values(chartHelp.charts);
    expect(cards).toHaveLength(6);
    cards.forEach((card, index) => {
      const header = card.querySelector('ion-card-header');
      expect(header?.querySelector('ion-card-title')?.textContent).toBe(explanations[index].title);
      expect(header?.querySelector('.chart-summary')?.textContent).toBe(explanations[index].summary);
    });
  });

  it('lets each description expand and collapse independently with a detailed explanation and labelled example', () => {
    const fixture = render();
    const panels = [...fixture.nativeElement.querySelectorAll('details.chart-explanation')] as HTMLDetailsElement[];
    const explanations = Object.values(chartHelp.charts);
    expect(panels).toHaveLength(6);
    panels.forEach((panel, index) => {
      expect(panel.open).toBe(false);
      const summary = panel.querySelector('summary')!;
      expect(summary.getAttribute('aria-label')).toContain(explanations[index].title);
      summary.click();
      expect(panel.open).toBe(true);
      expect(panel.textContent).toContain(explanations[index].detail);
      expect(panel.querySelector('.chart-example')?.textContent).toContain(explanations[index].example);
      expect(panel.querySelector('.chart-example')?.textContent).toContain('not live results');
      summary.click();
      expect(panel.open).toBe(false);
    });
  });

  it('explains that staffing totals are portfolio-wide rather than pretending filters change them', () => {
    expect(chartHelp.charts.capacity.detail).toContain('do not change with project filters');
    expect(render().nativeElement.querySelector('.chart-empty')?.textContent).toContain('not available');
    expect(JSON.stringify(chartHelp.charts)).not.toMatch(/OneLake|Fabric|Foundry|SHAP|LightGBM|treemap|sunburst/i);
  });
});
