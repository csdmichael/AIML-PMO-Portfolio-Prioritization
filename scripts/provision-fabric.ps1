[CmdletBinding()]
param(
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$DeploymentConfigPath = 'infra/config/pmo-deployment.json',
    [string]$FabricItemsConfigPath = 'config/fabric-items.json',
    [switch]$UpdateConfig
)

$ErrorActionPreference = 'Stop'

function Read-JsonConfig([string]$relativePath) {
    $fullPath = Join-Path $RepoRoot $relativePath
    if (-not (Test-Path -LiteralPath $fullPath)) { throw "Config file not found: $relativePath" }
    Get-Content -LiteralPath $fullPath -Raw | ConvertFrom-Json
}

$deployment = Read-JsonConfig $DeploymentConfigPath
$fabricItems = Read-JsonConfig $FabricItemsConfigPath
$apiBase = $fabricItems.api.baseUrl
$pollSeconds = [int]$fabricItems.longRunning.pollSeconds
$maxAttempts = [int]$fabricItems.longRunning.maxAttempts

$token = az account get-access-token --resource $fabricItems.api.tokenResource --query accessToken -o tsv
if (-not $token) { throw 'No Fabric token. Run az login first.' }
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }

function Invoke-LongRunning($response) {
    if ($response.StatusCode -ne 202) { return ($response.Content | ConvertFrom-Json) }
    $location = $response.Headers['Location']
    if ($location -is [array]) { $location = $location[0] }
    for ($attempt = 0; $attempt -lt $maxAttempts; $attempt++) {
        Start-Sleep -Seconds $pollSeconds
        $operation = Invoke-RestMethod -Method Get -Uri $location -Headers $headers
        if ($operation.status -eq 'Succeeded') { return (Invoke-RestMethod -Method Get -Uri "$location/result" -Headers $headers) }
        if ($operation.status -eq 'Failed') { throw "Operation failed: $($operation | ConvertTo-Json -Depth 5)" }
    }
    throw "Timed out waiting for operation at $location"
}

$capacityName = $deployment.reuse.fabricCapacity.name
$capacity = (Invoke-RestMethod -Method Get -Uri "$apiBase/capacities" -Headers $headers).value |
    Where-Object { $_.displayName -eq $capacityName } | Select-Object -First 1
if (-not $capacity) { throw "Fabric capacity '$capacityName' not found or not accessible." }

$workspaceName = $deployment.fabric.workspaceName
$workspace = (Invoke-RestMethod -Method Get -Uri "$apiBase/workspaces" -Headers $headers).value |
    Where-Object { $_.displayName -eq $workspaceName } | Select-Object -First 1
if (-not $workspace) {
    $body = @{ displayName = $workspaceName; capacityId = $capacity.id } | ConvertTo-Json
    $workspace = Invoke-RestMethod -Method Post -Uri "$apiBase/workspaces" -Headers $headers -Body $body
    Write-Information "Created workspace $workspaceName" -InformationAction Continue
}
$workspaceId = $workspace.id

$folderName = $fabricItems.mlNotebooksFolder
$folder = (Invoke-RestMethod -Method Get -Uri "$apiBase/workspaces/$workspaceId/folders" -Headers $headers).value |
    Where-Object { $_.displayName -eq $folderName } | Select-Object -First 1
if (-not $folder) {
    $folder = Invoke-RestMethod -Method Post -Uri "$apiBase/workspaces/$workspaceId/folders" -Headers $headers -Body (@{ displayName = $folderName } | ConvertTo-Json)
    Write-Information "Created folder $folderName" -InformationAction Continue
}

$lakehouseName = $deployment.fabric.lakehouseName
$lakehouse = (Invoke-RestMethod -Method Get -Uri "$apiBase/workspaces/$workspaceId/lakehouses" -Headers $headers).value |
    Where-Object { $_.displayName -eq $lakehouseName } | Select-Object -First 1
if (-not $lakehouse) {
    $body = @{ displayName = $lakehouseName; creationPayload = @{ enableSchemas = [bool]$fabricItems.lakehouse.enableSchemas } } | ConvertTo-Json -Depth 4
    $lakehouseResponse = Invoke-WebRequest -Method Post -Uri "$apiBase/workspaces/$workspaceId/lakehouses" -Headers $headers -Body $body -UseBasicParsing
    $lakehouse = Invoke-LongRunning $lakehouseResponse
    Write-Information "Created lakehouse $lakehouseName" -InformationAction Continue
}

if ($UpdateConfig) {
    $deployment.fabric.workspaceId = $workspaceId
    $deployment.fabric.lakehouseId = $lakehouse.id
    $deployment | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $RepoRoot $DeploymentConfigPath) -Encoding UTF8
    Write-Information "Updated $DeploymentConfigPath with resolved IDs" -InformationAction Continue
}

[ordered]@{
    workspaceName       = $workspaceName
    workspaceId         = $workspaceId
    capacityId          = $capacity.id
    mlNotebooksFolderId = $folder.id
    lakehouseName       = $lakehouseName
    lakehouseId         = $lakehouse.id
} | ConvertTo-Json
