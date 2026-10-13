import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonButton } from '@ionic/angular';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ExportTableData, FileExportService } from '../../services/file-export.service';

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

type ChartType = 'bar' | 'line' | 'pie';

@Component({
  selector: 'app-result-block',
  standalone: true,
  imports: [CommonModule, IonIcon, IonButton, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="result-block-card">
      <div class="rb-header">
        <div class="rb-title-wrap">
          <span class="rb-title">{{ table().title }}</span>
          <span class="rb-count">({{ table().rows.length }} rows)</span>
        </div>

        <div class="rb-actions">
          <div class="rb-view-tabs">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'table'"
              (click)="activeTab.set('table')"
              aria-label="Show Table"
            >
              <ion-icon name="grid-outline"></ion-icon> Table
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'chart'"
              (click)="activeTab.set('chart')"
              aria-label="Show Chart"
            >
              <ion-icon name="bar-chart-outline"></ion-icon> Chart
            </button>
          </div>

          <div class="rb-export-group">
            <button type="button" class="export-icon-btn" (click)="onExportCsv()" title="Export CSV">
              CSV
            </button>
            <button type="button" class="export-icon-btn" (click)="onExportExcel()" title="Export Excel">
              XLS
            </button>
            <button type="button" class="export-icon-btn" (click)="onExportWord()" title="Export Word">
              DOC
            </button>
            <button type="button" class="export-icon-btn" (click)="onExportPpt()" title="Export PowerPoint">
              PPT
            </button>
          </div>
        </div>
      </div>

      @if (activeTab() === 'table') {
        <div class="rb-table-wrap">
          <table class="rb-table">
            <thead>
              <tr>
                @for (h of table().headers; track h) {
                  <th>{{ h }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (r of table().rows; track $index) {
                <tr>
                  @for (c of r; track $index) {
                    <td>{{ c }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="rb-chart-container">
          <div class="chart-type-picker">
            <button
              type="button"
              class="type-btn"
              [class.active]="chartType() === 'bar'"
              (click)="chartType.set('bar')"
            >
              <ion-icon name="bar-chart-outline"></ion-icon>
            </button>
            <button
              type="button"
              class="type-btn"
              [class.active]="chartType() === 'line'"
              (click)="chartType.set('line')"
            >
              <ion-icon name="trending-up-outline"></ion-icon>
            </button>
            <button
              type="button"
              class="type-btn"
              [class.active]="chartType() === 'pie'"
              (click)="chartType.set('pie')"
            >
              <ion-icon name="pie-chart-outline"></ion-icon>
            </button>
          </div>
          <div echarts [options]="getChartOptions()" class="rb-echart"></div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .result-block-card {
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 8px;
        background: var(--pmo-surface, #ffffff);
        overflow: hidden;
        margin: 12px 0;
      }
      .rb-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #f8f9fb;
        border-bottom: 1px solid var(--pmo-border, #e0e0e0);
        flex-wrap: wrap;
        gap: 8px;
      }
      .rb-title {
        font-weight: 700;
        font-size: 0.9rem;
        color: var(--pmo-text, #1a1a1a);
      }
      .rb-count {
        font-size: 0.8rem;
        color: var(--pmo-muted, #666666);
        margin-left: 6px;
      }
      .rb-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .rb-view-tabs {
        display: flex;
        background: #eceff2;
        border-radius: 6px;
        padding: 2px;
      }
      .tab-btn {
        border: none;
        background: transparent;
        padding: 4px 10px;
        font-size: 0.78rem;
        font-weight: 600;
        color: #555555;
        border-radius: 4px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .tab-btn.active {
        background: #ffffff;
        color: var(--pmo-primary, #0078d4);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }
      .rb-export-group {
        display: flex;
        gap: 4px;
      }
      .export-icon-btn {
        padding: 3px 7px;
        font-size: 0.72rem;
        font-weight: 700;
        border: 1px solid #d0d0d0;
        background: #ffffff;
        color: #444444;
        border-radius: 4px;
        cursor: pointer;
      }
      .export-icon-btn:hover {
        background: #f0f0f0;
        color: var(--pmo-primary, #0078d4);
        border-color: var(--pmo-primary, #0078d4);
      }
      .rb-table-wrap {
        overflow-x: auto;
        max-height: 480px;
      }
      .rb-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
      }
      .rb-table th {
        background: #fafafa;
        color: #555555;
        font-weight: 600;
        text-align: left;
        padding: 8px 10px;
        border-bottom: 2px solid var(--pmo-border, #e0e0e0);
        white-space: nowrap;
        position: sticky;
        top: 0;
        z-index: 1;
      }
      .rb-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #f0f0f0;
        color: #222222;
        white-space: nowrap;
      }
      .rb-chart-container {
        padding: 12px;
      }
      .chart-type-picker {
        display: flex;
        gap: 6px;
        margin-bottom: 8px;
      }
      .type-btn {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        border: 1px solid #d0d0d0;
        background: #fff;
        border-radius: 4px;
        cursor: pointer;
        color: #555;
      }
      .type-btn.active {
        background: var(--pmo-primary, #0078d4);
        color: #fff;
        border-color: var(--pmo-primary, #0078d4);
      }
      .rb-echart {
        height: 280px;
        width: 100%;
      }
    `,
  ],
})
export class ResultBlockComponent {
  readonly table = input.required<ExportTableData>();
  readonly activeTab = signal<'table' | 'chart'>('table');
  readonly chartType = signal<ChartType>('bar');

  constructor(private readonly exportService: FileExportService) {}

  onExportCsv(): void {
    this.exportService.exportToCsv(this.table());
  }

  onExportExcel(): void {
    this.exportService.exportToExcel(this.table());
  }

  onExportWord(): void {
    this.exportService.exportToWord(this.table());
  }

  onExportPpt(): void {
    this.exportService.exportToPowerPoint(this.table());
  }

  getChartOptions(): echarts.EChartsCoreOption {
    const t = this.table();
    const categories = t.rows.slice(0, 15).map((r) => r[0] || 'Unknown');
    // Parse numeric column 1 if available
    const values = t.rows.slice(0, 15).map((r) => {
      const num = parseFloat((r[1] || '0').replace(/[^0-9.-]+/g, ''));
      return isNaN(num) ? 1 : num;
    });

    if (this.chartType() === 'pie') {
      return {
        tooltip: { trigger: 'item' },
        series: [
          {
            type: 'pie',
            radius: '65%',
            data: categories.map((c, i) => ({ name: c, value: values[i] })),
          },
        ],
      };
    }

    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { interval: 0, rotate: 20, fontSize: 10 },
      },
      yAxis: { type: 'value' },
      series: [
        {
          type: this.chartType() === 'line' ? 'line' : 'bar',
          data: values,
          itemStyle: { color: '#0078D4' },
        },
      ],
    };
  }
}
