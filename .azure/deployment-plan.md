# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-10-14T13:52:00-07:00

---

## 1. Project Overview

**Goal:** Publish `pmo-portfolio-copilot:2` with backend-mediated read-only Fabric queries through private APIM, not full-snapshot prompting. Publish both supplied ML diagrams in README, architecture documentation, and UI screens.

**Current update (2026-10-21):** Publish the user-approved not-started-only recommendation policy, protected project progress and dates, full-register duplicate checks, state-aware recommendation caching, and project > portfolio > global priority weights applied to saved analysis. Update the main README, in-app documentation, original runtime diagram, and showcase feature catalog. Reuse the API/UI GitHub Actions with serialized shared-plan publishing and the existing showcase ZIP deployment. Publish recommendation agent version 3 with the same model and connections, refresh only the existing APIM tool schema/description, register the missing progress route, and publish the changed inference notebook without executing it. No infrastructure provisioning, identities/RBAC, capacity, network changes, or live project mutations.

**Follow-up UI correction (2026-10-21):** The user reported a generic project-save rejection. Save scope/description in the existing Notes field instead of the unsupported projectDescription key; show the API's actual field/message errors; mark Effort required; validate required inputs and configured numeric limits before submission; explain the description limit without truncating entered text. Publish UI-only; the existing API contract and project data are unchanged.

**Approved recovery (2026-10-20):** The shared plan measured 100% CPU and 83-88% memory, and API platform logs confirmed the new container exceeded the default 230-second startup probe. The user approved extending only the three apps' startup allowance to 1,800 seconds. Preserve the main API/UI values in the shared JSON contract and both IaC flavors; apply only the individual app setting to existing sites, without a full infrastructure apply. Do not interrupt active remote builds or change shared-plan capacity, permissions, networking, or project data.

**Path:** Modify Existing

**Current update (2026-10-22):** App-only API/UI release plus both rebuilt Fabric notebooks. Correct agent analysis-state counts and use cache-first recommendations; add the Prioritization pipeline action and UI-entry ingestion; configure relative sponsor scores; preserve Overview averages when unscored projects are added. User explicitly requested commit, publish and deploy and confirmed the existing subscription. Reuse existing main-branch API/UI/Fabric workflows; no infrastructure apply, network changes, new permissions, capacity changes, or automatic pipeline execution. Publish notebook definitions only; pipeline execution remains an explicit UI action.

**Agent request correction (2026-10-22):** Reproduced chat HTTP 502 through the deployed UI proxy. Direct Foundry A/B requests returned HTTP 400 `invalid_payload`, parameter `reasoning`, message "Not allowed when agent is specified"; the same agent-reference request without the override returned HTTP 200. Remove request-level reasoning configuration and cover chat, recommendations and intake request payloads with regression tests. Publish API-only through the existing workflow, then exercise both affected live endpoints. Preserve agent versions, identities, permissions, networking, cache-first recommendations and tool/evidence validation.

**User-requested saved ranking correction (2026-10-22):** The user clarified that chat must show the top five saved Must-do-now projects even when current scoring inputs need a refresh. Rank the complete matching analyzed set uniformly by saved scores when current analysis is incomplete; expose the score basis and keep current score/state separate. Label saved scores in chat, preserve source-order ties and citations, exclude new/reset/deleted work, and never write or fabricate scores. API-only publication; no infrastructure, permission or agent-version changes.

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
  - [x] 2026-10-22 1. Core Validation: 334 API tests passed, one opt-in live test skipped; 170 UI tests passed; production build and shared config/OpenAPI checks passed. Azure CLI/auth and read-only template validation/what-if returned OVERALL PASS. What-if shows 16 create, 35 modify, 35 delete: no infrastructure apply is authorized or will run.
  - [x] 2026-10-22 2. Docker Build: not applicable to the existing Python App Service ZIP hosting.
  - [x] 2026-10-22 3. Azure Policy Validation: resource-group policy query returned empty; both existing app targets are Running. Preserve all existing network and identity scopes.
  - [x] Current release 1. Core Validation: CLI/auth, API tests (304 passed, one opt-in live test skipped), production builds, shared configuration/OpenAPI consistency, PowerShell gateway tests and existing targets pass. UI: 135 unique tests passed across the full run (134 passed) and corrected architecture subset (4 passed). Changed-file TypeScript lint passes. Full Bicep validate/what-if is outside this app-only release and is not being applied.
  - [x] Current release 2. Docker Build: not applicable; existing built-in Python App Service runtimes.
  - [x] Current release 3. Azure Policy Validation: applicable resource-group policy assignments returned empty; all three existing apps are Running, APIM public access remains Disabled, and the approved 1,800-second API startup allowance is preserved.
  - [x] Recovery core validation: JSON startup values and compiled Bicep settings match 1,800 seconds; Bicep lint and Terraform validation pass; existing deployment identity has app-configuration permissions. No full infrastructure validation/apply is needed for the scoped existing-app setting update.
  - [x] Recovery Docker build: not applicable; existing built-in Python App Service runtime.
  - [x] Recovery Azure Policy validation: no applicable policy assignments were returned for the existing resource group, including inherited scopes.
  - [x] Core validation for this app-only update: Azure CLI/authentication, API/UI tests, main/showcase builds, and existing App Service targets; Bicep validate/what-if is not an application-publish gate because no IaC changes are being applied
  - [x] Docker build: not applicable; Python App Service ZIPs
  - [x] Azure Policy validation: existing running app resources and build settings verified; resource-group policy assignments empty; no hosting resources, identities, SKUs, or network settings change
  - [x] Scoped activation preview: dedicated tool identity/app role, APIM JWT policy, API outbound VNet integration; APIM public access must remain disabled
  - [x] Static permission review: dedicated tool caller only has Portfolio.Query on the tool API audience; adapter retains existing OneLake identity; Foundry runtime role remains project-scoped
  - [x] Changed UI surfaces lint clean; production build succeeds. Full UI lint has unrelated pre-existing no-output-native violation in edit-project-modal.component.ts
- [x] Publish UI only with `infra/scripts/deploy.ps1 -Mode publish -Component ui`
- [x] Verify `https://azuittlyg2gcvfsso.azurewebsites.net/healthz`
- [x] Verify `https://azuittlyg2gcvfsso.azurewebsites.net/assets/auth-callback.html`
- [x] Verify production overview, hierarchy, and Power BI pages

---

## 8. Validation Proof

- 2026-10-22 saved ranking live verification: API workflow `39860842688` succeeded for `9ab8fbc`. The deployed integration test passed against exact saved IDs/order/scores. Playwright verified the existing top-five suggestion returned 200 and rendered all five named projects with last saved score 90.0 and project citations. A preliminary test run correctly matched IDs/order but exposed a supported score-cell suffix `(saved)`; the live assertion now accepts that explicit label without weakening numeric comparisons. Keep analysis counts scoped to query filters and omit unrelated counts from ranking answers.
- 2026-10-22 saved ranking correction: six focused regressions reproduced the missing top five, mixed-score/tie behavior and invalid saved-score failures. All 343 API tests passed after correction, with one opt-in live test skipped; shared config and OpenAPI consistency checks passed. Read-only live export confirms the five highest saved Must-do-now IDs are GIS-0009, GIS-0010, GIS-0012, GIS-0017 and GIS-0019, each with saved score 90. Deployment and live chat must be verified against these exact IDs and order.
- 2026-10-22 agent correction deployment: API workflow `39858317789` succeeded for commit `2418a5b`. The first probes reached the outgoing worker; an explicit existing-app restart activated the release, and API health then returned 200. The opt-in deployed chat integration test passed. Playwright verified the actual Copilot suggestion returned 200 in 7.1 seconds with query provenance. Recommendations generated and saved a valid grounded report; reload showed the saved report in 5.7 seconds with zero refresh/generation requests and no error card. One earlier generated proposal was rejected by the existing Planning/name safeguard; retry succeeded without relaxing validation. No project or decision actions were applied.
- 2026-10-22 agent request correction: focused regression tests first reproduced three failures for the unsupported reasoning override. After removing it, 337 API tests passed and one opt-in live test skipped. Shared config and generated OpenAPI checks passed. A corrected real Foundry/OneLake chat round trip completed in 11.4 seconds with validated query provenance, accurately reporting 45 registered Must-do-now projects awaiting refreshed scoring evidence. Azure CLI confirmed the previously approved subscription and existing API target Running. No identity, permission, infrastructure or live project changes.
- 2026-10-22 20:38 UTC: `api\.venv\Scripts\python.exe -m pytest -q` from API: 334 passed, one optional live test skipped, exit 0. `npm test -- --watch=false` from UI: 29 files, 170 tests passed; `npm run build`: exit 0. Shared config checks, generated OpenAPI, notebook `--all --check`, gateway operation/schema tests passed. Local full Spark execution remains unverified: notebook runtime dependency restoration was blocked by the package host TLS handshake; pure notebook input/scoring regression tests passed.
- 2026-10-22 20:38 UTC: `validate-deployment.ps1 -Scope group -ResourceGroup m365-myaacoub -Template infra\bicep\main.bicep -Parameters infra\bicep\main.parameters.json -Subscription cf824570-a8ba-497a-a184-0a52f1830aa9`: OVERALL PASS. What-if (16 create / 35 modify / 35 delete) is informational only; no infrastructure apply. `az webapp list` verified existing UI/API Running; policy assignments empty. User confirmed existing subscription. App-only publish and notebook definition deployment only.

- 2026-10-21 project-save correction: four targeted regression tests reproduced the old failure. After correction, all 24 Data Entry tests pass, changed-file ESLint passes, and the production UI build succeeds. An in-memory API reproduction confirmed the old projectDescription key returns 422 with a field-specific issue and no writes; sending the same description as Notes succeeds. The UI regression retains the canonical-payload assertion. No live projects were created for verification.
- 2026-10-21 current release: `uv run pytest -q --tb=short` passed 304 tests with one opt-in live-agent test skipped; `tools.sync_shared_config --check` passes and generated OpenAPI includes project progress. Both `npm run build` production builds passed. `npm test -- --watch=false` passed 134 UI tests; updating the changed diagram expectation and rerunning the four-test architecture subset passed, covering all 135 unique tests. Changed-file ESLint passes. Both PowerShell gateway suites passed, including preservation of the existing tool request/responses and explicit failures without policy, identity or network writes. Exact HTTP integration verifies scores 70.2 (global), 58.2 (portfolio), and 70.2 (project), immediate list/detail/export updates, preserved model evidence, pending null scores, and recommendation revision invalidation. Azure CLI is authenticated to the approved subscription/tenant; all existing targets are running, no applicable resource-group policies were returned, APIM stays private, and no new roles or hosting resources are introduced. Static role review: this release leaves all Bicep/Terraform role assignments unchanged; the SchemaOnly publication branch returns before the existing provisioning/identity routines.

- 2026-10-20 approved startup recovery: Bicep build and lint passed; an exact-output check confirmed both generated startup settings reference the JSON-backed 1,800-second integer values. Terraform validate and git diff --check passed. The active CLI context matches the approved subscription/tenant, ARM permissions on the API include configuration write access, and the applicable policy-assignment query returned an empty list. This validates only the approved existing-app setting update, not a full infrastructure apply. No roles, network settings, capacity, or project data change.
- 2026-10-20 preparation: API suite passed 208 tests with one opt-in test skipped. UI suite passed 114 tests; focused chart and presentation suite passed 66 tests. UI lint and production build passed. Shared configuration check passed, and the OpenAPI document was regenerated.
- 2026-10-20 final checks: native PowerShell gateway synchronization tests passed complete OpenAPI coverage, path-parameter registration, no overwrites of existing operations, and explicit failure handling. The final Overview subset passed all three tests. Showcase production browser verified 20 feature cards, their icons, and the six-chart guidance description. All three existing App Service targets are running; main API health, live UI portfolio read (100 projects), and showcase health return success. There are no RBAC/IaC changes to apply, and no resource-group policy assignments.
- 2026-10-20 source publication: the dedicated approved demo snapshot was published and read back with exactly 100 projects across five portfolios (40/20/15/10/15). Scores and explanations were retained; the one missing project name was restored from the deterministic generator and audited. A read-only check confirmed no active reset document exists.
- 2026-10-20 deployment scope: existing resource group m365-myaacoub and approved subscription/tenant confirmed. API target azapittlyg2gcvfsso, UI target azuittlyg2gcvfsso, showcase target caldova-pmo-showcase (West US 2, Python 3.12, existing Uvicorn startup). Main app uses existing CI/CD; showcase uses the existing server, requirements and built www assets. Missing operations on the existing APIM API must be registered from the current OpenAPI document, preserving existing operation policies. No new hosting resources, permission changes, network changes, or full infrastructure deployment are authorized or needed.

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

- 2026-10-22: Existing API user-assigned runtime and tools identities confirmed. Static template review retains Key Vault-scoped Secrets Officer only; no role, identity or infrastructure changes are in this release. The app-only workflow reuses these assignments.

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
