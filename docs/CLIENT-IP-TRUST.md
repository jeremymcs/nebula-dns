# Client IP trust (Flux Shield / Nebula DNS API)

Audit logs, session records, rate limits, API-key IP allowlists, and admin IP allowlists all resolve the client address through `api/src/common/http/client-ip.ts` (`getClientIp` / `tryGetClientIp`).

## Request paths

| Path | How the API learns the client IP |
|------|----------------------------------|
| Browser → `api.*` (Caddy → Nest) | Caddy sets `X-Forwarded-For` / `X-Real-IP` to `{remote_host}`. Express `trust proxy` (see `TRUSTED_PROXY_CIDRS`) makes `req.ip` the real client. Spoofed `X-Forwarded-For` from the internet is not trusted. |
| Browser → Vercel UI `/backend/*` → Caddy → Nest | Next.js proxy adds HMAC-signed `X-Flux-Client-IP` + `X-Flux-Client-IP-Signature` using `FLUX_CLIENT_IP_SECRET`. The API accepts the header only when the signature matches. |
| Mobile / agents → `api.*` directly | Same as the first row (Caddy). |

## Environment variables

| Variable | Where to set | Purpose |
|----------|--------------|---------|
| `TRUSTED_PROXY_CIDRS` | Droplet `api` container (optional) | Comma-separated CIDRs Express treats as reverse proxies. Defaults to `127.0.0.1`, `::1`, `172.16.0.0/12`, `10.0.0.0/8`. Set `false` to disable. |
| `FLUX_CLIENT_IP_SECRET` | Droplet `api`, Vercel **ui**, Vercel **admin-ui** (same value) | HMAC-SHA256 secret for signed `X-Flux-Client-IP` from the `/backend` proxy. Generate with `openssl rand -hex 32`. |

Do not reuse `INTERNAL_API_SECRET` for this purpose.

## Caddy

The `api.nebuladns.io` / `api.shield.fluxlabs.net` site blocks in `deploy/droplet/Caddyfile` replace upstream forwarding headers with the TCP client connecting to Caddy:

```caddyfile
reverse_proxy api:3000 {
  header_up X-Real-IP {remote_host}
  header_up X-Forwarded-For {remote_host}
}
```

## IPv4-mapped IPv6

Addresses like `::ffff:203.0.113.1` are normalized to `203.0.113.1` before persistence in Postgres `inet` columns and allowlist checks.
