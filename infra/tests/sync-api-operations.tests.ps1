$ErrorActionPreference = "Stop"
$repoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
    (Join-Path $repoRoot "infra/scripts/deploy.ps1"), [ref]$tokens, [ref]$parseErrors
)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
$definition = $ast.Find({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq "Sync-ApiOperations"
}, $false)
. ([scriptblock]::Create($definition.Extent.Text))

$script:operations = [System.Collections.Generic.List[object]]::new()
$script:operations.Add(@{ name = "getHealth"; method = "GET"; urlTemplate = "/v1/health" })
$script:created = [System.Collections.Generic.List[object]]::new()
$script:failCreate = $false
function az {
    $global:LASTEXITCODE = 0
    if ($args[2] -eq "list") { return '[{"name":"existing-pmo-api","path":"pmo"}]' }
    if ($args[3] -eq "list") { return ConvertTo-Json -InputObject @($script:operations) -Depth 10 }
    if ($script:failCreate) { $global:LASTEXITCODE = 1; return }
    $script:created.Add($args.Clone())
    $script:operations.Add(@{
        name = $args[$args.IndexOf("--operation-id") + 1]
        method = $args[$args.IndexOf("--method") + 1]
        urlTemplate = $args[$args.IndexOf("--url-template") + 1]
    })
}
$specPath = Join-Path $repoRoot "docs/api/openapi.json"
Sync-ApiOperations -OpenApiFile $specPath -ResourceGroup "group" -ServiceName "gateway" -ApiPath "pmo"
$spec = Get-Content -LiteralPath $specPath -Raw | ConvertFrom-Json
$expected = @($spec.paths.PSObject.Properties | ForEach-Object {
    $_.Value.PSObject.Properties | Where-Object Name -In @("get", "post", "put", "patch", "delete", "head", "options", "trace")
}).Count
if ($script:created.Count -ne $expected - 1) { throw "Every missing operation must be registered exactly once." }
foreach ($route in @("/v1/recommendations/cached", "/v1/demo/projects", "/v1/demo/projects/load", "/v1/demo/projects/clear")) {
    if (-not ($script:operations | Where-Object urlTemplate -EQ $route)) { throw "Missing gateway route $route." }
}
foreach ($arguments in $script:created) {
    $route = $arguments[$arguments.IndexOf("--url-template") + 1]
    if ($route.Contains("{") -and "--template-parameters" -notin $arguments) { throw "Missing URL parameters for $route." }
}
$count = $script:created.Count
Sync-ApiOperations -OpenApiFile $specPath -ResourceGroup "group" -ServiceName "gateway" -ApiPath "pmo"
if ($script:created.Count -ne $count) { throw "Existing gateway operations must not be overwritten." }
$script:operations.RemoveAt($script:operations.Count - 1)
$script:failCreate = $true
$failedExplicitly = $false
try {
    Sync-ApiOperations -OpenApiFile $specPath -ResourceGroup "group" -ServiceName "gateway" -ApiPath "pmo"
} catch {
    if ($_.Exception.Message -notlike "Unable to register gateway operation*") { throw }
    $failedExplicitly = $true
}
if (-not $failedExplicitly) { throw "Gateway registration failures must stop publication." }
Write-Output "Gateway synchronization tests passed: complete coverage, path parameters, idempotency, explicit failure."
$global:LASTEXITCODE = 0
