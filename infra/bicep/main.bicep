targetScope = 'resourceGroup'

@description('Environment name. It is part of the unique token, so changing it creates a new set of resources.')
param environmentName string

@description('Create the Foundry project under the reused Foundry account.')
param deployFoundryProject bool = true

@description('Tags applied to every created resource.')
param tags object = {}

var cfg = loadJsonContent('../config/pmo-deployment.json')
var location = cfg.location
var create = cfg.create
var lead = create.nameLead
var token = uniqueString(subscription().id, resourceGroup().id, location, environmentName)

var logAnalyticsName = '${lead}${create.logAnalytics.resourcePrefix}${token}'
var appInsightsName = '${lead}${create.appInsights.resourcePrefix}${token}'
var keyVaultName = '${lead}${create.keyVault.resourcePrefix}${token}'
var identityName = '${lead}${create.identity.resourcePrefix}${token}'
var diagnosticsName = '${lead}${create.diagnostics.resourcePrefix}${token}'
var uiAppName = '${lead}${create.apps.ui.resourcePrefix}${token}'
var apiAppName = '${lead}${create.apps.api.resourcePrefix}${token}'
var foundryProjectName = '${lead}${create.foundryProject.resourcePrefix}${token}'
var apimApiName = '${lead}${create.apimApi.resourcePrefix}${token}'
var apimProductName = '${lead}${create.apimApi.productResourcePrefix}${token}'
var apimSubscriptionName = '${lead}${create.apimApi.subscriptionResourcePrefix}${token}'

resource apim 'Microsoft.ApiManagement/service@2024-05-01' existing = {
  name: cfg.reuse.apim.name
}

resource foundryAccount 'Microsoft.CognitiveServices/accounts@2025-06-01' existing = {
  name: cfg.reuse.foundryAccount.name
}

resource appServicePlan 'Microsoft.Web/serverfarms@2024-04-01' existing = {
  name: cfg.reuse.appServicePlan.name
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
  tags: tags
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: create.logAnalytics.retentionDays
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: cfg.tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
  }
}

resource identitySecretsOfficer 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, identity.id, create.keyVault.secretsOfficerRoleId)
  scope: keyVault
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', create.keyVault.secretsOfficerRoleId)
  }
}

resource apimProduct 'Microsoft.ApiManagement/service/products@2024-05-01' = {
  parent: apim
  name: apimProductName
  properties: {
    displayName: create.apimApi.productDisplayName
    description: 'PMO portfolio prioritization data, scores, and recommendations.'
    state: 'published'
    subscriptionRequired: true
    approvalRequired: false
  }
}

resource apimApi 'Microsoft.ApiManagement/service/apis@2024-05-01' = {
  parent: apim
  name: apimApiName
  properties: {
    displayName: create.apimApi.displayName
    path: create.apimApi.path
    format: 'openapi+json'
    value: loadTextContent('../../docs/api/openapi.json')
    serviceUrl: 'https://${apiApp.properties.defaultHostName}'
    protocols: [
      'https'
    ]
    subscriptionRequired: true
  }
}

resource apimProductApi 'Microsoft.ApiManagement/service/products/apis@2024-05-01' = {
  parent: apimProduct
  name: apimApiName
  dependsOn: [
    apimApi
  ]
}

resource apimSubscription 'Microsoft.ApiManagement/service/subscriptions@2024-05-01' = {
  parent: apim
  name: apimSubscriptionName
  properties: {
    displayName: create.apimApi.subscriptionDisplayName
    scope: apimProduct.id
    state: 'active'
  }
}

resource keyVaultSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: create.keyVault.secretName
  tags: tags
  properties: {
    value: apimSubscription.listSecrets().primaryKey
  }
  dependsOn: [
    identitySecretsOfficer
  ]
}

resource uiApp 'Microsoft.Web/sites@2024-04-01' = {
  name: uiAppName
  location: location
  kind: 'app,linux'
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    keyVaultReferenceIdentity: identity.id
    siteConfig: {
      linuxFxVersion: create.apps.ui.runtimeStack
      appCommandLine: create.apps.ui.startupCommand
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      cors: {
        allowedOrigins: [
          apim.properties.gatewayUrl
        ]
      }
      appSettings: [
        { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
        { name: 'PORT', value: string(create.apps.ui.port) }
        { name: 'WEBSITES_PORT', value: string(create.apps.ui.port) }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'ENABLE_ORYX_BUILD', value: 'true' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'APIM_BASE_URL', value: '${apim.properties.gatewayUrl}/${create.apimApi.path}' }
        { name: 'APIM_SUBSCRIPTION_KEY', value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/${create.keyVault.secretName})' }
      ]
    }
  }
  dependsOn: [
    identitySecretsOfficer
    keyVaultSecret
  ]
}

resource apiApp 'Microsoft.Web/sites@2024-04-01' = {
  name: apiAppName
  location: location
  kind: 'app,linux'
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    keyVaultReferenceIdentity: identity.id
    siteConfig: {
      linuxFxVersion: create.apps.api.runtimeStack
      appCommandLine: create.apps.api.startupCommand
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      cors: {
        allowedOrigins: [
          apim.properties.gatewayUrl
          'https://${uiApp.properties.defaultHostName}'
        ]
      }
      appSettings: [
        { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
        { name: 'PORT', value: string(create.apps.api.port) }
        { name: 'WEBSITES_PORT', value: string(create.apps.api.port) }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'ENABLE_ORYX_BUILD', value: 'true' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
      ]
    }
  }
  dependsOn: [
    identitySecretsOfficer
  ]
}

resource uiDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: diagnosticsName
  scope: uiApp
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      { category: 'AppServiceHTTPLogs', enabled: true }
      { category: 'AppServiceConsoleLogs', enabled: true }
      { category: 'AppServiceAppLogs', enabled: true }
      { category: 'AppServicePlatformLogs', enabled: true }
    ]
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
}

resource apiDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: diagnosticsName
  scope: apiApp
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      { category: 'AppServiceHTTPLogs', enabled: true }
      { category: 'AppServiceConsoleLogs', enabled: true }
      { category: 'AppServiceAppLogs', enabled: true }
      { category: 'AppServicePlatformLogs', enabled: true }
    ]
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
}

resource foundryProject 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = if (deployFoundryProject) {
  parent: foundryAccount
  name: foundryProjectName
  location: cfg.reuse.foundryAccount.location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    displayName: create.foundryProject.displayName
    description: create.foundryProject.description
  }
}

output uiUrl string = 'https://${uiApp.properties.defaultHostName}'
output apiUrl string = 'https://${apiApp.properties.defaultHostName}'
output apiSwaggerUrl string = 'https://${apiApp.properties.defaultHostName}${create.apps.api.docsPath}'
output apimApiBaseUrl string = '${apim.properties.gatewayUrl}/${create.apimApi.path}'
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
output identityClientId string = identity.properties.clientId
output identityPrincipalId string = identity.properties.principalId
output appInsightsName string = appInsights.name
output uiAppName string = uiApp.name
output apiAppName string = apiApp.name
output foundryProjectName string = deployFoundryProject ? foundryProject!.name : ''
