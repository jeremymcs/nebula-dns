# Droplet deploy — Block page sinkhole (Flux Shield)

**Do not run on production without change window.** This documents the `deploy/droplet` stack only.

## Prerequisites

- Droplet runs `deploy/droplet/docker-compose.yml` (API, policy-svc, dnsdist, Caddy, ClickHouse, Unbound).
- Public IPv4 of the droplet available for DNS answers.

## 1. Environment (`.env`)

Add or update:

```bash
# IP returned in DNS for blockpage blocks (usually the droplet public IPv4)
BLOCKPAGE_IP=<droplet-public-ipv4>

# Used by Caddy catch-all → API (default in compose)
BLOCK_PAGE_API_UPSTREAM=api:3000
```

Enable block pages per tenant in the control plane (`tenants.settings.blockPageEnabled: true`) and recompile policies (save policy or location in UI).

## 2. Caddy and HTTPS (Shield CA)

The droplet `Caddyfile` includes an `:80` site that rewrites all HTTP requests to the API public block-page handler and forwards client IP headers. TLS on `:443` for the **API/DoH hostnames** remains on Caddy — **not** for arbitrary blocked domains.

**HTTPS block pages** use the `shield-blockpage` service (on-demand leaf certs via API `shield-ca/internal/issue-leaf`). Point sinkhole **HTTPS** traffic (typically `BLOCKPAGE_IP:443`) at that listener after policy-svc writes `blockdomainsni:{domain}` on blockpage blocks.

Endpoints must trust the MSP **Flux Shield CA** (see dashboard **Shield Certificate**). Once trusted:

- **HSTS and HSTS-preloaded sites** still show the block page over HTTPS (browsers accept locally installed roots for HSTS).

What **still breaks** without extra work:

- Apps with **certificate pinning**
- **Firefox** unless enterprise roots / Firefox’s own trust store is configured
- Any **device without the CA** installed (TLS error, no branded page on HTTPS-first navigations)

See `docs/modules/block-pages/DESIGN.md` §2 for PKI and deployment detail.

## 3. dnsdist

Already supports `block_type == "blockpage"` → spoof A to `BLOCKPAGE_IP`. Ensure `POLICY_SVC_URL` is reachable and compiled policies use `blockResponseType: "blockpage"` when block pages are enabled.

## 4. Verify

1. Block a test domain for a lab location.
2. `dig @<droplet> A blocked.test.example` → `BLOCKPAGE_IP`.
3. `curl -H "Host: blocked.test.example" http://<droplet>/` → HTML block page.
4. Submit unblock form → request appears in tenant inbox.

## 5. Rollback

- Set tenant `blockPageEnabled: false` (NXDOMAIN blocks).
- Remove `:80` catch-all from Caddy if needed.
- Unset `BLOCKPAGE_IP`.
