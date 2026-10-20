[CmdletBinding()]
param(
    [string]$ConfigFile = "infra/config/bing-grounding.json"
)

$ErrorActionPreference = "Stop"
$repo = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$deployment = Get-Content -Raw (Join-Path $repo "infra\config\pmo-deployment.json") | ConvertFrom-Json
$bing = Get-Content -Raw (Join-Path $repo $ConfigFile) | ConvertFrom-Json
$portfolioAgent = Get-Content -Raw (Join-Path $repo "api\config\portfolio-agent.json") | ConvertFrom-Json

if ($portfolioAgent.projectEndpoint -notmatch '^https://(?<account>[^.]+)\.services\.ai\.azure\.com/api/projects/(?<project>[^/]+)$') {
    throw "projectEndpoint in api/config/portfolio-agent.json is not a Foundry project endpoint."
}
$account = $Matches.account
$project = $Matches.project
$subscription = $deployment.subscriptionId
$resourceGroup = $deployment.resourceGroup
$bingId = "/subscriptions/$subscription/resourceGroups/$resourceGroup/providers/Microsoft.Bing/accounts/$($bing.bingAccountName)"
$connectionId = "/subscriptions/$subscription/resourceGroups/$resourceGroup/providers/Microsoft.CognitiveServices/accounts/$account/projects/$project/connections/$($bing.connectionName)"
$connectionUrl = "https://management.azure.com${connectionId}?api-version=$($bing.connectionApiVersion)"

# The key lives only in memory and in a temporary file that is deleted in finally. It is never printed.
$key = az rest --method post --url "https://management.azure.com$bingId/listKeys?api-version=$($bing.bingApiVersion)" --query key1 -o tsv
if ($LASTEXITCODE -ne 0 -or -not $key) { throw "Unable to read a key for Bing account $($bing.bingAccountName)." }
$body = @{
    properties = @{
        category = "ApiKey"; authType = "ApiKey"; target = $bing.target; isSharedToAll = [bool]$bing.sharedToAll
        credentials = @{ key = $key }
        metadata = @{ ApiType = "Azure"; Location = "global"; ResourceId = $bingId }
    }
} | ConvertTo-Json -Depth 6 -Compress
$key = $null
$file = Join-Path ([IO.Path]::GetTempPath()) ("pmo-bing-connection-" + [guid]::NewGuid().ToString() + ".json")
try {
    [IO.File]::WriteAllText($file, $body)
    $body = $null
    az rest --method put --url $connectionUrl --body "@$file" --headers Content-Type=application/json -o none
    if ($LASTEXITCODE -ne 0) { throw "Bing connection $($bing.connectionName) could not be written to project $project." }
} finally {
    Remove-Item -LiteralPath $file -ErrorAction SilentlyContinue
}

$check = az rest --method get --url $connectionUrl --query "{name:name, category:properties.category, target:properties.target}" -o json | ConvertFrom-Json
Write-Output "Connection $($check.name) on project $($project): $($check.category) -> $($check.target)"

foreach ($agentFile in @("api/config/intake-agent.json", "api/config/recommendation-agent.json")) {
    $definition = Get-Content -Raw (Join-Path $repo $agentFile) | ConvertFrom-Json
    foreach ($tool in @($definition.tools | Where-Object { $_.type -eq "bing_grounding" })) {
        if ($tool.projectConnectionId -ne $connectionId) {
            Write-Warning "$agentFile uses $($tool.projectConnectionId), which is not $connectionId."
        }
    }
}
