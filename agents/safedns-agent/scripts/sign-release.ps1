# Re-sign an MSI/exe built in CI (unsigned artifact) on your Windows machine.
param(
  [string] $PfxPath = $env:FLUXSHIELD_SIGN_PFX_PATH,
  [string] $PfxPassword = $env:FLUXSHIELD_SIGN_PFX_PASSWORD,
  [string] $CertThumbprint = $env:FLUXSHIELD_SIGN_CERT_THUMBPRINT,
  [string] $DistDir = (Join-Path (Split-Path $PSScriptRoot -Parent) "dist")
)

$ErrorActionPreference = "Stop"
$sign = Join-Path $PSScriptRoot "Sign-Code.ps1"

$exe = Join-Path $DistDir "fluxshield-agent.exe"
$msis = Get-ChildItem -Path $DistDir -Filter "FluxShield-Agent-*.msi" -ErrorAction SilentlyContinue

$targets = @()
if (Test-Path $exe) { $targets += $exe }
if ($msis) { $targets += $msis.FullName }

if ($targets.Count -eq 0) {
  throw "Nothing to sign under $DistDir — download CI artifacts or run build-msi.ps1 -SkipSign first"
}

$params = @{ Path = $targets }
if ($PfxPath) { $params.PfxPath = $PfxPath }
if ($PfxPassword) { $params.PfxPassword = $PfxPassword }
if ($CertThumbprint) { $params.CertThumbprint = $CertThumbprint }

& $sign @params
Write-Host "Signed: $($targets -join ', ')"
