# Nebula DNS — Rebuild runbook (sanitized)

> **Note:** The previous go-live plan contained committed credentials. Those values were removed and must be **rotated** before any production use. Operational steps for the new topology live in [`deploy/droplet/README.md`](../deploy/droplet/README.md).

## Target topology

| Component | Where it runs |
|-----------|----------------|
| Tenant UI (`ui/`) | Vercel project `nebula-dns-app` → `https://app.nebuladns.io` |
| Admin UI (`admin-ui/`) | Vercel project `nebula-dns-admin` → `https://admin.nebuladns.io` |
| API + DNS data plane | Single DigitalOcean droplet (~4 GB), Docker Compose in `deploy/droplet/` |
| PostgreSQL | Neon (Vercel Marketplace) |
| Redis | Upstash (Vercel Marketplace) |
| Query logs | ClickHouse Cloud (optional local ClickHouse compose profile) |

## Pre-launch checklist (no secrets in repo)

1. Provision Neon + Upstash from Vercel Marketplace; set `DATABASE_URL` (`sslmode=require`) and `REDIS_URL` on the droplet.
2. Provision ClickHouse Cloud; set `CLICKHOUSE_*` on API and policy-svc.
3. Generate new JWT and encryption keys (`openssl rand`) — see droplet runbook.
4. Configure Cloudflare **DNS only** A records: `api`, `dns1`, `dns2` → droplet IP.
5. Configure Vercel env: `API_URL=https://api.nebuladns.io` on the app project.
6. Rotate any credential types that ever appeared in git history (see PR description).

## Deprecated paths

- Kubernetes / Helm deploy workflows are **deprecated**; see `helm/DEPRECATED.md` and `k8s/DEPRECATED.md`.
- Do not use the old DigitalOcean droplet or DOKS cluster — rebuild from scratch.

## Placeholder exports (set locally, never commit)

```bash
export DIGITALOCEAN_TOKEN="dop_v1_<rotate-me>"
export AWS_ACCESS_KEY_ID="<spaces-access-key-id>"
export AWS_SECRET_ACCESS_KEY="<spaces-secret-key>"
export CLICKHOUSE_ORG_ID="org_<your-org>"
export CLICKHOUSE_TOKEN_KEY="<rotate-me>"
export CLICKHOUSE_TOKEN_SECRET="<rotate-me>"
```

External services (configure in `.env` on the droplet / Vercel):

- Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) — webhook URL `https://api.nebuladns.io/payments/webhook`
- SendGrid (`SENDGRID_API_KEY`)
- Sentry (`SENTRY_DSN`)
- Cloudflare API token (ACME DNS-01 if used outside Caddy HTTP-01)
