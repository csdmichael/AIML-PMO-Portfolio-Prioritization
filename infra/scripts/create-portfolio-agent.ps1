[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repo = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$config = Get-Content -Raw (Join-Path $repo "api\config\portfolio-agent.json") | ConvertFrom-Json
$base = "$($config.projectEndpoint)/agents"
$agents = az rest --method get --url "${base}?api-version=$($config.apiVersion)" --resource https://ai.azure.com -o json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to list Foundry agents. Check the signed-in account and Foundry permissions." }
if ($agents.data | Where-Object name -EQ $config.agentName) {
    throw "Agent already exists. Inspect its versions and explicitly update the pinned configuration instead of creating an untracked version."
}

$body = @{
    definition = @{ kind = "prompt"; model = $config.model; instructions = $config.instructions }
    description = "PMO portfolio chat grounded in server-read OneLake data, invoked through the API behind APIM."
} | ConvertTo-Json -Depth 8
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
