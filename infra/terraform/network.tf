data "azurerm_private_dns_zone" "vault" {
  name                = local.config.reuse.privateDnsZones.vault.name
  resource_group_name = local.config.reuse.privateDnsZones.vault.resourceGroup
}

resource "azurecaf_name" "key_vault_pe" {
  name          = local.create.baseName
  resource_type = "azurerm_private_endpoint"
}

resource "azurerm_private_endpoint" "key_vault" {
  name                = azurecaf_name.key_vault_pe.result
  location            = local.config.reuse.apim.location
  resource_group_name = data.azurerm_resource_group.solution.name
  subnet_id           = local.config.reuse.keyVaultPrivateEndpointSubnetId
  tags                = local.tags

  private_service_connection {
    name                           = azurerm_key_vault.solution.name
    private_connection_resource_id = azurerm_key_vault.solution.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.vault.id]
  }
}

resource "azurerm_app_service_virtual_network_swift_connection" "ui" {
  app_service_id = azurerm_linux_web_app.ui.id
  subnet_id      = local.config.reuse.vnetIntegrationSubnetId
}
