# Silent install for RMM/GPO — requires admin
param(
  [Parameter(Mandatory=$true)][string]$Token,
  [string]$Roles = "dns-enforce,site-updater"
)

$ErrorActionPreference = "Stop"
$exe = Join-Path $PSScriptRoot "..\dist\fluxshield-agent.exe"
if (-not (Test-Path $exe)) { $exe = "fluxshield-agent.exe" }

& $exe install --token $Token --roles $Roles
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Flux Shield Agent installed. Service will enroll with provided token."
