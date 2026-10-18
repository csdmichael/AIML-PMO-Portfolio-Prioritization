[CmdletBinding()]
param([switch]$CreateNextVersion)

$ErrorActionPreference = "Stop"
$repo = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$config = Get-Content -Raw (Join-Path $repo "api\config\portfolio-agent.json") | ConvertFrom-Json
$base = "$($config.projectEndpoint)/agents"
$agents = az rest --method get --url "${base}?api-version=$($config.apiVersion)" --resource https://ai.azure.com -o json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to list Foundry agents. Check the signed-in account and Foundry permissions." }
if ($agents.data | Where-Object name -EQ $config.agentName) {
    if (-not $CreateNextVersion) {
        throw "Agent already exists. Use -CreateNextVersion only after reviewing the pinned version and tool definition."
    }
    $versions = az rest --method get --url "$base/$($config.agentName)/versions?api-version=$($config.apiVersion)" --resource https://ai.azure.com -o json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw "Cannot inspect existing agent versions." }
    $latest = ($versions.data | ForEach-Object { [int]$_.version } | Measure-Object -Maximum).Maximum
    if ([int]$config.agentVersion -ne ($latest + 1)) { throw "Pinned version must be the next immutable version after $latest." }
}

$toolJson = & uv run --frozen --project (Join-Path $repo "api") --directory (Join-Path $repo "api") python -c "import json; from app.agent_tools import tool_definition; print(json.dumps(tool_definition()))"
if ($LASTEXITCODE -ne 0) { throw "Unable to load the API's shared read-only tool schema." }
$tool = $toolJson | ConvertFrom-Json
$body = @{
    definition = @{ kind = "prompt"; model = $config.model; instructions = $config.instructions; tools = @($tool) }
    description = "Read-only Fabric OneLake queries executed by the private backend through APIM."
} | ConvertTo-Json -Depth 20
$file = Join-Path ([IO.Path]::GetTempPath()) ("pmo-agent-" + [guid]::NewGuid().ToString() + ".json")
try {
    [IO.File]::WriteAllText($file, $body)
    $agent = az rest --method post --url "$base/$($config.agentName)/versions?api-version=$($config.apiVersion)" `
        --resource https://ai.azure.com --headers Content-Type=application/json --body "@$file" -o json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw "Foundry agent creation failed." }
    if ([string]$agent.version -ne $config.agentVersion) {
        throw "Created version $($agent.version), but the API pins $($config.agentVersion). Update the configuration before deployment."
    }
    $agent | Select-Object name, version, id
} finally {
    Remove-Item -LiteralPath $file
}
