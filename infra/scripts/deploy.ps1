[CmdletBinding()]
param(
    [ValidateSet("bicep", "terraform")]
    [string]$IacTool = "bicep",

    [ValidateSet("validate", "plan", "infra", "deploy", "publish")]
    [string]$Mode = "validate",

    [ValidateSet("both", "ui", "api")]
    [string]$Component = "both",

    [string]$Python = "python",

    [string]$Uv = "uv"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$cfg = Get-Content -Raw -Path (Join-Path $repoRoot "infra/config/pmo-deployment.json") | ConvertFrom-Json
$dep = $cfg.deployment
$resourceGroup = $cfg.resourceGroup
$tfDir = Join-Path $repoRoot $dep.terraformDirectory
$fabricUrl = "https://api.fabric.microsoft.com"
$tempDir = [System.IO.Path]::GetTempPath()

function Invoke-Checked {
    param([string]$Step, [scriptblock]$Command)
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Step failed with exit code $LASTEXITCODE."
    }
}

function Invoke-Iac {
    $action = if ($Mode -eq "infra") { "deploy" } else { $Mode }
    if ($IacTool -eq "bicep") {
        $template = Join-Path $repoRoot $dep.bicepFile
        $parameters = Join-Path $repoRoot $dep.bicepParameters
        switch ($action) {
            "validate" {
                Invoke-Checked "Bicep build" { az bicep build --file $template --outfile (Join-Path $tempDir "pmo-main.json") }
                Invoke-Checked "Bicep lint" { az bicep lint --file $template }
                Invoke-Checked "Deployment validation" { az deployment group validate --resource-group $resourceGroup --template-file $template --parameters $parameters }
            }
            "plan" {
                Invoke-Checked "Bicep what-if" { az deployment group what-if --resource-group $resourceGroup --name $dep.name --template-file $template --parameters $parameters --result-format ResourceIdOnly }
            }
            "deploy" {
                Invoke-Checked "Bicep deployment" { az deployment group create --resource-group $resourceGroup --name $dep.name --template-file $template --parameters $parameters }
            }
        }
        return
    }

    $varFile = $dep.terraformVarFile
    if ($action -eq "validate") {
        Invoke-Checked "terraform init" { terraform "-chdir=$tfDir" init -input=false -backend=false -no-color }
        Invoke-Checked "terraform validate" { terraform "-chdir=$tfDir" validate -no-color }
        return
    }
    Invoke-Checked "terraform init" { terraform "-chdir=$tfDir" init -input=false -no-color }
    if ($action -eq "plan") {
        Invoke-Checked "terraform plan" { terraform "-chdir=$tfDir" plan -input=false -no-color "-var-file=$varFile" }
    }
    else {
        Invoke-Checked "terraform apply" { terraform "-chdir=$tfDir" apply -input=false -auto-approve -no-color "-var-file=$varFile" }
    }
}

function ConvertTo-SnakeCase([string]$Name) {
    return ([regex]::Replace($Name, '([a-z0-9])([A-Z])', '$1_$2')).ToLowerInvariant()
}

function Get-DeploymentOutputs {
    if ($IacTool -eq "bicep") {
        $raw = az deployment group show --resource-group $resourceGroup --name $dep.name --query properties.outputs -o json | ConvertFrom-Json
    }
    else {
        $raw = terraform "-chdir=$tfDir" output -json | ConvertFrom-Json
    }
    $outputs = @{}
    foreach ($property in $raw.PSObject.Properties) {
        $outputs[(ConvertTo-SnakeCase $property.Name)] = $property.Value.value
    }
    return $outputs
}

function Wait-ForHealthy([string]$Url) {
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        try {
            Invoke-RestMethod -Uri $Url -TimeoutSec 30 | Out-Null
            Write-Output "healthy: $Url"
            return
        }
        catch {
            Start-Sleep -Seconds 10
        }
    }
    throw "Not healthy after waiting: $Url"
}

function Wait-ForDeployment([string]$AppName) {
    for ($attempt = 1; $attempt -le 120; $attempt++) {
        $deployments = az webapp log deployment list --name $AppName --resource-group $resourceGroup -o json | ConvertFrom-Json
        $latest = $deployments | Where-Object { -not $_.is_temp } | Sort-Object { [datetime]$_.received_time } -Descending | Select-Object -First 1
        if ($latest -and $latest.status -eq 4) {
            Write-Output "deployed: $AppName"
            return
        }
        if ($latest -and $latest.status -eq 3) {
            throw "Deployment to $AppName failed: $($latest.status_text)"
        }
        Start-Sleep -Seconds 15
    }
    throw "Deployment to $AppName did not finish in time."
}

function Sync-ApiOperations {
    param([string]$OpenApiFile, [string]$ResourceGroup, [string]$ServiceName, [string]$ApiPath)

    $apis = az apim api list --resource-group $ResourceGroup --service-name $ServiceName --output json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw "Unable to resolve the existing PMO APIM API." }
    $matches = @($apis | Where-Object path -EQ $ApiPath)
    if ($matches.Count -ne 1) { throw "Expected one APIM API for path $ApiPath." }
    $apiId = $matches[0].name
    $existing = @(az apim api operation list --resource-group $ResourceGroup --service-name $ServiceName --api-id $apiId --output json | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0) { throw "Unable to read the existing PMO gateway operations." }
    $specification = Get-Content -LiteralPath $OpenApiFile -Raw | ConvertFrom-Json
    foreach ($path in $specification.paths.PSObject.Properties) {
        foreach ($method in $path.Value.PSObject.Properties) {
            if ($method.Name -notin @("get", "post", "put", "patch", "delete", "head", "options", "trace")) { continue }
            $verb = $method.Name.ToUpperInvariant()
            $operation = $method.Value
            if ($existing | Where-Object { $_.method -eq $verb -and $_.urlTemplate -eq $path.Name }) { continue }
            if (-not $operation.operationId -or -not $operation.summary) {
                throw "The API contract is missing an operation ID or summary for $verb $($path.Name)."
            }
            if ($existing | Where-Object name -EQ $operation.operationId) {
                throw "Gateway operation ID $($operation.operationId) already belongs to another route."
            }
            $arguments = @(
                "apim", "api", "operation", "create", "--resource-group", $ResourceGroup,
                "--service-name", $ServiceName, "--api-id", $apiId,
                "--operation-id", $operation.operationId, "--method", $verb,
                "--url-template", $path.Name, "--display-name", $operation.summary, "--output", "none"
            )
            foreach ($parameter in @($path.Value.parameters) + @($operation.parameters) | Where-Object { $_.in -eq "path" }) {
                if (-not $parameter.schema.type) { throw "The path parameter $($parameter.name) has no type." }
                $arguments += @("--template-parameters", "name=$($parameter.name)", "type=$($parameter.schema.type)", "required=true")
            }
            az @arguments
            if ($LASTEXITCODE -ne 0) { throw "Unable to register gateway operation $verb $($path.Name)." }
            Write-Output "Registered gateway operation: $verb $($path.Name)"
        }
    }
}

function Publish-Apps($outputs) {
    $stage = Join-Path $tempDir "pmo-publish"
    if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
    $apiStage = Join-Path $stage "api"
    $uiStage = Join-Path $stage "ui"
    New-Item -ItemType Directory -Force -Path $apiStage, (Join-Path $uiStage "server"), (Join-Path $uiStage "www") | Out-Null
    $publishUi = $Component -ne "api"
    $publishApi = $Component -ne "ui"

    if ($publishUi) {
        [IO.File]::WriteAllText((Join-Path $uiStage "runtime.txt"), "python-$($cfg.create.apps.ui.runtimeStack.Split('|')[1])`n")
        if (-not (Test-Path (Join-Path $repoRoot "ui/www/index.html"))) {
            Invoke-Checked "UI build" {
                Push-Location (Join-Path $repoRoot "ui")
                try {
                    if (-not (Test-Path "node_modules")) {
                        npm ci
                    }
                    npm run build
                } finally { Pop-Location }
            }
        }
        Copy-Item -Recurse -Force (Join-Path $repoRoot "ui/server/app") (Join-Path $uiStage "server/app")
        Copy-Item -Force (Join-Path $repoRoot "ui/server/config.json") (Join-Path $uiStage "server/config.json")
        Get-ChildItem -Path (Join-Path $repoRoot "ui/www") | Copy-Item -Recurse -Force -Destination (Join-Path $uiStage "www")
        Invoke-Checked "UI requirements export" {
            Push-Location (Join-Path $repoRoot "ui/server")
            try { & $Uv export --frozen --no-hashes --no-dev --no-emit-project --output-file (Join-Path $uiStage "requirements.txt") } finally { Pop-Location }
        }
    }

    if ($publishApi) {
        [IO.File]::WriteAllText((Join-Path $apiStage "runtime.txt"), "python-$($cfg.create.apps.api.runtimeStack.Split('|')[1])`n")
        Copy-Item -Recurse -Force (Join-Path $repoRoot "api/app") (Join-Path $apiStage "app")
        Copy-Item -Recurse -Force (Join-Path $repoRoot "api/config") (Join-Path $apiStage "config")
        Invoke-Checked "API requirements export" {
            Push-Location (Join-Path $repoRoot "api")
            try { & $Uv export --frozen --no-hashes --no-dev --no-emit-project --output-file (Join-Path $apiStage "requirements.txt") } finally { Pop-Location }
        }
    }

    Get-ChildItem -Recurse -Directory -Filter "__pycache__" -Path $stage | Remove-Item -Recurse -Force

    if ($publishApi) {
        $apiZip = Join-Path $stage "pmo-api.zip"
        Invoke-Checked "API zip" { & $Python -m zipfile -c $apiZip @((Get-ChildItem -Path $apiStage).FullName) }
        Invoke-Checked "API deploy" { az webapp deploy --resource-group $resourceGroup --name $outputs.api_app_name --src-path $apiZip --type zip --clean true --restart true --async true --track-status false }
        Wait-ForDeployment $outputs.api_app_name
        Invoke-Checked "Synchronize API gateway operations" {
            Sync-ApiOperations -OpenApiFile (Join-Path $repoRoot $cfg.create.apimApi.openApiFile) `
                -ResourceGroup $cfg.reuse.apim.resourceGroup -ServiceName $cfg.reuse.apim.name `
                -ApiPath $cfg.create.apimApi.path
        }
        Invoke-Checked "Synchronize existing agent tool schema" {
            $agentConfig = Get-Content -Raw (Join-Path $repoRoot "api/config/portfolio-agent.json") | ConvertFrom-Json
            if ($agentConfig.projectEndpoint -notmatch '^https://(?<account>[^.]+)\.services\.ai\.azure\.com/api/projects/(?<project>[^/]+)$') {
                throw "The portfolio agent project endpoint is invalid."
            }
            $projectId = "/subscriptions/$($cfg.subscriptionId)/resourceGroups/$resourceGroup/providers/Microsoft.CognitiveServices/accounts/$($Matches.account)/projects/$($Matches.project)"
            & (Join-Path $repoRoot "infra/scripts/configure-agent-tools.ps1") `
                -ApiAppName $outputs.api_app_name -FoundryProjectResourceId $projectId -SchemaOnly -Apply
        }
    }
    if ($publishUi) {
        $uiZip = Join-Path $stage "pmo-ui.zip"
        Invoke-Checked "UI zip" { & $Python -m zipfile -c $uiZip @((Get-ChildItem -Path $uiStage).FullName) }
        Invoke-Checked "UI deploy" { az webapp deploy --resource-group $resourceGroup --name $outputs.ui_app_name --src-path $uiZip --type zip --clean true --restart true --async true --track-status false }
        Wait-ForDeployment $outputs.ui_app_name
    }

    Remove-Item -Recurse -Force $stage
}

function Grant-FabricWorkspaceRole([string]$PrincipalId) {
    try {
        $url = "$fabricUrl/v1/workspaces/$($cfg.fabric.workspaceId)/roleAssignments"
        $existing = az rest --method get --url $url --resource $fabricUrl | ConvertFrom-Json
        if ($existing.value | Where-Object { $_.principal.id -eq $PrincipalId }) {
            Write-Output "Fabric workspace role already assigned to the API identity."
            return
        }
        $bodyPath = Join-Path $tempDir "pmo-fabric-role.json"
        $body = @{ principal = @{ id = $PrincipalId; type = "ServicePrincipal" }; role = $dep.fabricWorkspaceRole } | ConvertTo-Json -Depth 4
        [System.IO.File]::WriteAllText($bodyPath, $body)
        Invoke-Checked "Fabric role assignment" { az rest --method post --url $url --resource $fabricUrl --body "@$bodyPath" }
        Remove-Item -Force $bodyPath
    } catch {
        Write-Warning "Could not update Fabric role assignment: $_"
    }
}

function Add-SpaRedirectUri([string]$Uri) {
    try {
        $clientId = $cfg.entra.clientId
        $current = @(az ad app show --id $clientId --query "spa.redirectUris" -o json | ConvertFrom-Json)
        if ($current -contains $Uri) {
            Write-Output "Entra redirect URI already registered: $Uri"
            return
        }
        $uris = @($current + $Uri) | Where-Object { $_ } | Select-Object -Unique
        Invoke-Checked "Entra redirect update" { az ad app update --id $clientId --spa-redirect-uris @uris }
    } catch {
        Write-Warning "Could not update Entra redirect URI: $_"
    }
}

if ($Mode -ne "publish") {
    Invoke-Iac
}

if ($Mode -eq "deploy" -or $Mode -eq "publish") {
    $outputs = Get-DeploymentOutputs
    Publish-Apps $outputs
    if ($Mode -eq "deploy") {
        Grant-FabricWorkspaceRole -PrincipalId $outputs.identity_principal_id
        Add-SpaRedirectUri -Uri $outputs.ui_url
    }
    $uiHealthPath = (Get-Content -Raw -Path (Join-Path $repoRoot "ui/server/config.json") | ConvertFrom-Json).server.healthzPath
    if ($Component -ne "api") { Wait-ForHealthy -Url ($outputs.ui_url + $uiHealthPath) }
    if ($Component -ne "ui") { Wait-ForHealthy -Url ($outputs.api_url + "/v1/health") }
    Write-Output ("UI: " + $outputs.ui_url)
    Write-Output ("API: " + $outputs.api_url)
    Write-Output ("Swagger: " + $outputs.api_swagger_url)
    $global:LASTEXITCODE = 0
}
