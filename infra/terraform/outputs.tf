output "ui_url" {
  description = "Hosted UI URL."
  value       = "https://${azurerm_linux_web_app.ui.default_hostname}"
}

output "api_url" {
  description = "Hosted API URL (behind APIM for clients)."
  value       = "https://${azurerm_linux_web_app.api.default_hostname}"
}

output "api_swagger_url" {
  description = "Swagger UI for the API."
  value       = "https://${azurerm_linux_web_app.api.default_hostname}${local.create.apps.api.docsPath}"
}

output "apim_api_base_url" {
  description = "Gateway base URL for the API through APIM."
  value       = "${local.gateway}/${local.apim_api.path}"
}

output "key_vault_name" {
  description = "Key Vault that holds the APIM subscription key."
  value       = azurerm_key_vault.solution.name
}

output "key_vault_uri" {
  description = "Key Vault URI."
  value       = azurerm_key_vault.solution.vault_uri
}

output "identity_client_id" {
  description = "Client ID of the user-assigned managed identity used by both apps."
  value       = azurerm_user_assigned_identity.solution.client_id
}

output "identity_principal_id" {
  description = "Principal ID of the user-assigned managed identity. Grant it Fabric workspace access."
  value       = azurerm_user_assigned_identity.solution.principal_id
}

output "app_insights_name" {
  description = "Application Insights resource name."
  value       = azurerm_application_insights.solution.name
}

output "ui_app_name" {
  description = "UI App Service name."
  value       = azurerm_linux_web_app.ui.name
}

output "api_app_name" {
  description = "API App Service name."
  value       = azurerm_linux_web_app.api.name
}

output "foundry_project_name" {
  description = "Foundry project name, or empty when not deployed."
  value       = try(azapi_resource.foundry_project[0].name, "")
}
