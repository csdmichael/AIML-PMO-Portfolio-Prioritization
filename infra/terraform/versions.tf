terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azapi = {
      source  = "azure/azapi"
      version = "~> 2.0"
    }
    azurecaf = {
      source  = "aztfmod/azurecaf"
      version = "~> 1.2"
    }
  }
}

provider "azurerm" {
  subscription_id = local.config.subscriptionId
  tenant_id       = local.config.tenantId
  features {}
}

provider "azapi" {
  subscription_id = local.config.subscriptionId
  tenant_id       = local.config.tenantId
}

provider "azurecaf" {}
