# Windows installation

## Recommended: PowerShell (RMM / GPO)

```powershell
.\install.ps1 -Token "<installation-token-from-app>"
```

The script runs:

```text
fluxshield-agent.exe install --token <token> --roles dns-enforce,site-updater
```

Secrets (`deviceSecret`, `dohToken`) are stored with **DPAPI (LOCAL_MACHINE)** under `%ProgramData%\FluxShield\credentials\` — never written to `config.json`.

## Emergency DNS restore

If the service crashes or the stub cannot bind, the agent **does not** leave loopback DNS applied without a working stub. If a machine is stuck on loopback:

```powershell
fluxshield-agent.exe recover-dns
```

Uninstall also restores per-adapter DNS from `%ProgramData%\FluxShield\dns_backup.json`.

## MSI

WiX MSI packaging is **not** built in CI (requires Windows + WiX toolchain). Use the `.exe` artifact from CI plus `install.ps1`, or wrap with your RMM’s software package template.

## Service recovery

Install configures Service Control Manager recovery: **restart** up to three times at 60s intervals (`sc.exe failure`).
