# DNS Management — Platform operations (Phase 1)

## API environment

Before a platform admin connects Cloudflare in the Admin Console, set a dedicated encryption key on the **API** service (same pattern as `SIEM_ENCRYPTION_KEY`):

```bash
# Generate once per environment
DNS_MANAGEMENT_ENCRYPTION_KEY=$(openssl rand -base64 32)
```

Add the value to the API deployment secrets / `api/.env`. The key encrypts the platform Cloudflare token at rest; it is **not** the Cloudflare token itself.

Never commit real Cloudflare tokens or encryption keys to the repository.

## Connect the Flux Cloudflare token (Admin Console)

1. Sign in to **Admin Console** → **DNS Platform** → **Connection** (`/dns-platform/connection`).
2. Enter a label (for example `Flux Labs production CF`).
3. Paste a **Cloudflare API token** with the permissions listed below.
4. Click **Connect** (or **Replace token**). The API calls Cloudflare `GET /user/tokens/verify`, then stores the token encrypted. The UI never shows the token again—only status and a short fingerprint.

## Sync and assign a zone

1. Open **DNS Platform** → **Zone inventory** (`/dns-platform/zones`).
2. Click **Sync from Cloudflare** to refresh the Flux account zone list.
3. For an existing zone, click **Assign**, enter the tenant UUID, and confirm.
4. Alternatively, use **Create zone** to add a domain in Cloudflare; nameservers are shown after create for registrar cutover. Optionally paste a tenant ID to assign immediately.

Tenants then open the tenant app **DNS Management** module (`/dns-management`) to view assigned zones and records (read-only in Phase 1).

## Minimal Cloudflare API token permissions

Create a **Custom token** in the Cloudflare dashboard for the Flux account:

| Permission | Access | Why |
|------------|--------|-----|
| **Zone** → Zone | Read | Sync zone inventory |
| **Zone** → Zone | Edit | Manage DNS records (tenant mutations in Phase 2) |
| **Zone** → Zone** → Create | (if available) or account-level zone create | Create new zones from Admin Console |

Scope the token to **Account** → your Flux account, and restrict to **All zones** (or include only zones Flux hosts for customers).

Recommended extras:

- **User** → User Details → Read — satisfies `/user/tokens/verify` for some token types.

Do **not** grant Account Settings, Workers, or Billing unless required.

After rotation or compromise, revoke the old token in Cloudflare, then use Admin Console → Connection → **Replace token**.
