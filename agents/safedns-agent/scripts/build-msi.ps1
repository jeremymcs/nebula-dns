# Build Flux Shield Agent MSI on your Windows machine (signing happens locally).
param(
  [string] $Version = "1.0.0",
  [string] $PfxPath = $env:FLUXSHIELD_SIGN_PFX_PATH,
  [string] $PfxPassword = $env:FLUXSHIELD_SIGN_PFX_PASSWORD,
  [string] $CertThumbprint = $env:FLUXSHIELD_SIGN_CERT_THUMBPRINT,
  [switch] $SkipSign,
  [switch] $RequireSign,
  [switch] $SkipGoBuild
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$dist = Join-Path $root "dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null

if (-not $SkipGoBuild) {
  Write-Host "Building fluxshield-agent.exe..."
  $ldflags = "-X main.Version=$Version -X main.BuildTime=$(Get-Date -Format o) -s -w"
  go build -ldflags $ldflags -o (Join-Path $dist "fluxshield-agent.exe") ./cmd/agent
}

$exe = Join-Path $dist "fluxshield-agent.exe"
if (-not (Test-Path $exe)) { throw "Missing $exe" }

function Invoke-FluxSign {
  param([string[]] $Files)
  if ($RequireSign -and -not $SkipSign) {
    $hasCred = $PfxPath -or $CertThumbprint `
      -or $env:FLUXSHIELD_SIGN_PFX_PATH -or $env:FLUXSHIELD_SIGN_CERT_THUMBPRINT `
      -or $env:FLUXSHIELD_SIGN_PFX_BASE64
    if (-not $hasCred) {
      throw "RequireSign: pass -PfxPath or -CertThumbprint (or set FLUXSHIELD_SIGN_* env vars)"
    }
  }
  $signParams = @{ Path = $Files }
  if ($SkipSign) {
    $signParams.SkipSign = $true
  } else {
    if ($PfxPath) { $signParams.PfxPath = $PfxPath }
    if ($PfxPassword) { $signParams.PfxPassword = $PfxPassword }
    if ($CertThumbprint) { $signParams.CertThumbprint = $CertThumbprint }
  }
  & (Join-Path $PSScriptRoot "Sign-Code.ps1") @signParams
}

Invoke-FluxSign -Files @($exe)

if (-not (Get-Command candle.exe -ErrorAction SilentlyContinue)) {
  throw "WiX Toolset not found. Install: choco install wixtoolset -y"
}

$wxs = Join-Path $PSScriptRoot "fluxshield-agent.wxs"
$obj = Join-Path $dist "fluxshield-agent.wixobj"
$msiName = "FluxShield-Agent-$Version.msi"
$msi = Join-Path $dist $msiName

$parts = $Version.Split(".")
while ($parts.Count -lt 4) { $parts += "0" }
$productVersionQuad = ($parts[0..3] -join ".")

$wxiPath = Join-Path $dist "_ProductVersion.wxi"
@"
<?xml version="1.0" encoding="UTF-8"?>
<Include>
  <?define ProductVersion = "$productVersionQuad" ?>
</Include>
"@ | Set-Content -Path $wxiPath -Encoding UTF8

Write-Host "Compiling WiX (product version $productVersionQuad)..."
$candleArgs = @(
  "-nologo",
  $wxs,
  "-out", $obj
)
& candle.exe @candleArgs
if ($LASTEXITCODE -ne 0) { throw "candle failed" }

Write-Host "Linking MSI..."
& light.exe -nologo $obj -out $msi
if ($LASTEXITCODE -ne 0) { throw "light failed" }

Invoke-FluxSign -Files @($msi)

Write-Host ""
Write-Host "Built: $msi"
Write-Host "Silent install: msiexec /i `"$msiName`" INSTALLTOKEN=<token> /qn"
