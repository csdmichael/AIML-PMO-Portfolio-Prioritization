[CmdletBinding()]
param(
    [string[]]$AgentConfigFiles = @("api/config/portfolio-agent.json", "api/config/recommendation-agent.json", "api/config/intake-agent.json"),
    [switch]$CreateNextVersion
)

$ErrorActionPreference = "Stop"
$repo = (Get-Item $PSScriptRoot).Parent.Parent.FullName

foreach ($relPath in $AgentConfigFiles) {
    $configFile = Join-Path $repo $relPath
    if (-not (Test-Path $configFile)) {
        Write-Warning "Agent config file not found: $configFile"
        continue
    }
    $config = Get-Content -Raw $configFile | ConvertFrom-Json
    $base = "$($config.projectEndpoint)/agents"
    $agents = az rest --method get --url "${base}?api-version=$($config.apiVersion)" --resource https://ai.azure.com -o json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw "Unable to list Foundry agents. Check the signed-in account and Foundry permissions." }

    $existing = $agents.data | Where-Object name -EQ $config.agentName
    if ($existing) {
        if (-not $CreateNextVersion) {
            Write-Output "Agent '$($config.agentName)' already exists (Version $($config.agentVersion))."
            continue
        }
        $versions = az rest --method get --url "$base/$($config.agentName)/versions?api-version=$($config.apiVersion)" --resource https://ai.azure.com -o json | ConvertFrom-Json
        $latest = ($versions.data | ForEach-Object { [int]$_.version } | Measure-Object -Maximum).Maximum
        if ([int]$config.agentVersion -ne ($latest + 1)) { throw "Pinned version must be the next immutable version after $latest." }
    }

    $toolDefinitions = foreach ($item in $config.tools) {
        switch ($item.type) {
            "mcp" {
                @{
                    type = "mcp"; server_label = $item.serverLabel; server_url = $item.serverUrl
                    project_connection_id = $item.connectionName
                    allowed_tools = @($item.allowedTools)
                    require_approval = $item.requireApproval
                }
            }
            "bing_grounding" {
                @{
                    type = "bing_grounding"
                    bing_grounding = @{ search_configurations = @(@{ project_connection_id = $item.projectConnectionId }) }
                }
            }
            default { throw "Unsupported tool type '$($item.type)' in $configFile" }
        }
    }
    $body = @{
        definition = @{ kind = "prompt"; model = $config.model; instructions = $config.instructions; tools = @($toolDefinitions) }
        description = $config.description
    } | ConvertTo-Json -Depth 20

    $file = Join-Path ([IO.Path]::GetTempPath()) ("pmo-agent-" + [guid]::NewGuid().ToString() + ".json")
    try {
        [IO.File]::WriteAllText($file, $body)
        $agent = az rest --method post --url "$base/$($config.agentName)/versions?api-version=$($config.apiVersion)" `
            --resource https://ai.azure.com --headers Content-Type=application/json --body "@$file" -o json | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0) { throw "Foundry agent creation failed for $($config.agentName)." }
        Write-Output "Successfully provisioned agent: $($agent.name) v$($agent.version)"
    } finally {
        Remove-Item -LiteralPath $file -ErrorAction SilentlyContinue
    }
}
