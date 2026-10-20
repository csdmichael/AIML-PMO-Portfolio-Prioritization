import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PowerBiEmbedComponent } from './powerbi-embed.component';

const { embed, reset, on } = vi.hoisted(() => ({
  embed: vi.fn(),
  reset: vi.fn(),
  on: vi.fn(),
}));

vi.mock('powerbi-client', () => ({
  service: {
    Service: class {
      embed = embed;
      reset = reset;
    },
  },
  factories: {},
  models: {
    TokenType: { Aad: 0 },
    Permissions: { Read: 0 },
    BackgroundType: { Transparent: 1 },
  },
}));

const REPORT = {
  id: 'report-id',
  name: 'PMO Executive Dashboard',
  embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=report-id',
};

describe('PowerBiEmbedComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    embed.mockReturnValue({ on });
    TestBed.configureTestingModule({ imports: [PowerBiEmbedComponent] });
  });

  it('embeds once the host, report, and token exist', () => {
    const fixture = TestBed.createComponent(PowerBiEmbedComponent);
    fixture.componentRef.setInput('report', REPORT);
    fixture.componentRef.setInput('accessToken', 'test-token');
    expect(embed).not.toHaveBeenCalled();

    fixture.detectChanges();

    expect(embed).toHaveBeenCalledTimes(1);
    expect(embed).toHaveBeenCalledWith(
      fixture.nativeElement.querySelector('.pbi-embed-host'),
      expect.objectContaining({
        id: REPORT.id,
        embedUrl: REPORT.embedUrl,
        accessToken: 'test-token',
        tokenType: 0,
        permissions: 0,
      }),
    );
  });

  it('waits for inputs and re-embeds when the report changes', () => {
    const fixture = TestBed.createComponent(PowerBiEmbedComponent);
    fixture.detectChanges();
    expect(embed).not.toHaveBeenCalled();

    fixture.componentRef.setInput('report', REPORT);
    fixture.componentRef.setInput('accessToken', 'test-token');
    fixture.detectChanges();
    fixture.componentRef.setInput('report', { ...REPORT, id: 'another-report' });
    fixture.detectChanges();

    expect(embed).toHaveBeenCalledTimes(2);
    expect(embed).toHaveBeenLastCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({ id: 'another-report' }),
    );
  });

  it('surfaces asynchronous SDK errors', () => {
    const fixture = TestBed.createComponent(PowerBiEmbedComponent);
    const errors: string[] = [];
    fixture.componentInstance.embedError.subscribe((error) => errors.push(error));
    fixture.componentRef.setInput('report', REPORT);
    fixture.componentRef.setInput('accessToken', 'test-token');
    fixture.detectChanges();

    const handler = on.mock.calls[0][1];
    handler({ detail: { message: 'Load failed', detailedMessage: 'Access denied' } });
    expect(errors).toEqual(['Load failed - Access denied']);
  });

  it('surfaces synchronous SDK errors', () => {
    embed.mockImplementation(() => {
      throw new Error('Invalid embed URL');
    });
    const fixture = TestBed.createComponent(PowerBiEmbedComponent);
    const errors: string[] = [];
    fixture.componentInstance.embedError.subscribe((error) => errors.push(error));
    fixture.componentRef.setInput('report', REPORT);
    fixture.componentRef.setInput('accessToken', 'test-token');
    fixture.detectChanges();

    expect(errors).toEqual(['Invalid embed URL']);
  });

  it('resets the SDK when the view is destroyed and embeds on remount', () => {
    const fixture = TestBed.createComponent(PowerBiEmbedComponent);
    fixture.componentRef.setInput('report', REPORT);
    fixture.componentRef.setInput('accessToken', 'test-token');
    fixture.detectChanges();
    reset.mockClear();
    fixture.destroy();
    expect(reset).toHaveBeenCalled();

    const remounted = TestBed.createComponent(PowerBiEmbedComponent);
    remounted.componentRef.setInput('report', REPORT);
    remounted.componentRef.setInput('accessToken', 'test-token');
    remounted.detectChanges();
    expect(embed).toHaveBeenCalled();
  });
});
