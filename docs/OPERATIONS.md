# Flux Shield — Operations Reference

Environment variables introduced or used by **Mobile Phase 0** (API prep):

| Variable | Default | Purpose |
|----------|---------|---------|
| `ADMIN_JWT_EXPIRY` | `15m` | Platform admin access token TTL |
| `ADMIN_REFRESH_TOKEN_TTL_DAYS` | `30` | Rotating admin refresh token lifetime |
| `EXPO_ACCESS_TOKEN` | _(empty)_ | Expo Push API bearer token; push sends are skipped when unset |
| `MOBILE_IMPERSONATION_ENABLED` | `false` | Allow `POST /admin/impersonate/:tenantId` when `X-Device-Id` is present |

Mobile clients should send on authenticated mutating requests:

- `X-Device-Id` — stable device identifier from the app
- `X-App-Version` — semver/build label (captured in audit metadata)

Jailbroken/rooted devices registered with `isJailbroken: true` receive **403** with code `DEVICE_JAILBROKEN_READ_ONLY` on mutating HTTP methods.

See also `api/.env.example` and `scripts/init-postgres.sql` for bootstrap parity.
