# Flux Shield CA — owner setup checklist

One-time and ongoing steps for platform ops and MSP admins.

## 1. Database

```bash
cd api && npm run migration:run
```

Migration: `1762000000000-ShieldCa.ts` → table `shield_ca_intermediates`.

Fresh dev DB: `scripts/init-postgres.sql` includes the same table definition.

## 2. API environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `SHIELD_ROOT_CERT_PEM` | Yes (HTTPS block pages) | Offline root **certificate** PEM |
| `SHIELD_ROOT_KEY_PEM` | Yes (auto intermediate) | Root **private** key PEM — secrets manager only |
| `SHIELD_CA_MASTER_KEY` | Yes (production) | Encrypts intermediate keys at rest; min 32 bytes |
| `SHIELD_BLOCKPAGE_INTERNAL_SECRET` | Yes | Must match `shield-blockpage` / internal clients |
| `SENDGRID_API_KEY` + `EMAIL_FROM_*` | Optional | Rotation alert emails; logs only if unset |
| `FRONTEND_URL` | Recommended | Links in rotation alert emails |

Dev defaults exist in code for local testing — **never use in production**.

## 3. Policy / Redis

When policy-svc blocks with `blockpage`, it must set:

- `blockctx:{client_ip}:{domain}` — HTML context
- `blockdomainsni:{domain}` → `tenantId`
- `blockdomain:{tenantId}:{domain}` → `1`

Requires tenant `settings.blockPageEnabled` and compiled `blockResponseType: blockpage`.

## 4. Droplet sinkhole

See `DROPLET-DEPLOY.md`:

- `BLOCKPAGE_IP` = droplet public IPv4 (DNS A answers)
- Caddy `:80` → block page HTML
- `shield-blockpage` service → on-demand TLS; point **HTTPS to sinkhole IP:443** (often DNAT host `:443` → container `:9443` when Caddy uses `:443` for API hostnames)

## 5. Endpoint trust

Dashboard → **Shield Certificate**: download `.cer` / `.pem` / `.mobileconfig`, or `GET /shield-ca/install-guide`.

Enable Windows agent CA deploy: tenant setting `installShieldCaOnAgent` + agent `install_shield_ca` (agent PR #13).

## 6. Rotation alerts

Daily job (09:00 UTC) emails tenant **owner/admin** users when an active intermediate expires within **30 days**. UI shows `rotationRecommended` on the Shield Certificate page. Redeploy trust before `notAfter`.

## 7. Verify

1. Block a test domain; confirm Redis SNI keys.
2. `curl -H "X-Shield-Internal-Secret: …" "https://api…/shield-ca/internal/caddy-ask?domain=blocked.example"` → `ok`
3. `POST /shield-ca/internal/issue-leaf` with blocked domain → leaf PEM
4. Browser with CA trusted → HTTPS block page (including HSTS sites)
