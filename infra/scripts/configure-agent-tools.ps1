[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ApiAppName,
    [Parameter(Mandatory)][string]$FoundryProjectResourceId,
    [switch]$SchemaOnly,
    [switch]$Apply
)

$ErrorActionPreference = "Stop"
$repo = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$cfg = Get-Content -Raw (Join-Path $repo "infra\config\pmo-deployment.json") | ConvertFrom-Json
$agentConfig = Get-Content -Raw (Join-Path $repo "api\config\portfolio-agent.json") | ConvertFrom-Json
if ($agentConfig.projectEndpoint -notmatch '^https://(?<account>[^.]+)\.services\.ai\.azure\.com/api/projects/(?<project>[^/]+)$') {
    throw "The agent project endpoint is not a supported Foundry project URL."
}
$accountName = $Matches.account
$projectName = $Matches.project
$expectedProjectId = "/subscriptions/$($cfg.subscriptionId)/resourceGroups/$($cfg.resourceGroup)/providers/Microsoft.CognitiveServices/accounts/$accountName/projects/$projectName"
if ($FoundryProjectResourceId -ne $expectedProjectId) {
    throw "The approved project resource ID must match portfolio-agent.json."
}
$roleId = "33459c87-266c-43e9-b649-f97d0b133902"
$appName = "PMO Read-only Fabric Query Tools"
$identityName = "$ApiAppName-tools"

function Invoke-AzJson {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    if ($Arguments[0] -eq "rest") {
        $responseFile = Join-Path ([IO.Path]::GetTempPath()) ("pmo-tools-response-" + [guid]::NewGuid().ToString() + ".json")
        try {
            & az @Arguments --output-file $responseFile --output none
            if ($LASTEXITCODE -ne 0) { throw "Azure REST operation failed: $($Arguments[1..2] -join ' ')" }
            if ((Test-Path -LiteralPath $responseFile) -and (Get-Item -LiteralPath $responseFile).Length -gt 0) {
                return (Get-Content -Raw -LiteralPath $responseFile | ConvertFrom-Json)
            }
            return
        } finally {
            if (Test-Path -LiteralPath $responseFile) { Remove-Item -LiteralPath $responseFile }
        }
    }
    $result = & az @Arguments --output json
    if ($LASTEXITCODE -ne 0) { throw "Azure operation failed: $($Arguments[0..1] -join ' ')" }
    if ($result) { return ($result | ConvertFrom-Json) }
}

function Invoke-JsonBody {
    param([string]$Method, [string]$Url, [object]$Body)
    $file = Join-Path ([IO.Path]::GetTempPath()) ("pmo-tools-" + [guid]::NewGuid().ToString() + ".json")
    $responseFile = Join-Path ([IO.Path]::GetTempPath()) ("pmo-tools-write-" + [guid]::NewGuid().ToString() + ".response")
    try {
        [IO.File]::WriteAllText($file, ($Body | ConvertTo-Json -Depth 30))
        & az rest --method $Method --url $Url --headers Content-Type=application/json Accept=application/json `
            --body "@$file" --output-file $responseFile --output none
        if ($LASTEXITCODE -ne 0) { throw "Azure $Method failed for $Url." }
    } finally {
        Remove-Item -LiteralPath $file
        if (Test-Path -LiteralPath $responseFile) { Remove-Item -LiteralPath $responseFile }
    }
}

function Sync-PortfolioToolSchema {
    param([string]$ToolApiArm, [object]$ExistingOperation = $null)
    $toolJson = & uv run --frozen --project (Join-Path $repo "api") --directory (Join-Path $repo "api") python -c "import json; from app.agent_tools import tool_definition; print(json.dumps(tool_definition()))"
    if ($LASTEXITCODE -ne 0) { throw "Unable to load the shared portfolio query schema." }
    $tool = $toolJson | ConvertFrom-Json
    Invoke-JsonBody PUT "$ToolApiArm/schemas/portfolio-query?api-version=2024-05-01" @{
        properties = @{ contentType = "application/vnd.oai.openapi.components+json"; document = @{
            components = @{ schemas = @{ PortfolioQuery = $tool.parameters } }
        } }
    } | Out-Null
    $properties = if ($null -ne $ExistingOperation) {
        $ExistingOperation.properties
    } else {
        @{
            displayName = "query_portfolio"; method = "POST"; urlTemplate = "/portfolio/query"
            request = @{ representations = @(@{ contentType = "application/json"; schemaId = "portfolio-query"; typeName = "PortfolioQuery" }) }
        }
    }
    $properties.description = $tool.description
    Invoke-JsonBody PUT "$ToolApiArm/operations/queryFabricPortfolio?api-version=2024-05-01" @{ properties = $properties } | Out-Null
    return $tool
}

$account = Invoke-AzJson @("account", "show")
if ($account.id -ne $cfg.subscriptionId -or $account.tenantId -ne $cfg.tenantId) { throw "Select the approved subscription and tenant first." }
$apim = Invoke-AzJson @("apim", "show", "-g", $cfg.reuse.apim.resourceGroup, "-n", $cfg.reuse.apim.name)
if ($apim.publicNetworkAccess -ne "Disabled") { throw "This private-tool rollout requires APIM public access to remain disabled." }
$api = Invoke-AzJson @("webapp", "show", "-g", $cfg.resourceGroup, "-n", $ApiAppName)
$toolApiId = "$ApiAppName-tools"
$arm = "https://management.azure.com/subscriptions/$($cfg.subscriptionId)/resourceGroups/$($cfg.reuse.apim.resourceGroup)/providers/Microsoft.ApiManagement/service/$($cfg.reuse.apim.name)/apis/$toolApiId"
if ($SchemaOnly) {
    $operation = Invoke-AzJson @("rest", "--method", "get", "--url", "$arm/operations/queryFabricPortfolio?api-version=2024-05-01")
    if ($operation.properties.method -ne "POST" -or $operation.properties.urlTemplate -ne "/portfolio/query") {
        throw "The existing query operation does not match the approved tool path."
    }
    if (-not $Apply) {
        Write-Output "Plan: refresh only the portfolio-query schema and queryFabricPortfolio description on the existing private tool API."
        Write-Output "Policies, identities, permissions, networks, application settings and data remain unchanged."
        return
    }
    Sync-PortfolioToolSchema -ToolApiArm $arm -ExistingOperation $operation | Out-Null
    Write-Output "Updated only the existing portfolio tool schema and operation description; MCP retains the same operation reference."
    return
}
$project = Invoke-AzJson @("rest", "--method", "get", "--url", "https://management.azure.com${FoundryProjectResourceId}?api-version=2025-10-01-preview")
if (-not $project.identity.principalId) { throw "The Foundry project must have a system-assigned identity." }
$foundry = Invoke-AzJson @("cognitiveservices", "account", "show", "-g", $cfg.resourceGroup, "-n", $accountName)
if (-not ($foundry.properties.networkInjections | Where-Object { $_.scenario -eq "agent" -and $_.subnetArmId })) {
    throw "Private APIM MCP requires an existing VNet-injected Foundry account."
}
$projectPrincipalId = $project.identity.principalId
if (-not $Apply) {
    Write-Output "Plan: dedicated workload identity $identityName; Entra application with Portfolio.Query app role;"
    Write-Output "assign only this identity; add API outbound VNet integration; configure fail-closed JWT validation;"
    Write-Output "authorize the PMO Foundry project identity; publish pmo-tools REST and pmo-onelake MCP APIs."
    Write-Output "No public-access settings changed. Foundry account must already have private outbound connectivity."
    return
}

$apps = @(Invoke-AzJson @("ad", "app", "list", "--display-name", $appName))
if ($apps.Count -gt 1) { throw "Multiple tool applications match; resolve before proceeding." }
if ($apps.Count -eq 0) {
    $app = Invoke-AzJson @("ad", "app", "create", "--display-name", $appName, "--sign-in-audience", "AzureADMyOrg")
    Invoke-JsonBody PATCH "https://graph.microsoft.com/v1.0/applications/$($app.id)" @{
        identifierUris = @("api://$($app.appId)")
        api = @{ requestedAccessTokenVersion = 2 }
        appRoles = @(@{ id = $roleId; allowedMemberTypes = @("Application"); displayName = "Query approved portfolio";
            description = "Read bounded approved Fabric portfolio evidence"; isEnabled = $true; value = "Portfolio.Query" })
    } | Out-Null
} else {
    $app = $apps[0]
    if ($app.api.requestedAccessTokenVersion -ne 2 -or -not ($app.appRoles | Where-Object { $_.id -eq $roleId -and $_.value -eq "Portfolio.Query" -and $_.isEnabled })) {
        throw "Existing tool application differs from the reviewed definition."
    }
}
$principals = @(Invoke-AzJson @("ad", "sp", "list", "--filter", "appId eq '$($app.appId)'"))
if ($principals.Count -eq 0) {
    $resourceSp = Invoke-AzJson @("ad", "sp", "create", "--id", $app.appId)
} elseif ($principals.Count -eq 1) { $resourceSp = $principals[0] } else { throw "Ambiguous tool service principal." }
Invoke-JsonBody PATCH "https://graph.microsoft.com/v1.0/servicePrincipals/$($resourceSp.id)" @{ appRoleAssignmentRequired = $true } | Out-Null

$identities = @(Invoke-AzJson @("identity", "list", "-g", $cfg.resourceGroup) | Where-Object name -EQ $identityName)
if ($identities.Count -eq 0) {
    $identity = Invoke-AzJson @("identity", "create", "-g", $cfg.resourceGroup, "-n", $identityName, "-l", $cfg.location)
} else { $identity = $identities[0] }
for ($attempt = 1; $attempt -le 12; $attempt++) {
    $principal = az ad sp show --id $identity.principalId --query id --output tsv 2>&1
    if ($LASTEXITCODE -eq 0) { break }
    if (($principal -join "`n") -notmatch "Request_ResourceNotFound|does not exist") {
        throw "Cannot resolve dedicated tool identity: $principal"
    }
    if ($attempt -eq 12) { throw "Dedicated tool identity has not propagated to Entra after 120 seconds. Retry the script later." }
    Write-Output "Waiting for dedicated tool identity to propagate to Entra (attempt $attempt/12)."
    Start-Sleep -Seconds 10
}
foreach ($principalId in @($identity.principalId, $projectPrincipalId)) {
    $assignments = Invoke-AzJson @("rest", "--method", "get", "--url", "https://graph.microsoft.com/v1.0/servicePrincipals/$principalId/appRoleAssignments")
    if (-not ($assignments.value | Where-Object { $_.resourceId -eq $resourceSp.id -and $_.appRoleId -eq $roleId })) {
        Invoke-JsonBody POST "https://graph.microsoft.com/v1.0/servicePrincipals/$principalId/appRoleAssignments" @{
            principalId = $principalId; resourceId = $resourceSp.id; appRoleId = $roleId
        } | Out-Null
    }
}
Invoke-AzJson @("webapp", "identity", "assign", "-g", $cfg.resourceGroup, "-n", $ApiAppName, "--identities", $identity.id) | Out-Null
$integrations = @(Invoke-AzJson @("webapp", "vnet-integration", "list", "-g", $cfg.resourceGroup, "-n", $ApiAppName))
if ($integrations.Count -eq 0) {
    $subnet = $cfg.reuse.vnetIntegrationSubnetId
    $vnetId = $subnet.Substring(0, $subnet.LastIndexOf("/subnets/"))
    Invoke-AzJson @("webapp", "vnet-integration", "add", "-g", $cfg.resourceGroup, "-n", $ApiAppName, "--vnet", $vnetId, "--subnet", $subnet) | Out-Null
} elseif (-not ($integrations | Where-Object {
    $_.subnetResourceId -eq $cfg.reuse.vnetIntegrationSubnetId -or $_.vnetResourceId -eq $cfg.reuse.vnetIntegrationSubnetId
})) {
    throw "API already uses a different integration subnet. Refusing to replace it."
}

Invoke-JsonBody PUT "${arm}?api-version=2024-05-01" @{
    properties = @{ displayName = "PMO read-only Fabric tools"; path = "pmo-tools"; protocols = @("https");
        serviceUrl = "https://$($api.defaultHostName)"; subscriptionRequired = $false }
} | Out-Null
$tool = Sync-PortfolioToolSchema -ToolApiArm $arm
$policy = @"
<policies>
  <inbound>
    <base />
    <validate-jwt header-name="Authorization" failed-validation-httpcode="403" require-scheme="Bearer">
      <openid-config url="https://login.microsoftonline.com/$($cfg.tenantId)/v2.0/.well-known/openid-configuration" />
      <audiences><audience>$($app.appId)</audience></audiences>
      <issuers><issuer>https://login.microsoftonline.com/$($cfg.tenantId)/v2.0</issuer></issuers>
      <required-claims>
        <claim name="oid" match="any"><value>$($identity.principalId)</value><value>$projectPrincipalId</value></claim>
        <claim name="roles" match="any"><value>Portfolio.Query</value></claim>
      </required-claims>
    </validate-jwt>
    <rate-limit-by-key calls="60" renewal-period="60" counter-key="&quot;pmo-portfolio-tools&quot;" />
    <rewrite-uri template="/v1/agent/tools/query" copy-unmatched-params="false" />
  </inbound>
  <backend><forward-request timeout="30" /></backend>
  <outbound><base /></outbound>
  <on-error><base /></on-error>
</policies>
"@
Invoke-JsonBody PUT "$arm/policies/policy?api-version=2024-05-01" @{ properties = @{ format = "rawxml"; value = $policy } } | Out-Null
$mcpArm = $arm.Substring(0, $arm.LastIndexOf("/apis/")) + "/apis/pmo-onelake"
Invoke-JsonBody PUT "${mcpArm}?api-version=2025-09-01-preview" @{
    properties = @{
        displayName = "PMO OneLake MCP"; description = "Read-only bounded OneLake portfolio queries."
        type = "mcp"; path = "pmo-onelake"; protocols = @("https"); subscriptionRequired = $false
    }
} | Out-Null
Invoke-JsonBody PUT "$mcpArm/tools/query_portfolio?api-version=2025-09-01-preview" @{
    properties = @{ displayName = "query_portfolio"; description = $tool.description; operationId = "$($arm.Replace('https://management.azure.com', ''))/operations/queryFabricPortfolio" }
} | Out-Null
$mcpPolicy = $policy.Replace('<rewrite-uri template="/v1/agent/tools/query" copy-unmatched-params="false" />', '')
$mcpPolicy = $mcpPolicy.Replace('<backend><forward-request timeout="30" /></backend>', '<backend><base /></backend>')
Invoke-JsonBody PUT "$mcpArm/policies/policy?api-version=2025-09-01-preview" @{ properties = @{ format = "rawxml"; value = $mcpPolicy } } | Out-Null
$mcpTool = @($agentConfig.tools | Where-Object { $_.type -eq "mcp" })[0]
if (-not $mcpTool) { throw "portfolio-agent.json must define an mcp tool." }
Invoke-JsonBody PUT "https://management.azure.com$FoundryProjectResourceId/connections/$($mcpTool.connectionName)?api-version=2025-10-01-preview" @{
    properties = @{
        category = "RemoteTool"; authType = "ProjectManagedIdentity"; target = $mcpTool.serverUrl
        audience = "api://$($app.appId)"; isSharedToAll = $false; metadata = @{ type = "custom_MCP" }
    }
} | Out-Null
Invoke-AzJson @(
    "webapp", "config", "appsettings", "set", "-g", $cfg.resourceGroup, "-n", $ApiAppName, "--settings",
    "PMO_TOOL_URL=$($apim.gatewayUrl)/pmo-tools/portfolio/query", "PMO_TOOL_AUDIENCE=$($app.appId)",
    "PMO_TOOL_TENANT_ID=$($cfg.tenantId)", "PMO_TOOL_CALLER_OBJECT_ID=$($identity.principalId),$projectPrincipalId",
    "PMO_TOOL_CLIENT_ID=$($identity.clientId)"
) | Out-Null
Write-Output "Configured private APIM tool API $toolApiId with dedicated caller $($identity.clientId)."
Write-Output "Verify the runtime path and public-access settings before declaring private-network readiness."
