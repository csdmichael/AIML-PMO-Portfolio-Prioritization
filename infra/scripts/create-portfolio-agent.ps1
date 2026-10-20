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

    $tool = @{
        type = "mcp"; server_label = $config.mcpServerLabel; server_url = $config.mcpServerUrl
        project_connection_id = $config.mcpConnectionName
        allowed_tools = @("query_portfolio")
        require_approval = "never"
    }
    $body = @{
        definition = @{ kind = "prompt"; model = $config.model; instructions = $config.instructions; tools = @($tool) }
        description = "Native read-only OneLake MCP retrieval through private APIM using the project managed identity."
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
