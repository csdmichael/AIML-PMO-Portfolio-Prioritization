import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonIcon,
  IonToggle,
  IonBadge,
  IonProgressBar,
  IonSelect,
  IonSelectOption,
  IonNote,
} from '@ionic/angular';
import { DataApiService } from '../../services/data-api.service';
import { ConfigService } from '../../services/config.service';
import { PortfolioStore } from '../../services/portfolio.store';
import { OptionsResponse, IntakeDraft, DraftFieldProvenance, ProjectFieldDef } from '../../models/api.models';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

@Component({
  selector: 'app-quick-add-page',
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
    IonTextarea,
    IonButton,
    IonIcon,
    IonToggle,
    IonBadge,
    IonProgressBar,
    IonSelect,
    IonSelectOption,
    IonNote,
    LoadingSkeletonComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding quick-add-content">
      <div class="page-header">
        <h2 class="page-title">Quick Add with AI Prefill</h2>
        <p class="page-subtitle">
          Describe your project in plain English, optionally attach files, and let AI extract structured PMO fields.
        </p>
      </div>

      @if (isLoadingOptions()) {
        <app-loading-skeleton [cards]="2" [rows]="4"></app-loading-skeleton>
      } @else if (optionsError()) {
        <app-empty-state
          title="Options Unavailable"
          [message]="optionsError()!"
          [isError]="true"
          icon="alert-circle-outline"
        >
          <ion-button fill="outline" (click)="loadOptions()">Retry</ion-button>
        </app-empty-state>
      } @else {
        <!-- STEP 1: DESCRIBE -->
        @if (currentStep() === 1) {
          <ion-card class="step-card">
            <ion-card-header>
              <div class="step-indicator">Step 1 of 2</div>
              <ion-card-title>Describe Project</ion-card-title>
            </ion-card-header>

            <ion-card-content>
              <div class="sample-templates-bar">
                <span class="templates-label">Sample Prompts:</span>
                <button type="button" class="template-chip" (click)="applySamplePrompt('iot')">
                  <ion-icon name="hardware-chip-outline"></ion-icon>
                  <span>Fab Sensor IoT Pipeline</span>
                </button>
                <button type="button" class="template-chip" (click)="applySamplePrompt('identity')">
                  <ion-icon name="shield-checkmark-outline"></ion-icon>
                  <span>Zero Trust IAM Modernization</span>
                </button>
                <button type="button" class="template-chip" (click)="applySamplePrompt('yield')">
                  <ion-icon name="analytics-outline"></ion-icon>
                  <span>Autonomous Wafer Yield AI</span>
                </button>
              </div>

              <div class="form-group">
                <ion-item lines="none" class="input-item">
                  <ion-label position="stacked">
                    Project Name <span class="required">*</span>
                  </ion-label>
                  <ion-input
                    [(ngModel)]="projectName"
                    [maxlength]="limits.maxProjectNameChars"
                    aria-label="Project Name"
                  ></ion-input>
                </ion-item>
                <div class="char-counter">
                  {{ projectName.length }}/{{ limits.maxProjectNameChars }}
                </div>
              </div>

              <div class="form-group">
                <ion-item lines="none" class="input-item">
                  <ion-label position="stacked">
                    Plain-English Description <span class="required">*</span>
                  </ion-label>
                  <ion-textarea
                    [(ngModel)]="description"
                    rows="6"
                    [maxlength]="limits.maxDescriptionChars"
                    aria-label="Project Description"
                  ></ion-textarea>
                </ion-item>
                <div class="char-counter" [class.text-danger]="description.length > 0 && description.length < limits.minDescriptionChars">
                  {{ description.length }}/{{ limits.maxDescriptionChars }} (min: {{ limits.minDescriptionChars }})
                </div>
              </div>

              <!-- Drag & Drop Supporting Files -->
              <div class="form-group">
                <ion-label class="section-label">Optional Supporting Documents</ion-label>
                <div
                  class="drop-zone"
                  [class.drag-over]="isDragOver()"
                  (dragover)="onDragOver($event)"
                  (dragleave)="isDragOver.set(false)"
                  (drop)="onFileDrop($event)"
                >
                  <ion-icon name="cloud-upload-outline" class="drop-icon"></ion-icon>
                  <div class="drop-text">Drag & drop documents here, or click to browse</div>
                  <div class="drop-subtext">
                    Accepted: {{ acceptedExtensionsText }} &bull; Max {{ limits.maxDocuments }} files, up to {{ maxMbText }}MB each
                  </div>
                  <input
                    type="file"
                    #fileInput
                    multiple
                    [accept]="limits.acceptedDocumentExtensions.join(',')"
                    (change)="onFileInputChange($event)"
                    style="display: none;"
                  />
                  <ion-button size="small" fill="outline" (click)="fileInput.click()">
                    Browse files
                  </ion-button>
                </div>

                @if (selectedFiles().length > 0) {
                  <div class="file-list">
                    @for (file of selectedFiles(); track file.name) {
                      <div class="file-chip">
                        <ion-icon name="document-attach-outline"></ion-icon>
                        <span class="file-name">{{ file.name }}</span>
                        <span class="file-size">({{ (file.size / 1024).toFixed(1) }} KB)</span>
                        <button type="button" class="remove-btn" (click)="removeFile(file)">&times;</button>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Prefill progress indicator -->
              @if (isPrefilling()) {
                <div class="progress-box">
                  <ion-label>{{ prefillStatusMessage() }}</ion-label>
                  <ion-progress-bar type="indeterminate" color="primary"></ion-progress-bar>
                </div>
              }

              @if (step1Error()) {
                <ion-note color="danger" class="error-banner">{{ step1Error() }}</ion-note>
              }

              <div class="actions-row">
                <ion-button
                  color="primary"
                  [disabled]="!isStep1Valid || isPrefilling()"
                  (click)="startAiPrefill()"
                >
                  <ion-icon name="sparkles-outline" slot="start"></ion-icon>
                  Prefill with AI
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- STEP 2: REVIEW AI PREFILL -->
        @if (currentStep() === 2) {
          <ion-card class="step-card">
            <ion-card-header>
              <div class="step-indicator">Step 2 of 2</div>
              <ion-card-title>Review & Adjust Extracted Fields</ion-card-title>
              <p class="card-desc">
                Review machine-extracted values, evidence quotes, and rationales. You can edit any field before submitting.
              </p>
            </ion-card-header>

            <ion-card-content>
              @if (missingRequiredFields.length > 0) {
                <div class="missing-warning-banner">
                  <ion-icon name="alert-circle-outline"></ion-icon>
                  <span>
                    <strong>Missing Required Fields:</strong>
                    {{ missingRequiredLabels.join(', ') }}
                  </span>
                </div>
              }

              <div class="fields-table-wrap">
                <table class="fields-review-table">
                  <thead>
                    <tr>
                      <th style="width: 22%;">Field</th>
                      <th style="width: 38%;">Value / Input</th>
                      <th style="width: 15%;">Confidence</th>
                      <th style="width: 25%;">Evidence & Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of fieldRows(); track row.def.key) {
                      <tr [class.missing-row]="isFieldMissing(row.def.key)">
                        <td class="field-label-cell">
                          <strong>{{ row.def.label }}</strong>
                          @if (row.def.required) {
                            <span class="required">*</span>
                          }
                          @if (row.provenance?.source === 'human') {
                            <div class="human-edited-tag">Edited by you</div>
                          }
                        </td>

                        <td class="field-input-cell">
                          <!-- Select dropdown -->
                          @if (row.def.type === 'select') {
                            <select
                              class="custom-select"
                              [ngModel]="getFieldValue(row.def.key)"
                              (ngModelChange)="onFieldValueChange(row.def.key, $event)"
                            >
                              <option [ngValue]="null">-- Select {{ row.def.label }} --</option>
                              @for (opt of getOptionsForField(row.def); track opt.value) {
                                <option [value]="opt.value">{{ opt.label }}</option>
                              }
                            </select>
                          }
                          <!-- Boolean toggle -->
                          @else if (row.def.type === 'boolean') {
                            <ion-toggle
                              [checked]="getFieldValue(row.def.key) === true"
                              (ionChange)="onFieldValueChange(row.def.key, $event.detail.checked)"
                            >
                              {{ row.def.label }}
                            </ion-toggle>
                          }
                          <!-- Number / Integer -->
                          @else if (row.def.type === 'number' || row.def.type === 'integer') {
                            <input
                              type="number"
                              class="custom-input"
                              [min]="row.def.min ?? null"
                              [max]="row.def.max ?? null"
                              [value]="getFieldValue(row.def.key)"
                              (change)="onNumberChange(row.def.key, $event)"
                            />
                          }
                          <!-- Date -->
                          @else if (row.def.type === 'date') {
                            <input
                              type="date"
                              class="custom-input"
                              [value]="getFieldValue(row.def.key)"
                              (change)="onFieldValueChange(row.def.key, $any($event.target).value)"
                            />
                          }
                          <!-- Default text input -->
                          @else {
                            <input
                              type="text"
                              class="custom-input"
                              [value]="getFieldValue(row.def.key) ?? ''"
                              (change)="onFieldValueChange(row.def.key, $any($event.target).value)"
                            />
                          }

                          @if (row.provenance?.source === 'human' && row.provenance.aiValue !== undefined) {
                            <button
                              type="button"
                              class="reset-ai-btn"
                              (click)="resetToAiValue(row.def.key)"
                            >
                              Reset to AI value
                            </button>
                          }
                        </td>

                        <td class="field-badge-cell">
                          @if (row.provenance; as prov) {
                            <span
                              class="conf-badge"
                              [style.background-color]="getConfidenceBadgeColor(prov.confidenceLevel)"
                              [title]="(prov.evidenceQuote ? 'Quote: ' + prov.evidenceQuote + '\n' : '') + (prov.rationale ?? '')"
                            >
                              {{ prov.confidenceLevel }}
                            </span>
                          }
                        </td>

                        <td class="field-evidence-cell">
                          @if (row.provenance; as prov) {
                            @if (prov.evidenceQuote) {
                              <div class="evidence-quote">“{{ prov.evidenceQuote }}”</div>
                            }
                            @if (prov.rationale) {
                              <div class="evidence-rationale">{{ prov.rationale }}</div>
                            }
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Options: Run Priority Pipeline & Submit -->
              <div class="submit-controls-box">
                <ion-item lines="none" class="run-pipeline-toggle">
                  <ion-toggle [(ngModel)]="runPipeline">
                    <strong>Run priority pipeline</strong> (re-score portfolio via Fabric ML)
                  </ion-toggle>
                </ion-item>

                @if (isSubmitting()) {
                  <div class="progress-box">
                    <ion-label>{{ submitStatusMessage() }}</ion-label>
                    <ion-progress-bar type="indeterminate" color="primary"></ion-progress-bar>
                  </div>
                }

                @if (submitWarning()) {
                  <div class="warning-callout">
                    <ion-icon name="warning-outline"></ion-icon>
                    <span>{{ submitWarning() }}</span>
                  </div>
                }

                <div class="actions-row">
                  <ion-button fill="outline" color="medium" (click)="currentStep.set(1)" [disabled]="isSubmitting()">
                    Back to Description
                  </ion-button>
                  <ion-button color="success" (click)="submitDraft()" [disabled]="isSubmitting()">
                    <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
                    Save & Submit Project
                  </ion-button>
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
      .quick-add-content {
        --background: var(--pmo-bg, #f4f6f8);
      }
      .page-header {
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
      .step-card {
        margin: 8px 0;
        border-radius: 8px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        border: 1px solid var(--pmo-border, #e0e0e0);
        background: var(--pmo-surface, #ffffff);
      }
      .step-indicator {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--pmo-primary, #0078d4);
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .card-desc {
        font-size: 0.82rem;
        color: var(--pmo-muted, #666666);
        margin: 4px 0 0 0;
      }
      .sample-templates-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 16px;
        padding: 10px 14px;
        background: #f4f8fc;
        border-radius: 8px;
        border: 1px solid #d0e2f2;
      }
      .templates-label {
        font-size: 0.78rem;
        font-weight: 700;
        color: #004578;
      }
      .template-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        border-radius: 16px;
        background: #ffffff;
        border: 1px solid #0078d4;
        color: #0078d4;
        font-size: 0.76rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .template-chip:hover {
        background: #0078d4;
        color: #ffffff;
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 120, 212, 0.25);
      }
      .form-group {
        margin-bottom: 14px;
      }
      .input-item {
        --background: #ffffff;
        --padding-start: 0;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 6px;
        padding: 4px 10px;
      }
      .required {
        color: var(--pmo-mustdo, #d13438);
        font-weight: 700;
      }
      .char-counter {
        text-align: right;
        font-size: 0.72rem;
        color: #777777;
        margin-top: 2px;
      }
      .text-danger {
        color: var(--pmo-mustdo, #d13438) !important;
      }
      .section-label {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--pmo-text, #1a1a1a);
        margin-bottom: 6px;
        display: block;
      }
      .drop-zone {
        border: 2px dashed #b8c8d8;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        background: #f9fbfd;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      .drop-zone.drag-over {
        border-color: var(--pmo-primary, #0078d4);
        background: #eaf3fb;
      }
      .drop-icon {
        font-size: 36px;
        color: var(--pmo-primary, #0078d4);
      }
      .drop-text {
        font-size: 0.9rem;
        font-weight: 600;
        color: #333333;
      }
      .drop-subtext {
        font-size: 0.75rem;
        color: #777777;
      }
      .file-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .file-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #e8f1f8;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.78rem;
        color: #004578;
      }
      .remove-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        font-weight: bold;
        color: #d13438;
      }
      .progress-box {
        margin: 12px 0;
        padding: 10px;
        background: #f0f7fd;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .error-banner {
        display: block;
        margin: 8px 0;
        font-weight: 600;
      }
      .actions-row {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 14px;
      }
      .missing-warning-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #fed9cc;
        color: #a80000;
        border-radius: 6px;
        margin-bottom: 12px;
        font-size: 0.82rem;
      }
      .fields-table-wrap {
        overflow-x: auto;
      }
      .fields-review-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.82rem;
      }
      .fields-review-table th {
        background: #f8f9fb;
        padding: 8px 10px;
        text-align: left;
        border-bottom: 2px solid var(--pmo-border, #e0e0e0);
        color: #555555;
      }
      .fields-review-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: top;
      }
      .missing-row {
        background: #fffcf0;
      }
      .human-edited-tag {
        font-size: 0.68rem;
        color: var(--pmo-primary, #0078d4);
        font-weight: 600;
        margin-top: 2px;
      }
      .custom-input,
      .custom-select {
        width: 100%;
        padding: 6px 8px;
        border: 1px solid var(--pmo-border, #e0e0e0);
        border-radius: 4px;
        font-size: 0.82rem;
      }
      .reset-ai-btn {
        margin-top: 4px;
        font-size: 0.7rem;
        background: transparent;
        color: var(--pmo-primary, #0078d4);
        border: none;
        cursor: pointer;
        text-decoration: underline;
        padding: 0;
      }
      .conf-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        color: #ffffff;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: help;
      }
      .evidence-quote {
        font-style: italic;
        color: #444444;
        font-size: 0.75rem;
        line-height: 1.25;
      }
      .evidence-rationale {
        color: #666666;
        font-size: 0.72rem;
        margin-top: 2px;
      }
      .submit-controls-box {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--pmo-border, #e0e0e0);
      }
      .run-pipeline-toggle {
        --background: transparent;
        --padding-start: 0;
        margin-bottom: 8px;
      }
      .warning-callout {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #fff4ce;
        color: #795e00;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.82rem;
        margin: 8px 0;
      }
    `,
  ],
})
export class QuickAddPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(DataApiService);
  private readonly configService = inject(ConfigService);
  private readonly store = inject(PortfolioStore);
  private readonly router = inject(Router);

  readonly currentStep = signal<1 | 2>(1);
  readonly isLoadingOptions = signal<boolean>(true);
  readonly optionsError = signal<string | null>(null);
  readonly options = signal<OptionsResponse | null>(null);

  // Step 1 state
  projectName = '';
  description = '';
  readonly selectedFiles = signal<File[]>([]);
  readonly isDragOver = signal<boolean>(false);
  readonly isPrefilling = signal<boolean>(false);
  readonly prefillStatusMessage = signal<string>('Creating draft...');
  readonly step1Error = signal<string | null>(null);

  // Step 2 state
  draftId: string | null = null;
  readonly draft = signal<IntakeDraft | null>(null);
  readonly draftFieldValues = signal<Record<string, unknown>>({});
  runPipeline = true;
  readonly isSubmitting = signal<boolean>(false);
  readonly submitStatusMessage = signal<string>('Submitting project...');
  readonly submitWarning = signal<string | null>(null);

  private pollIntervalHandle?: ReturnType<typeof setInterval>;

  applySamplePrompt(type: 'iot' | 'identity' | 'yield'): void {
    if (type === 'iot') {
      this.projectName = 'NextGen Fab Telemetry & Real-Time Sensor Ingestion';
      this.description =
        'Deploy real-time streaming telemetry across 45 semiconductor etch and deposition chambers in Fremont and Singapore. Connects via IoT Edge gateways to OneLake Lakehouse, providing millisecond-level pressure, temperature, and RF power monitoring for automated equipment safety and yield optimization. Estimated budget $1.85M, requires Application Development and Cloud Infrastructure FTEs with Q3 2027 target go-live.';
    } else if (type === 'identity') {
      this.projectName = 'Enterprise Zero Trust PAM & Cloud Identity Modernization';
      this.description =
        'Implement privileged access management (PAM) and microsegmentation for all fab engineering and corporate workstations to comply with SEC cybersecurity disclosure rules and ISO 27001 requirements. Protects access to cleanroom tooling and SCADA networks with executive sponsorship. Capital budget $1.2M, 50 person weeks effort, Low risk.';
    } else {
      this.projectName = 'Autonomous Wafer Defect Detection & Computer Vision Co-Pilot';
      this.description =
        'Develop an AI-driven deep learning inspection pipeline using high-resolution wafer SEM imagery to detect micro-cracks and particle contamination in real time. Deploys custom edge inference models on GPU nodes connected to Fabric MLflow registry. High business value (5/5), estimated $2.4M cost, DT Initiative strategic tag.';
    }
  }

  ngOnInit(): void {
    this.loadOptions();
  }

  ngOnDestroy(): void {
    if (this.pollIntervalHandle) {
      clearInterval(this.pollIntervalHandle);
    }
  }

  loadOptions(): void {
    this.isLoadingOptions.set(true);
    this.optionsError.set(null);
    this.api.getOptions().subscribe({
      next: (opts) => {
        this.options.set(opts);
        this.isLoadingOptions.set(false);
      },
      error: (err) => {
        this.optionsError.set(err?.message ?? 'Failed to load options schema');
        this.isLoadingOptions.set(false);
      },
    });
  }

  get limits() {
    return (
      this.options()?.quickAdd?.limits ?? {
        maxProjectNameChars: 120,
        minDescriptionChars: 40,
        maxDescriptionChars: 4000,
        maxDocuments: 5,
        maxDocumentBytes: 10485760,
        acceptedDocumentExtensions: ['.pdf', '.docx', '.xlsx', '.csv', '.txt', '.md'],
      }
    );
  }

  get acceptedExtensionsText(): string {
    return this.limits.acceptedDocumentExtensions.join(', ');
  }

  get maxMbText(): number {
    return Math.round(this.limits.maxDocumentBytes / (1024 * 1024));
  }

  get isStep1Valid(): boolean {
    const pLen = this.projectName.trim().length;
    const dLen = this.description.trim().length;
    return (
      pLen >= 3 &&
      pLen <= this.limits.maxProjectNameChars &&
      dLen >= this.limits.minDescriptionChars &&
      dLen <= this.limits.maxDescriptionChars
    );
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (!event.dataTransfer?.files) return;
    this.addFiles(Array.from(event.dataTransfer.files));
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
  }

  private addFiles(files: File[]): void {
    const current = [...this.selectedFiles()];
    const acceptedExts = this.limits.acceptedDocumentExtensions;

    for (const f of files) {
      if (current.length >= this.limits.maxDocuments) break;
      const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
      if (!acceptedExts.includes(ext)) continue;
      if (f.size > this.limits.maxDocumentBytes) continue;
      current.push(f);
    }
    this.selectedFiles.set(current);
  }

  removeFile(file: File): void {
    this.selectedFiles.update((list) => list.filter((f) => f !== file));
  }

  // Step 1 -> AI Prefill
  async startAiPrefill(): Promise<void> {
    this.step1Error.set(null);
    this.isPrefilling.set(true);
    this.prefillStatusMessage.set('Creating intake draft in OneLake...');

    try {
      // 1. Create draft
      const draft = await this.api.createIntakeDraft(this.projectName.trim(), this.description.trim()).toPromise();
      if (!draft) throw new Error('Failed to create draft');
      this.draftId = draft.draftId;

      // 2. Upload supporting documents
      const files = this.selectedFiles();
      for (let i = 0; i < files.length; i++) {
        this.prefillStatusMessage.set(`Uploading document ${i + 1} of ${files.length}...`);
        await this.api.uploadIntakeDocument(this.draftId, files[i]).toPromise();
      }

      // 3. Trigger AI Prefill
      this.prefillStatusMessage.set('Extracting PMO fields with Azure OpenAI...');
      const prefilledDraft = await this.api.prefillIntakeDraft(this.draftId).toPromise();
      if (!prefilledDraft) throw new Error('AI Prefill failed');

      this.draft.set(prefilledDraft);
      this.initDraftValues(prefilledDraft);
      this.currentStep.set(2);
    } catch (err: unknown) {
      const e = err as { message?: string };
      this.step1Error.set(e?.message ?? 'Failed to execute AI prefill');
    } finally {
      this.isPrefilling.set(false);
    }
  }

  private initDraftValues(d: IntakeDraft): void {
    const vals: Record<string, unknown> = {};
    if (d.fields) {
      for (const f of d.fields) {
        vals[f.key] = f.value;
      }
    }
    this.draftFieldValues.set(vals);
  }

  // Step 2 Review helpers
  get fieldRows(): () => Array<{ def: ProjectFieldDef; provenance?: DraftFieldProvenance }> {
    return () => {
      const opts = this.options();
      if (!opts) return [];
      const d = this.draft();
      const provMap = new Map<string, DraftFieldProvenance>();
      if (d?.fields) {
        for (const p of d.fields) provMap.set(p.key, p);
      }

      return opts.projectFields.map((def) => ({
        def,
        provenance: provMap.get(def.key),
      }));
    };
  }

  get missingRequiredFields(): string[] {
    const d = this.draft();
    return d?.missingRequired ?? [];
  }

  get missingRequiredLabels(): string[] {
    const opts = this.options();
    if (!opts) return this.missingRequiredFields;
    return this.missingRequiredFields.map((key) => {
      const found = opts.projectFields.find((f) => f.key === key);
      return found?.label ?? key;
    });
  }

  isFieldMissing(key: string): boolean {
    return this.missingRequiredFields.includes(key);
  }

  getFieldValue(key: string): unknown {
    return this.draftFieldValues()[key];
  }

  onFieldValueChange(key: string, val: unknown): void {
    this.draftFieldValues.update((curr) => ({ ...curr, [key]: val }));
    if (!this.draftId) return;

    // PATCH to API
    this.api.patchIntakeDraftFields(this.draftId, { [key]: val }).subscribe({
      next: (res) => {
        // Update local provenance
        this.draft.update((curr) => {
          if (!curr) return null;
          return {
            ...curr,
            fields: res.fields,
            missingRequired: curr.missingRequired.filter((k) => k !== key),
          };
        });
      },
    });
  }

  onNumberChange(key: string, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const num = val === '' ? null : Number(val);
    this.onFieldValueChange(key, num);
  }

  resetToAiValue(key: string): void {
    const d = this.draft();
    const prov = d?.fields.find((f) => f.key === key);
    if (prov && prov.aiValue !== undefined) {
      this.onFieldValueChange(key, prov.aiValue);
    }
  }

  getConfidenceBadgeColor(level: string): string {
    const colors = this.configService.config.confidence.colors;
    switch (level) {
      case 'High':
        return colors.high;
      case 'Medium':
        return colors.medium;
      case 'Low':
        return colors.low;
      case 'Human':
        return colors.human;
      default:
        return colors.none;
    }
  }

  getOptionsForField(field: ProjectFieldDef): Array<{ value: unknown; label: string }> {
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

  // Step 2 Submission & Pipeline Polling
  async submitDraft(): Promise<void> {
    if (!this.draftId) return;
    this.isSubmitting.set(true);
    this.submitStatusMessage.set('Writing project entry to OneLake...');
    this.submitWarning.set(null);

    try {
      const res = await this.api.submitIntakeDraft(this.draftId, this.runPipeline).toPromise();
      if (!res) throw new Error('Submission failed');

      if (res.warnings && res.warnings.length > 0) {
        this.submitWarning.set(res.warnings.join('; '));
      }

      if (this.runPipeline && res.pipelineRunId) {
        this.pollPipeline(res.pipelineRunId, res.projectId);
      } else {
        // No pipeline run or pipelineRunId is null
        this.isSubmitting.set(false);
        this.store.init(); // Reload portfolio
        if (res.pipelineRunId === null) {
          if (res.warnings && res.warnings.length > 0) {
            this.submitWarning.set(res.warnings.join('; '));
          } else {
            this.submitWarning.set('Project created in OneLake, but priority pipeline run was skipped or not triggered.');
          }
        } else {
          this.router.navigate(['/projects', res.projectId]);
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      this.submitWarning.set(e?.message ?? 'Failed to submit project');
      this.isSubmitting.set(false);
    }
  }

  private pollPipeline(runId: string, projectId: string): void {
    const pollInterval = this.configService.config.api.pipelinePollIntervalMs;
    this.submitStatusMessage.set('Calculating priority via Fabric pipeline...');

    this.pollIntervalHandle = setInterval(() => {
      this.api.getPipelineRunStatus(runId).subscribe({
        next: (status) => {
          if (status.status === 'Completed') {
            clearInterval(this.pollIntervalHandle);
            this.isSubmitting.set(false);
            this.store.init(); // Refresh data
            this.router.navigate(['/projects', projectId]);
          } else if (status.status === 'Failed' || status.status === 'Cancelled') {
            clearInterval(this.pollIntervalHandle);
            this.isSubmitting.set(false);
            this.submitWarning.set(`Pipeline execution ${status.status}: ${status.failureReason ?? 'Unknown error'}`);
          }
        },
        error: () => {
          // Keep polling or stop on repeated error
        },
      });
    }, pollInterval);
  }
}
