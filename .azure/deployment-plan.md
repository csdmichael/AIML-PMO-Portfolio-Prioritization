# Azure Deployment Plan

> **Status:** Deployed

Generated: 2026-10-14T13:52:00-07:00

---

## 1. Project Overview

**Goal:** Publish commit `312d754` containing the repaired portfolio dashboards, Power BI authentication/embed flow, hierarchy rendering, and compact navigation/filter layout to the existing production UI.

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

**Rationale:** The repository already has a tested UI-only App Service ZIP publish workflow. This deployment reuses the existing resource and does not provision or modify infrastructure.

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
  - [x] Core validation: Azure CLI, authentication, production UI build, existing App Service target
  - [x] Docker build: not applicable; deployment is a Python-hosted static UI ZIP
  - [x] Azure Policy validation: no infrastructure or policy-governed resource changes
- [x] Publish UI only with `infra/scripts/deploy.ps1 -Mode publish -Component ui`
- [x] Verify `https://azuittlyg2gcvfsso.azurewebsites.net/healthz`
- [x] Verify `https://azuittlyg2gcvfsso.azurewebsites.net/assets/auth-callback.html`
- [x] Verify production overview, hierarchy, and Power BI pages

---

## 8. Validation Proof

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

**Target:** `https://azuittlyg2gcvfsso.azurewebsites.net`

**Scope:** UI application package only. No infrastructure deployment.

**Rollback:** Use the App Service deployment history to redeploy the prior successful package if production verification fails.
