# Admin console P1 screenshots

Captured against a local stack (API `:4010`, admin-ui `:4012`, seeded PostgreSQL).

```bash
# From repo root — start API + admin-ui, then:
cd admin-ui
ADMIN_PASSWORD='your-seed-password' node scripts/capture-p1-screenshots.mjs
```

Do not commit passwords. Default seed admin: `admin@nebula.local` (password set in your local env only).

Files: `*-desktop.png` (1440×900) and `*-iphone.png` (iPhone 13 viewport) for tenants index/detail, audit, health (cert panel), alerting, and MSP detail usage.
