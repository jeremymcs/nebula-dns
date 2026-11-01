# Windows installation

## Build & sign MSI on your Windows machine

Code signing stays **local** (your Azure cert never goes to GitHub). CI only publishes an **unsigned** MSI/exe artifact for convenience; you sign before RMM rollout.

### Prerequisites

- Go 1.24+
- [WiX Toolset 3.x](https://wixtoolset.org/) (`choco install wixtoolset -y`)
- [Windows SDK](https://developer.microsoft.com/windows/downloads/windows-sdk/) (for `signtool.exe`)
- Your Azure code signing cert as **PFX on disk**, or imported into **Local Machine → Personal** with private key

### One-shot build + sign

From repo root:

```powershell
cd agents\safedns-agent

# Option A: PFX file (typical after exporting from Azure Key Vault)
.\scripts\build-msi.ps1 -Version 1.0.0 `
  -PfxPath "C:\certs\fluxshield-codesign.pfx" `
  -PfxPassword (Read-Host -AsSecureString | ConvertFrom-SecureString -AsPlainText)

# Option B: cert already in Windows store (list thumbprints: certmgr.msc)
.\scripts\build-msi.ps1 -Version 1.0.0 -CertThumbprint "AA BB CC ..."

# Require signing (fail if no cert provided)
.\scripts\build-msi.ps1 -Version 1.0.0 -PfxPath C:\certs\flux.pfx -PfxPassword $env:FLUXSHIELD_SIGN_PFX_PASSWORD -RequireSign
```

Environment variables (optional instead of parameters):

- `FLUXSHIELD_SIGN_PFX_PATH` + `FLUXSHIELD_SIGN_PFX_PASSWORD`
- `FLUXSHIELD_SIGN_CERT_THUMBPRINT`

Output: `dist\FluxShield-Agent-1.0.0.msi` (exe and MSI both signed).

### Sign a CI download

1. Download artifact **fluxshield-agent-msi-unsigned** from GitHub Actions.
2. Extract into `agents\safedns-agent\dist\`.
3. Run:

```powershell
cd agents\safedns-agent
.\scripts\sign-release.ps1 -PfxPath C:\certs\fluxshield-codesign.pfx -PfxPassword $env:FLUXSHIELD_SIGN_PFX_PASSWORD
```

### Silent install (after signing)

```powershell
msiexec /i FluxShield-Agent-1.0.0.msi INSTALLTOKEN="<token-from-dashboard>" /qn
```

| Property | Default | Purpose |
|----------|---------|---------|
| `INSTALLTOKEN` | (required for enroll) | Dashboard install token |
| `INSTALLROLES` | `dns-enforce,site-updater` | Comma-separated roles |

### Azure Trusted Signing (local, no PFX)

If you use **Azure Trusted Signing** instead of a PFX, set env vars from `scripts\signing.env.example` and run `build-msi.ps1` on a machine where `az login` / service principal can reach the signing account.

## PowerShell (exe only)

```powershell
.\install.ps1 -Token "<installation-token-from-app>"
```

## Emergency DNS restore

```powershell
fluxshield-agent.exe recover-dns
```
