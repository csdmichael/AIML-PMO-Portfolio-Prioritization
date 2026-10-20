import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
  output,
} from '@angular/core';
import * as pbi from 'powerbi-client';
import { ReportEmbedDetails } from '../../services/powerbi-auth.service';
import { businessText } from '../../core/problem-detail';

@Component({
  selector: 'app-powerbi-embed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div #host class="pbi-embed-host"></div>',
  styles: [`
    :host { display: block; width: 100%; }
    .pbi-embed-host {
      width: 100%;
      height: calc(100vh - 240px);
      min-height: 560px;
    }
  `],
})
export class PowerBiEmbedComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() report: ReportEmbedDetails | null = null;
  @Input() accessToken: string | null = null;
  @ViewChild('host', { static: true }) host?: ElementRef<HTMLDivElement>;

  readonly embedError = output<string>();
  private viewInitialized = false;

  private readonly service = new pbi.service.Service(
    pbi.factories.hpmFactory,
    pbi.factories.wpmpFactory,
    pbi.factories.routerFactory,
  );

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.tryEmbed();
  }

  ngOnChanges(): void {
    this.tryEmbed();
  }

  ngOnDestroy(): void {
    if (this.host) {
      this.service.reset(this.host.nativeElement);
    }
  }

  private tryEmbed(): void {
    const host = this.host?.nativeElement;
    if (!this.viewInitialized || !host || !this.report || !this.accessToken) return;

    try {
      this.service.reset(host);
      const report = this.service.embed(host, {
        type: 'report',
        id: this.report.id,
        embedUrl: this.report.embedUrl,
        accessToken: this.accessToken,
        tokenType: pbi.models.TokenType.Aad,
        permissions: pbi.models.Permissions.Read,
        settings: {
          panes: {
            filters: { expanded: false, visible: true },
            pageNavigation: { visible: true },
          },
          background: pbi.models.BackgroundType.Transparent,
        },
      });
      report.on('error', (event?: pbi.service.ICustomEvent<pbi.models.IError>) => {
        const error = event?.detail;
        this.embedError.emit(
          businessText([error?.message, error?.detailedMessage].filter(Boolean).join(' - ') ||
          'The selected report could not be displayed.'),
        );
      });
    } catch (error: unknown) {
      this.embedError.emit(
        businessText(error instanceof Error ? error.message : 'The selected report could not be displayed.'),
      );
    }
  }
}
