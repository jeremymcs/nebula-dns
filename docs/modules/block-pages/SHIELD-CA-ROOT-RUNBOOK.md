# Flux Shield — offline root CA runbook

**Purpose:** Create the platform **offline root** used to sign MSP/tenant **intermediate** CAs. The root private key must **never** live on the droplet, in git, or in customer-facing systems.

## Prerequisites

- OpenSSL 3.x on an **air-gapped or hardened ops workstation**
- Password manager or HSM procedure for long-term root key storage
- Secrets manager path for **production API** env (Vercel/droplet `.env` only — not the repo)

## Generate (local only)

Use the helper script (writes to a temp directory by default):

```bash
./scripts/shield-ca/generate-offline-root.sh
# or explicit output dir (must NOT be inside the git repo):
./scripts/shield-ca/generate-offline-root.sh /secure/vault/flux-shield-root-$(date +%Y%m%d)
```

The script prints:

- `flux-shield-root.key` — **offline forever** (encrypted backup, dual control)
- `flux-shield-root.crt` — public root certificate

**Do not commit** `.key`, `.crt`, or `.pem` files from this step. Add your output directory to `.gitignore` if you override the default.

## Install into production API

Set these on the **API** service only (same PEM contents as files, or base64 in your secret store):

| Variable | Content |
|----------|---------|
| `SHIELD_ROOT_CERT_PEM` | Full PEM of `flux-shield-root.crt` |
| `SHIELD_ROOT_KEY_PEM` | Full PEM of root private key — **only while signing new intermediates**; prefer signing intermediates offline and importing intermediate PEM only (advanced). For Phase 1, API holds root key in secrets to auto-provision intermediates on first use. |

Also set:

| Variable | Purpose |
|----------|---------|
| `SHIELD_CA_MASTER_KEY` | AES key for encrypting intermediate private keys in PostgreSQL (`openssl rand -base64 32`) |
| `SHIELD_BLOCKPAGE_INTERNAL_SECRET` | Shared secret for `shield-blockpage` / Caddy ask → API (`openssl rand -hex 32`) |

Run database migration `1762000000000-ShieldCa` before enabling block pages + HTTPS.

## Sign a new intermediate offline (rotation)

When rotating an MSP intermediate without storing the root key on API:

1. Generate a new RSA intermediate key + CSR on a secure host (or let API generate and export CSR — future enhancement).
2. Sign with offline root (manual OpenSSL `ca` config) with `basicConstraints=critical,CA:TRUE,pathlen:0`.
3. Insert new row in `shield_ca_intermediates` or call admin rotation API (future); mark old intermediate `rotating` then `revoked`.
4. Redeploy trust: Intune/GPO/RMM/mobileconfig/agent (`install_shield_ca`) — see dashboard **Shield Certificate**.

## Windows agent (PR #13)

Automatic CA install/uninstall on endpoints is implemented in `agents/safedns-agent` (`internal/shieldca/`). Enable per tenant: `tenants.settings.installShieldCaOnAgent` and agent config `install_shield_ca`. Agent changes ship with agent PR #13; API download endpoint is `GET /agents/shield-ca/certificate.pem?device_id=`.

## Security checklist

- [ ] Root key stored offline with backup and access logging
- [ ] Root key not in git, Slack, or ticket attachments
- [ ] `SHIELD_CA_MASTER_KEY` unique per environment
- [ ] `SHIELD_BLOCKPAGE_INTERNAL_SECRET` rotated if leaked
- [ ] Intermediate expiry alerts monitored (API daily job + UI metadata)

See `SHIELD-CA-SETUP.md` for droplet terminator and Redis/policy prerequisites.
