# Azure Deployment Plan

> **Status:** Ready for Validation

Generated: 2026-10-14T13:52:00-07:00

---

## 1. Project Overview

**Goal:** Publish real portfolio agent chat: UI -> UI proxy -> existing APIM -> API -> Foundry `pmo-portfolio-copilot:1`, grounded in server-read OneLake records. Remove browser-generated answers.

**Path:** Modify Existing

---

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Production |
| Scale | Existing deployment |
| Budget | No infrastructure change |
| Subscription | `ME-Caldova37587778-myaacoub-1` (`cf824570-a8ba-497a-a184-0a52f1830aa9`) |
| Location | `westus2` |

---

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| PMO Portfolio UI | Frontend | Ionic Angular 22, TypeScript, ECharts, Power BI Client, MSAL Browser | `ui/` |
| UI static host | Web application | Python 3.12, FastAPI/Uvicorn | `ui/server/` |
| Deployment automation | Deployment script | PowerShell, Azure CLI, App Service ZIP deployment | `infra/scripts/deploy.ps1` |

---

## 4. Recipe Selection

**Selected:** AZCLI

**Rationale:** Reuse App Service ZIP publish for API and UI. Add only one APIM operation for `/v1/agent/chat` to the existing PMO API. No full infrastructure deployment.

---

## 5. Architecture

**Stack:** App Service

### Service Mapping

| Component | Azure Service | SKU |
|-----------|---------------|-----|
| PMO Portfolio UI and static host | Existing Azure App Service `azuittlyg2gcvfsso` | Existing shared App Service plan |

### Supporting Services

| Service | Purpose |
|---------|---------|
| Microsoft Entra ID | SPA authentication for Power BI |
| Microsoft Fabric / Power BI | Workspace report discovery and embedded analytics |
| Application Insights | Existing monitoring and diagnostics |

---

## 6. Provisioning Limit Checklist

This is a code-only deployment to an existing App Service. No Azure resources, plans, instances, public IPs, or quotas will be created or increased.

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|------------------|------------------------|-------------|-------|
| New Azure resources | 0 | Unchanged | Not applicable | Existing App Service ZIP deployment only |

**Status:** All resource limits unchanged.

---

## 7. Execution Checklist

### Phase 1: Planning
- [x] Analyze workspace
- [x] Gather requirements
- [x] Confirm existing subscription and location from repository deployment contract and active Azure context
- [x] Prepare resource inventory
- [x] Confirm no quota-bearing resources will be provisioned
- [x] Scan codebase
- [x] Select recipe
- [x] Plan architecture
- [x] User approved this plan

### Phase 2: Execution
- [x] Validate production build and tests
- [x] Validate active Azure context and existing deployment outputs
- [x] Update plan status to `Ready for Validation`
- [x] Run Azure validation and record proof
- [x] All validation checks pass
  - [ ] Core validation: Azure CLI, authentication, production UI build, existing App Service target, Bicep validation/what-if
  - [x] Docker build: not applicable; Python App Service ZIPs
  - [ ] Azure Policy validation: existing resources and one APIM operation only
- [x] Publish UI only with `infra/scripts/deploy.ps1 -Mode publish -Component ui`
- [x] Verify `https://azuittlyg2gcvfsso.azurewebsites.net/healthz`
- [x] Verify `https://azuittlyg2gcvfsso.azurewebsites.net/assets/auth-callback.html`
- [x] Verify production overview, hierarchy, and Power BI pages

---

## 8. Validation Proof

- 2026-10-17 agent release: Azure CLI identity `admin@caldova37587778.onmicrosoft.com` verified in the approved subscription/tenant. Created and read back `pmo-portfolio-copilot:1` (prompt agent, existing `gpt-5.4-mini` deployment).
- 2026-10-17 agent release: `validate-deployment.ps1` passed all five checks. What-if reported infrastructure drift (17 create, 35 modify, 34 delete); no full infrastructure apply is permitted.
- 2026-10-17 agent release: 32 backend tests and 18 UI-proxy tests passed. A real backend invocation against OneLake and Foundry returned HTTP 200 in 4.9 seconds; top-five table IDs/order matched server-read source records.
- 2026-10-17 agent release: User approved resuming existing F2 Fabric capacity. It is Active, unchanged SKU. Approved PMO pipeline run `c90b582a-077a-4bab-97fa-dda1f4dc0e42` completed and produced a 100-project export at `2026-10-17T18:42:14Z`, verified through the production UI proxy/APIM.
- 2026-10-17 agent release: Runtime identity's existing project-scoped Foundry Project Runtime User assignment verified. API App Service Running, no resource-group policy assignments.
- 2026-10-17: `validate-deployment.ps1 -Scope group -ResourceGroup m365-myaacoub -Template infra\bicep\main.bicep -Parameters infra\bicep\main.parameters.json` returned OVERALL: PASS (CLI, authentication, Bicep compilation, validation, what-if).
- 2026-10-17: What-if still reports 16 create, 35 modify, 33 delete. Infrastructure deployment is explicitly excluded; only `deploy.ps1 -Mode publish -Component ui` is authorized.
- 2026-10-17: `npm run build` passed; targeted Power BI unit tests passed (18 tests); ESLint passed for changed TypeScript.
- 2026-10-17: Real Chromium verified the built callback relays a synthetic authentication response through BroadcastChannel and displays an explicit error for a missing response.
- 2026-10-17: `az webapp show` confirmed the existing production UI is Running; `az ad app show` confirmed local and production callback SPA redirect URIs; resource-group policy assignment list is empty.
- 2026-10-17: Existing Bicep identity and Key Vault-scoped role reviewed; this package-only publish changes no identities, role assignments, configuration, or infrastructure.
- 2026-10-14: Azure CLI authenticated to `ME-Caldova37587778-myaacoub-1`.
- 2026-10-14: Bicep compilation, resource-group validation, and what-if completed successfully.
- 2026-10-14: What-if reported infrastructure drift (16 create, 35 modify, 33 delete); this release will not apply infrastructure and is restricted to UI ZIP publish.
- 2026-10-14: Production Angular build passed.
- 2026-10-14: 19 unit tests passed.
- 2026-10-14: Existing App Service `azuittlyg2gcvfsso` verified running in West US 2.
- 2026-10-14: No resource-group policy assignments apply.
- 2026-10-14: Entra production and local callback URIs verified.
- 2026-10-14: Production overview rendered six populated KPIs and six charts from the live OneLake export.
- 2026-10-14: Production hierarchy rendered 11 business units and 100 project rows.
- 2026-10-14: Production Power BI Direct Lake view rendered three charts and the live embed sign-in surface.
- 2026-10-14: App Service health and authentication callback endpoints returned HTTP 200.

### Role Assignment Verification

- Status: Verified for the unchanged deployment architecture.
- Identities checked: existing solution user-assigned managed identity and Entra SPA registration.
- Roles confirmed in code: Key Vault Secrets Officer scoped to the solution Key Vault; Fabric workspace Contributor is maintained by the existing publish workflow.
- Issues: None applicable to this UI-only package deployment.

---

## 9. Deployment

2026-10-17: Published commit `8615600` using `infra\scripts\deploy.ps1 -Mode publish -Component ui`.
App Service deployment `117b14e5-4fe5-431f-9fde-888d4848c0f6` reported
`RuntimeSuccessful`. Health, callback HTML, callback JavaScript, and the MSAL
bridge each returned HTTP 200. Existing identity's Key Vault Secrets Officer
role was verified live. The deployed Power BI page rendered both dashboard
and live embed views. Interactive sign-in was initiated in the shared browser;
authenticated report rendering still requires user completion and verification.

**Target:** `https://azuittlyg2gcvfsso.azurewebsites.net`

**Scope:** API and UI application ZIPs plus `chatWithPortfolioAgent` APIM operation only. Never apply the full infrastructure template. User authorized creation of the prompt agent, project-scoped runtime access, and resuming existing F2 Fabric capacity to regenerate missing portfolio data.

**Rollback:** Use the App Service deployment history to redeploy the prior successful package if production verification fails.
