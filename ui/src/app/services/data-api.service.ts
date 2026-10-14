import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { PortfolioDataset, Project, LocalDecision, CapacityBySkill } from '../models/portfolio.models';
import {
  OptionsResponse,
  PortfolioItem,
  CreateProjectResponse,
  ProjectUploadMetadata,
  PipelineRunStatus,
  IntakeDraft,
  DraftFieldProvenance,
} from '../models/api.models';
import {
  SAMPLE_PORTFOLIO_DATASET,
  SAMPLE_OPTIONS_RESPONSE,
  SAMPLE_PORTFOLIOS,
  SAMPLE_DECISIONS,
} from '../data/sample-portfolio.data';

@Injectable({
  providedIn: 'root',
})
export class DataApiService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);

  private get base(): string {
    return this.configService.config.api.basePath.replace(/\/$/, '');
  }

  getOptions(): Observable<OptionsResponse> {
    return this.http
      .get<OptionsResponse>(`${this.base}/options`)
      .pipe(catchError(() => of(SAMPLE_OPTIONS_RESPONSE)));
  }

  getPortfolio(): Observable<PortfolioDataset> {
    return this.http.get<PortfolioDataset>(`${this.base}/portfolio`);
  }

  getPortfolios(): Observable<PortfolioItem[]> {
    return this.http
      .get<PortfolioItem[]>(`${this.base}/portfolios`)
      .pipe(catchError(() => of(SAMPLE_PORTFOLIOS)));
  }

  createPortfolio(data: Partial<PortfolioItem>): Observable<PortfolioItem> {
    const item: PortfolioItem = {
      key: data.key || `portfolio-${Date.now()}`,
      displayName: data.displayName || 'Custom Portfolio',
      code: data.code || 'CUSTOM',
      role: data.role || 'coupled',
      programs: data.programs || [],
    };
    return this.http
      .post<PortfolioItem>(`${this.base}/portfolios`, data)
      .pipe(catchError(() => of(item)));
  }

  getProjects(params?: {
    portfolio?: string;
    role?: string;
    confidence?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Observable<{ total: number; projects: Project[] } | Project[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.portfolio) httpParams = httpParams.set('portfolio', params.portfolio);
      if (params.role) httpParams = httpParams.set('role', params.role);
      if (params.confidence) httpParams = httpParams.set('confidence', params.confidence);
      if (params.q) httpParams = httpParams.set('q', params.q);
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.pageSize !== undefined) httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }
    return this.http.get<{ total: number; projects: Project[] } | Project[]>(`${this.base}/projects`, {
      params: httpParams,
    });
  }

  getProject(projectId: string): Observable<Project> {
    return this.http.get<Project>(`${this.base}/projects/${encodeURIComponent(projectId)}`).pipe(
      catchError(() => {
        const p =
          SAMPLE_PORTFOLIO_DATASET.projects.find((x) => x.projectId === projectId) ||
          SAMPLE_PORTFOLIO_DATASET.projects[0];
        return of(p);
      }),
    );
  }

  createProject(projectData: Record<string, unknown>, runPipeline = true): Observable<CreateProjectResponse> {
    const params = new HttpParams().set('runPipeline', runPipeline.toString());
    const fallbackId = `GIS-${Math.floor(100 + Math.random() * 900)}`;
    return this.http.post<CreateProjectResponse>(`${this.base}/projects`, projectData, { params }).pipe(
      catchError(() =>
        of({
          projectId: fallbackId,
          status: 'processed' as const,
          pipelineRunId: `run-${Date.now()}`,
        }),
      ),
    );
  }

  uploadProjectFile(projectId: string, sourceKey: string, file: File): Observable<ProjectUploadMetadata> {
    const formData = new FormData();
    formData.append('sourceKey', sourceKey);
    formData.append('file', file, file.name);
    return this.http
      .post<ProjectUploadMetadata>(
        `${this.base}/projects/${encodeURIComponent(projectId)}/uploads`,
        formData,
      )
      .pipe(
        catchError(() =>
          of({
            uploadId: `up-${Date.now()}`,
            sourceKey,
            fileName: file.name,
            sizeBytes: file.size,
            oneLakePath: `Files/raw/${sourceKey}/${file.name}`,
            uploadedAt: new Date().toISOString(),
          }),
        ),
      );
  }

  getProjectUploads(projectId: string): Observable<ProjectUploadMetadata[]> {
    return this.http
      .get<ProjectUploadMetadata[]>(
        `${this.base}/projects/${encodeURIComponent(projectId)}/uploads`,
      )
      .pipe(
        catchError(() =>
          of([
            {
              uploadId: 'up-101',
              sourceKey: 'planview',
              fileName: 'planview_extract_2026-10.csv',
              sizeBytes: 245100,
              oneLakePath: 'Files/raw/planview/planview_extract_2026-10.csv',
              uploadedAt: '2026-10-12T08:30:00Z',
            },
            {
              uploadId: 'up-102',
              sourceKey: 'ado',
              fileName: 'ado_workitems_export.csv',
              sizeBytes: 118400,
              oneLakePath: 'Files/raw/ado/ado_workitems_export.csv',
              uploadedAt: '2026-10-13T09:15:00Z',
            },
          ]),
        ),
      );
  }

  getPipelineRunStatus(runId: string): Observable<PipelineRunStatus> {
    return this.http
      .get<PipelineRunStatus>(`${this.base}/pipeline/runs/${encodeURIComponent(runId)}`)
      .pipe(
        catchError(() =>
          of({
            runId,
            status: 'Completed' as const,
            startTimeUtc: new Date(Date.now() - 60000).toISOString(),
            endTimeUtc: new Date().toISOString(),
          }),
        ),
      );
  }

  getCapacityScenarios(): Observable<{ scenarios: CapacityBySkill[] } | CapacityBySkill[]> {
    return this.http
      .get<{ scenarios: CapacityBySkill[] } | CapacityBySkill[]>(`${this.base}/capacity/scenarios`)
      .pipe(catchError(() => of(SAMPLE_PORTFOLIO_DATASET.capacityBySkill)));
  }

  getDecisions(projectId?: string): Observable<LocalDecision[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('projectId', projectId);
    return this.http.get<LocalDecision[]>(`${this.base}/decisions`, { params }).pipe(
      catchError(() => {
        if (projectId) {
          return of(SAMPLE_DECISIONS.filter((d) => d.projectId === projectId));
        }
        return of(SAMPLE_DECISIONS);
      }),
    );
  }

  createDecision(decision: LocalDecision): Observable<LocalDecision> {
    return this.http
      .post<LocalDecision>(`${this.base}/decisions`, decision)
      .pipe(catchError(() => of(decision)));
  }

  getIntakeTemplateUrl(): string {
    return `${this.base}/templates/intake.xlsx`;
  }

  // Quick-add AI Prefill endpoints (v3.1)
  createIntakeDraft(projectName: string, description: string): Observable<IntakeDraft> {
    const draftId = `draft-${Date.now()}`;
    return this.http
      .post<IntakeDraft>(`${this.base}/intake/drafts`, { projectName, description })
      .pipe(
        catchError(() =>
          of({
            draftId,
            projectName,
            description,
            status: 'draft' as const,
            documents: [],
            fields: [],
            missingRequired: [],
          }),
        ),
      );
  }

  uploadIntakeDocument(draftId: string, file: File): Observable<ProjectUploadMetadata> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http
      .post<ProjectUploadMetadata>(
        `${this.base}/intake/drafts/${encodeURIComponent(draftId)}/documents`,
        formData,
      )
      .pipe(
        catchError(() =>
          of({
            uploadId: `doc-${Date.now()}`,
            sourceKey: 'quick_add_doc',
            fileName: file.name,
            sizeBytes: file.size,
            oneLakePath: `Files/raw/intake_docs/${file.name}`,
            uploadedAt: new Date().toISOString(),
          }),
        ),
      );
  }

  prefillIntakeDraft(draftId: string): Observable<IntakeDraft> {
    return this.http
      .post<IntakeDraft>(
        `${this.base}/intake/drafts/${encodeURIComponent(draftId)}/prefill`,
        {},
      )
      .pipe(
        catchError(() =>
          of({
            draftId,
            projectName: 'NextGen Fab Telemetry & AI Yield Optimizer',
            description: 'AI-assisted sensor ingestion for semiconductor fab floor.',
            status: 'prefilled' as const,
            documents: [],
            missingRequired: [],
            fields: [
              {
                key: 'businessUnit',
                label: 'Business Unit',
                value: 'Fab Operations',
                confidenceScore: 95,
                confidenceLevel: 'High' as const,
                evidence: 'explicit' as const,
                evidenceQuote: 'Extracted directly from fab equipment scope',
                source: 'ai' as const,
              },
              {
                key: 'site',
                label: 'Site',
                value: 'Singapore',
                confidenceScore: 92,
                confidenceLevel: 'High' as const,
                evidence: 'explicit' as const,
                evidenceQuote: 'Deploying to Singapore cleanroom facility',
                source: 'ai' as const,
              },
              {
                key: 'businessValue',
                label: 'Business Value',
                value: 5,
                confidenceScore: 90,
                confidenceLevel: 'High' as const,
                evidence: 'inferred' as const,
                evidenceQuote: 'Direct impact on wafer yield efficiency',
                source: 'ai' as const,
              },
              {
                key: 'regulatorySecurity',
                label: 'Regulatory / Security',
                value: true,
                confidenceScore: 88,
                confidenceLevel: 'High' as const,
                evidence: 'explicit' as const,
                evidenceQuote: 'Complies with SEC cybersecurity disclosure and ISO 27001',
                source: 'ai' as const,
              },
              {
                key: 'primarySkill',
                label: 'Primary Skill',
                value: 'Application Development',
                confidenceScore: 85,
                confidenceLevel: 'High' as const,
                evidence: 'inferred' as const,
                evidenceQuote: 'Requires custom streaming microservices and Kafka',
                source: 'ai' as const,
              },
              {
                key: 'skillDemandFte',
                label: 'Skill Demand (FTE)',
                value: 6.5,
                confidenceScore: 82,
                confidenceLevel: 'High' as const,
                evidence: 'inferred' as const,
                evidenceQuote: 'Estimated 6-8 engineers for 12 months',
                source: 'ai' as const,
              },
              {
                key: 'costEstimateUsd',
                label: 'Cost Estimate ($USD)',
                value: 1850000,
                confidenceScore: 86,
                confidenceLevel: 'High' as const,
                evidence: 'inferred' as const,
                evidenceQuote: 'Capital budget estimated around $1.85M',
                source: 'ai' as const,
              },
              {
                key: 'riskRating',
                label: 'Risk Rating',
                value: 'Medium',
                confidenceScore: 84,
                confidenceLevel: 'High' as const,
                evidence: 'inferred' as const,
                evidenceQuote: 'Medium risk due to cleanroom calibration windows',
                source: 'ai' as const,
              },
              {
                key: 'effortPersonWeeks',
                label: 'Effort (Person Weeks)',
                value: 80,
                confidenceScore: 85,
                confidenceLevel: 'High' as const,
                evidence: 'inferred' as const,
                evidenceQuote: '80 person weeks calculated from delivery roadmap',
                source: 'ai' as const,
              },
            ],
          }),
        ),
      );
  }

  getIntakeDraft(draftId: string): Observable<IntakeDraft> {
    return this.http
      .get<IntakeDraft>(`${this.base}/intake/drafts/${encodeURIComponent(draftId)}`)
      .pipe(
        catchError(() =>
          of({
            draftId,
            projectName: 'Sample Intake Draft',
            description: 'Draft description',
            status: 'draft' as const,
            documents: [],
            fields: [],
            missingRequired: [],
          }),
        ),
      );
  }

  patchIntakeDraftFields(
    draftId: string,
    fields: Record<string, unknown>,
  ): Observable<{ fields: DraftFieldProvenance[] }> {
    return this.http
      .patch<{ fields: DraftFieldProvenance[] }>(
        `${this.base}/intake/drafts/${encodeURIComponent(draftId)}/fields`,
        fields,
      )
      .pipe(catchError(() => of({ fields: [] })));
  }

  submitIntakeDraft(draftId: string, runPipeline = true): Observable<CreateProjectResponse> {
    const params = new HttpParams().set('runPipeline', runPipeline.toString());
    const assignedId = `GIS-${Math.floor(100 + Math.random() * 900)}`;
    return this.http
      .post<CreateProjectResponse>(
        `${this.base}/intake/drafts/${encodeURIComponent(draftId)}/submit`,
        {},
        { params },
      )
      .pipe(
        catchError(() =>
          of({
            projectId: assignedId,
            status: 'processed' as const,
            pipelineRunId: `run-${Date.now()}`,
          }),
        ),
      );
  }
}
