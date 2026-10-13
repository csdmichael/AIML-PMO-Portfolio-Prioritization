import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonSearchbar,
  IonChip,
  IonLabel,
  IonButton,
  IonIcon,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonRange,
  IonCheckbox,
  IonAccordionGroup,
  IonAccordion,
} from '@ionic/angular';
import { PortfolioStore } from '../../services/portfolio.store';
import { ConfidenceLevel, PriorityTier, SponsorLevel, RiskRating, RecommendedAction, FilterCriteria } from '../../models/portfolio.models';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonSearchbar,
    IonChip,
    IonLabel,
    IonButton,
    IonIcon,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonRange,
    IonCheckbox,
    IonAccordionGroup,
    IonAccordion,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filter-panel-wrapper" role="region" aria-label="Portfolio Filters">
      <!-- Search bar -->
      <div class="filter-header">
        <ion-searchbar
          [value]="store.filters().search"
          (ionInput)="onSearchChange($event)"
          debounce="200"
          class="custom-searchbar"
          aria-label="Free-text search"
        ></ion-searchbar>
      </div>

      <!-- Action buttons: Reset & CSV -->
      <div class="filter-actions-row">
        <ion-button size="small" fill="outline" color="medium" (click)="store.resetFilters()" aria-label="Reset all filters">
          Reset
        </ion-button>
        <ion-button size="small" fill="solid" color="primary" (click)="onExportCsv()" aria-label="Export filtered projects to CSV">
          Export CSV
        </ion-button>
      </div>

      <!-- Live Confidence Chips (Multi-select) -->
      <div class="filter-section">
        <div class="section-title">Confidence Level</div>
        <div class="chips-flex">
          <ion-chip
            [outline]="!isConfidenceActive('High')"
            [color]="isConfidenceActive('High') ? 'success' : 'medium'"
            (click)="store.toggleConfidenceLevel('High')"
            tabindex="0"
            role="button"
            [attr.aria-pressed]="isConfidenceActive('High')"
            aria-label="Filter High confidence"
          >
            <ion-label>High ({{ store.confidenceCounts().high }})</ion-label>
          </ion-chip>
          <ion-chip
            [outline]="!isConfidenceActive('Medium')"
            [color]="isConfidenceActive('Medium') ? 'warning' : 'medium'"
            (click)="store.toggleConfidenceLevel('Medium')"
            tabindex="0"
            role="button"
            [attr.aria-pressed]="isConfidenceActive('Medium')"
            aria-label="Filter Medium confidence"
          >
            <ion-label>Med ({{ store.confidenceCounts().medium }})</ion-label>
          </ion-chip>
          <ion-chip
            [outline]="!isConfidenceActive('Low')"
            [color]="isConfidenceActive('Low') ? 'danger' : 'medium'"
            (click)="store.toggleConfidenceLevel('Low')"
            tabindex="0"
            role="button"
            [attr.aria-pressed]="isConfidenceActive('Low')"
            aria-label="Filter Low confidence"
          >
            <ion-label>Low ({{ store.confidenceCounts().low }})</ion-label>
          </ion-chip>
        </div>
      </div>

      <!-- Final Tier Chips (Multi-select) -->
      <div class="filter-section">
        <div class="section-title">Final Priority Tier</div>
        <div class="chips-flex">
          @for (tier of availableTiers; track tier) {
            <ion-chip
              [outline]="!isTierActive(tier)"
              color="primary"
              (click)="store.toggleFinalTier(tier)"
              tabindex="0"
              role="button"
              [attr.aria-pressed]="isTierActive(tier)"
              [attr.aria-label]="'Filter tier ' + tier"
            >
              <ion-label>{{ tier }}</ion-label>
            </ion-chip>
          }
        </div>
      </div>

      <!-- Dropdowns & Accordion Controls -->
      <ion-accordion-group [multiple]="true" [value]="['org', 'attributes', 'sliders']">
        <!-- Organization: BU, Site, Portfolio -->
        <ion-accordion value="org">
          <ion-item slot="header" color="light">
            <ion-label>Organization & Portfolio</ion-label>
          </ion-item>
          <div class="accordion-inner" slot="content">
            <ion-item lines="none">
              <ion-select
                label="Business Unit"
                labelPlacement="stacked"
                [multiple]="true"
                [value]="store.filters().businessUnits"
                (ionChange)="onMultiSelectChange('businessUnits', $event)"
              >
                @for (bu of store.businessUnits(); track bu) {
                  <ion-select-option [value]="bu">{{ bu }}</ion-select-option>
                }
              </ion-select>
            </ion-item>

            <ion-item lines="none">
              <ion-select
                label="Site"
                labelPlacement="stacked"
                [multiple]="true"
                [value]="store.filters().sites"
                (ionChange)="onMultiSelectChange('sites', $event)"
              >
                @for (site of store.sites(); track site) {
                  <ion-select-option [value]="site">{{ site }}</ion-select-option>
                }
              </ion-select>
            </ion-item>

            <ion-item lines="none">
              <ion-select
                label="Portfolio"
                labelPlacement="stacked"
                [multiple]="true"
                [value]="store.filters().portfolios"
                (ionChange)="onMultiSelectChange('portfolios', $event)"
              >
                @for (port of store.portfolios(); track port) {
                  <ion-select-option [value]="port">{{ port }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
          </div>
        </ion-accordion>

        <!-- Governance & Strategy: Sponsor, Risk, Skill, Cluster, Action -->
        <ion-accordion value="attributes">
          <ion-item slot="header" color="light">
            <ion-label>Strategic Alignment & Risk</ion-label>
          </ion-item>
          <div class="accordion-inner" slot="content">
            <ion-item lines="none">
              <ion-select
                label="Sponsor Level"
                labelPlacement="stacked"
                [multiple]="true"
                [value]="store.filters().sponsorLevels"
                (ionChange)="onMultiSelectChange('sponsorLevels', $event)"
              >
                <ion-select-option value="Executive">Executive</ion-select-option>
                <ion-select-option value="Director">Director</ion-select-option>
                <ion-select-option value="Manager">Manager</ion-select-option>
                <ion-select-option value="Individual">Individual</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item lines="none">
              <ion-select
                label="Risk Rating"
                labelPlacement="stacked"
                [multiple]="true"
                [value]="store.filters().riskRatings"
                (ionChange)="onMultiSelectChange('riskRatings', $event)"
              >
                <ion-select-option value="Low">Low</ion-select-option>
                <ion-select-option value="Medium">Medium</ion-select-option>
                <ion-select-option value="High">High</ion-select-option>
                <ion-select-option value="Critical">Critical</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item lines="none">
              <ion-select
                label="Primary Skill"
                labelPlacement="stacked"
                [multiple]="true"
                [value]="store.filters().primarySkills"
                (ionChange)="onMultiSelectChange('primarySkills', $event)"
              >
                @for (skill of store.primarySkills(); track skill) {
                  <ion-select-option [value]="skill">{{ skill }}</ion-select-option>
                }
              </ion-select>
            </ion-item>

            <ion-item lines="none">
              <ion-select
                label="Cluster"
                labelPlacement="stacked"
                [multiple]="true"
                [value]="store.filters().clusters"
                (ionChange)="onMultiSelectChange('clusters', $event)"
              >
                @for (cluster of store.clusters(); track cluster) {
                  <ion-select-option [value]="cluster">{{ cluster }}</ion-select-option>
                }
              </ion-select>
            </ion-item>

            <ion-item lines="none">
              <ion-select
                label="Recommended Action"
                labelPlacement="stacked"
                [value]="store.filters().recommendedActions"
                (ionChange)="onMultiSelectChange('recommendedActions', $event)"
              >
                <ion-select-option value="Add capacity">Add capacity</ion-select-option>
                <ion-select-option value="Protect slot">Protect slot</ion-select-option>
                <ion-select-option value="Proceed">Proceed</ion-select-option>
                <ion-select-option value="Re-sequence">Re-sequence</ion-select-option>
                <ion-select-option value="Pause or divert skills">Pause or divert skills</ion-select-option>
              </ion-select>
            </ion-item>

            <!-- Strategic flags checkboxes -->
            <div class="checkbox-group">
              <ion-checkbox
                [checked]="store.filters().regulatory === true"
                (ionChange)="onCheckboxChange('regulatory', $event)"
                labelPlacement="end"
              >
                Regulatory / Compliance
              </ion-checkbox>
              <ion-checkbox
                [checked]="store.filters().dtAlignment === true"
                (ionChange)="onCheckboxChange('dtAlignment', $event)"
                labelPlacement="end"
              >
                DT Alignment
              </ion-checkbox>
              <ion-checkbox
                [checked]="store.filters().protectedProgram === true"
                (ionChange)="onCheckboxChange('protectedProgram', $event)"
                labelPlacement="end"
              >
                Protected Program
              </ion-checkbox>
              <ion-checkbox
                [checked]="store.filters().hasDataIssues === true"
                (ionChange)="onCheckboxChange('hasDataIssues', $event)"
                labelPlacement="end"
              >
                Has Data Issues
              </ion-checkbox>
            </div>
          </div>
        </ion-accordion>

        <!-- Sliders: Sources, Completeness, Priority, Cost, Date -->
        <ion-accordion value="sliders">
          <ion-item slot="header" color="light">
            <ion-label>Sliders & Dates</ion-label>
          </ion-item>
          <div class="accordion-inner" slot="content">
            <!-- Sources Present Slider (0 - 11) -->
            <div class="slider-item">
              <div class="slider-label">
                <span>Sources Present</span>
                <span class="slider-val">{{ store.filters().minSources }} - {{ store.filters().maxSources }}</span>
              </div>
              <ion-range
                [min]="0"
                [max]="11"
                [dualKnobs]="true"
                [pin]="true"
                [value]="{ lower: store.filters().minSources, upper: store.filters().maxSources }"
                (ionChange)="onSourcesRangeChange($event)"
                aria-label="Sources present range"
              ></ion-range>
            </div>

            <!-- Completeness Slider (0 - 100%) -->
            <div class="slider-item">
              <div class="slider-label">
                <span>Completeness</span>
                <span class="slider-val">{{ store.filters().minCompleteness }}% - {{ store.filters().maxCompleteness }}%</span>
              </div>
              <ion-range
                [min]="0"
                [max]="100"
                [dualKnobs]="true"
                [pin]="true"
                [value]="{ lower: store.filters().minCompleteness, upper: store.filters().maxCompleteness }"
                (ionChange)="onCompletenessRangeChange($event)"
                aria-label="Completeness range percentage"
              ></ion-range>
            </div>

            <!-- Priority Score Slider (0 - 100) -->
            <div class="slider-item">
              <div class="slider-label">
                <span>Priority Score</span>
                <span class="slider-val">{{ store.filters().minPriorityScore }} - {{ store.filters().maxPriorityScore }}</span>
              </div>
              <ion-range
                [min]="0"
                [max]="100"
                [dualKnobs]="true"
                [pin]="true"
                [value]="{ lower: store.filters().minPriorityScore, upper: store.filters().maxPriorityScore }"
                (ionChange)="onPriorityRangeChange($event)"
                aria-label="Priority score range"
              ></ion-range>
            </div>

            <!-- Cost Range Slider (0 - 15M USD) -->
            <div class="slider-item">
              <div class="slider-label">
                <span>Cost USD</span>
                <span class="slider-val">
                  &#36;{{ (store.filters().minCostUsd / 1000000).toFixed(1) }}M -
                  &#36;{{ (store.filters().maxCostUsd / 1000000).toFixed(1) }}M
                </span>
              </div>
              <ion-range
                [min]="0"
                [max]="15000000"
                [step]="250000"
                [dualKnobs]="true"
                [value]="{ lower: store.filters().minCostUsd, upper: store.filters().maxCostUsd }"
                (ionChange)="onCostRangeChange($event)"
                aria-label="Cost range in USD"
              ></ion-range>
            </div>

            <!-- Go-Live Date Window -->
            <div class="date-window-item">
              <div class="slider-label"><span>Go-Live Date Window</span></div>
              <div class="date-inputs">
                <input
                  type="date"
                  class="date-picker-input"
                  [value]="store.filters().goLiveFrom"
                  (change)="onDateChange('goLiveFrom', $event)"
                  aria-label="Go live date from"
                />
                <span class="date-sep">to</span>
                <input
                  type="date"
                  class="date-picker-input"
                  [value]="store.filters().goLiveTo"
                  (change)="onDateChange('goLiveTo', $event)"
                  aria-label="Go live date to"
                />
              </div>
            </div>
          </div>
        </ion-accordion>
      </ion-accordion-group>

      <!-- Saved Views Management -->
      <div class="filter-section saved-views-section">
        <div class="section-title">Saved Views</div>
        <div class="saved-views-input-row">
          <input
            type="text"
            class="view-name-input"
            [value]="newViewName()"
            (input)="onNewViewNameInput($event)"
            aria-label="New view name"
          />
          <ion-button size="small" fill="solid" (click)="onSaveCurrentView()" aria-label="Save current view">
            Save
          </ion-button>
        </div>
        @if (store.savedViews().length > 0) {
          <div class="saved-views-list">
            @for (v of store.savedViews(); track v.id) {
              <div class="saved-view-chip-row">
                <button type="button" class="view-chip-btn" (click)="store.applySavedView(v)">
                  {{ v.name }}
                </button>
                <button type="button" class="view-delete-btn" (click)="store.deleteSavedView(v.id)" aria-label="Delete view">
                  &times;
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .filter-panel-wrapper {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .filter-header {
        margin-bottom: 2px;
      }
      .custom-searchbar {
        --box-shadow: none;
        --background: var(--ion-color-step-100, #f5f5f5);
        --border-radius: 6px;
        padding: 0;
      }
      .filter-actions-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }
      .filter-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .section-title {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--ion-color-step-600, #666666);
        letter-spacing: 0.3px;
      }
      .chips-flex {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .chips-flex ion-chip {
        margin: 2px;
        font-size: 0.75rem;
        height: 28px;
        cursor: pointer;
      }
      .chips-flex ion-chip:focus-visible {
        outline: 2px solid #0078d4;
      }
      .accordion-inner {
        padding: 8px 4px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .checkbox-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px 12px;
      }
      .slider-item {
        padding: 6px 12px;
      }
      .slider-label {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--ion-color-step-700, #444444);
      }
      .slider-val {
        color: #0078d4;
      }
      .date-window-item {
        padding: 6px 12px;
      }
      .date-inputs {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
      }
      .date-picker-input {
        flex: 1;
        padding: 4px 6px;
        font-size: 0.8rem;
        border: 1px solid var(--ion-color-step-200, #cccccc);
        border-radius: 4px;
        background: var(--ion-background-color, #ffffff);
        color: var(--ion-text-color, #1a1a1a);
      }
      .date-sep {
        font-size: 0.75rem;
        color: #777777;
      }
      .saved-views-section {
        border-top: 1px solid var(--ion-color-step-150, #e0e0e0);
        padding-top: 12px;
      }
      .saved-views-input-row {
        display: flex;
        gap: 6px;
      }
      .view-name-input {
        flex: 1;
        padding: 4px 8px;
        font-size: 0.8rem;
        border: 1px solid var(--ion-color-step-200, #cccccc);
        border-radius: 4px;
      }
      .saved-views-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 6px;
      }
      .saved-view-chip-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--ion-color-step-100, #f0f0f0);
        padding: 4px 8px;
        border-radius: 4px;
      }
      .view-chip-btn {
        background: transparent;
        border: none;
        color: #0078d4;
        font-weight: 600;
        font-size: 0.8rem;
        cursor: pointer;
        text-align: left;
      }
      .view-delete-btn {
        background: transparent;
        border: none;
        color: #d13438;
        font-size: 1rem;
        cursor: pointer;
        padding: 0 4px;
      }
    `,
  ],
})
export class FilterPanelComponent {
  readonly store = inject(PortfolioStore);
  readonly newViewName = signal<string>('');

  readonly availableTiers: PriorityTier[] = [
    'Must-do-now',
    'Proceed',
    'Can wait',
    'Candidate to deprioritize',
  ];

  isConfidenceActive(level: ConfidenceLevel): boolean {
    return this.store.filters().confidenceLevels.includes(level);
  }

  isTierActive(tier: PriorityTier): boolean {
    return this.store.filters().finalTiers.includes(tier);
  }

  onSearchChange(event: Event): void {
    const customEvent = event as CustomEvent;
    this.store.setSearch(customEvent.detail.value ?? '');
  }

  onMultiSelectChange(field: keyof FilterCriteria, event: Event): void {
    const customEvent = event as CustomEvent;
    const val = customEvent.detail.value;
    this.store.updateFilters((f) => ({
      ...f,
      [field]: val ?? [],
    }));
  }

  onCheckboxChange(
    field: 'regulatory' | 'dtAlignment' | 'protectedProgram' | 'hasDataIssues',
    event: Event,
  ): void {
    const customEvent = event as CustomEvent;
    const checked = customEvent.detail.checked;
    this.store.updateFilters((f) => ({
      ...f,
      [field]: checked ? true : null,
    }));
  }

  onSourcesRangeChange(event: Event): void {
    const customEvent = event as CustomEvent;
    const val = customEvent.detail.value as { lower: number; upper: number };
    if (val && typeof val.lower === 'number') {
      this.store.updateFilters((f) => ({
        ...f,
        minSources: val.lower,
        maxSources: val.upper,
      }));
    }
  }

  onCompletenessRangeChange(event: Event): void {
    const customEvent = event as CustomEvent;
    const val = customEvent.detail.value as { lower: number; upper: number };
    if (val && typeof val.lower === 'number') {
      this.store.updateFilters((f) => ({
        ...f,
        minCompleteness: val.lower,
        maxCompleteness: val.upper,
      }));
    }
  }

  onPriorityRangeChange(event: Event): void {
    const customEvent = event as CustomEvent;
    const val = customEvent.detail.value as { lower: number; upper: number };
    if (val && typeof val.lower === 'number') {
      this.store.updateFilters((f) => ({
        ...f,
        minPriorityScore: val.lower,
        maxPriorityScore: val.upper,
      }));
    }
  }

  onCostRangeChange(event: Event): void {
    const customEvent = event as CustomEvent;
    const val = customEvent.detail.value as { lower: number; upper: number };
    if (val && typeof val.lower === 'number') {
      this.store.updateFilters((f) => ({
        ...f,
        minCostUsd: val.lower,
        maxCostUsd: val.upper,
      }));
    }
  }

  onDateChange(field: 'goLiveFrom' | 'goLiveTo', event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const val = inputEl.value;
    this.store.updateFilters((f) => ({
      ...f,
      [field]: val,
    }));
  }

  onNewViewNameInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.newViewName.set(target.value);
  }

  onSaveCurrentView(): void {
    const name = this.newViewName().trim();
    if (!name) return;
    this.store.saveCurrentView(name);
    this.newViewName.set('');
  }

  onExportCsv(): void {
    const csv = this.store.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmo-portfolio-filtered-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
