import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';
import { ConfigService } from './config.service';
import {
  PortfolioDataset,
  Project,
  LocalDecision,
  CapacityBySkill,
  DecisionList,
  DecisionRequest,
  DecisionView,
} from '../models/portfolio.models';
import { RecommendationReport } from '../models/recommendation.models';
import { OneLakeDatasetList, OneLakeDatasetView } from '../models/onelake.models';
import {
  OptionsResponse,
  PortfolioItem,
  PortfolioList,
  ProjectImportResult,
  ProjectRemoved,
  CreateProjectResponse,
  ProjectUploadMetadata,
  PipelineRunStatus,
  IntakeDraft,
  DraftFieldProvenance,
} from '../models/api.models';

/** Maps the API's decision record to the shape the decision screens use. */
function toLocalDecision(view: DecisionView): LocalDecision {
  return {
    decisionId: view.decisionId,
    projectId: view.projectId,
    decision: view.decision,
    action: view.action ?? null,
    reason: view.reason,
    decidedBy: view.decidedBy ?? null,
    timestamp: view.recordedAtUtc,
  };
}

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
    return this.http.get<OptionsResponse>(`${this.base}/options`);
  }

  getPortfolio(): Observable<PortfolioDataset> {
    return this.http.get<PortfolioDataset>(`${this.base}/portfolio`);
  }

  getPortfolios(): Observable<PortfolioItem[]> {
    return this.http.get<PortfolioList>(`${this.base}/portfolios`).pipe(map((list) => list.items));
  }

  createPortfolio(data: Partial<PortfolioItem>): Observable<PortfolioItem> {
    return this.http.post<PortfolioItem>(`${this.base}/portfolios`, data);
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
    return this.http.get<Project>(`${this.base}/projects/${encodeURIComponent(projectId)}`);
  }

  createProject(projectData: Record<string, unknown>, runPipeline = true): Observable<CreateProjectResponse> {
    const params = new HttpParams().set('runPipeline', runPipeline.toString());
    return this.http.post<CreateProjectResponse>(`${this.base}/projects`, projectData, { params });
  }

  /** Changes a project's fields, or soft deletes or restores it (isDeleted). The API validates every field. */
  updateProject(projectId: string, changes: Record<string, unknown>): Observable<Project> {
    return this.http.patch<Project>(`${this.base}/projects/${encodeURIComponent(projectId)}`, changes);
  }

  /** Removes a project from every view. Its entry stays in OneLake for audit. */
  deleteProject(projectId: string): Observable<ProjectRemoved> {
    return this.http.delete<ProjectRemoved>(`${this.base}/projects/${encodeURIComponent(projectId)}`);
  }

  importProjects(file: File, runPipeline = true): Observable<ProjectImportResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const params = new HttpParams().set('runPipeline', runPipeline.toString());
    return this.http.post<ProjectImportResult>(`${this.base}/projects/import`, formData, { params });
  }

  uploadProjectFile(projectId: string, sourceKey: string, file: File): Observable<ProjectUploadMetadata> {
    const formData = new FormData();
    formData.append('sourceKey', sourceKey);
    formData.append('file', file, file.name);
    return this.http.post<ProjectUploadMetadata>(
      `${this.base}/projects/${encodeURIComponent(projectId)}/uploads`,
      formData,
    );
  }

  getProjectUploads(projectId: string): Observable<ProjectUploadMetadata[]> {
    return this.http.get<ProjectUploadMetadata[]>(
      `${this.base}/projects/${encodeURIComponent(projectId)}/uploads`,
    );
  }

  getPipelineRunStatus(runId: string): Observable<PipelineRunStatus> {
    return this.http.get<PipelineRunStatus>(`${this.base}/pipeline/runs/${encodeURIComponent(runId)}`);
  }

  getCapacityScenarios(): Observable<{ scenarios: CapacityBySkill[] } | CapacityBySkill[]> {
    return this.http.get<{ scenarios: CapacityBySkill[] } | CapacityBySkill[]>(`${this.base}/capacity/scenarios`);
  }

  getDecisions(projectId?: string): Observable<LocalDecision[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('projectId', projectId);
    return this.http
      .get<DecisionList>(`${this.base}/decisions`, { params })
      .pipe(map((list) => list.items.map(toLocalDecision)));
  }

  createDecision(decision: DecisionRequest): Observable<LocalDecision> {
    return this.http.post<DecisionView>(`${this.base}/decisions`, decision).pipe(map(toLocalDecision));
  }

  getIntakeTemplateUrl(): string {
    return `${this.base}/templates/intake.xlsx`;
  }

  createIntakeDraft(projectName: string, description: string): Observable<IntakeDraft> {
    return this.http.post<IntakeDraft>(`${this.base}/intake/drafts`, { projectName, description });
  }

  uploadIntakeDocument(draftId: string, file: File): Observable<ProjectUploadMetadata> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ProjectUploadMetadata>(
      `${this.base}/intake/drafts/${encodeURIComponent(draftId)}/documents`,
      formData,
    );
  }

  prefillIntakeDraft(draftId: string): Observable<IntakeDraft> {
    return this.http.post<IntakeDraft>(
      `${this.base}/intake/drafts/${encodeURIComponent(draftId)}/prefill`,
      {},
    );
  }

  getIntakeDraft(draftId: string): Observable<IntakeDraft> {
    return this.http.get<IntakeDraft>(`${this.base}/intake/drafts/${encodeURIComponent(draftId)}`);
  }

  patchIntakeDraftFields(
    draftId: string,
    fields: Record<string, unknown>,
  ): Observable<{ fields: DraftFieldProvenance[] }> {
    return this.http.patch<{ fields: DraftFieldProvenance[] }>(
      `${this.base}/intake/drafts/${encodeURIComponent(draftId)}/fields`,
      fields,
    );
  }

  applyIntakeSuggestion(draftId: string, fieldKey: string): Observable<IntakeDraft> {
    return this.http.post<IntakeDraft>(
      `${this.base}/intake/drafts/${encodeURIComponent(draftId)}/suggestions/${encodeURIComponent(fieldKey)}/apply`,
      {},
    );
  }

  dismissIntakeSuggestion(draftId: string, fieldKey: string): Observable<IntakeDraft> {
    return this.http.delete<IntakeDraft>(
      `${this.base}/intake/drafts/${encodeURIComponent(draftId)}/suggestions/${encodeURIComponent(fieldKey)}`,
    );
  }

  submitIntakeDraft(draftId: string, runPipeline = true): Observable<CreateProjectResponse> {
    const params = new HttpParams().set('runPipeline', runPipeline.toString());
    return this.http.post<CreateProjectResponse>(
      `${this.base}/intake/drafts/${encodeURIComponent(draftId)}/submit`,
      {},
      { params },
    );
  }

  getAdminSettings(): Observable<{ isDemoEnvironment: boolean; environmentName?: string }> {
    return this.http.get<{ isDemoEnvironment: boolean; environmentName?: string }>(`${this.base}/admin/settings`);
  }

  updateAdminSettings(settings: {
    isDemoEnvironment: boolean;
    environmentName?: string;
  }): Observable<{ isDemoEnvironment: boolean; environmentName?: string }> {
    return this.http.put<{ isDemoEnvironment: boolean; environmentName?: string }>(`${this.base}/admin/settings`, settings);
  }

  getPriorityWeights(): Observable<any> {
    return this.http.get<any>(`${this.base}/admin/priority-weights`);
  }

  updatePriorityWeights(data: {
    defaultWeights?: Record<string, number>;
    projectOverrides?: Record<string, Record<string, number>>;
  }): Observable<any> {
    return this.http.put<any>(`${this.base}/admin/priority-weights`, data);
  }

  getLookups(): Observable<any> {
    return this.http.get<any>(`${this.base}/admin/lookups`);
  }

  updateLookups(data: any): Observable<any> {
    return this.http.put<any>(`${this.base}/admin/lookups`, data);
  }

  getRecommendations(portfolioKey?: string): Observable<RecommendationReport> {
    let params = new HttpParams();
    if (portfolioKey) params = params.set('portfolioKey', portfolioKey);
    return this.http.get<RecommendationReport>(`${this.base}/recommendations`, { params });
  }

  queryResearcherAgent(query: string, portfolioKey?: string): Observable<RecommendationReport> {
    return this.http.post<RecommendationReport>(`${this.base}/recommendations/research`, { query, portfolioKey });
  }

  postDecision(decision: Record<string, unknown>): Observable<{ decisionId: string }> {
    return this.http.post<{ decisionId: string }>(`${this.base}/decisions`, decision);
  }

  listOneLakeDatasets(): Observable<OneLakeDatasetList> {
    return this.http.get<OneLakeDatasetList>(`${this.base}/onelake/datasets`);
  }

  getOneLakeDataset(key: string): Observable<OneLakeDatasetView> {
    return this.http.get<OneLakeDatasetView>(`${this.base}/onelake/datasets/${encodeURIComponent(key)}`);
  }

  /** The etag from the last read is sent as If-Match, so a change made since then is rejected rather than overwritten. */
  putOneLakeDataset(key: string, data: unknown, etag: string | null): Observable<OneLakeDatasetView> {
    const headers: Record<string, string> = etag ? { 'If-Match': `"${etag}"` } : {};
    return this.http.put<OneLakeDatasetView>(`${this.base}/onelake/datasets/${encodeURIComponent(key)}`, data, { headers });
  }

  async downloadProjectImportTemplate(): Promise<void> {
    try {
      const blob = await firstValueFrom(this.http.get(this.getProjectImportTemplateUrl(), { responseType: 'blob' }));
      this.triggerBlobDownload(blob, 'project_import_template.xlsx');
    } catch (e) {
      console.error('Failed to download the project import template from the API:', e);
    }
  }

  getProjectImportTemplateUrl(): string {
    return `${this.base}/templates/project-import.xlsx`;
  }

  private triggerBlobDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 200);
  }
}
