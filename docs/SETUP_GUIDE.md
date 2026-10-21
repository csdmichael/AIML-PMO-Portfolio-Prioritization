# AI-Powered PMO Portfolio Prioritization — Azure Setup & Deployment Guide

This comprehensive deployment guide explains the Azure architecture, the Microsoft Fabric foundation, and the exact deployment scripts and commands required to deploy the complete **AI-Powered PMO Portfolio Prioritization** solution to Microsoft Azure.

---

## Table of Contents

1. [Architecture Overview & Azure Services Used](#1-architecture-overview--azure-services-used)
2. [Prerequisites & Environment Setup](#2-prerequisites--environment-setup)
3. [Configuration Files & Non-Secret Contracts](#3-configuration-files--non-secret-contracts)
4. [Deployment Workflow (Step-by-Step)](#4-deployment-workflow-step-by-step)
   - [Phase 1: Generate Data & Upload to OneLake](#phase-1-generate-data--upload-to-onelake)
   - [Phase 2: Deploy Microsoft Fabric Items](#phase-2-deploy-microsoft-fabric-items)
   - [Phase 3: Deploy Azure Infrastructure (Bicep or Terraform)](#phase-3-deploy-azure-infrastructure-bicep-or-terraform)
   - [Phase 4: Publish & Deploy Applications (API & UI)](#phase-4-publish--deploy-applications-api--ui)
   - [Phase 5: Configure Power BI Direct Lake & MSAL](#phase-5-configure-power-bi-direct-lake--msal)
5. [Local Development & Testing](#5-local-development--testing)
6. [User Guide & Operational Documentation](#6-user-guide--operational-documentation)
7. [Troubleshooting & Verification](#7-troubleshooting--verification)

---

## 1. Architecture Overview & Azure Services Used

The supplied [end-to-end ML walkthrough](images/End-to-end%20project%20flow%20-%20ML%20Algos.png)
and [ML decision flow](images/ML-Algos-Flow.png) are embedded in the README and the
Architecture/Algorithms UI screens. See [the architecture guide](ARCHITECTURE.md)
for actual notebook behavior, illustrative-image caveats, and private deployment gates.

### Governed Foundry tool activation

Chat uses the pinned agent in [portfolio-agent.json](../api/config/portfolio-agent.json).
Foundry automatically executes the read-only `query_portfolio` MCP tool through
private APIM against the approved OneLake export. No manual function output is
needed in the playground. This solution-specific MCP server does not expose
Fabric's general-purpose data-agent service, arbitrary SQL, or per-user RLS.

After approval for identity/network changes, preview then activate the scoped
configuration (replace the app name for another environment):

```powershell
az deployment group what-if -g m365-myaacoub --template-file .\infra\bicep\agent-project.bicep
az deployment group create -g m365-myaacoub -n pmo-private-agent --template-file .\infra\bicep\agent-project.bicep
$projectId = "/subscriptions/cf824570-a8ba-497a-a184-0a52f1830aa9/resourceGroups/m365-myaacoub/providers/Microsoft.CognitiveServices/accounts/foundry-myaacoub-private/projects/pmo-portfolio"
.\infra\scripts\configure-agent-tools.ps1 -ApiAppName azapittlyg2gcvfsso -FoundryProjectResourceId $projectId
.\infra\scripts\configure-agent-tools.ps1 -ApiAppName azapittlyg2gcvfsso -FoundryProjectResourceId $projectId -Apply
.\infra\scripts\create-portfolio-agent.ps1
.\infra\scripts\deploy.ps1 -Mode publish -Component api
```

The configuration script creates a dedicated single-tenant Entra API audience,
`Portfolio.Query` app role, explicitly allowed caller identities, separate APIM
REST/MCP APIs, a keyless `ProjectManagedIdentity` Foundry connection, and API
outbound VNet integration. It preserves existing runtime identities
and public-access settings. Directory propagation can require a short wait;
rerunning is supported and mismatched existing app definitions are rejected.

The backend needs `PMO_TOOL_AUDIENCE` (application client ID),
`PMO_TOOL_TENANT_ID`, and `PMO_TOOL_CALLER_OBJECT_ID` (comma-separated explicit
workload object IDs, including the PMO project identity).
These are nonsecret settings, not tokens. The script sets them server-side.
Both APIM and the backend validate workload JWTs. Missing configuration fails
closed. Do not place tokens or tool credentials in SPA configuration.

The deployment account needs application-registration/app-role-assignment
permissions in Entra, and permission to configure the existing App Service,
managed identity and APIM API. No broad Fabric role is granted to the new caller.
The existing backend identity still requires OneLake access and the project-scoped
Foundry runtime role. The dedicated project uses the already VNet-injected
`foundry-myaacoub-private` account and its existing `gpt-5.6-sol` model deployment.
Keep the old public-account agent for rollback; it is not used by the updated API.

The Fabric capacity must be running. If exports are missing, run `PMO Full Pipeline`
and verify `/v1/health` and `/v1/portfolio` before testing chat. Capacity resume
incurs charges; pausing it again disables live retrieval even if files exist.

Full enterprise isolation additionally requires approved private endpoints,
DNS/routing and public-access-denial tests for Fabric and Foundry. The scoped
script does not create those endpoints or claim that the existing public UI/API
has become private. Do not apply the full infrastructure template merely to
activate tools; review drift first.

The solution implements a transparent, human-in-the-loop prioritization platform integrating 11 enterprise data sources into **Microsoft Fabric**, utilizing **LightGBM + SHAP** machine learning, and exposing insights through a device-optimized **Ionic Angular UI** and **Direct Lake Power BI**.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           11 Enterprise Data Sources                            │
│ Planview • Power Apps • ADO • JIRA • MS Project • Smartsheet • Spreadsheets ... │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ Files/raw/
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Microsoft Fabric OneLake (Lakehouse)                         │
│  src_* (Bronze) ──► silver.signal_provenance ──► gold.pmo_predictions (Gold)   │
│                             LightGBM + SHAP Notebooks                           │
└───────────────────────┬───────────────────────────────────┬─────────────────────┘
                        │ Direct Lake                       │ Delta Parquet
                        ▼                                   ▼
┌───────────────────────────────────┐    ┌────────────────────────────────────────┐
│     Power BI (Direct Lake)        │    │         FastAPI Backend Engine         │
│  Executive Analytics Semantic     │    │  Data Entry • AI Prefill • Lake Reads  │
└───────────────────────────────────┘    └──────────────────┬─────────────────────┘
                                                            │ APIM Gateway
                                                            ▼
                                         ┌────────────────────────────────────────┐
                                         │       Ionic Angular UI (SPA)           │
                                         │  Desktop • Tablet • Mobile • Copilot   │
                                         └────────────────────────────────────────┘
```

### Azure Services Inventory

| Azure Service | Resource Role in Solution | Configuration Key |
|---|---|---|
| **Microsoft Fabric** | **OneLake Lakehouse (`pmo_lakehouse`)** stores medallion layers (`src_*`, `silver.signal_provenance`, `gold.pmo_predictions`). Spark notebooks execute feature engineering and LightGBM model training. Fabric Pipelines orchestrate scheduled scoring runs. | `fabric.workspaceId`, `fabric.lakehouseId` in `infra/config/pmo-deployment.json` |
| **Power BI (Direct Lake)** | High-performance reporting querying OneLake delta parquet directly with zero data movement and sub-second refreshes. | `ui/src/assets/config/powerbi-embed.json` |
| **Azure App Service (Linux)** | Hosts the frontend Ionic Angular application (served via FastAPI / Express static host) and the backend REST API in dedicated Linux App Service containers. | `create.apps.ui`, `create.apps.api` |
| **Azure API Management (APIM)** | Enterprise API gateway exposing the API under `/pmo` with subscription key authentication (`Ocp-Apim-Subscription-Key`), request throttling, and unified telemetry. | `reuse.apim.name` (`caldova-apim-westus`) |
| **Azure Key Vault** | Stores sensitive keys (APIM subscription keys) accessed securely by the UI host via Managed Identity and private endpoints. | `create.keyVault` (`azkv...`) |
| **Microsoft Foundry (Azure AI)** | Hosts three agents in the `pmo-portfolio` project on `foundry-myaacoub-private` using `gpt-5.6-sol`: the PMO chat and recommendation agents (OneLake through APIM) and the intake agent that prefills Quick Add fields with Bing grounding. | `reuse.foundryAccount` (`foundry-myaacoub`) |
| **Azure Monitor & App Insights** | Centralized log workspace and distributed application performance monitoring. | `create.logAnalytics`, `create.appInsights` |
| **Microsoft Entra ID** | User-assigned Managed Identity (`mi...`) for secretless Azure resource communication; Entra App Registration for Power BI MSAL authentication. | `create.identity`, `entra.clientId` |
| **Azure Virtual Network & Private Endpoints** | VNet integration and private endpoints for secure Key Vault and backend connectivity. | `reuse.vnetIntegrationSubnetId`, `reuse.keyVaultPrivateEndpointSubnetId` |

---

## 2. Prerequisites & Environment Setup

Ensure the following tools are installed on your deployment workstation:

- **Azure CLI (`az`)** version 2.60.0 or later with Bicep CLI (`az bicep install`).
- **PowerShell 7+** (cross-platform `pwsh` or Windows PowerShell 5.1+).
- **Python 3.12+** with `uv` package manager (`pip install uv`).
- **Node.js 22+** with `npm` 10+.
- **Terraform 1.8+** (required only if deploying using Terraform instead of Bicep).
- **Playwright** (for generating the PDF User Guide and test verification).

### Authentication

Sign in to your Azure subscription:

```powershell
az login
az account set --subscription "cf824570-a8ba-497a-a184-0a52f1830aa9"
```

Verify that you have Contributor permissions on the target resource group (`m365-myaacoub`) and on the Microsoft Fabric workspace.

---

## 3. Configuration Files & Non-Secret Contracts

The deployment behavior is governed by shared JSON configuration contracts located in the repository:

1. **`infra/config/pmo-deployment.json`**: Master non-secret deployment manifest containing subscription IDs, resource group names, App Service configurations, APIM settings, and Fabric identifiers.
2. **`config/portfolios.json`**: Master portfolio taxonomy defining the 5 portfolios (`IT InfoSec`, `IT Software Development`, `IT Infrastructure`, `AI Team`, `Data and Analytics`), programs, and cross-portfolio coupling rules.
3. **`config/data-entry.json`**: Canonical data entry contracts, required fields, and validation boundaries.
4. **`ui/src/assets/config/ui.json`**: Frontend brand tokens, navigation items, confidence thresholds, and responsive breakpoints.
5. **`ui/src/assets/config/powerbi-embed.json`**: Power BI workspace, optional preferred report, and Entra ID client IDs.

---

## 4. Deployment Workflow (Step-by-Step)

The solution provides an automated, end-to-end PowerShell orchestrator: **`infra/scripts/deploy.ps1`**.

---

### Phase 1: Generate Data & Upload to OneLake

Generate the deterministic 100-project synthetic dataset and upload source extracts to OneLake:

```powershell
# 1. Generate synthetic source extracts
python data-generator/generate_pmo_data.py

# 2. Upload raw extracts to OneLake lakehouse
python data-generator/upload_to_onelake.py
```

This creates the source folders in OneLake under `Files/raw/`:
- `planview/` (Planview portfolio extracts)
- `powerapps/` (Power Apps intake requests)
- `ado/` (Azure DevOps work items)
- `jira/` (JIRA issues and link dependencies)
- `ms_project/` (MSPDI XML schedules)
- `smartsheet/` (Smartsheet milestone tracker)
- `spreadsheets/` (BU trackers & PMO decision labels)
- `hr_capacity/` & `hr_roster/` (FTE supply & allocations)
- `cost/` (Finance monthly budgets)
- `excel_intake/` (Excel-only intake signals)

---

### Phase 2: Deploy Microsoft Fabric Items

Build and deploy the PySpark ML notebooks and data pipeline into your Fabric workspace:

```powershell
# 1. Compile modular Python source into Fabric PySpark notebooks
python fabric/scripts/build_notebooks.py

# 2. Deploy notebooks and PMO Full Pipeline to the Fabric workspace
python fabric/scripts/deploy_fabric_items.py
```

#### Notebooks Deployed:
- **`01_PMO_Feature_Engineering_Training.ipynb`**: Ingests raw files, performs schema normalization, builds `silver.signal_provenance`, trains the LightGBM classifier with Platt calibration, computes SHAP feature importance, and logs the model in MLflow.
- **`02_PMO_Inference_Predictions.ipynb`**: Performs batch inference, calculates confidence scores (Completeness, Quality, Model Certainty), applies Rules R1 to R5, and writes the `gold.pmo_predictions` table and `Files/gold/exports/pmo_portfolio_export.json`.

---

### Phase 3: Deploy Azure Infrastructure (Bicep or Terraform)

Deploy the Azure App Service plans, Log Analytics, Key Vault, and APIM APIs using Infrastructure as Code.

#### Option A: Deploy via Azure Bicep (Recommended)

```powershell
# Step 3.1: Validate Bicep template
pwsh infra/scripts/deploy.ps1 -IacTool bicep -Mode validate

# Step 3.2: Inspect deployment what-if plan
pwsh infra/scripts/deploy.ps1 -IacTool bicep -Mode plan

# Step 3.3: Deploy infrastructure
pwsh infra/scripts/deploy.ps1 -IacTool bicep -Mode infra
```

#### Option B: Deploy via Terraform

```powershell
# Step 3.1: Initialize & validate Terraform
pwsh infra/scripts/deploy.ps1 -IacTool terraform -Mode validate

# Step 3.2: Plan changes
pwsh infra/scripts/deploy.ps1 -IacTool terraform -Mode plan

# Step 3.3: Apply infrastructure
pwsh infra/scripts/deploy.ps1 -IacTool terraform -Mode infra
```

---

### Phase 4: Publish & Deploy Applications (API & UI)

Build the production artifacts and publish them to Azure App Service:

```powershell
# Step 4.1: Deploy both UI and API
pwsh infra/scripts/deploy.ps1 -Mode deploy -Component both
```

Or deploy components individually:

```powershell
# Deploy API backend only
pwsh infra/scripts/deploy.ps1 -Mode deploy -Component api

# Deploy UI frontend only
pwsh infra/scripts/deploy.ps1 -Mode deploy -Component ui
```

The script automatically:
1. Builds the Angular application (`npm run build`).
2. Packages the Python runtime and dependencies using `uv`.
3. Deploys zip packages to the corresponding Linux App Service slots.
4. Verifies health probes (`/healthz` and `/docs`).

---

### Phase 5: Configure Power BI Direct Lake & MSAL

1. Open Power BI Desktop or the Fabric web portal.
2. Connect to the `pmo_lakehouse` SQL Analytics Endpoint using **Direct Lake** mode.
3. Select the `gold.pmo_predictions` table.
4. Publish the report to the Fabric workspace `PMO-Portfolio-Prioritization`.
5. Add both the local and deployed callback URLs to the app registration's **Single-page application** redirect URIs:
   - `http://localhost:4200/assets/auth-callback.html`
   - `https://<your-ui-host>/assets/auth-callback.html`
6. Update `ui/src/assets/config/powerbi-embed.json`. The UI discovers workspace reports after sign-in. Set `preferredReportName` to select a report by name, or replace `PENDING` with a report GUID to pin one:

   The callback page loads the MSAL redirect bridge shipped with the installed
   `@azure/msal-browser` package. The Angular build copies it to
   `assets/msal/msal-redirect-bridge.min.js`; deploy that file together with
   `assets/auth-callback.html` and `assets/auth-callback.js`. A blank callback
   page cannot complete MSAL 5 popup sign-in. Do not route the callback through
   the Angular app or remove its scripts.

```json
{
  "clientId": "5b2b4e8a-53cf-4295-990d-71a34962aadb",
  "tenantId": "12a4b86b-e64c-43f9-af05-d9130a72dfd2",
  "workspaceId": "39c02d65-d2cb-4355-9e77-cbf442d7fc8b",
  "reportId": "PENDING",
  "preferredReportName": "PMO Executive Dashboard",
  "scopes": ["https://analysis.windows.net/powerbi/api/Report.Read.All"]
}
```

---

## 5. Local Development & Testing

You can run the entire solution locally for development, demonstration, and offline evaluation:

### Running the Frontend UI

```powershell
cd ui

# 1. Install dependencies
npm install

# 2. Run unit tests (Vitest)
npm test

# 3. Build production bundle
npm run build

# 4. Start local development server
npm start
```

The UI will be accessible at `http://localhost:4200` with full 100-project data, responsive layouts, and the AI Copilot Agent.

### Running the Backend API

```powershell
cd api

# 1. Sync virtual environment
uv sync

# 2. Run API test suite
pytest

# 3. Start local FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive Swagger API documentation will be available at `http://localhost:8000/docs`.

---

## 6. User Guide & Operational Documentation

For an in-depth walkthrough of all user interface screens, the AI Copilot Agent, and responsive device layouts:

- 📖 **Markdown User Guide**: [`docs/USER_GUIDE.md`](USER_GUIDE.md)
- 🗑️ **Trashed Projects & Audit Lifecycle (`/trash`)**: soft-delete management, restore, and permanent purge
- ✏️ **URL-Based Project Edit (`/projects/:projectId/edit`)**: field-level AI vs. Human provenance badges with confidence tooltips, supporting document uploads into OneLake, AI-driven recalculation, and complete calculation methodology transparency (LightGBM, MCDA weighted formula, governance rule floors)

To regenerate the user guide and high-resolution screenshots using Playwright at any time:

```powershell
cd ui
node scripts/capture_guide.mjs
```

---

## 7. Troubleshooting & Verification

| Symptom | Diagnostic Step | Resolution |
|---|---|---|
| **App Service returns 503** | Run `az webapp log tail --name azui... --resource-group m365-myaacoub` | Check startup command in `infra/config/pmo-deployment.json`. Ensure `ui/www` bundle exists before deployment. |
| **APIM 401 Unauthorized** | Inspect request headers for `Ocp-Apim-Subscription-Key`. | Verify the UI server retrieves the secret from Key Vault via Managed Identity. |
| **No Data in OneLake Banner** | Verify `Files/gold/exports/pmo_portfolio_export.json` exists in OneLake. | Run `PMO Full Pipeline` in Fabric or use built-in demo data mode. |
| **Power BI report does not render** | Check the callback redirect URI, `powerbi-embed.json`, and Entra ID permissions. | Ensure the callback URL is registered, the user has Fabric Viewer permission, and popup blockers are disabled for MSAL login. |

---

*AI-Powered PMO Portfolio Prioritization — Azure Setup Guide Version 2.0*
