# Windows installation

## MSI (signed, RMM-friendly)

CI builds **`FluxShield-Agent-<version>.msi`** on `windows-latest` (WiX + optional Azure signing).

### Silent install with installation token

```powershell
msiexec /i FluxShield-Agent-1.0.0.msi INSTALLTOKEN="<token-from-dashboard>" /qn
```

Optional property:

| Property | Default | Purpose |
|----------|---------|---------|
| `INSTALLTOKEN` | (required for enroll) | Dashboard install token |
| `INSTALLROLES` | `dns-enforce,site-updater` | Comma-separated roles |

The MSI copies `fluxshield-agent.exe`, then runs `install --token …` (service + DPAPI enrollment). Uninstall runs `fluxshield-agent uninstall` and restores DNS.

### Local build + sign

```powershell
cd agents/safedns-agent
$env:FLUXSHIELD_SIGN_PFX_BASE64 = "<base64-pfx>"
$env:FLUXSHIELD_SIGN_PFX_PASSWORD = "<pfx-password>"
.\scripts\build-msi.ps1 -Version 1.0.0
```

Or point at a Key Vault secret (base64 PFX) after `az login`:

```powershell
$env:AZURE_SIGNING_KEY_VAULT = "my-vault"
$env:AZURE_SIGNING_PFX_SECRET = "fluxshield-codesign-pfx"
.\scripts\build-msi.ps1
```

**Azure Trusted Signing** (no PFX on disk):

```powershell
$env:AZURE_TRUSTED_SIGNING_ACCOUNT = "my-account"
$env:AZURE_TRUSTED_SIGNING_PROFILE = "my-profile"
$env:AZURE_TENANT_ID = "..."
$env:AZURE_CLIENT_ID = "..."
$env:AZURE_CLIENT_SECRET = "..."
.\scripts\build-msi.ps1
```

Optional: `AZURE_TRUSTED_SIGNING_ENDPOINT` (defaults to `https://<account>.codesigning.azure.net/`).

### GitHub Actions secrets

Configure **one** signing path:

| Secret | Use |
|--------|-----|
| `FLUXSHIELD_SIGN_PFX_BASE64` + `FLUXSHIELD_SIGN_PFX_PASSWORD` | PFX in repo secrets |
| `AZURE_SIGNING_KEY_VAULT` + `AZURE_SIGNING_PFX_SECRET` | PFX as Key Vault secret (needs `AZURE_*` login secrets) |
| `AZURE_TRUSTED_SIGNING_*` + `AZURE_CLIENT_*` | Azure Trusted Signing |

If no signing secrets are set, the MSI still builds but artifacts remain **unsigned** (warning in log).

## PowerShell (exe only)

```powershell
.\install.ps1 -Token "<installation-token-from-app>"
```

Secrets (`deviceSecret`, `dohToken`) use **DPAPI (LOCAL_MACHINE)** under `%ProgramData%\FluxShield\credentials\`.

## Emergency DNS restore

```powershell
fluxshield-agent.exe recover-dns
```

## Service recovery

Install configures SCM recovery: **restart** up to three times at 60s intervals.
