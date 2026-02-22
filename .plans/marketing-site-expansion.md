# Plan: Marketing Site Expansion + Domain Setup

## Status: COMPLETED

## Summary
Expanded the UI app to serve as both the marketing site (nebuladns.io) and the authenticated dashboard (app.nebuladns.io) using hostname-based middleware routing.

## Changes Made

### Part 1: Hostname-Based Routing
- **NEW** `ui/src/middleware.ts` - Detects hostname and rewrites `/` to `/landing` for nebuladns.io

### Part 2: New Marketing Pages (16 pages)
All in `ui/src/app/(public)/`:

| Page | Route | Status |
|------|-------|--------|
| Features | `/features` | Done |
| Contact | `/contact` | Done |
| Privacy Policy | `/privacy` | Done |
| Terms of Service | `/terms` | Done |
| Security | `/security` | Done |
| Enterprise | `/enterprise` | Done |
| About | `/about` | Done |
| Docs Hub | `/docs` | Done |
| API Reference | `/docs/api` | Done |
| Guides | `/docs/guides` | Done |
| Blog Index | `/blog` | Done |
| Blog Post | `/blog/[slug]` | Done |
| Status | `/status` | Done |
| Careers | `/careers` | Done |
| SLA | `/sla` | Done |
| GDPR | `/gdpr` | Done |

### Part 3: MDX Blog System
- Installed `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `gray-matter`
- Updated `next.config.js` with MDX support and `pageExtensions`
- Created 3 seed blog posts in `ui/src/content/blog/`:
  - `why-dns-security.mdx`
  - `getting-started.mdx`
  - `content-filtering.mdx`

### Part 4: Infrastructure Changes
- **`helm/safedns/values.yaml`** - Added nebuladns.io + www hosts to ingress, added MARKETING_DOMAIN/APP_DOMAIN env vars
- **`helm/safedns/values-production.yaml`** - Added nebuladns.io + www hosts, env vars
- **`helm/safedns/values-staging.yaml`** - Added staging.nebuladns.io host, env vars
- **`helm/safedns/templates/ingress.yaml`** - Updated CORS origin to dynamically include all UI hosts
- **`k8s/base/ingress.yaml`** - Added nebuladns.io + www host rules, updated CORS
- **`k8s/base/cert-manager/certificates.yaml`** - Added nebuladns.io + www to TLS SANs
- **`docker-compose.yml`** - Added MARKETING_DOMAIN/APP_DOMAIN env vars to UI service

### Part 5: Layout Updates
- **`ui/src/app/(public)/layout.tsx`** - Fixed footer nav links (/api -> /docs/api, /guides -> /docs/guides), updated copyright year, added Blog nav link

## Build Verification
- `npm run build` succeeds with all 58 routes compiled
- All blog posts statically generated at build time
- Middleware recognized as Proxy (ƒ)

## Notes
- Next.js 16.1.1 shows a deprecation warning about "middleware" -> "proxy" convention. The middleware still works correctly.
- All pages use placeholder marketing copy that can be refined later.
