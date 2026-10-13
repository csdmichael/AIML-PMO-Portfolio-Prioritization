import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
} from '@ionic/angular';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { PieChart, BarChart, TreemapChart, SunburstChart, ScatterChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { PortfolioStore } from '../../services/portfolio.store';
import { KpiRowComponent } from '../../components/kpi-row/kpi-row.component';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { getConfidenceColor } from '../../core/portfolio-filter';

echarts.use([
  PieChart,
  BarChart,
  TreemapChart,
  SunburstChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-overview-page',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    NgxEchartsDirective,
    KpiRowComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
  ],
  providers: [provideEchartsCore({ echarts })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding overview-content">
      <div class="overview-header-row">
        <div>
          <h2 class="page-title">Executive Portfolio Overview</h2>
          <p class="page-subtitle">Cross-dimensional machine learning insights & resource capacity analytics</p>
        </div>
      </div>

      @if (store.isLoading()) {
        <app-loading-skeleton [cards]="6" [rows]="6"></app-loading-skeleton>
      } @else if (store.loadError()) {
        <app-empty-state
          title="No Data in OneLake"
          [message]="store.loadError()!"
          [detail]="store.problemDetail()"
          [isError]="true"
        >
          <ion-button (click)="store.init()">Retry</ion-button>
        </app-empty-state>
      } @else {
        <!-- KPI Summary Row -->
        <app-kpi-row></app-kpi-row>

        <!-- Charts Grid -->
        <ion-grid class="charts-grid ion-no-padding">
          <ion-row>
            <!-- 1. Tier Donut Chart -->
            <ion-col size="12" size-lg="4">
              <ion-card class="chart-card">
                <ion-card-header>
                  <ion-card-title>Prioritization Tier Distribution</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div echarts [options]="getTierDonutOptions()" class="echart-box"></div>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <!-- 2. Confidence Distribution Stacked by Business Unit -->
            <ion-col size="12" size-lg="8">
              <ion-card class="chart-card">
                <ion-card-header>
                  <ion-card-title>Confidence Level Distribution by Business Unit</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div echarts [options]="getConfidenceByBuOptions()" class="echart-box"></div>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>

          <ion-row>
            <!-- 3. Cost Treemap (Business Unit > Site) -->
            <ion-col size="12" size-lg="6">
              <ion-card class="chart-card">
                <ion-card-header>
                  <ion-card-title>Cost Allocation Treemap (BU &gt; Site)</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div echarts [options]="getCostTreemapOptions()" class="echart-box"></div>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <!-- 4. Sunburst (Business Unit > Site > Tier) -->
            <ion-col size="12" size-lg="6">
              <ion-card class="chart-card">
                <ion-card-header>
                  <ion-card-title>Strategic Hierarchy Sunburst (BU &gt; Site &gt; Tier)</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div echarts [options]="getSunburstOptions()" class="echart-box"></div>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>

          <ion-row>
            <!-- 5. Capacity Supply vs Demand by Skill -->
            <ion-col size="12" size-lg="6">
              <ion-card class="chart-card">
                <ion-card-header>
                  <ion-card-title>Capacity Supply vs Demand (FTE by Skill)</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div echarts [options]="getCapacityChartOptions()" class="echart-box"></div>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <!-- 6. Scatter: Completeness vs Quality (Bubble Size = Cost, Color = Confidence) -->
            <ion-col size="12" size-lg="6">
              <ion-card class="chart-card">
                <ion-card-header>
                  <ion-card-title>Completeness vs Data Quality (Bubble Size = Cost USD)</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div echarts [options]="getScatterPlotOptions()" class="echart-box"></div>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      }
    </ion-content>
  `,
  styles: [
    `
      .overview-content {
        --background: var(--ion-background-color, #f4f6f8);
      }
      .overview-header-row {
        margin-bottom: 8px;
      }
      .page-title {
        font-size: 1.35rem;
        font-weight: 700;
        margin: 0;
        color: var(--ion-text-color, #1a1a1a);
      }
      .page-subtitle {
        font-size: 0.85rem;
        color: var(--ion-color-step-600, #666666);
        margin: 2px 0 0 0;
      }
      .charts-grid {
        margin-top: 4px;
      }
      .chart-card {
        margin: 6px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        border: 1px solid var(--ion-color-step-150, #e6e6e6);
        border-radius: 8px;
      }
      .chart-card ion-card-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--ion-text-color, #222222);
      }
      .echart-box {
        height: 310px;
        width: 100%;
      }
    `,
  ],
})
export class OverviewPageComponent {
  readonly store = inject(PortfolioStore);

  // 1. Tier Donut Chart
  getTierDonutOptions(): echarts.EChartsCoreOption {
    const projects = this.store.filteredProjects();
    const tiers = ['Must-do-now', 'Proceed', 'Can wait', 'Candidate to deprioritize'];
    const colors: Record<string, string> = {
      'Must-do-now': '#D13438',
      'Proceed': '#107C10',
      'Can wait': '#C19C00',
      'Candidate to deprioritize': '#737373',
    };

    const data = tiers.map((t) => ({
      name: t,
      value: projects.filter((p) => p.finalTier === t).length,
      itemStyle: { color: colors[t] },
    }));

    return {
      tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> ({d}%)' },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      series: [
        {
          name: 'Prioritization Tier',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 'bold' },
          },
          data,
        },
      ],
    };
  }

  // 2. Confidence Level Stacked by Business Unit
  getConfidenceByBuOptions(): echarts.EChartsCoreOption {
    const projects = this.store.filteredProjects();
    const buSet = new Set<string>();
    for (const p of projects) buSet.add(p.businessUnit);
    const bus = Array.from(buSet).sort();

    const highData: number[] = [];
    const medData: number[] = [];
    const lowData: number[] = [];

    for (const bu of bus) {
      const buProjects = projects.filter((p) => p.businessUnit === bu);
      highData.push(buProjects.filter((p) => p.confidenceLevel === 'High').length);
      medData.push(buProjects.filter((p) => p.confidenceLevel === 'Medium').length);
      lowData.push(buProjects.filter((p) => p.confidenceLevel === 'Low').length);
    }

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, textStyle: { fontSize: 11 } },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: bus.map((b) => (b.length > 15 ? b.slice(0, 15) + '...' : b)),
        axisLabel: { interval: 0, rotate: 20, fontSize: 10 },
      },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        { name: 'High', type: 'bar', stack: 'total', itemStyle: { color: '#107C10' }, data: highData },
        { name: 'Medium', type: 'bar', stack: 'total', itemStyle: { color: '#C19C00' }, data: medData },
        { name: 'Low', type: 'bar', stack: 'total', itemStyle: { color: '#D13438' }, data: lowData },
      ],
    };
  }

  // 3. Cost Treemap (Business Unit > Site)
  getCostTreemapOptions(): echarts.EChartsCoreOption {
    const projects = this.store.filteredProjects();
    const buMap = new Map<string, Map<string, number>>();

    for (const p of projects) {
      let siteMap = buMap.get(p.businessUnit);
      if (!siteMap) {
        siteMap = new Map<string, number>();
        buMap.set(p.businessUnit, siteMap);
      }
      siteMap.set(p.site, (siteMap.get(p.site) ?? 0) + p.costEstimateUsd);
    }

    interface TreemapChild {
      name: string;
      value: number;
    }
    interface TreemapNode {
      name: string;
      value: number;
      children: TreemapChild[];
    }

    const data: TreemapNode[] = [];
    for (const [bu, siteMap] of buMap.entries()) {
      let buTotal = 0;
      const children: TreemapChild[] = [];
      for (const [site, cost] of siteMap.entries()) {
        buTotal += cost;
        children.push({ name: site, value: cost });
      }
      data.push({ name: bu, value: buTotal, children });
    }

    return {
      tooltip: {
        formatter: (info: unknown) => {
          const item = info as { name: string; value: number };
          return `${item.name}: <b>$${(item.value / 1000000).toFixed(2)}M</b>`;
        },
      },
      series: [
        {
          type: 'treemap',
          roam: false,
          nodeClick: false,
          breadcrumb: { show: true },
          label: { show: true, formatter: '{b}' },
          levels: [
            { itemStyle: { borderColor: '#555', borderWidth: 2, gapWidth: 2 } },
            { colorSaturation: [0.35, 0.6], itemStyle: { borderWidth: 1, gapWidth: 1 } },
          ],
          data,
        },
      ],
    };
  }

  // 4. Sunburst (Business Unit > Site > Tier)
  getSunburstOptions(): echarts.EChartsCoreOption {
    const projects = this.store.filteredProjects();
    const buMap = new Map<string, Map<string, Map<string, number>>>();

    for (const p of projects) {
      let siteMap = buMap.get(p.businessUnit);
      if (!siteMap) {
        siteMap = new Map();
        buMap.set(p.businessUnit, siteMap);
      }
      let tierMap = siteMap.get(p.site);
      if (!tierMap) {
        tierMap = new Map();
        siteMap.set(p.site, tierMap);
      }
      tierMap.set(p.finalTier, (tierMap.get(p.finalTier) ?? 0) + 1);
    }

    interface SunburstTierNode {
      name: string;
      value: number;
    }
    interface SunburstSiteNode {
      name: string;
      children: SunburstTierNode[];
    }
    interface SunburstBuNode {
      name: string;
      children: SunburstSiteNode[];
    }

    const data: SunburstBuNode[] = [];
    for (const [bu, siteMap] of buMap.entries()) {
      const siteChildren: SunburstSiteNode[] = [];
      for (const [site, tierMap] of siteMap.entries()) {
        const tierChildren: SunburstTierNode[] = [];
        for (const [tier, count] of tierMap.entries()) {
          tierChildren.push({ name: tier, value: count });
        }
        siteChildren.push({ name: site, children: tierChildren });
      }
      data.push({ name: bu, children: siteChildren });
    }

    return {
      tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b>' },
      series: [
        {
          type: 'sunburst',
          data,
          radius: [0, '90%'],
          label: { rotate: 'radial', minAngle: 15, fontSize: 10 },
        },
      ],
    };
  }

  // 5. Capacity Supply vs Demand by Skill
  getCapacityChartOptions(): echarts.EChartsCoreOption {
    const capacities = this.store.dataset()?.capacityBySkill ?? [];
    const skills = capacities.map((c) => c.skill);
    const supply = capacities.map((c) => c.supplyFte);
    const demand = capacities.map((c) => c.demandFte);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, textStyle: { fontSize: 11 } },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: skills.map((s) => (s.length > 12 ? s.slice(0, 12) + '...' : s)),
        axisLabel: { interval: 0, rotate: 25, fontSize: 10 },
      },
      yAxis: { type: 'value', name: 'FTE' },
      series: [
        { name: 'Supply FTE', type: 'bar', itemStyle: { color: '#0078D4' }, data: supply },
        { name: 'Demand FTE', type: 'bar', itemStyle: { color: '#FFB900' }, data: demand },
      ],
    };
  }

  // 6. Completeness vs Quality Scatter (Bubble = Cost, Color = Confidence)
  getScatterPlotOptions(): echarts.EChartsCoreOption {
    const projects = this.store.filteredProjects();

    const data = projects.map((p) => {
      // Bubble size mapped from cost (min 150K -> ~10px, max 5M -> ~40px)
      const bubbleSize = Math.max(8, Math.min(45, (p.costEstimateUsd / 1000000) * 10 + 6));
      return {
        name: p.projectId,
        value: [Math.round(p.completeness * 100), Math.round(p.quality * 100), p.costEstimateUsd, p.projectName],
        symbolSize: bubbleSize,
        itemStyle: {
          color: getConfidenceColor(p.confidenceLevel),
          opacity: 0.85,
        },
      };
    });

    return {
      tooltip: {
        formatter: (params: unknown) => {
          const item = params as {
            name: string;
            value: [number, number, number, string];
          };
          const val = item.value;
          return `<b>${item.name}</b>: ${val[3]}<br/>Completeness: <b>${val[0]}%</b><br/>Quality: <b>${val[1]}%</b><br/>Cost: <b>$${(val[2] / 1000000).toFixed(2)}M</b>`;
        },
      },
      grid: { left: '8%', right: '8%', bottom: '12%', top: '12%' },
      xAxis: {
        type: 'value',
        name: 'Completeness %',
        min: 0,
        max: 100,
        splitLine: { show: true, lineStyle: { type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: 'Quality %',
        min: 0,
        max: 100,
        splitLine: { show: true, lineStyle: { type: 'dashed' } },
      },
      series: [
        {
          name: 'Projects',
          type: 'scatter',
          data,
        },
      ],
    };
  }
}
