import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeAll, vi } from 'vitest';
import { DocsArchitecturePageComponent } from './docs-architecture.page';

describe('DocsArchitecturePageComponent', () => {
  beforeAll(() => {
    // Ionic scrollable segments use an element API that JSDOM does not implement.
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  });

  it('should create the architecture documentation page', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsArchitecturePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocsArchitecturePageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.steps.length).toBe(7);
    fixture.detectChanges();
    const images: NodeListOf<HTMLImageElement> = fixture.nativeElement.querySelectorAll('app-ml-flow-diagrams img');
    expect(images.length).toBe(2);
    expect(images[0].getAttribute('src')).toBe('assets/images/pmo-end-to-end-ml.png');
    expect(images[1].alt).toContain('LightGBM');
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

  it('opens on Solution Architecture and keeps both ML diagrams in the second tab', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsArchitecturePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(DocsArchitecturePageComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const buttons = host.querySelectorAll('ion-segment-button');
    expect(Array.from(buttons, button => button.textContent?.trim())).toEqual([
      'Solution Architecture', 'ML Algos', 'Pipeline Steps', 'OneLake Layers', 'Services & Security',
    ]);
    const panels = Array.from(host.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    expect(panels.filter(panel => !panel.hidden).map(panel => panel.id)).toEqual(['arch-panel-solution']);
    expect(host.querySelector('#arch-panel-solution img')?.getAttribute('src')).toBe('assets/images/pmo-architecture.png');
    expect(host.querySelectorAll('#arch-panel-solution app-ml-flow-diagrams')).toHaveLength(0);
    expect(host.querySelectorAll('#arch-panel-ml img')).toHaveLength(2);

    const segment = host.querySelector('ion-segment');
    for (const tab of fixture.componentInstance.tabs) {
      segment?.dispatchEvent(new CustomEvent('ionChange', { detail: { value: tab.id } }));
      fixture.detectChanges();
      expect(panels.filter(panel => !panel.hidden).map(panel => panel.id)).toEqual([`arch-panel-${tab.id}`]);
      expect(host.querySelector(`#arch-tab-${tab.id}`)?.getAttribute('aria-controls')).toBe(`arch-panel-${tab.id}`);
    }
    expect(host.querySelectorAll('#arch-panel-pipeline .step-card-wrapper')).toHaveLength(7);
    expect(host.querySelector('#arch-panel-onelake #medallion-layers')).not.toBeNull();
    expect(host.querySelector('#arch-panel-services #azure-services')).not.toBeNull();
  });

  it('preserves architecture layer focus when switching between tabs', async () => {
    await TestBed.configureTestingModule({
      imports: [DocsArchitecturePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocsArchitecturePageComponent);
    const component = fixture.componentInstance;
    component.selectedLayer.set('ml');
    component.selectTab('ml');
    component.selectTab('solution');
    expect(component.selectedLayer()).toBe('ml');
    expect(() => component.selectTab('unknown')).toThrow('Unknown architecture documentation tab.');
  });
});
