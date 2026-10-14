import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
} from '@ionic/angular';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, RadarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  RadarComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import {
  PortfolioAgentService,
  AgentStructuredResponse,
  AgentChartType,
} from '../../services/portfolio-agent.service';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  RadarComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-agent-fab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonBadge,
    IonSpinner,
    NgxEchartsDirective,
  ],
  providers: [provideEchartsCore({ echarts })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Floating Action Button (FAB) -->
    <div
      class="copilot-fab-container"
      [class.open]="agent.isOpen()"
      (click)="onFabClick()"
      role="button"
      tabindex="0"
      aria-label="Open PMO Portfolio Copilot Agent"
    >
      <div class="fab-pulse"></div>
      <button class="copilot-fab-btn" [attr.aria-expanded]="agent.isOpen()">
        <ion-icon
          [name]="agent.isOpen() ? 'close-outline' : 'sparkles'"
          class="fab-icon"
        ></ion-icon>
        <span class="fab-label" *ngIf="!agent.isOpen()">Ask AI Agent</span>
      </button>
    </div>

    <!-- Copilot Modal / Drawer Backdrop & Window -->
    @if (agent.isOpen()) {
      <div class="copilot-drawer-backdrop" (click)="agent.setOpen(false)"></div>
      <div
        class="copilot-drawer-panel"
        [class.maximized]="isMaximized()"
        role="dialog"
        aria-label="PMO Portfolio Copilot"
      >
        <!-- Drawer Header -->
        <div class="drawer-header">
          <div class="header-branding">
            <div class="copilot-avatar">
              <ion-icon name="sparkles"></ion-icon>
            </div>
            <div class="header-titles">
              <h3 class="copilot-title">PMO Portfolio Copilot</h3>
              <span class="copilot-subtitle">
                <span class="status-dot"></span> Microsoft Fabric & Foundry AI • OneLake Live
              </span>
            </div>
          </div>

          <div class="header-actions">
            <button
              class="icon-action-btn"
              (click)="toggleMaximize()"
              [title]="isMaximized() ? 'Restore size' : 'Maximize window'"
              aria-label="Maximize window"
            >
              <ion-icon [name]="isMaximized() ? 'contract-outline' : 'expand-outline'"></ion-icon>
            </button>
            <button
              class="icon-action-btn close-btn"
              (click)="agent.setOpen(false)"
              title="Close Copilot"
              aria-label="Close Copilot"
            >
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>
        </div>

        <!-- Pre-saved Sample Prompts Bar -->
        <div class="prompts-bar">
          <span class="prompts-label">Pre-saved Prompts:</span>
          <div class="prompts-scroll">
            @for (sp of agent.samplePrompts; track sp.id) {
              <button
                class="prompt-chip"
                (click)="onPromptClick(sp.prompt)"
                [title]="sp.prompt"
              >
                <ion-icon [name]="sp.icon" class="chip-icon"></ion-icon>
                <span>{{ sp.title }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Chat Transcript Body -->
        <div class="drawer-body" #transcriptContainer>
          @for (msg of agent.messages(); track msg.id) {
            <div class="chat-message-card">
              <!-- Query Bubble if not initial welcome -->
              @if (msg.query && msg.id !== 'msg-welcome') {
                <div class="user-query-row">
                  <div class="user-query-bubble">
                    <ion-icon name="person-outline" class="user-icon"></ion-icon>
                    <span>{{ msg.query }}</span>
                  </div>
                </div>
              }

              <!-- Agent Response Box -->
              <div class="agent-response-box">
                <div class="agent-meta-row">
                  <span class="agent-name">
                    <ion-icon name="sparkles" class="agent-spark-icon"></ion-icon>
                    Portfolio Copilot
                  </span>
                  <span class="agent-time">{{ msg.timestamp }}</span>
                </div>

                <div class="agent-narrative">
                  {{ msg.text }}
                </div>

                <!-- Structured Response Controls Toolbar -->
                @if (msg.tableData && msg.tableData.rows.length > 0) {
                  <div class="response-toolbar">
                    <div class="toolbar-left-group">
                      <!-- Table vs Chart Toggle -->
                      <div class="view-switch-btns">
                        <button
                          class="view-btn"
                          [class.active]="msg.activeView === 'table'"
                          (click)="agent.toggleMessageView(msg.id)"
                          title="View as Data Table"
                        >
                          <ion-icon name="grid-outline"></ion-icon>
                          <span>Table</span>
                        </button>
                        <button
                          class="view-btn"
                          [class.active]="msg.activeView === 'chart'"
                          (click)="agent.toggleMessageView(msg.id)"
                          title="View as Interactive Chart"
                        >
                          <ion-icon name="bar-chart-outline"></ion-icon>
                          <span>Chart</span>
                        </button>
                      </div>

                      <!-- Chart Type Switcher Icons (Visible when Chart is active) -->
                      @if (msg.activeView === 'chart') {
                        <div class="chart-type-selector">
                          <button
                            class="chart-type-btn"
                            [class.selected]="msg.activeChartType === 'bar'"
                            (click)="agent.setChartType(msg.id, 'bar')"
                            title="Bar Chart"
                            aria-label="Bar Chart"
                          >
                            <ion-icon name="bar-chart-outline"></ion-icon>
                          </button>
                          <button
                            class="chart-type-btn"
                            [class.selected]="msg.activeChartType === 'line'"
                            (click)="agent.setChartType(msg.id, 'line')"
                            title="Line Chart"
                            aria-label="Line Chart"
                          >
                            <ion-icon name="trending-up-outline"></ion-icon>
                          </button>
                          <button
                            class="chart-type-btn"
                            [class.selected]="msg.activeChartType === 'pie'"
                            (click)="agent.setChartType(msg.id, 'pie')"
                            title="Pie / Donut Chart"
                            aria-label="Pie Chart"
                          >
                            <ion-icon name="pie-chart-outline"></ion-icon>
                          </button>
                          <button
                            class="chart-type-btn"
                            [class.selected]="msg.activeChartType === 'radar'"
                            (click)="agent.setChartType(msg.id, 'radar')"
                            title="Radar / Spider Chart"
                            aria-label="Radar Chart"
                          >
                            <ion-icon name="radio-outline"></ion-icon>
                          </button>
                        </div>
                      }
                    </div>

                    <!-- Export Action Buttons -->
                    <div class="export-actions-group">
                      <span class="export-label">Export:</span>
                      <button
                        class="export-btn word-btn"
                        (click)="onExportWord(msg)"
                        title="Export Table to Word (.docx)"
                      >
                        <ion-icon name="document-text-outline"></ion-icon>
                        <span>Word</span>
                      </button>
                      <button
                        class="export-btn xls-btn"
                        (click)="onExportExcel(msg)"
                        title="Export Table to Excel (.xlsx)"
                      >
                        <ion-icon name="grid-outline"></ion-icon>
                        <span>XLS</span>
                      </button>
                      <button
                        class="export-btn ppt-btn"
                        (click)="onExportPpt(msg)"
                        title="Export Table to PowerPoint (.pptx)"
                      >
                        <ion-icon name="easel-outline"></ion-icon>
                        <span>PPT</span>
                      </button>
                    </div>
                  </div>

                  <!-- Table View Content -->
                  @if (msg.activeView === 'table') {
                    <div class="table-container">
                      <div class="table-title">{{ msg.tableData.title }}</div>
                      <table class="agent-table">
                        <thead>
                          <tr>
                            @for (h of msg.tableData.headers; track h) {
                              <th>{{ h }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of msg.tableData.rows; track $index) {
                            <tr>
                              @for (cell of row; track $index) {
                                <td>{{ cell }}</td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }

                  <!-- Chart View Content -->
                  @if (msg.activeView === 'chart') {
                    <div class="chart-container">
                      <div class="chart-title">{{ msg.tableData.title }}</div>
                      <div
                        echarts
                        [options]="agent.buildEchartsOption(msg)"
                        class="agent-echarts-box"
                      ></div>
                    </div>
                  }
                }
              </div>
            </div>
          }

          @if (agent.isThinking()) {
            <div class="agent-thinking-card">
              <div class="thinking-spinner">
                <ion-spinner name="crescent" color="primary"></ion-spinner>
              </div>
              <span class="thinking-text"
                >Querying OneLake Gold Delta tables & evaluating rules...</span
              >
            </div>
          }
        </div>

        <!-- Toast Notification on Export -->
        @if (exportToast()) {
          <div class="export-toast">
            <ion-icon name="checkmark-circle-outline"></ion-icon>
            <span>{{ exportToast() }}</span>
          </div>
        }

        <!-- Drawer Input Footer -->
        <div class="drawer-footer">
          <form class="input-form" (ngSubmit)="onSubmitInput()">
            <input
              type="text"
              class="query-input"
              [(ngModel)]="userInput"
              name="agentQuery"
              placeholder="Ask Copilot about priorities, SHAP, capacity, rules..."
              [disabled]="agent.isThinking()"
              autocomplete="off"
            />
            <button
              type="submit"
              class="send-btn"
              [disabled]="!userInput || !userInput.trim() || agent.isThinking()"
              title="Send message"
            >
              <ion-icon name="arrow-up-outline"></ion-icon>
            </button>
          </form>
          <div class="footer-hint">
            Direct Lake OneLake connection active • Exportable to Word, Excel & PowerPoint
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      /* Floating Action Button (FAB) */
      .copilot-fab-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .fab-pulse {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 9999px;
        background: radial-gradient(circle, rgba(0, 120, 212, 0.4) 0%, rgba(104, 33, 122, 0) 70%);
        animation: pulseRing 2.4s infinite ease-out;
        pointer-events: none;
      }
      @keyframes pulseRing {
        0% {
          transform: scale(0.95);
          opacity: 0.8;
        }
        70% {
          transform: scale(1.4);
          opacity: 0;
        }
        100% {
          transform: scale(1.4);
          opacity: 0;
        }
      }
      .copilot-fab-btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: 52px;
        padding: 0 20px;
        border-radius: 26px;
        background: linear-gradient(135deg, #0078d4 0%, #68217a 50%, #00b294 100%);
        color: #ffffff;
        border: 2px solid rgba(255, 255, 255, 0.6);
        box-shadow: 0 8px 24px rgba(0, 120, 212, 0.4), 0 2px 8px rgba(0, 0, 0, 0.15);
        cursor: pointer;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        font-weight: 600;
        font-size: 0.95rem;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      }
      .copilot-fab-btn:hover {
        transform: translateY(-2px) scale(1.03);
        box-shadow: 0 12px 28px rgba(0, 120, 212, 0.5), 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      .fab-icon {
        font-size: 22px;
      }
      .fab-label {
        letter-spacing: 0.2px;
      }

      /* Backdrop */
      .copilot-drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(2px);
        z-index: 100000;
      }

      /* Panel Drawer */
      .copilot-drawer-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 680px;
        max-width: calc(100vw - 32px);
        height: 740px;
        max-height: calc(100vh - 40px);
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.24), 0 4px 16px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(0, 120, 212, 0.2);
        z-index: 100001;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: slideUpFade 0.25s ease-out;
      }
      .copilot-drawer-panel.maximized {
        width: calc(100vw - 40px);
        height: calc(100vh - 40px);
        bottom: 20px;
        right: 20px;
      }
      @keyframes slideUpFade {
        from {
          transform: translateY(24px) scale(0.97);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      /* Header */
      .drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        background: linear-gradient(135deg, #0b1f3f 0%, #102644 100%);
        color: #ffffff;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .header-branding {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .copilot-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0078d4 0%, #68217a 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 18px;
        box-shadow: 0 2px 8px rgba(0, 120, 212, 0.4);
      }
      .header-titles {
        display: flex;
        flex-direction: column;
      }
      .copilot-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #ffffff;
      }
      .copilot-subtitle {
        font-size: 0.72rem;
        color: #a0cbf1;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #107c10;
        box-shadow: 0 0 6px #107c10;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .icon-action-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #ffffff;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .icon-action-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .icon-action-btn.close-btn:hover {
        background: #d13438;
      }

      /* Prompts Bar */
      .prompts-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        background: #f4f6f8;
        border-bottom: 1px solid #e0e0e0;
        overflow-x: auto;
      }
      .prompts-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: #666666;
        white-space: nowrap;
      }
      .prompts-scroll {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding-bottom: 2px;
      }
      .prompt-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 14px;
        background: #ffffff;
        border: 1px solid #d0d7de;
        color: #0078d4;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .prompt-chip:hover {
        background: #0078d4;
        color: #ffffff;
        border-color: #0078d4;
        transform: translateY(-1px);
      }
      .chip-icon {
        font-size: 14px;
      }

      /* Transcript Body */
      .drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: #f9fbfd;
      }

      /* Message Cards */
      .chat-message-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .user-query-row {
        display: flex;
        justify-content: flex-end;
      }
      .user-query-bubble {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #0078d4;
        color: #ffffff;
        padding: 8px 14px;
        border-radius: 16px 16px 4px 16px;
        font-size: 0.88rem;
        font-weight: 500;
        max-width: 80%;
        box-shadow: 0 2px 6px rgba(0, 120, 212, 0.2);
      }
      .user-icon {
        font-size: 16px;
      }

      .agent-response-box {
        background: #ffffff;
        border: 1px solid #e1dfdd;
        border-radius: 12px;
        padding: 14px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .agent-meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .agent-name {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.82rem;
        font-weight: 700;
        color: #0078d4;
      }
      .agent-spark-icon {
        font-size: 16px;
        color: #68217a;
      }
      .agent-time {
        font-size: 0.72rem;
        color: #8a8886;
      }
      .agent-narrative {
        font-size: 0.88rem;
        line-height: 1.45;
        color: #242424;
      }

      /* Response Toolbar */
      .response-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        padding: 6px 10px;
        background: #f4f6f8;
        border-radius: 8px;
        border: 1px solid #edebe9;
      }
      .toolbar-left-group {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .view-switch-btns {
        display: flex;
        background: #e1dfdd;
        border-radius: 6px;
        padding: 2px;
      }
      .view-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 10px;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: #484644;
        font-size: 0.76rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .view-btn.active {
        background: #ffffff;
        color: #0078d4;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      }
      .chart-type-selector {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .chart-type-btn {
        width: 26px;
        height: 26px;
        border-radius: 4px;
        border: 1px solid #d0d7de;
        background: #ffffff;
        color: #484644;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .chart-type-btn:hover {
        background: #f3f2f1;
        color: #0078d4;
      }
      .chart-type-btn.selected {
        background: #0078d4;
        color: #ffffff;
        border-color: #0078d4;
      }

      .export-actions-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .export-label {
        font-size: 0.72rem;
        font-weight: 700;
        color: #605e5c;
      }
      .export-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.72rem;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.15s ease;
      }
      .word-btn {
        background: #eff6fc;
        color: #0078d4;
        border-color: #c7e0f4;
      }
      .word-btn:hover {
        background: #0078d4;
        color: #ffffff;
      }
      .xls-btn {
        background: #dff6dd;
        color: #107c10;
        border-color: #a7e3a5;
      }
      .xls-btn:hover {
        background: #107c10;
        color: #ffffff;
      }
      .ppt-btn {
        background: #fed9cc;
        color: #d13438;
        border-color: #fca891;
      }
      .ppt-btn:hover {
        background: #d13438;
        color: #ffffff;
      }

      /* Table Container */
      .table-container {
        overflow-x: auto;
        border: 1px solid #e1dfdd;
        border-radius: 8px;
        background: #ffffff;
      }
      .table-title {
        font-size: 0.8rem;
        font-weight: 700;
        color: #323130;
        padding: 8px 12px;
        background: #f8f8f8;
        border-bottom: 1px solid #e1dfdd;
      }
      .agent-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;
        text-align: left;
      }
      .agent-table th {
        background: #faf9f8;
        padding: 7px 10px;
        font-weight: 700;
        color: #323130;
        border-bottom: 1px solid #e1dfdd;
      }
      .agent-table td {
        padding: 7px 10px;
        border-bottom: 1px solid #f3f2f1;
        color: #201f1e;
      }
      .agent-table tr:nth-child(even) td {
        background: #fcfcfc;
      }
      .agent-table tr:hover td {
        background: #f3f9fd;
      }

      /* Chart Container */
      .chart-container {
        border: 1px solid #e1dfdd;
        border-radius: 8px;
        background: #ffffff;
        padding: 8px;
      }
      .chart-title {
        font-size: 0.8rem;
        font-weight: 700;
        color: #323130;
        margin-bottom: 4px;
        padding-left: 6px;
      }
      .agent-echarts-box {
        width: 100%;
        height: 240px;
      }

      /* Thinking Card */
      .agent-thinking-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: #eff6fc;
        border: 1px solid #c7e0f4;
        border-radius: 10px;
      }
      .thinking-spinner {
        display: flex;
        align-items: center;
      }
      .thinking-text {
        font-size: 0.82rem;
        color: #0078d4;
        font-weight: 600;
      }

      /* Toast */
      .export-toast {
        position: absolute;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #107c10;
        color: #ffffff;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.82rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        animation: toastFade 0.3s ease-out;
        z-index: 10;
      }
      @keyframes toastFade {
        from {
          opacity: 0;
          transform: translate(-50%, 10px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }

      /* Footer */
      .drawer-footer {
        padding: 12px 16px;
        background: #ffffff;
        border-top: 1px solid #edebe9;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .input-form {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .query-input {
        flex: 1;
        height: 42px;
        border-radius: 21px;
        border: 1px solid #d0d7de;
        padding: 0 16px;
        font-size: 0.88rem;
        color: #242424;
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .query-input:focus {
        border-color: #0078d4;
        box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.15);
      }
      .send-btn {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #0078d4;
        color: #ffffff;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.15s ease;
      }
      .send-btn:hover:not(:disabled) {
        background: #106ebe;
        transform: scale(1.05);
      }
      .send-btn:disabled {
        background: #c8c6c4;
        cursor: not-allowed;
      }
      .footer-hint {
        font-size: 0.7rem;
        color: #8a8886;
        text-align: center;
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        .copilot-fab-container {
          bottom: 16px;
          right: 16px;
        }
        .copilot-fab-btn {
          height: 46px;
          padding: 0 14px;
          font-size: 0.85rem;
        }
        .fab-icon {
          font-size: 20px;
        }
        .copilot-drawer-panel {
          bottom: 0;
          right: 0;
          width: 100vw;
          max-width: 100vw;
          height: 90vh;
          max-height: 90vh;
          border-radius: 16px 16px 0 0;
        }
        .agent-echarts-box {
          height: 200px;
        }
      }
    `,
  ],
})
export class AgentFabComponent {
  readonly agent = inject(PortfolioAgentService);
  readonly transcriptContainer = viewChild<ElementRef<HTMLDivElement>>('transcriptContainer');

  userInput = '';
  readonly isMaximized = signal<boolean>(false);
  readonly exportToast = signal<string | null>(null);

  onFabClick(): void {
    this.agent.toggleOpen();
    if (this.agent.isOpen()) {
      this.scrollToBottom();
    }
  }

  toggleMaximize(): void {
    this.isMaximized.update((v) => !v);
  }

  onPromptClick(prompt: string): void {
    this.agent.askQuestion(prompt);
    this.scrollToBottom();
  }

  onSubmitInput(): void {
    if (!this.userInput || !this.userInput.trim()) return;
    const q = this.userInput.trim();
    this.userInput = '';
    this.agent.askQuestion(q);
    this.scrollToBottom();
  }

  async onExportWord(msg: AgentStructuredResponse): Promise<void> {
    await this.agent.exportToWord(msg);
    this.showToast('Exported to Word (.docx) successfully');
  }

  async onExportExcel(msg: AgentStructuredResponse): Promise<void> {
    await this.agent.exportToExcel(msg);
    this.showToast('Exported to Excel (.xlsx) successfully');
  }

  async onExportPpt(msg: AgentStructuredResponse): Promise<void> {
    await this.agent.exportToPpt(msg);
    this.showToast('Exported to PowerPoint (.pptx) successfully');
  }

  private showToast(message: string): void {
    this.exportToast.set(message);
    setTimeout(() => this.exportToast.set(null), 3000);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.transcriptContainer()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 150);
  }
}
