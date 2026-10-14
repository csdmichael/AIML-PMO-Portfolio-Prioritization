locals {
  config   = jsondecode(file("${path.module}/../config/pmo-deployment.json"))
  location = local.config.location
  create   = local.config.create
  tags     = merge(var.tags, { environment = var.environment_name })
  gateway  = data.azurerm_api_management.apim.gateway_url
  apim_api = local.create.apimApi
  kv_role  = "/subscriptions/${local.config.subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${local.create.keyVault.secretsOfficerRoleId}"
}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "solution" {
  name = local.config.resourceGroup
}

data "azurerm_api_management" "apim" {
  name                = local.config.reuse.apim.name
  resource_group_name = local.config.reuse.apim.resourceGroup
}

data "azurerm_service_plan" "plan" {
  name                = local.config.reuse.appServicePlan.name
  resource_group_name = local.config.reuse.appServicePlan.resourceGroup
}

data "azurerm_cognitive_account" "foundry" {
  name                = local.config.reuse.foundryAccount.name
  resource_group_name = local.config.reuse.foundryAccount.resourceGroup
}

resource "azurecaf_name" "identity" {
  name          = local.create.baseName
  resource_type = "azurerm_user_assigned_identity"
}

resource "azurecaf_name" "log" {
  name          = local.create.baseName
  resource_type = "azurerm_log_analytics_workspace"
}

resource "azurecaf_name" "appi" {
  name          = local.create.baseName
  resource_type = "azurerm_application_insights"
}

resource "azurecaf_name" "kv" {
  name          = local.create.baseName
  resource_type = "azurerm_key_vault"
}

resource "azurecaf_name" "ui" {
  name          = "${local.create.baseName}-ui"
  resource_type = "azurerm_app_service"
}

resource "azurecaf_name" "api" {
  name          = "${local.create.baseName}-api"
  resource_type = "azurerm_app_service"
}

resource "azurecaf_name" "foundry" {
  name          = local.create.foundryProject.name
  resource_type = "azurerm_cognitive_account"
}

resource "azurerm_user_assigned_identity" "solution" {
  name                = azurecaf_name.identity.result
  location            = local.location
  resource_group_name = data.azurerm_resource_group.solution.name
  tags                = local.tags
}

resource "azurerm_log_analytics_workspace" "solution" {
  name                = azurecaf_name.log.result
  location            = local.location
  resource_group_name = data.azurerm_resource_group.solution.name
  sku                 = "PerGB2018"
  retention_in_days   = local.create.logAnalytics.retentionDays
  tags                = local.tags
}

resource "azurerm_application_insights" "solution" {
  name                = azurecaf_name.appi.result
  location            = local.location
  resource_group_name = data.azurerm_resource_group.solution.name
  workspace_id        = azurerm_log_analytics_workspace.solution.id
  application_type    = "web"
  tags                = local.tags
}

resource "azurerm_key_vault" "solution" {
  name                          = azurecaf_name.kv.result
  location                      = local.location
  resource_group_name           = data.azurerm_resource_group.solution.name
  tenant_id                     = local.config.tenantId
  sku_name                      = "standard"
  rbac_authorization_enabled    = true
  public_network_access_enabled = true
  soft_delete_retention_days    = 7
  purge_protection_enabled      = false
  tags                          = local.tags
}

resource "azurerm_role_assignment" "identity_secrets_officer" {
  scope              = azurerm_key_vault.solution.id
  role_definition_id = local.kv_role
  principal_id       = azurerm_user_assigned_identity.solution.principal_id
  principal_type     = "ServicePrincipal"
}

resource "azurerm_role_assignment" "deployer_secrets_officer" {
  scope              = azurerm_key_vault.solution.id
  role_definition_id = local.kv_role
  principal_id       = data.azurerm_client_config.current.object_id
}

resource "azurerm_api_management_product" "pmo" {
  product_id            = local.apim_api.productName
  api_management_name   = data.azurerm_api_management.apim.name
  resource_group_name   = data.azurerm_api_management.apim.resource_group_name
  display_name          = local.apim_api.productDisplayName
  description           = "PMO portfolio prioritization data, scores, and recommendations."
  subscription_required = true
  approval_required     = false
  published             = true
}

resource "azurerm_api_management_api" "pmo" {
  name                  = local.apim_api.name
  api_management_name   = data.azurerm_api_management.apim.name
  resource_group_name   = data.azurerm_api_management.apim.resource_group_name
  revision              = "1"
  display_name          = local.apim_api.displayName
  path                  = local.apim_api.path
  protocols             = ["https"]
  service_url           = "https://${azurerm_linux_web_app.api.default_hostname}"
  subscription_required = true

  import {
    content_format = "openapi+json"
    content_value  = file("${path.module}/../../${local.apim_api.openApiFile}")
  }
}

resource "azurerm_api_management_product_api" "pmo" {
  api_name            = azurerm_api_management_api.pmo.name
  product_id          = azurerm_api_management_product.pmo.product_id
  api_management_name = data.azurerm_api_management.apim.name
  resource_group_name = data.azurerm_api_management.apim.resource_group_name
}

resource "azurerm_api_management_subscription" "pmo_ui" {
  display_name        = local.apim_api.subscriptionDisplayName
  api_management_name = data.azurerm_api_management.apim.name
  resource_group_name = data.azurerm_api_management.apim.resource_group_name
  product_id          = azurerm_api_management_product.pmo.id
  state               = "active"
  allow_tracing       = false
}

resource "azurerm_key_vault_secret" "apim_subscription_key" {
  name         = local.create.keyVault.secretName
  value        = azurerm_api_management_subscription.pmo_ui.primary_key
  key_vault_id = azurerm_key_vault.solution.id
  depends_on   = [azurerm_role_assignment.deployer_secrets_officer]
}

resource "azurerm_linux_web_app" "ui" {
  name                            = azurecaf_name.ui.result
  location                        = local.location
  resource_group_name             = data.azurerm_resource_group.solution.name
  service_plan_id                 = data.azurerm_service_plan.plan.id
  https_only                      = true
  key_vault_reference_identity_id = azurerm_user_assigned_identity.solution.id
  tags                            = local.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.solution.id]
  }

  site_config {
    always_on           = true
    ftps_state          = "Disabled"
    minimum_tls_version = "1.2"
    http2_enabled       = true
    app_command_line    = local.create.apps.ui.startupCommand

    application_stack {
      python_version = "3.12"
    }

    cors {
      allowed_origins = [local.gateway]
    }
  }

  app_settings = {
    AZURE_CLIENT_ID                       = azurerm_user_assigned_identity.solution.client_id
    PORT                                  = tostring(local.create.apps.ui.port)
    WEBSITES_PORT                         = tostring(local.create.apps.ui.port)
    SCM_DO_BUILD_DURING_DEPLOYMENT        = "true"
    ENABLE_ORYX_BUILD                     = "true"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.solution.connection_string
    APIM_BASE_URL                         = "${local.gateway}/${local.apim_api.path}"
    APIM_SUBSCRIPTION_KEY                 = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.solution.vault_uri}secrets/${azurerm_key_vault_secret.apim_subscription_key.name})"
  }

  depends_on = [
    azurerm_role_assignment.identity_secrets_officer,
    azurerm_key_vault_secret.apim_subscription_key,
  ]
}

resource "azurerm_linux_web_app" "api" {
  name                            = azurecaf_name.api.result
  location                        = local.location
  resource_group_name             = data.azurerm_resource_group.solution.name
  service_plan_id                 = data.azurerm_service_plan.plan.id
  https_only                      = true
  key_vault_reference_identity_id = azurerm_user_assigned_identity.solution.id
  tags                            = local.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.solution.id]
  }

  site_config {
    always_on           = true
    ftps_state          = "Disabled"
    minimum_tls_version = "1.2"
    http2_enabled       = true
    app_command_line    = local.create.apps.api.startupCommand

    application_stack {
      python_version = "3.12"
    }

    cors {
      allowed_origins = [local.gateway, "https://${azurerm_linux_web_app.ui.default_hostname}"]
    }
  }

  app_settings = {
    AZURE_CLIENT_ID                       = azurerm_user_assigned_identity.solution.client_id
    PORT                                  = tostring(local.create.apps.api.port)
    WEBSITES_PORT                         = tostring(local.create.apps.api.port)
    SCM_DO_BUILD_DURING_DEPLOYMENT        = "true"
    ENABLE_ORYX_BUILD                     = "true"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.solution.connection_string
  }

  depends_on = [azurerm_role_assignment.identity_secrets_officer]
}

resource "azurerm_monitor_diagnostic_setting" "ui" {
  name                       = "diag-${local.create.baseName}-ui"
  target_resource_id         = azurerm_linux_web_app.ui.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.solution.id

  enabled_log {
    category = "AppServiceHTTPLogs"
  }
  enabled_log {
    category = "AppServiceConsoleLogs"
  }
  enabled_log {
    category = "AppServiceAppLogs"
  }
  enabled_log {
    category = "AppServicePlatformLogs"
  }
  enabled_metric {
    category = "AllMetrics"
  }
}

resource "azurerm_monitor_diagnostic_setting" "api" {
  name                       = "diag-${local.create.baseName}-api"
  target_resource_id         = azurerm_linux_web_app.api.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.solution.id

  enabled_log {
    category = "AppServiceHTTPLogs"
  }
  enabled_log {
    category = "AppServiceConsoleLogs"
  }
  enabled_log {
    category = "AppServiceAppLogs"
  }
  enabled_log {
    category = "AppServicePlatformLogs"
  }
  enabled_metric {
    category = "AllMetrics"
  }
}

resource "azapi_resource" "foundry_project" {
  count     = var.deploy_foundry_project ? 1 : 0
  type      = "Microsoft.CognitiveServices/accounts/projects@2025-06-01"
  name      = azurecaf_name.foundry.result
  parent_id = data.azurerm_cognitive_account.foundry.id
  location  = local.config.reuse.foundryAccount.location
  tags      = local.tags

  identity {
    type = "SystemAssigned"
  }

  body = {
    properties = {
      displayName = local.create.foundryProject.displayName
      description = local.create.foundryProject.description
    }
  }
}
