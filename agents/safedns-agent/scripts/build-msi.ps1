# Build a signed Flux Shield Agent MSI (WiX 3.x).
# Signing: see Sign-Code.ps1 (PFX base64, Key Vault secret, or Azure Trusted Signing env vars).
param(
  [string] $Version = "1.0.0",
  [switch] $SkipSign,
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

$signArgs = @{ Path = @($exe) }
if ($SkipSign) { $signArgs.SkipSign = $true }
& (Join-Path $PSScriptRoot "Sign-Code.ps1") @signArgs

if (-not (Get-Command candle.exe -ErrorAction SilentlyContinue)) {
  throw "WiX Toolset not found. Install: choco install wixtoolset -y"
}

$wxs = Join-Path $PSScriptRoot "fluxshield-agent.wxs"
$obj = Join-Path $dist "fluxshield-agent.wixobj"
$msiName = "FluxShield-Agent-$Version.msi"
$msi = Join-Path $dist $msiName

$parts = $Version.Split(".")
while ($parts.Count -lt 4) { $parts += "0" }
$wixVersion = ($parts[0..3] -join ".")

Write-Host "Compiling WiX (product version $wixVersion)..."
& candle.exe -nologo -dProductVersion=$wixVersion $wxs -out $obj
if ($LASTEXITCODE -ne 0) { throw "candle failed" }

Write-Host "Linking MSI..."
& light.exe -nologo $obj -out $msi
if ($LASTEXITCODE -ne 0) { throw "light failed" }

$signMsi = @{ Path = @($msi) }
if ($SkipSign) { $signMsi.SkipSign = $true }
& (Join-Path $PSScriptRoot "Sign-Code.ps1") @signMsi

Write-Host "Built: $msi"
Write-Host "Silent install: msiexec /i `"$msiName`" INSTALLTOKEN=<token> /qn"
