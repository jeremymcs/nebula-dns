# Admin console P0 verification artifacts

Screenshots captured against local `admin-ui` (port 4012) for PR verification.

| File | Description |
|------|-------------|
| `login.png` | Admin login |
| `login-mfa-challenge.png` | TOTP challenge step |
| `login-mfa-enroll.png` | MFA enrollment (QR step) |
| `dashboard.png` | Home dashboard (API responses mocked for capture) |
| `admin-users.png` | Admin users (mocked list API) |
| `billing.png` | Tenant billing (mocked subscription API) |
| `health.png` | System health with mock-data banner |

To reproduce against a live stack (API + Postgres + Redis):

```bash
# API :4010, admin-ui :4012 — set ADMIN_PASSWORD in env only, never commit
node docs/reviews/admin-console-p0/capture-screenshots.mjs
```
