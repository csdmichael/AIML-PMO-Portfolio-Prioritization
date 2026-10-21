$ErrorActionPreference = "Stop"
$repo = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
    (Join-Path $repo "infra/scripts/configure-agent-tools.ps1"), [ref]$tokens, [ref]$parseErrors
)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
$definition = $ast.Find({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq "Sync-PortfolioToolSchema"
}, $false)
. ([scriptblock]::Create($definition.Extent.Text))
$script:writes = [System.Collections.Generic.List[object]]::new()
$script:failSchema = $false
function uv {
    $global:LASTEXITCODE = if ($script:failSchema) { 1 } else { 0 }
    return '{"description":"Search the full register","parameters":{"properties":{"kind":{"enum":["projectInventory"]},"notStartedOnly":{"type":"boolean"}}}}'
}
function Invoke-JsonBody {
    param([string]$Method, [string]$Url, [object]$Body)
    $script:writes.Add(@{ Method = $Method; Url = $Url; Body = $Body })
}
$operation = [pscustomobject]@{ properties = [pscustomobject]@{
    displayName = "query_portfolio"; description = "Old description"; method = "POST"; urlTemplate = "/portfolio/query"
    request = @{ representations = @(@{ contentType = "application/json"; schemaId = "portfolio-query"; typeName = "PortfolioQuery" }) }
    responses = @(@{ statusCode = 200; description = "Existing response" })
} }
$request = $operation.properties.request | ConvertTo-Json -Depth 10
$responses = $operation.properties.responses | ConvertTo-Json -Depth 10
Sync-PortfolioToolSchema -ToolApiArm "https://management.azure.com/existing-tool-api" -ExistingOperation $operation | Out-Null
if ($script:writes.Count -ne 2) { throw "Only the existing schema and operation may be written." }
if ($script:writes[0].Url -notlike "*/schemas/portfolio-query?api-version=*") { throw "Unexpected schema target." }
$schema = $script:writes[0].Body.properties.document.components.schemas.PortfolioQuery
if ("projectInventory" -notin $schema.properties.kind.enum -or -not $schema.properties.notStartedOnly) {
    throw "The inventory schema must be preserved."
}
$published = $script:writes[1].Body.properties
if ($published.description -ne "Search the full register" -or $published.method -ne "POST") { throw "Operation description not refreshed." }
if (($published.request | ConvertTo-Json -Depth 10) -ne $request -or ($published.responses | ConvertTo-Json -Depth 10) -ne $responses) {
    throw "Existing request and response contracts must be preserved."
}
if ($script:writes.Url -match "/policies|roleAssignments|network|config/") { throw "Schema refresh must not change security or hosting." }
$script:failSchema = $true
$failedExplicitly = $false
try {
    Sync-PortfolioToolSchema -ToolApiArm "https://management.azure.com/existing-tool-api" | Out-Null
} catch {
    if ($_.Exception.Message -ne "Unable to load the shared portfolio query schema.") { throw }
    $failedExplicitly = $true
}
if (-not $failedExplicitly -or $script:writes.Count -ne 2) { throw "Schema loading errors must stop all writes." }
Write-Output "Agent tool schema tests passed: narrow targets, preserved operation, explicit failure."
$global:LASTEXITCODE = 0
