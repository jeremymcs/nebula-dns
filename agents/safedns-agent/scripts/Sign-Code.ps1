# Signs Windows artifacts using Azure Key Vault (PFX secret) or a local PFX file.
# Azure Trusted Signing is supported when AzureSignTool is on PATH.
param(
  [Parameter(Mandatory = $true)]
  [string[]] $Path,

  [string] $PfxPath = $env:FLUXSHIELD_SIGN_PFX_PATH,
  [string] $PfxPassword = $env:FLUXSHIELD_SIGN_PFX_PASSWORD,

  [string] $PfxBase64 = $env:FLUXSHIELD_SIGN_PFX_BASE64,

  [string] $KeyVaultName = $env:AZURE_SIGNING_KEY_VAULT,
  [string] $KeyVaultSecretName = $env:AZURE_SIGNING_PFX_SECRET,

  [string] $TrustedSigningAccount = $env:AZURE_TRUSTED_SIGNING_ACCOUNT,
  [string] $TrustedSigningProfile = $env:AZURE_TRUSTED_SIGNING_PROFILE,
  [string] $AzureTenantId = $env:AZURE_TENANT_ID,
  [string] $AzureClientId = $env:AZURE_CLIENT_ID,
  [string] $AzureClientSecret = $env:AZURE_CLIENT_SECRET,

  [string] $Description = "Flux Shield Agent",
  [string] $DescriptionUrl = "https://shield.fluxlabs.net",

  [switch] $SkipSign
)

$ErrorActionPreference = "Stop"

function Find-SignTool {
  $kits = "${env:ProgramFiles(x86)}\Windows Kits\10\bin"
  if (-not (Test-Path $kits)) {
    throw "Windows SDK signtool not found under $kits"
  }
  $latest = Get-ChildItem $kits -Directory | Sort-Object Name -Descending | Select-Object -First 1
  $tool = Join-Path $latest.FullName "x64\signtool.exe"
  if (-not (Test-Path $tool)) {
    throw "signtool.exe not found at $tool"
  }
  return $tool
}

function Resolve-PfxPath {
  if ($PfxPath -and (Test-Path $PfxPath)) {
    return $PfxPath
  }
  if ($PfxBase64) {
    $temp = Join-Path $env:RUNNER_TEMP "fluxshield-codesign.pfx"
    if (-not $env:RUNNER_TEMP) { $temp = Join-Path $env:TEMP "fluxshield-codesign.pfx" }
    [IO.File]::WriteAllBytes($temp, [Convert]::FromBase64String($PfxBase64))
    return $temp
  }
  if ($KeyVaultName -and $KeyVaultSecretName) {
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
      throw "Azure CLI required to fetch PFX from Key Vault (set FLUXSHIELD_SIGN_PFX_* instead)"
    }
    $temp = Join-Path $env:RUNNER_TEMP "kv-codesign.pfx"
    if (-not $env:RUNNER_TEMP) { $temp = Join-Path $env:TEMP "kv-codesign.pfx" }
    az keyvault secret show `
      --vault-name $KeyVaultName `
      --name $KeyVaultSecretName `
      --query value -o tsv | Out-File -FilePath $temp -Encoding ascii -NoNewline
    # Secret value is base64-encoded PFX
    $raw = Get-Content $temp -Raw
    [IO.File]::WriteAllBytes($temp, [Convert]::FromBase64String($raw.Trim()))
    return $temp
  }
  return $null
}

function Sign-WithPfx {
  param([string[]] $Files, [string] $Pfx, [string] $Password)
  $signtool = Find-SignTool
  foreach ($f in $Files) {
    if (-not (Test-Path $f)) { throw "Missing file to sign: $f" }
    Write-Host "Signing (PFX): $f"
    & $signtool sign /f $Pfx /p $Password /fd sha256 /tr "http://timestamp.digicert.com" /td sha256 /d $Description /du $DescriptionUrl $f
    if ($LASTEXITCODE -ne 0) { throw "signtool failed for $f" }
  }
}

function Sign-WithTrustedSigning {
  param([string[]] $Files)
  if (-not (Get-Command AzureSignTool -ErrorAction SilentlyContinue)) {
    dotnet tool install --global AzureSignTool --version 6.0.0 | Out-Null
    $env:PATH = "$env:USERPROFILE\.dotnet\tools;$env:PATH"
  }
  if (-not $TrustedSigningProfile) {
    throw "Set AZURE_TRUSTED_SIGNING_PROFILE"
  }
  if (-not $AzureTenantId -or -not $AzureClientId -or -not $AzureClientSecret) {
    throw "Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET for Trusted Signing"
  }
  $endpoint = $env:AZURE_TRUSTED_SIGNING_ENDPOINT
  if (-not $endpoint -and $TrustedSigningAccount) {
    $endpoint = "https://$TrustedSigningAccount.codesigning.azure.net/"
  }
  if (-not $endpoint) {
    throw "Set AZURE_TRUSTED_SIGNING_ENDPOINT or AZURE_TRUSTED_SIGNING_ACCOUNT"
  }
  foreach ($f in $Files) {
    Write-Host "Signing (Azure Trusted Signing): $f"
    AzureSignTool sign `
      -kvu $endpoint `
      -kvi $AzureClientId `
      -kvt $AzureTenantId `
      -kvs $AzureClientSecret `
      -kvc $TrustedSigningProfile `
      -d $Description `
      -du $DescriptionUrl `
      -tr "http://timestamp.digicert.com" `
      -v $f
    if ($LASTEXITCODE -ne 0) { throw "AzureSignTool failed for $f" }
  }
}

if ($SkipSign) {
  Write-Warning "SkipSign set — artifacts left unsigned"
  exit 0
}

if ($TrustedSigningProfile -and $AzureClientId) {
  Sign-WithTrustedSigning -Files $Path
  exit 0
}

$pfx = Resolve-PfxPath
if (-not $pfx) {
  Write-Warning "No signing credentials (PFX / Key Vault / Trusted Signing). Skipping sign."
  exit 0
}
if (-not $PfxPassword) {
  throw "PFX password required: set FLUXSHIELD_SIGN_PFX_PASSWORD"
}

Sign-WithPfx -Files $Path -Pfx $pfx -Password $PfxPassword
