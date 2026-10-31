# Nebula DNS — Droplet production runbook

This directory runs the **always-on DigitalOcean droplet** stack: NestJS API, Go policy-svc, dnsdist, Unbound, and Caddy (TLS for `api.nebuladns.io` and DoH on `:443` for `dns1`/`dns2`).

Customer-facing **UI** and **admin-ui** deploy separately on Vercel (`nebula-dns-app`, `nebula-dns-admin`). Postgres (Neon) and Redis (Upstash) are provisioned via the Vercel Marketplace; connection strings live in `.env` on the droplet.

## Architecture

```text
app.nebuladns.io / admin.nebuladns.io  →  Vercel (Next.js)
api.nebuladns.io                       →  Caddy → API :3000
dns1/dns2.nebuladns.io                 →  Caddy :443 DoH → dnsdist :8443
                                       →  dnsdist :53 UDP/TCP (plain DNS)
                                       →  dnsdist :853 DoT
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

```bash
docker compose up -d caddy
# Wait for ACME success in: docker compose logs caddy
chmod +x scripts/sync-caddy-certs.sh
./scripts/sync-caddy-certs.sh dns1.nebuladns.io
docker compose restart dnsdist
```

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
```

## 5. Cloudflare DNS (DNS only — grey cloud)

Create **DNS only** A records pointing at the droplet public IPv4:

| Name | Type | Content | Proxy |
|------|------|---------|-------|
| api | A | `<droplet-ip>` | DNS only |
| dns1 | A | `<droplet-ip>` | DNS only |
| dns2 | A | `<droplet-ip>` | DNS only |

Vercel handles `app` and `admin` CNAME/A records for the UI projects.

## 6. Start the stack

Ensure the droplet can pull from GHCR (one-time):

```bash
echo "<github_pat_with_read_packages>" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
```

```bash
cd /opt/nebula-dns/deploy/droplet
docker compose pull
docker compose up -d
docker compose ps
```

Optional local ClickHouse (fallback if not using ClickHouse Cloud):

```bash
docker compose --profile clickhouse-local up -d
```

## 7. External integrations checklist

| Integration | URL / setting |
|-------------|----------------|
| Vercel UI `API_URL` | `https://api.nebuladns.io` |
| API `FRONTEND_URL` | `https://app.nebuladns.io` |
| API `ADMIN_URL` | `https://admin.nebuladns.io` |
| API `CORS_ORIGINS` | `https://app.nebuladns.io,https://admin.nebuladns.io` |
| Stripe webhook | `https://api.nebuladns.io/payments/webhook` |
| SAML ACS | `https://api.nebuladns.io/sso/saml/callback` |
| OIDC redirect | `https://api.nebuladns.io/sso/oidc/callback` |

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

### Stripe test webhook

In Stripe Dashboard → Developers → Webhooks, send a test event to:

`https://api.nebuladns.io/payments/webhook`

Confirm HTTP 2xx in Stripe delivery logs and no errors in `docker compose logs api`.

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

### clickhouse (optional profile)

`CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DATABASE`

### Compose / deploy

`IMAGE_TAG`, `ACME_EMAIL`
