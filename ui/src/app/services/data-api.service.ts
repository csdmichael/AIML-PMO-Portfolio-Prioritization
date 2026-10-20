import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<PortfolioItem[]>(`${this.base}/portfolios`);
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
    return this.http.get<LocalDecision[]>(`${this.base}/decisions`, { params });
  }

  createDecision(decision: LocalDecision): Observable<LocalDecision> {
    return this.http.post<LocalDecision>(`${this.base}/decisions`, decision);
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

  async downloadExcelTemplate(filename = 'project_intake_template.xlsx'): Promise<void> {
    try {
      const blob = await this.http
        .get(`${this.base}/templates/intake.xlsx`, { responseType: 'blob' })
        .toPromise();
      if (blob) {
        this.triggerBlobDownload(blob, filename);
      }
    } catch (e) {
      console.error('Failed to download Excel template from API:', e);
    }
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
