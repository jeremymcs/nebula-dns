# Nebula DNS — Droplet production runbook

This directory runs the **always-on DigitalOcean droplet** stack: NestJS API, Go policy-svc, dnsdist, Unbound, and Caddy (TLS for `api.nebuladns.io` and DoH on `:443` for `dns1`/`dns2`).

Customer-facing **UI** and **admin-ui** deploy separately on Vercel (`nebula-dns-app`, `nebula-dns-admin`). **Postgres (Neon)** and **Redis (Upstash)** come from the Vercel Marketplace (connection strings in `.env`). **ClickHouse** runs self-hosted in this Compose stack (internal network only, ~1 GiB memory cap).

## Architecture

```text
app.nebuladns.io / admin.nebuladns.io  →  Vercel (Next.js)
api.nebuladns.io                       →  Caddy → API :3000
dns1/dns2.nebuladns.io                 →  Caddy :443 DoH → dnsdist :8443
                                       →  dnsdist :53 UDP/TCP (plain DNS)
                                       →  dnsdist :853 DoT
Neon Postgres / Upstash Redis           →  external (TLS)
clickhouse (compose)                     →  query logs (not exposed publicly)
```

## 1. Provision a fresh Ubuntu droplet (~4 GB)

1. Create an Ubuntu 24.04 droplet in your region (4 GB RAM recommended).
2. SSH as root and install Docker:

```bash
apt-get update && apt-get install -y ca-certificates curl
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin git
```

3. Clone this repository (or copy only `deploy/droplet/`):

```bash
git clone https://github.com/jeremymcs/nebula-dns.git /opt/nebula-dns
cd /opt/nebula-dns/deploy/droplet
cp .env.example .env
# Edit .env — see variable list at bottom of this file
```

### Vercel Marketplace → droplet `.env`

| Provider | Names in Vercel / dashboard | **Use on droplet** |
|----------|----------------------------|--------------------|
| Neon | `POSTGRES_URL`, `DATABASE_URL` | **`DATABASE_URL`** (pooled URL + `sslmode=require`) |
| Upstash Redis | `REDIS_URL`, `KV_URL` | **`REDIS_URL`** (`rediss://…` TLS URL) |

The API and policy-svc do **not** read `POSTGRES_URL` or `KV_URL` — copy values into the names above.

**Redis TLS:** The API uses **ioredis** with the connection URL string; **`rediss://` enables TLS** (Upstash default). policy-svc uses **go-redis** `ParseURL`, which also supports `rediss://` with TLS 1.2+.

## 2. Firewall and port 53

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 53/tcp
ufw allow 53/udp
ufw allow 853/tcp
ufw enable
```

Free port 53 from `systemd-resolved` (required before dnsdist can bind):

```bash
sed -ri 's/^#?DNSStubListener=.*/DNSStubListener=no/' /etc/systemd/resolved.conf
systemctl restart systemd-resolved
ln -sf /run/systemd/resolve/resolv.conf /etc/resolv.conf
```

Published services:

| Port | Protocol | Service |
|------|----------|---------|
| 22 | TCP | SSH |
| 80 | TCP | Caddy (ACME HTTP-01) |
| 443 | TCP | Caddy — API + DoH |
| 53 | UDP/TCP | dnsdist plain DNS |
| 853 | TCP | dnsdist DoT |

## 3. TLS certificates for dnsdist (DoT / internal DoH)

Private keys are **not** stored in git.

**Bootstrap (self-signed, 30 days):**

```bash
chmod +x scripts/generate-dns-certs.sh
./scripts/generate-dns-certs.sh dns1.nebuladns.io
```

**Production (recommended):** Let Caddy obtain ACME certificates, then sync PEM files for dnsdist:

The `Caddyfile` lists **both** `dns1.nebuladns.io` and `dns2.nebuladns.io` in one site block so Let's Encrypt issues a **single certificate with both SANs**. That cert is copied to dnsdist for DoT on `:853` (clients can use either hostname).

```bash
docker compose up -d caddy
# Wait for ACME success in: docker compose logs caddy
chmod +x scripts/sync-caddy-certs.sh
./scripts/sync-caddy-certs.sh dns1.nebuladns.io
docker compose restart dnsdist
```

**After Caddy renews (automated):** Caddy renews in the background, but dnsdist still reads files from `./certs/`. Install the systemd timer on the droplet so renewed certs are copied and dnsdist is restarted only when the files change:

```bash
cp systemd/nebula-dns-sync-certs.{service,timer} /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now nebula-dns-sync-certs.timer
systemctl list-timers nebula-dns-sync-certs.timer
```

The timer runs `scripts/sync-caddy-certs.sh … --reload-if-changed` daily (see `systemd/nebula-dns-sync-certs.timer`). Override `CADDY_DATA` in the unit if your Docker volume path differs (`docker volume inspect nebula-dns_caddy_data`).

See `certs/README.md` for details.

## 4. Database migrations (Neon)

On first deploy, run migrations against an empty Neon database:

```bash
cd /opt/nebula-dns/deploy/droplet
docker compose pull api
docker compose run --rm --no-deps \
  -e NODE_ENV=production \
  -e DATABASE_URL='postgresql://...?sslmode=require' \
  api node dist/database/migrate.js
```

Generate application secrets on the droplet:

```bash
openssl rand -base64 64   # JWT_SECRET, JWT_REFRESH_SECRET, ADMIN_JWT_SECRET
openssl rand -base64 32   # MFA_ENCRYPTION_KEY, SSO_ENCRYPTION_KEY, etc.
openssl rand -hex 32      # DNSDIST_API_KEY
openssl rand -base64 24   # CLICKHOUSE_PASSWORD (match .env)
```

### ClickHouse (self-hosted)

ClickHouse starts with the stack (no profile). It is **not** published on the host — only `expose` on the Compose network. Memory is capped at **~1 GiB server limit** (`clickhouse/max-memory.xml`) and **1536 MB** Docker limit so a **4 GB** droplet keeps headroom for API, policy-svc, dnsdist, and the OS.

On first boot, `scripts/init-clickhouse.sql` creates the `nebula_dns` schema. Ensure `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, and `CLICKHOUSE_DATABASE` in `.env` match the compose service environment.

## 5. Cloudflare DNS (DNS only — grey cloud)

Create **DNS only** A records pointing at the droplet public IPv4:

| Name | Type | Content | Proxy |
|------|------|---------|-------|
| api | A | `<droplet-ip>` | DNS only |
| dns1 | A | `<droplet-ip>` | DNS only |
| dns2 | A | `<droplet-ip>` | DNS only |

Vercel handles `app` and `admin` CNAME/A records for the UI projects.

## 6. Start the stack

### Pull images from GHCR (private packages)

Images built by `.github/workflows/deploy.yml` are pushed to **GitHub Container Registry** (`ghcr.io/jeremymcs/nebula-dns-*`) as **private** packages. The droplet must authenticate before `docker compose pull`:

1. Create a GitHub **classic PAT** or fine-grained token with **`read:packages`** (and `read:org` if the package is org-scoped).
2. On the droplet (once per machine):

```bash
echo "<token>" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
```

3. Deploys from CI (push to `main` → `deploy.yml`) SSH to the droplet and run `docker compose pull && docker compose up -d` in `DROPLET_DEPLOY_PATH` (default `/opt/nebula-dns/deploy/droplet`). The droplet login above must succeed or pulls fail while the workflow still reports SSH success.

Manual rollout on the droplet:

```bash
cd /opt/nebula-dns/deploy/droplet
export IMAGE_TAG=<git-sha-or-latest>
docker compose pull
docker compose up -d
docker compose ps
```

## 7. External integrations checklist

| Integration | URL / setting |
|-------------|----------------|
| Vercel UI `API_URL` | `https://api.nebuladns.io` |
| API `FRONTEND_URL` | `https://app.nebuladns.io` |
| API `ADMIN_URL` | `https://admin.nebuladns.io` |
| API `CORS_ORIGINS` | `https://app.nebuladns.io,https://admin.nebuladns.io` |
| Stripe **live** keys | `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_WEBHOOK_SECRET=whsec_…` (live mode in Dashboard) |
| Stripe webhook | `https://api.nebuladns.io/payments/webhook` |
| SAML ACS | `https://api.nebuladns.io/sso/saml/callback` |
| OIDC redirect | `https://api.nebuladns.io/sso/oidc/callback` |

Use Stripe **test** keys (`sk_test_…`) only for sandbox verification (see §8); switch to live keys before production checkout.

## 8. Verification

Run these after deploy (replace tokens and IPs as needed).

### API health

```bash
curl -sf https://api.nebuladns.io/health | jq .
curl -sf https://api.nebuladns.io/health/ready | jq .
```

### Signup and login

1. Open `https://app.nebuladns.io` and complete signup (or use an existing tenant).
2. Confirm login succeeds and the dashboard loads (browser network tab shows API calls to `https://api.nebuladns.io`).

### Stripe webhook (live or test)

**Production:** Register the live webhook in Stripe Dashboard (Live mode) pointing to:

`https://api.nebuladns.io/payments/webhook`

Use the live signing secret in `STRIPE_WEBHOOK_SECRET`.

**Verification (test mode):** Toggle Dashboard to Test mode, use `sk_test_…` and the test `whsec_…` in `.env`, then use “Send test webhook”. Confirm HTTP 2xx and clean `docker compose logs api`. Restore **live** keys before launch.

### DNS — plain UDP/TCP (:53)

From a client that matches a **location IP** in the policy (or use a DoH Bearer token):

```bash
drill @dns1.nebuladns.io google.com
drill @dns1.nebuladns.io -T google.com
kdig @dns1.nebuladns.io google.com
kdig @dns1.nebuladns.io +tcp google.com
```

Unidentified sources should receive **REFUSED** (not an open resolver).

### DNS — DoT (:853)

After installing `kdig` (knot-dnsutils):

```bash
kdig @dns1.nebuladns.io +tls-ca +tls-host=dns1.nebuladns.io google.com
kdig @dns2.nebuladns.io +tls-ca +tls-host=dns2.nebuladns.io google.com
```

Use the Let's Encrypt chain from Caddy/synced certs, or `-tls` with `+tls-insecure` only for bootstrap self-signed certs.

### DNS — DoH (:443 via Caddy)

With a location **Bearer** token from the dashboard:

```bash
TOKEN='your-location-token'
curl -sS -H "accept: application/dns-message" \
  -H "Authorization: Bearer ${TOKEN}" \
  "https://dns1.nebuladns.io/dns-query?dns=$(printf '\\x00\\x00\\x01\\x00\\x00\\x01\\x00\\x00\\x00\\x00\\x00\\x00\\x06google\\x03com\\x00\\x00\\x01\\x00\\x01' | base64 -w0)" \
  | hexdump -C | head
```

Or use `kdig` DoH when built with nghttp2:

```bash
kdig @https://dns1.nebuladns.io/dns-query google.com +https +tls-host=dns1.nebuladns.io
```

## 9. CI deploy

GitHub Actions workflow `.github/workflows/deploy.yml` builds images to GHCR and SSHs to the droplet (`DROPLET_HOST`, `DROPLET_SSH_KEY` secrets) to run `docker compose pull && docker compose up -d` in `/opt/nebula-dns/deploy/droplet`.

---

## Environment variables by service

### API (`api`)

`NODE_ENV`, `PORT`, `LOG_LEVEL`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_JWT_SECRET`, `MFA_ENCRYPTION_KEY`, `SSO_ENCRYPTION_KEY`, `SIEM_ENCRYPTION_KEY`, `ALERTING_ENCRYPTION_KEY`, `INTERNAL_SERVICE_KEY`, `FRONTEND_URL`, `ADMIN_URL`, `CORS_ORIGINS`, `CLICKHOUSE_URL`, `CLICKHOUSE_DATABASE`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `SENDGRID_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `SENTRY_DSN`

### policy-svc

`PORT`, `LOG_LEVEL`, `FAIL_MODE`, `REDIS_URL`, `CLICKHOUSE_URL`, `CLICKHOUSE_DATABASE`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `API_URL`, `API_INTERNAL_KEY`

### dnsdist

`POLICY_SVC_URL`, `DNSDIST_API_KEY`, TLS files mounted at `/etc/dnsdist/certs/` (`server.crt`, `server.key`)

### Caddy

`ACME_EMAIL` (via `.env`), `Caddyfile` volume

### Unbound

No extra env (config baked in image)

### clickhouse (self-hosted, default)

`CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DATABASE` — set in `.env`; `CLICKHOUSE_URL` defaults to `http://clickhouse:8123` in compose for API and policy-svc. Not reachable from the public internet.

### Compose / deploy

`IMAGE_TAG`, `ACME_EMAIL`
