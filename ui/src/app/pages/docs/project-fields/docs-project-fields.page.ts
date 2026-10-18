import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IonContent } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '../../../services/config.service';
import { OptionsResponse, ProjectFieldDef } from '../../../models/api.models';
import { PortfolioDataset } from '../../../models/portfolio.models';

interface FieldGuide {
  description: string;
  example: string;
  signal?: string;
  policy?: string;
}

export const PROJECT_FIELD_GUIDE: Record<string, FieldGuide> = {
  projectName: { description: 'Human-readable project title for intake, search, and review; not an ML feature.', example: 'Secure Network Refresh' },
  portfolioKey: { description: 'Existing portfolio that owns the project; establishes governance and reporting context.', example: 'it-infosec' },
  programKey: { description: 'Existing program within the selected portfolio; must belong to that portfolio.', example: 'grc' },
  businessUnit: { description: 'Accountable business unit used for budget aggregation and portfolio reporting.', example: 'Corporate IT' },
  site: { description: 'Primary delivery location for reporting and coordination.', example: 'Fremont' },
  sponsorName: { description: 'Named accountable sponsor. The separate sponsor-level signal, not the person’s name, influences the model.', example: 'Alex Morgan' },
  sponsorEmail: { description: 'Sponsor contact information; not a predictive feature.', example: 'sponsor@example.com' },
  projectManager: { description: 'Delivery owner for project coordination and review; not an ML feature.', example: 'Jordan Lee' },
  projectStatus: { description: 'Current delivery lifecycle state for operational filtering and governance.', example: 'Planning' },
  goLiveDate: { description: 'Target delivery date. The pipeline derives timing urgency relative to its as-of date.', example: '2027-06-30', signal: 'timing_urgency', policy: 'Near-term go-live guard can restrict deprioritization.' },
  businessValue: { description: 'Business value rating from 1 (lowest) to 5 (highest), supported by the business case.', example: '5', signal: 'business_value', policy: 'High value combined with executive sponsorship can trigger a policy rule.' },
  userBase: { description: 'Estimated affected-user count, collected for intake context. Not one of the current ten trained model signals.', example: '1200' },
  estimatedAnnualBenefitUsd: { description: 'Expected annual benefit in USD for business-case review. Not a direct current model feature or a guaranteed realized benefit.', example: '1500000' },
  sponsorLevel: { description: 'Sponsor seniority mapped to the numeric sponsor-priority feature.', example: 'Executive', signal: 'sponsor_priority', policy: 'Executive sponsorship combined with high business value can constrain the tier.' },
  regulatorySecurity: { description: 'Whether the project addresses a regulatory or security obligation. Validate the obligation and timing with the owner.', example: 'true', signal: 'regulatory_security', policy: 'Regulatory/security policy gate; its effect is not a fixed additive percentage.' },
  dtAlignment: { description: 'Whether the project aligns with the digital-transformation strategy.', example: 'true', signal: 'dt_alignment' },
  protectedProgram: { description: 'Marks a governance-protected program. Protection is a policy constraint, not a learned model weight.', example: 'false', policy: 'Protected-program gate can preserve the priority tier.' },
  primarySkill: { description: 'Primary delivery skill, selected by its contract skill key. Used for capacity grouping; demand FTE is the predictive signal.', example: 'CLOUD' },
  skillDemandFte: { description: 'Required full-time-equivalent capacity for the primary skill; compare with available supply.', example: '4.5', signal: 'skill_demand' },
  costEstimateUsd: { description: 'Estimated project cost in USD. The model uses a transformed cost feature, not a fixed cost-to-score conversion.', example: '500000', signal: 'cost_log10' },
  dependencies: { description: 'Structured links to existing projects with relationship types; dependency count is a model signal. Recorded links do not prove a critical path.', example: '[{"projectId":"GIS-0001","relationshipType":"FinishToStart"}]', signal: 'dependencies' },
  riskRating: { description: 'Ordinal delivery-risk rating mapped to the model risk signal.', example: 'High', signal: 'risk' },
  effortPersonWeeks: { description: 'Estimated total delivery effort in person-weeks, distinct from concurrent FTE demand.', example: '40', signal: 'effort' },
  notes: { description: 'Supporting context for human review. Free text is not a numeric feature or an instruction to the model.', example: 'Validate the delivery date with the sponsor.' },
};

@Component({
  selector: 'app-docs-project-fields-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding">
      <main>
        <p class="breadcrumb">Documentation / Project Fields</p>
        <h1>Project fields: importance and intake requirements</h1>
        <p>Every input field comes from the active API intake contract. Mandatory/optional
          refers to direct project submission; quick-add drafts may be incomplete until reviewed.</p>
        <aside>
          <strong>Priority impact is not a fixed weight.</strong> LightGBM is nonlinear and
          policy rules can override its tier. Percentages below are each signal’s share of the
          absolute SHAP magnitude actually exported for the loaded projects, not a percentage
          change in priority score, a causal effect, or a training-time feature weight.
          Missing/truncated explanations cannot establish complete model importance.
        </aside>
        <p>Order: policy gates first, then model signals by measured attribution share;
          required context and optional context follow. Without attribution, model fields
          retain contract order—not a claimed importance ranking.</p>
        @if (loading()) { <p role="status">Loading the current field contract and attribution evidence…</p> }
        @if (schemaError()) {
          <p role="alert">{{ schemaError() }}</p>
          <button type="button" (click)="load()" [disabled]="loading()">Retry loading fields</button>
        }
        @if (impactError()) { <p role="status">{{ impactError() }} No example impact percentages were substituted.</p> }
        @if (dataset(); as data) {
          <p class="evidence">Attribution source: {{ data.source }} · Export: {{ data.generatedAtUtc }} ·
            {{ data.projects.length }} projects. Source records may be generated demo data.</p>
        }
        @if (contract()) {
          <label for="field-search">Find a field</label>
          <input id="field-search" type="search" placeholder="Name, description, or canonical key"
            [ngModel]="search()" (ngModelChange)="search.set($event)" />
          <p>{{ rows().length }} of {{ contract()!.projectFields.length }} intake fields.
            <code>projectId</code> is generated by the server (for example GIS-0101), not entered.</p>
          <div class="table-scroll" tabindex="0" role="region" aria-label="Project field reference table">
            <table>
              <caption>Project inputs ordered by policy and observed model importance</caption>
              <thead><tr>
                <th scope="col">Order</th><th scope="col">Field / key</th><th scope="col">Description</th>
                <th scope="col">Data type</th><th scope="col">Mandatory / optional</th>
                <th scope="col">Impact on priority (%)</th><th scope="col">Potential values / limits</th>
                <th scope="col">Example</th>
              </tr></thead>
              <tbody>
                @for (row of rows(); track row.field.key) {
                  <tr>
                    <td>{{ row.order }}</td>
                    <th scope="row">{{ row.field.label }}<code>{{ row.field.key }}</code></th>
                    <td>{{ row.guide.description }}
                      @if (row.guide.policy) { <p class="policy">{{ row.guide.policy }}</p> }
                    </td>
                    <td>{{ dataType(row.field) }}</td>
                    <td><span [class.required]="row.field.required">{{ row.field.required ? 'Mandatory' : 'Optional' }}</span></td>
                    <td>
                      @if (row.share !== null) {
                        <strong>{{ row.share | number:'1.2-2' }}%</strong> of exported |SHAP|
                        <small>{{ row.observations }} observed attributions</small>
                      } @else if (row.guide.signal) {
                        Not available — no measured attribution
                      } @else if (row.guide.policy) {
                        Policy override — no fixed %
                      } @else {
                        Not a direct current ML feature; no fixed %
                      }
                    </td>
                    <td>{{ potentialValues(row.field) }}</td>
                    <td><code>{{ row.guide.example }}</code></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <h2>Generated outputs are not intake requirements</h2>
          <p>ML tier, calibrated probabilities, SHAP drivers, priority score, confidence,
            final tier, cluster and recommended action are pipeline outputs. Do not provide
            them as project inputs. Confidence combines completeness (45%), quality (35%),
            and model certainty (20%); these are confidence weights, not priority-feature percentages.</p>
        }
      </main>
    </ion-content>
  `,
  styles: [`
    main { max-width: 1600px; margin: 0 auto; padding-bottom: 32px; }
    h1 { font-size: 1.8rem; } p, aside { line-height: 1.6; }
    .breadcrumb, .evidence { color: var(--pmo-muted, #605e5c); font-size: 0.85rem; }
    aside { padding: 16px; border-left: 4px solid #0078d4; background: #edf6ff; color: #123854; }
    input { display: block; width: min(100%, 480px); padding: 10px; margin: 8px 0; }
    .table-scroll { overflow-x: auto; border: 1px solid var(--pmo-border, #ddd); border-radius: 8px; }
    table { border-collapse: collapse; width: 100%; min-width: 1250px; font-size: 0.85rem; }
    caption { text-align: left; padding: 12px; font-weight: 600; }
    th, td { padding: 12px; border-bottom: 1px solid var(--pmo-border, #ddd); text-align: left; vertical-align: top; }
    thead { background: var(--pmo-bg, #f4f6f8); } th { min-width: 80px; }
    tbody th { min-width: 170px; } td:nth-child(3) { min-width: 240px; }
    td:nth-child(6), td:nth-child(7) { min-width: 180px; }
    code { display: block; overflow-wrap: anywhere; font-size: 0.8rem; font-weight: normal; }
    small { display: block; margin-top: 6px; } .policy { color: #805000; margin-bottom: 0; }
    .required { font-weight: 700; } [role=alert] { color: #a4262c; }
  `],
})
export class DocsProjectFieldsPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  readonly contract = signal<OptionsResponse | null>(null);
  readonly dataset = signal<PortfolioDataset | null>(null);
  readonly loading = signal(false);
  readonly schemaError = signal<string | null>(null);
  readonly impactError = signal<string | null>(null);
  readonly search = signal('');

  readonly impacts = computed(() => {
    const values = new Map<string, { magnitude: number; observations: number }>();
    for (const project of this.dataset()?.projects ?? []) {
      for (const driver of project.topDrivers ?? []) {
        if (!Number.isFinite(driver.shapValue)) continue;
        const item = values.get(driver.signalKey) ?? { magnitude: 0, observations: 0 };
        item.magnitude += Math.abs(driver.shapValue);
        item.observations++;
        values.set(driver.signalKey, item);
      }
    }
    const total = [...values.values()].reduce((sum, item) => sum + item.magnitude, 0);
    return new Map([...values].map(([key, value]) => [key, {
      share: total > 0 ? 100 * value.magnitude / total : null, observations: value.observations,
    }]));
  });

  readonly rows = computed(() => {
    const rows = (this.contract()?.projectFields ?? []).map((field, index) => {
      const guide: FieldGuide = PROJECT_FIELD_GUIDE[field.key] ?? {
        description: 'Field defined by the active intake contract; additional business guidance is not yet available.',
        example: 'See permitted values',
      };
      const impact = guide.signal ? this.impacts().get(guide.signal) : undefined;
      return { field, guide, index, share: impact?.share ?? null, observations: impact?.observations ?? 0 };
    });
    const group = (row: typeof rows[number]): number => row.guide.policy ? 0 : row.guide.signal ? 1 : row.field.required ? 2 : 3;
    rows.sort((a, b) => group(a) - group(b) || (b.share ?? -1) - (a.share ?? -1) || a.index - b.index);
    const query = this.search().trim().toLowerCase();
    return rows.map((row, index) => ({ ...row, order: index + 1 })).filter(row =>
      `${row.field.label} ${row.field.key} ${row.guide.description}`.toLowerCase().includes(query));
  });

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.schemaError.set(null);
    this.impactError.set(null);
    const base = this.config.config.api.basePath.replace(/\/$/, '');
    await Promise.all([
      firstValueFrom(this.http.get<OptionsResponse>(`${base}/options`)).then(
        contract => this.contract.set(contract),
        () => { this.contract.set(null); this.schemaError.set('The active intake field contract could not be loaded.'); },
      ),
      firstValueFrom(this.http.get<PortfolioDataset>(`${base}/portfolio`)).then(
        dataset => this.dataset.set(dataset),
        () => { this.dataset.set(null); this.impactError.set('Live model attribution is unavailable; field requirements are still shown when available.'); },
      ),
    ]);
    this.loading.set(false);
  }

  dataType(field: ProjectFieldDef): string {
    const types: Record<string, string> = { text: 'String', email: 'Email string', select: 'Enum / reference key', date: 'Date (YYYY-MM-DD)',
      integer: 'Integer', number: 'Decimal number', boolean: 'Boolean', dependencyList: 'Array of dependency links' };
    return types[field.type] ?? field.type;
  }

  potentialValues(field: ProjectFieldDef): string {
    const options = this.contract()?.options;
    if (field.source && options) {
      switch (field.source) {
        case 'options.businessUnits': return options.businessUnits.join(', ');
        case 'options.sites': return options.sites.join(', ');
        case 'options.projectStatuses': return options.projectStatuses.join(', ');
        case 'options.sponsorLevels': return options.sponsorLevels.join(', ');
        case 'options.riskRatings': return options.riskRatings.join(', ');
        case 'options.skills': return options.skills.map(skill => `${skill.key}: ${skill.displayName}`).join(', ');
        case 'portfolios': return 'An existing portfolio key from Data entry → Portfolios';
        case 'programsOfPortfolio': return 'An existing program key belonging to the selected portfolio';
      }
    }
    if (field.type === 'boolean') return 'true or false (false is a valid required value)';
    if (field.type === 'date') return `${field.minDate ?? 'No lower bound'} to ${field.maxDate ?? 'No upper bound'}`;
    if (field.type === 'number' || field.type === 'integer') return `${field.min ?? 'No lower bound'} to ${field.max ?? 'No upper bound'}`;
    if (field.type === 'dependencyList') return `Up to ${field.maxItems} links; types: ${options?.relationshipTypes.join(', ')}`;
    if (field.type === 'email') return 'Valid email address; omit if unknown';
    return `${field.minLength ?? 0} to ${field.maxLength ?? 'unbounded'} characters`;
  }
}
