# AI-Powered PMO Portfolio Prioritization — User Guide

Welcome to the **AI-Powered PMO Portfolio Prioritization** solution user manual. This platform integrates 11 disparate project management and business systems (Planview, Power Apps, Azure DevOps, JIRA, MS Project, Smartsheet, BU Trackers, HR Capacity, HR Roster, Finance, and Excel intake) into Microsoft Fabric OneLake, applies transparent Machine Learning (LightGBM + SHAP) and business rule governance (R1 to R5), and provides a high-fidelity, device-optimized interface for executives, PMO directors, and portfolio managers.

---

## Table of Contents

1. [Executive Portfolio Overview](#1-executive-portfolio-overview)
2. [Multi-Device Layout Optimization](#2-multi-device-layout-optimization)
3. [Prioritization Board & Table](#3-prioritization-board--table)
4. [Organizational Hierarchy & Rollups](#4-organizational-hierarchy--rollups)
5. [Power BI Direct Lake Executive Analytics](#5-power-bi-direct-lake-executive-analytics)
6. [Quick Add with AI Prefill](#6-quick-add-with-ai-prefill)
7. [Direct Data Entry & OneLake Ingestion](#7-direct-data-entry--onelake-ingestion)
8. [PMO Decisions & Human Governance Log](#8-pmo-decisions--human-governance-log)
9. [Project Deep Dive & SHAP Drivers](#9-project-deep-dive--shap-drivers)
10. [AI Portfolio Copilot (Agent FAB & Multi-Format Exports)](#10-ai-portfolio-copilot-agent-fab--multi-format-exports)

---

## 1. Executive Portfolio Overview

The **Overview** screen surfaces cross-dimensional machine learning insights, strategic priority tier allocations, confidence distributions, and workforce capacity analytics across all 100 enterprise projects.

![Executive Portfolio Overview Desktop](images/user-guide/01-overview-desktop.png)

### Key Capabilities:
- **Executive KPI Cards**: Real-time rollups of filtered project counts, Must-do-now counts, Proceed counts, average machine learning confidence (0-100%), average priority scores, and total capital spend in millions ($M).
- **Prioritization Tier Donut**: Visual breakdown of projects classified into *Must-do-now*, *Proceed*, *Can wait*, and *Candidate to deprioritize*.
- **Confidence Level Distribution by BU**: Analyzes signal completeness, source quality, and Platt-calibrated model certainty across each Business Unit.
- **Cost Allocation Treemap**: Hierarchical visualization of budget density by Business Unit and Site location.
- **Strategic Hierarchy Sunburst**: Multi-level concentric analysis showing Business Unit &gt; Site &gt; Tier.
- **Workforce Capacity Supply vs Demand**: FTE comparisons across 8 critical skill domains (Application Development, Cloud, Data, Cyber, Networks, UC, iPaaS, PM).
- **Completeness vs Data Quality Quadrant**: Scatter bubble chart correlating signal resolution with audit quality, sized by budget.

---

## 2. Multi-Device Layout Optimization

The application is engineered with an adaptive, fluid architecture delivering a cohesive experience across **Browser**, **Desktop**, **Tablet**, and **Mobile** viewports:

| Device Class | Viewport Range | Optimized Experience |
|---|---|---|
| **Desktop / Large Displays** | 1200px – 4K | 3-column split-pane layout: collapsible left navigation, active filter sidebar, interactive central workspace, and sliding project detail inspector. |
| **Tablet / Foldables** | 768px – 1199px | 2-column adaptive layout: collapsible side menu drawer, 2x2 responsive KPI grid, touch-friendly chart tooltips, and floating filter controls. |
| **Mobile Smartphones** | 320px – 767px | Single-column fluid stack: touch-accessible navigation bar, bottom-sheet slide drawers for filters and details, thumb-friendly tap targets, and swipeable board cards. |

<div style="display: flex; gap: 12px; margin: 16px 0;">
  <img src="images/user-guide/01-overview-tablet.png" alt="Tablet Layout" width="48%" />
  <img src="images/user-guide/01-overview-mobile.png" alt="Mobile Layout" width="48%" />
</div>

---

## 3. Prioritization Board & Table

The **Prioritization** workspace provides multiple lenses to examine, rank, and group all 100 projects in the portfolio:

![Prioritization Board View](images/user-guide/02-prioritization-board.png)

### Board View:
- Displays cards grouped by **Final Tier** (*Must-do-now*, *Proceed*, *Can wait*, *Candidate to deprioritize*) or customizable Group-By dimensions (*Confidence Level*, *Business Unit*, *Cluster*, *Action Lever*).
- Each project card displays the unique **GIS-####** identifier, project name, business unit, site, priority score badge, cost estimate, and confidence pill.
- Star icon toggle allows pinning key projects to an executive shortlist.

### Table View:
- High-density data grid featuring sticky headers, sortable columns (Priority Score, Project Name, Tier, Confidence, Cost, Go-Live Date, Sources Present, and Action Lever).
- Client-side pagination (10, 25, 50, 100 rows per page) and real-time faceted search filtering.

![Prioritization Table View](images/user-guide/03-prioritization-table.png)

---

## 4. Organizational Hierarchy & Rollups

The **Hierarchy** view provides aggregated rollups structured by **Business Unit &gt; Site &gt; Project**:

![Organizational Hierarchy Rollups](images/user-guide/04-hierarchy-rollups.png)

### Key Features:
- **Interactive Collapsible Tree**: Expand and collapse individual Business Units and Sites.
- **Aggregate Metrics**: Every node displays total project count, total capital commitment ($M), and weighted average confidence score.
- **Direct Project Selection**: Clicking any child project immediately selects it for detailed inspection.

---

## 5. Power BI Direct Lake Executive Analytics

The **Power BI** dashboard embeds an enterprise analytics experience backed directly by OneLake Delta parquet tables without data movement:

![Power BI Direct Lake Analytics](images/user-guide/05-powerbi-directlake.png)

### Key Features:
- **Zero-Copy Direct Lake Sync**: Reads directly from `gold.pmo_predictions` with sub-second response times.
- **Interactive Slicers**: Filter across Portfolios, Priority Tiers, and Business Units simultaneously.
- **Prioritization Scatter Matrix**: Quadrant analysis comparing Business Value (1-5) against Estimated Cost ($M).
- **Top 10 High-Impact Matrix**: Live ranking table with conditional mini-bars illustrating relative priority scores.
- **Live Fabric MSAL Embed**: Seamless Microsoft Entra ID authentication to embed the live report hosted in the Power BI Service.

---

## 6. Quick Add with AI Prefill

The **Quick Add** wizard allows business sponsors and PMs to submit project proposals in plain English and have the Microsoft Foundry intake agent fill the project fields:

![Quick Add AI Prefill](images/user-guide/06-quick-add-prefill.png)

### Workflow:
1. **Pre-saved Sample Prompts**: One-click prompt chips populate realistic semiconductor, IoT, and cybersecurity proposals.
2. **AI Pre-fill (Missing only)**: the intake agent fills the fields that are still empty, using public web sources through Bing grounding. It covers Business Value, Regulatory Flag, Primary Skill, Cost Estimate, Risk Rating, and Effort person-weeks. A value you entered is never replaced.
3. **Signal Provenance & Confidence**: Each field displays an extracted confidence score, evidence quote from the source text, and allows human overrides before OneLake submission.

---

## 7. Direct Data Entry & OneLake Ingestion

The **Data Entry** module allows direct ingestion, portfolio management, and monitoring of the 11 enterprise connectors:

![Data Entry & Ingestion Sources](images/user-guide/07-data-entry-ingestion.png)

### Key Capabilities:
- **Create Project**: Form-based creation with "Quick Fill Sample Values" for rapid testing.
- **Create Portfolio**: Register new portfolios and program taxonomies.
- **OneLake Ingestion Activity**: Status table detailing synchronization health, target schemas, formats, and record counts across Planview, ADO, JIRA, SAP Cost, and HR Roster.

---

## 8. PMO Decisions & Human Governance Log

The **Decisions** screen enforces the proposal principle: *"Keep people in control."* Every AI recommendation must be approved, adjusted, or rejected by human stakeholders:

![PMO Human Governance Log](images/user-guide/08-pmo-decisions-log.png)

### Features:
- **Record Governance Action**: Choose Action (*Approve*, *Adjust*, *Reject*), select target project, and enter mandatory justification.
- **Immutable Audit Trail**: Chronological log recording reviewer timestamps, action pills, and justification notes stored in OneLake.

---

## 9. Project Deep Dive & SHAP Drivers

Clicking any project opens the **Detail Inspector** displaying all 10 canonical signals, machine learning explainability, and rule overrides:

![Project Detail & SHAP Feature Drivers](images/user-guide/09-project-detail.png)

### Key Elements:
- **Confidence Ring Gauge**: Visual breakdown of Completeness, Quality, and Model Certainty.
- **SHAP Feature Importance Waterfall**: Explains *why* the model scored the project high or low (e.g. high business value increasing score by +0.72; high cost reducing score by -0.18).
- **Rule Overrides Badge**: Transparent indicators showing which deterministic business rules (R1 Regulatory First, R2 Executive Sponsorship, R3 Protected Programs, R4 Deprioritize Guard, R5 Cross-Portfolio Critical Path) altered the machine learning rank.
- **Cross-Source Provenance**: Checkmarks showing which of the 11 enterprise systems contributed data.

---

## 10. AI Portfolio Copilot (Agent FAB & Multi-Format Exports)

The **AI Portfolio Copilot** is accessible from any screen via the Floating Action Button (FAB) in the lower-right corner:

![AI Portfolio Copilot Agent FAB](images/user-guide/10-ai-copilot-agent-fab.png)

### Copilot Features:
- **Pulsing FAB**: High-visibility floating button with gradient styling and "Ask AI Agent" indicator.
- **Pre-Saved Prompts**: Clickable chips that send real requests to the Foundry agent:
  - 💡 *Top 5 Must-Do-Now Projects*
  - 📊 *Budget by Business Unit*
  - 👥 *Skills Capacity Deficits*
  - 🔍 *Explain GIS-0042 Deprioritization*
  - 🛡️ *Regulatory & Security Projects*
  - ⚡ *R5 Critical Path Dependencies*
- **Table vs Chart Switcher**: Seamlessly toggle any Copilot response between a structured data table and an interactive chart.
- **Chart Type Selector**: Switch between **Bar**, **Line**, **Pie / Donut**, and **Radar / Spider** charts with a single click.
- **Multi-Format Export**: Export any Copilot answer directly to:
  - 📄 **Word (.docx)**
  - 📊 **Excel (.xlsx)**
  - 📑 **PowerPoint (.pptx)**
- **Verifiable Responses**: Successful answers show the Foundry agent name,
  version, response ID, and source project IDs. The agent uses a server-read
  read-only OneLake query tools through APIM, not browser-generated answers or
  a full portfolio snapshot in the prompt. Query IDs identify the retrieval.
- **Explicit Errors**: If the snapshot is missing or the agent is unavailable,
  the drawer shows an error instead of substituting demo results. Retry after
  the upstream issue is resolved.

Responses depend on the evidence present in the snapshot. Missing SHAP,
dependency, or capacity evidence is reported as unavailable. The agent does not
approve decisions or change project records. Charts and exports are available
when the answer includes a data table.

### ML flow diagrams

The **Architecture & Steps** page opens on **Solution Architecture**, with the
architecture diagram, layer descriptions and governed Foundry query path.
Its second tab, **ML Algos**, contains both ML flow diagrams. **Pipeline Steps**,
**OneLake Layers**, and **Services & Security** keep the detailed reference
sections separate. The tab bar scrolls horizontally on narrow screens.

The **Documentation → Architecture** and **Documentation → Algorithms** screens
include both diagrams with full-resolution links:

![End-to-end ML project walkthrough](images/End-to-end%20project%20flow%20-%20ML%20Algos.png)

![ML algorithm decision flow](images/ML-Algos-Flow.png)

These are illustrative explanations, not live outputs. Example confidence,
model consensus, and write-back are not implementation guarantees. See
[the architecture guide](ARCHITECTURE.md) for actual ML roles and deployment boundaries.

### Project field reference

Open **Documentation → Project Fields**, immediately after Architecture. The
table loads every field from the current intake contract, including data type,
mandatory/optional status, allowed values and limits, an explanation and example.
Search by label, canonical key, or description.

Policy gates appear first, followed by model fields ordered by observed exported
absolute SHAP attribution, then required/optional context fields. Percentages
describe the share of available exported attribution, not a fixed contribution
to priority score or a causal effect. If live attribution is unavailable, the
page states that explicitly and does not invent percentages. The project ID and
pipeline outputs are generated, not additional inputs.

---

*AI-Powered PMO Portfolio Prioritization — Document generated October 2026*
