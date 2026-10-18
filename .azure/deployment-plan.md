# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-10-14T13:52:00-07:00

---

## 1. Project Overview

**Goal:** Publish `pmo-portfolio-copilot:2` with backend-mediated read-only Fabric queries through private APIM, not full-snapshot prompting. Publish both supplied ML diagrams in README, architecture documentation, and UI screens.

**Path:** Modify Existing

---

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Production |
| Scale | Existing deployment |
| Budget | Existing compute; one dedicated managed identity and Entra tool application; no SKU increase |
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

**Rationale:** Reuse App Service ZIP publish for API and UI. Add chat operation and separate workload-authenticated `pmo-tools` API on existing private APIM. User explicitly approved dedicated identity configuration and API VNet integration on 2026-10-17. Use scoped `configure-agent-tools.ps1`; no full infrastructure apply or public-access changes.

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

This scoped rollout adds one dedicated managed identity, one Entra API application/service principal/app role, and one APIM tool API/operation. API outbound VNet integration uses the existing approved subnet. No public-access settings, capacity SKUs, or unrelated resources are changed. Complete Fabric/Foundry private networking and user-specific authorization remain separate enterprise deployment gates.

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|------------------|------------------------|-------------|-------|
| Dedicated managed identity | 1 | Existing plus one | No compute quota | Tool caller only |
| Entra application / service principal | 1 each | One tool audience | Directory policy applies | One app role |
| APIM API / operation | 1 each | Existing gateway plus one | Existing StandardV2 | No scale change |

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
  - [x] Core validation: Azure CLI, authentication, production UI build, existing App Service target, Bicep validation/what-if
  - [x] Docker build: not applicable; Python App Service ZIPs
  - [x] Azure Policy validation: existing resources plus scoped tool identity/APIM API/VNet integration
  - [x] Scoped activation preview: dedicated tool identity/app role, APIM JWT policy, API outbound VNet integration; APIM public access must remain disabled
  - [x] Static permission review: dedicated tool caller only has Portfolio.Query on the tool API audience; adapter retains existing OneLake identity; Foundry runtime role remains project-scoped
  - [x] Changed UI surfaces lint clean; production build succeeds. Full UI lint has unrelated pre-existing no-output-native violation in edit-project-modal.component.ts
- [x] Publish UI only with `infra/scripts/deploy.ps1 -Mode publish -Component ui`
- [x] Verify `https://azuittlyg2gcvfsso.azurewebsites.net/healthz`
- [x] Verify `https://azuittlyg2gcvfsso.azurewebsites.net/assets/auth-callback.html`
- [x] Verify production overview, hierarchy, and Power BI pages

---

## 8. Validation Proof

- 2026-10-18 architecture tabs: commit `c99e2e1` published in UI deployment `5e9d8058-531b-441f-9aab-546ca5cb207d`. Explicit restart and bundle comparison confirmed the new release (`main-3KTDN6YW.js`), not just an older healthy process. Production browser verified the five tabs in order, Solution Architecture selected by default with its diagram loaded, both ML images loaded (1536/1152 pixels wide), seven pipeline steps, OneLake/services panels, native ArrowRight keyboard selection, and horizontally scrollable tabs at a 390-pixel viewport.

- 2026-10-18 documentation update: Project Fields renders all 24 live intake fields. Focused field/chat/architecture tests passed (13); API suite passed (48, one opt-in test skipped); production build and changed-file lint passed. Follow-up architecture tab tests passed (9 combined architecture/field tests), covering default/ordered tabs, both ML images, single visible panel, all seven steps and retained layer focus.
- 2026-10-18 publication recovery: explicit runtime.txt metadata fixed Oryx platform detection. API deployment `584b46e3-241a-4c1f-8531-afccacd7f6af` is complete/active with Kudu status 4; `/health` verifies OneLake export availability. Azure CLI startup tracking timed out despite success; publisher now uses Kudu completion plus explicit existing health probes instead. UI deployment `fb666061-0f8a-4c85-b437-88ea396a0b2c` succeeded and `/healthz` passed.
- 2026-10-18 live agent gate remains blocked: UI-origin chat reached the backend, but Foundry returned HTTP 403. Project-scoped Foundry Project Runtime User is assigned to the expected runtime identity; Foundry account public access is Enabled with default Allow and no network rules. Do not claim the agent's complete deployed tool round trip has passed. No permissions or network exposure were widened in response.

- 2026-10-17 activation: Foundry `pmo-portfolio-copilot:2` created with `query_portfolio`. Dedicated tool identity/client `2d0fb01a-1389-442f-965d-7d7b91fa4660`, Entra audience `3fb9b744-0f16-48c7-a602-2d8dc5aadc87`, app role, APIM tool API and API VNet integration configured. Existing runtime identity preserved; APIM public access remains Disabled. Recovered bounded directory propagation delay and Azure CLI XML/BOM response handling; deployment script handles both.
- 2026-10-17 version2 release: 47 API tests passed, one opt-in live test skipped; 11 focused UI tests passed; changed UI surfaces lint clean; production build passed. Full UI lint has one unrelated existing `no-output-native` error in `edit-project-modal.component.ts`, not changed in this release.
- 2026-10-17 version2 release: core Azure helper OVERALL PASS; current what-if 16 create, 35 modify, 34 delete. Full infrastructure application remains prohibited. Scoped activation preview passed; gateway public access is Disabled. Resource-group policy assignments empty; subscription policies cover Defender database protections, outside these changes.
- 2026-10-17 agent release: Azure CLI identity `admin@caldova37587778.onmicrosoft.com` verified in the approved subscription/tenant. Created and read back `pmo-portfolio-copilot:1` (prompt agent, existing `gpt-5.4-mini` deployment).
- 2026-10-17 agent release: `validate-deployment.ps1` passed all five checks. What-if reported infrastructure drift (17 create, 35 modify, 34 delete); no full infrastructure apply is permitted.
- 2026-10-17 agent release: 32 backend tests and 18 UI-proxy tests passed. A real backend invocation against OneLake and Foundry returned HTTP 200 in 4.9 seconds; top-five table IDs/order matched server-read source records.
- 2026-10-17 agent release: User approved resuming existing F2 Fabric capacity. It is Active, unchanged SKU. Approved PMO pipeline run `c90b582a-077a-4bab-97fa-dda1f4dc0e42` completed and produced a 100-project export at `2026-10-17T18:42:14Z`, verified through the production UI proxy/APIM.
- 2026-10-17 agent release: Runtime identity's existing project-scoped Foundry Project Runtime User assignment verified. API App Service Running, no resource-group policy assignments.

## Role Assignment Verification

- Status: Verified (static scope review).
- Existing backend identity retains OneLake permissions and project-scoped Foundry Project Runtime User.
- New dedicated caller identity is attached to the API only. Its sole new application permission is `Portfolio.Query` on the dedicated Entra tool API service principal; it gets no Fabric or subscription-wide role.
- `configure-agent-tools.ps1` grants the app role and sets `appRoleAssignmentRequired`. Both APIM and query adapter validate issuer/audience/caller/role. No client secrets are created.
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
