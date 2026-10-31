# Flux Shield Agent

Windows-first endpoint agent for Flux Shield (formerly Nebula DNS). Implementation lives in [`../agents/safedns-agent/`](../agents/safedns-agent/).

## Split DNS (Active Directory)

Domain-joined machines use a **local stub resolver on 127.0.0.1** with zone-based split routing. See [SPLIT-DNS.md](../agents/safedns-agent/docs/SPLIT-DNS.md) for architecture, NRPT tradeoffs, and the on-site / off-site decision table.

## RMM install (Windows)

```powershell
fluxshield-agent.exe install --token "<installation-token-from-app>"
```

Generate the token from **Dashboard → Agents → Download** (optionally link a location for site IP updater + internal DNS zones).
