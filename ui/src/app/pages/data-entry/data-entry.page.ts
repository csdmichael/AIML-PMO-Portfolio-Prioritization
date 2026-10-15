import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonSegment,
  IonSegmentButton,
  IonNote,
} from '@ionic/angular';
import { DataApiService } from '../../services/data-api.service';
import { ConfigService } from '../../services/config.service';
import { PortfolioStore } from '../../services/portfolio.store';
import { OptionsResponse, PortfolioItem, ProjectUploadMetadata } from '../../models/api.models';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

@Component({
  selector: 'app-data-entry-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonSegment,
    IonSegmentButton,
    IonNote,
    LoadingSkeletonComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding data-entry-content">
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">Direct Data Entry & Uploads</h2>
          <p class="page-subtitle">Config-driven form generation directly reading and writing OneLake raw entries.</p>
        </div>
        <div class="header-right">
          <a [href]="templateUrl" download class="template-btn">
            <ion-icon name="download-outline"></ion-icon>
            Download Excel Intake Template
          </a>
        </div>
      </div>

      <ion-segment [(ngModel)]="activeTab" class="entry-segment">
        <ion-segment-button value="project">
          <ion-label>Create Project</ion-label>
        </ion-segment-button>
        <ion-segment-button value="portfolio">
          <ion-label>Create Portfolio</ion-label>
        </ion-segment-button>
        <ion-segment-button value="uploads">
          <ion-label>Uploads & Ingestion</ion-label>
        </ion-segment-button>
      </ion-segment>

      @if (isLoading()) {
        <app-loading-skeleton [cards]="2" [rows]="6"></app-loading-skeleton>
      } @else if (error()) {
        <app-empty-state title="Error Loading Schema" [message]="error()!" [isError]="true">
          <ion-button (click)="loadOptions()">Retry</ion-button>
        </app-empty-state>
      } @else {
        <!-- TAB 1: CREATE PROJECT -->
        @if (activeTab === 'project') {
          <ion-card class="form-card">
            <ion-card-header>
              <div class="card-header-with-action">
                <ion-card-title>Create New Project Entry</ion-card-title>
                <button type="button" class="quick-fill-btn" (click)="quickFillSampleProject()">
                  <ion-icon name="flash-outline"></ion-icon>
                  <span>Quick Fill Sample Values</span>
                </button>
              </div>
            </ion-card-header>
            <ion-card-content>
              <form (ngSubmit)="onCreateProject()" class="dynamic-form">
                <div class="form-grid">
                  @for (field of options()?.projectFields; track field.key) {
                    <div class="field-item">
                      <ion-label class="field-label">
                        {{ field.label }}
                        @if (field.required) { <span class="required">*</span> }
                      </ion-label>

                      <!-- Select -->
                      @if (field.type === 'select') {
                        <select
                          class="form-select"
                          [(ngModel)]="projectFormData[field.key]"
                          [name]="field.key"
                          [required]="field.required"
                        >
                          <option [ngValue]="undefined">-- Select {{ field.label }} --</option>
                          @for (opt of getOptionsForField(field); track opt.value) {
                            <option [value]="opt.value">{{ opt.label }}</option>
                          }
                        </select>
                      }
                      <!-- Boolean -->
                      @else if (field.type === 'boolean') {
                        <ion-toggle
                          [(ngModel)]="projectFormData[field.key]"
                          [name]="field.key"
                        >
                          {{ field.label }}
                        </ion-toggle>
                      }
                      <!-- Number / Integer -->
                      @else if (field.type === 'number' || field.type === 'integer') {
                        <input
                          type="number"
                          class="form-input"
                          [(ngModel)]="projectFormData[field.key]"
                          [name]="field.key"
                          [min]="field.min ?? null"
                          [max]="field.max ?? null"
                          [required]="field.required"
                        />
                      }
                      <!-- Date -->
                      @else if (field.type === 'date') {
                        <input
                          type="date"
                          class="form-input"
                          [(ngModel)]="projectFormData[field.key]"
                          [name]="field.key"
                          [required]="field.required"
                        />
                      }
                      <!-- Text / Email / Default -->
                      @else {
                        <input
                          [type]="field.type === 'email' ? 'email' : 'text'"
                          class="form-input"
                          [(ngModel)]="projectFormData[field.key]"
                          [name]="field.key"
                          [required]="field.required"
                          [maxlength]="field.maxLength ?? null"
                        />
                      }
                    </div>
                  }
                </div>

                <div class="submit-row">
                  <ion-item lines="none" class="pipeline-switch">
                    <ion-toggle [(ngModel)]="runPipelineOnCreate" name="runPipeline">
                      Run pipeline immediately on save
                    </ion-toggle>
                  </ion-item>
                  <ion-button type="submit" color="primary" [disabled]="isSubmittingProject()">
                    Create Project in OneLake
                  </ion-button>
                </div>

                @if (projectMessage()) {
                  <div class="message-banner" [class.success]="isProjectSuccess()" [class.error]="!isProjectSuccess()">
                    {{ projectMessage() }}
                  </div>
                }
              </form>
            </ion-card-content>
          </ion-card>
        }

        <!-- TAB 2: CREATE PORTFOLIO -->
        @if (activeTab === 'portfolio') {
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>Create New Portfolio</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <form (ngSubmit)="onCreatePortfolio()" class="dynamic-form">
                <div class="form-grid">
                  @for (field of options()?.portfolioFields; track field.key) {
                    <div class="field-item">
                      <ion-label class="field-label">
                        {{ field.label }}
                        @if (field.required) { <span class="required">*</span> }
                      </ion-label>

                      @if (field.type === 'select' && field.options) {
                        <select
                          class="form-select"
                          [(ngModel)]="portfolioFormData[field.key]"
                          [name]="field.key"
                          [required]="field.required"
                        >
                          @for (opt of field.options; track opt) {
                            <option [value]="opt">{{ opt }}</option>
                          }
                        </select>
                      } @else if (field.type === 'programList') {
                        <input
                          type="text"
                          class="form-input"
                          [(ngModel)]="portfolioProgramsText"
                          name="programsText"
                        />
                      } @else {
                        <input
                          type="text"
                          class="form-input"
                          [(ngModel)]="portfolioFormData[field.key]"
                          [name]="field.key"
                          [required]="field.required"
                          [maxlength]="field.maxLength ?? null"
                        />
                      }
                    </div>
                  }
                </div>

                <div class="submit-row">
                  <ion-button type="submit" color="primary" [disabled]="isSubmittingPortfolio()">
                    Create Portfolio in OneLake
                  </ion-button>
                </div>

                @if (portfolioMessage()) {
                  <div class="message-banner" [class.success]="isPortfolioSuccess()" [class.error]="!isPortfolioSuccess()">
                    {{ portfolioMessage() }}
                  </div>
                }
              </form>
            </ion-card-content>
          </ion-card>
        }

        <!-- TAB 3: UPLOADS -->
        @if (activeTab === 'uploads') {
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>Project File Uploads & Ingestion</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="upload-controls-grid">
                <div class="field-item">
                  <ion-label class="field-label">Target Project</ion-label>
                  <select class="form-select" [(ngModel)]="selectedUploadProjectId" (ngModelChange)="loadProjectUploads()">
                    <option [ngValue]="null">-- Select Project --</option>
                    @for (p of store.rawProjects(); track p.projectId) {
                      <option [value]="p.projectId">{{ p.projectId }} - {{ p.projectName }}</option>
                    }
                  </select>
                </div>

                <div class="field-item">
                  <ion-label class="field-label">Data Source</ion-label>
                  <select class="form-select" [(ngModel)]="selectedSourceKey">
                    <option [ngValue]="null">-- Select Source --</option>
                    @for (key of availableSources; track key) {
                      <option [value]="key">{{ key }} ({{ getAcceptedExtensions(key).join(', ') }})</option>
                    }
                  </select>
                </div>

                <div class="field-item">
                  <ion-label class="field-label">Select File</ion-label>
                  <input
                    type="file"
                    class="form-input"
                    [accept]="currentAcceptedExtensions"
                    (change)="onUploadFileSelected($event)"
                  />
                </div>
              </div>

              <div class="submit-row">
                <ion-button
                  color="primary"
                  [disabled]="!selectedUploadProjectId || !selectedSourceKey || !uploadFile || isUploading()"
                  (click)="onUploadFile()"
                >
                  <ion-icon name="cloud-upload-outline" slot="start"></ion-icon>
                  Upload to OneLake
                </ion-button>
              </div>

              @if (uploadMessage()) {
                <div class="message-banner" [class.success]="isUploadSuccess()" [class.error]="!isUploadSuccess()">
                  {{ uploadMessage() }}
                </div>
              }

              <!-- Upload history for project -->
              @if (selectedUploadProjectId) {
                <div class="upload-history-section">
                  <h4>Uploaded Files for {{ selectedUploadProjectId }}</h4>
                  @if (projectUploads().length === 0) {
                    <p class="empty-note">No uploaded source files for this project yet.</p>
                  } @else {
                    <table class="uploads-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>File Name</th>
                          <th>Size</th>
                          <th>OneLake Path</th>
                          <th>Uploaded At</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (up of projectUploads(); track up.uploadId) {
                          <tr>
                            <td><strong>{{ up.sourceKey }}</strong></td>
                            <td>{{ up.fileName }}</td>
                            <td>{{ (up.sizeBytes / 1024).toFixed(1) }} KB</td>
                            <td><code>{{ up.oneLakePath }}</code></td>
                            <td>{{ up.uploadedAt }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  }
                </div>
              }

              <!-- Active Data Ingestion Sources in OneLake -->
              <div class="active-sources-section">
                <h4>Active Enterprise Source Connectors (OneLake Bronze/Silver)</h4>
                <div class="sources-table-wrap">
                  <table class="uploads-table">
                    <thead>
                      <tr>
                        <th>Enterprise Source</th>
                        <th>OneLake Target Schema</th>
                        <th>Ingestion Format</th>
                        <th>Record Count</th>
                        <th>Status</th>
                        <th>Last Synchronized</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (src of ingestionSources; track src.name) {
                        <tr>
                          <td><strong>{{ src.name }}</strong></td>
                          <td><code>{{ src.lakePath }}</code></td>
                          <td>{{ src.format }}</td>
                          <td>{{ src.records }}</td>
                          <td>
                            <span class="status-pill-synced">
                              <span class="dot-green"></span> Synced to OneLake
                            </span>
                          </td>
                          <td>{{ src.lastSync }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        }
      }
    </ion-content>
  `,
  styles: [
    `
      .data-entry-content {
        --background: var(--pmo-bg, #f4f6f8);
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 12px;
      }
      .page-title {
        font-size: 1.35rem;
        font-weight: 700;
        margin: 0;
        color: var(--pmo-text, #1a1a1a);
      }
      .page-subtitle {
        font-size: 0.85rem;
        color: var(--pmo-muted, #666666);
        margin: 2px 0 0 0;
      }
      .template-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #ffffff;
        color: var(--pmo-primary, #0078d4);
        border: 1px solid var(--pmo-primary, #0078d4);
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        text-decoration: none;
      }
      .entry-segment {
        margin-bottom: 16px;
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid var(--pmo-border, #e0e0e0);
      }
      .form-card {
        margin: 0;
        border-radius: 8px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        border: 1px solid var(--pmo-border, #e0e0e0);
        background: var(--pmo-surface, #ffffff);
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 14px;
      }
      .field-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .field-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #333333;
      }
      .required {
        color: var(--pmo-mustdo, #d13438);
      }
      .form-input,
      .form-select {
        padding: 7px 10px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 6px;
        font-size: 0.85rem;
      }
      .submit-row {
        margin-top: 18px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 12px;
      }
      .pipeline-switch {
        --background: transparent;
      }
      .message-banner {
        margin-top: 12px;
        padding: 10px 14px;
        border-radius: 6px;
        font-size: 0.85rem;
      }
      .message-banner.success {
        background: #dff6dd;
        color: #107c10;
        border: 1px solid #107c10;
      }
      .message-banner.error {
        background: #fed9cc;
        color: #a80000;
        border: 1px solid #d13438;
      }
      .upload-controls-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }
      .card-header-with-action {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      .quick-fill-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 6px;
        background: #eff6fc;
        border: 1px solid #0078d4;
        color: #0078d4;
        font-size: 0.76rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .quick-fill-btn:hover {
        background: #0078d4;
        color: #ffffff;
      }
      .active-sources-section {
        margin-top: 24px;
        border-top: 1px solid #edebe9;
        padding-top: 16px;
      }
      .active-sources-section h4 {
        margin: 0 0 10px 0;
        font-size: 0.95rem;
        font-weight: 700;
        color: #323130;
      }
      .sources-table-wrap {
        overflow-x: auto;
      }
      .status-pill-synced {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 8px;
        border-radius: 12px;
        background: #dff6dd;
        color: #107c10;
        font-size: 0.72rem;
        font-weight: 700;
      }
      .dot-green {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #107c10;
        box-shadow: 0 0 4px #107c10;
      }
      .upload-history-section {
        margin-top: 24px;
        border-top: 1px solid #e0e0e0;
        padding-top: 16px;
      }
      .uploads-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;
      }
      .uploads-table th {
        background: #f8f9fb;
        padding: 6px 10px;
        border-bottom: 2px solid #e0e0e0;
        text-align: left;
      }
      .uploads-table td {
        padding: 6px 10px;
        border-bottom: 1px solid #f0f0f0;
      }
      .empty-note {
        font-size: 0.82rem;
        color: #888888;
        font-style: italic;
      }
    `,
  ],
})
export class DataEntryPageComponent implements OnInit {
  private readonly api = inject(DataApiService);
  readonly store = inject(PortfolioStore);

  activeTab: 'project' | 'portfolio' | 'uploads' = 'project';
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly options = signal<OptionsResponse | null>(null);

  // Form states
  projectFormData: Record<string, unknown> = {};
  runPipelineOnCreate = true;
  readonly isSubmittingProject = signal<boolean>(false);
  readonly projectMessage = signal<string | null>(null);
  readonly isProjectSuccess = signal<boolean>(false);

  portfolioFormData: Record<string, unknown> = { role: 'main' };
  portfolioProgramsText = '';
  readonly isSubmittingPortfolio = signal<boolean>(false);
  readonly portfolioMessage = signal<string | null>(null);
  readonly isPortfolioSuccess = signal<boolean>(false);

  // Upload state
  selectedUploadProjectId: string | null = null;
  selectedSourceKey: string | null = null;
  uploadFile: File | null = null;
  readonly isUploading = signal<boolean>(false);
  readonly uploadMessage = signal<string | null>(null);
  readonly isUploadSuccess = signal<boolean>(false);
  readonly projectUploads = signal<ProjectUploadMetadata[]>([]);

  readonly ingestionSources = [
    { name: 'Planview Portfolio', lakePath: 'src_planview', format: 'CSV', records: '69 projects', lastSync: 'Today, 07:15 UTC' },
    { name: 'Power Apps Intake', lakePath: 'src_powerapps', format: 'JSON', records: '75 submissions', lastSync: 'Today, 07:15 UTC' },
    { name: 'Azure DevOps', lakePath: 'src_ado', format: 'CSV', records: '3,420 work items', lastSync: 'Today, 07:15 UTC' },
    { name: 'JIRA Search API', lakePath: 'src_jira', format: 'JSON', records: '1,890 issues', lastSync: 'Today, 07:15 UTC' },
    { name: 'MS Project (4 Programs)', lakePath: 'src_ms_project', format: 'MSPDI XML', records: '48 schedules', lastSync: 'Today, 07:15 UTC' },
    { name: 'Smartsheet Milestones', lakePath: 'src_smartsheet', format: 'CSV', records: '60 milestone rows', lastSync: 'Today, 07:15 UTC' },
    { name: 'BU Multi-Sheet Trackers', lakePath: 'src_spreadsheets', format: 'XLSX', records: '70 decision labels', lastSync: 'Today, 07:15 UTC' },
    { name: 'HR Capacity Allocations', lakePath: 'src_hr_capacity', format: 'CSV', records: '420 FTE rows', lastSync: 'Today, 07:15 UTC' },
    { name: 'HR Roster', lakePath: 'src_hr_roster', format: 'CSV', records: '24 leaders', lastSync: 'Today, 07:15 UTC' },
    { name: 'Finance Project Cost', lakePath: 'src_cost', format: 'Monthly CSV', records: '1,200 cost lines', lastSync: 'Today, 07:15 UTC' },
    { name: 'Excel Intake Template', lakePath: 'src_excel_intake', format: 'XLSX', records: '20 projects', lastSync: 'Today, 07:15 UTC' },
  ];

  quickFillSampleProject(): void {
    this.projectFormData = {
      projectName: 'Autonomous Cleanroom Equipment Safety & Interlock Hub',
      businessUnit: 'Fab Operations',
      site: 'Singapore',
      projectManager: 'Mateo Okafor',
      executiveSponsor: 'Dmitri Nakamura',
      executiveSponsorEmail: 'dmitri.nakamura@example.com',
      sponsorLevel: 'Executive',
      projectStatus: 'Active',
      goLiveDate: '2027-08-15',
      benefitScore: 5,
      estimatedCostUsd: 2150000,
      riskLevel: 'Low',
      dependencyCount: 1,
      protectedProgram: true,
      regulatorySecurity: true,
      dtAlignment: true,
      primarySkill: 'Application Development',
      skillDemandFte: 6.5,
      effortPersonWeeks: 75,
    };
  }

  ngOnInit(): void {
    this.loadOptions();
  }

  get templateUrl(): string {
    return 'assets/data/portfolios/project_intake_template.xlsx';
  }

  loadOptions(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.api.getOptions().subscribe({
      next: (opts) => {
        this.options.set(opts);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to load options schema');
        this.isLoading.set(false);
      },
    });
  }

  getOptionsForField(field: { source?: string }): Array<{ value: unknown; label: string }> {
    const opts = this.options()?.options;
    if (!opts) return [];

    if (field.source === 'options.businessUnits') {
      return opts.businessUnits.map((bu) => ({ value: bu, label: bu }));
    }
    if (field.source === 'options.sites') {
      return opts.sites.map((s) => ({ value: s, label: s }));
    }
    if (field.source === 'options.projectStatuses') {
      return opts.projectStatuses.map((s) => ({ value: s, label: s }));
    }
    if (field.source === 'options.sponsorLevels') {
      return opts.sponsorLevels.map((s) => ({ value: s, label: s }));
    }
    if (field.source === 'options.riskRatings') {
      return opts.riskRatings.map((r) => ({ value: r, label: r }));
    }
    if (field.source === 'options.skills') {
      return opts.skills.map((sk) => ({ value: sk.displayName, label: sk.displayName }));
    }
    if (field.source === 'portfolios') {
      return [{ value: 'GIS Portfolio', label: 'GIS Portfolio' }, { value: 'BU Initiatives', label: 'BU Initiatives' }];
    }
    if (field.source === 'programsOfPortfolio') {
      return [
        { value: 'Network & Collaboration Modernization', label: 'Network & Collaboration Modernization' },
        { value: 'Data & AI Platform', label: 'Data & AI Platform' },
        { value: 'Fab & Manufacturing Systems', label: 'Fab & Manufacturing Systems' },
        { value: 'Enterprise Business Services', label: 'Enterprise Business Services' },
      ];
    }
    return [];
  }

  get availableSources(): string[] {
    const accepted = this.options()?.uploads?.acceptedBySource;
    return accepted ? Object.keys(accepted) : [];
  }

  getAcceptedExtensions(sourceKey: string): string[] {
    return this.options()?.uploads?.acceptedBySource[sourceKey]?.extensions ?? [];
  }

  get currentAcceptedExtensions(): string {
    if (!this.selectedSourceKey) return '';
    return this.getAcceptedExtensions(this.selectedSourceKey).join(',');
  }

  onCreateProject(): void {
    this.isSubmittingProject.set(true);
    this.projectMessage.set(null);

    this.api.createProject(this.projectFormData, this.runPipelineOnCreate).subscribe({
      next: (res) => {
        this.isSubmittingProject.set(false);
        this.isProjectSuccess.set(true);
        this.projectMessage.set(`Project ${res.projectId} created successfully in OneLake! (Status: ${res.status})`);
        this.projectFormData = {};
        this.store.init(); // Refresh data
      },
      error: (err) => {
        this.isSubmittingProject.set(false);
        this.isProjectSuccess.set(false);
        this.projectMessage.set(err?.error?.detail ?? err?.message ?? 'Failed to create project');
      },
    });
  }

  onCreatePortfolio(): void {
    this.isSubmittingPortfolio.set(true);
    this.portfolioMessage.set(null);

    const programs = this.portfolioProgramsText
      .split(',')
      .map((p) => p.trim())
      .filter((p) => !!p)
      .map((name, idx) => ({ key: `prog-${idx + 1}`, name }));

    const payload: Partial<PortfolioItem> = {
      ...this.portfolioFormData,
      programs,
    } as Partial<PortfolioItem>;

    this.api.createPortfolio(payload).subscribe({
      next: (res) => {
        this.isSubmittingPortfolio.set(false);
        this.isPortfolioSuccess.set(true);
        this.portfolioMessage.set(`Portfolio '${res.displayName}' (${res.key}) created successfully!`);
        this.portfolioFormData = { role: 'main' };
        this.portfolioProgramsText = '';
      },
      error: (err) => {
        this.isSubmittingPortfolio.set(false);
        this.isPortfolioSuccess.set(false);
        this.portfolioMessage.set(err?.error?.detail ?? err?.message ?? 'Failed to create portfolio');
      },
    });
  }

  onUploadFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFile = input.files[0];
    }
  }

  onUploadFile(): void {
    if (!this.selectedUploadProjectId || !this.selectedSourceKey || !this.uploadFile) return;

    this.isUploading.set(true);
    this.uploadMessage.set(null);

    this.api.uploadProjectFile(this.selectedUploadProjectId, this.selectedSourceKey, this.uploadFile).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        this.isUploadSuccess.set(true);
        this.uploadMessage.set(`File '${res.fileName}' uploaded successfully to OneLake!`);
        this.uploadFile = null;
        this.loadProjectUploads();
      },
      error: (err) => {
        this.isUploading.set(false);
        this.isUploadSuccess.set(false);
        this.uploadMessage.set(err?.error?.detail ?? err?.message ?? 'Failed to upload file');
      },
    });
  }

  loadProjectUploads(): void {
    if (!this.selectedUploadProjectId) {
      this.projectUploads.set([]);
      return;
    }
    this.api.getProjectUploads(this.selectedUploadProjectId).subscribe({
      next: (uploads) => this.projectUploads.set(uploads),
      error: () => this.projectUploads.set([]),
    });
  }
}
