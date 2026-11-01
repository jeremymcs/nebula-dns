# Flux Shield — threat feeds & category data

## Redis key scheme (API writer ↔ policy-svc reader)

| Key pattern | Type | Purpose |
|-------------|------|---------|
| `nebula:threats:{category}` | SET | Domains for threat type (`malware`, `phishing`, `botnet`, …). Atomic refresh via `{category}:staging` + `RENAME`. TTL 48h. |
| `nebula:categories:{category}` | SET | Domains for content categories (`adult`, `gambling`, `social_media`, …). TTL 7d. |
| `nebula:feeds:meta:{feedId}` | STRING (JSON) | Last update time, entry count, last error (admin stats). |

Lookups walk parent domain labels (e.g. `sub.evil.com` → `evil.com`) using `SISMEMBER` on each suffix.

### Estimated Redis memory (order of magnitude)

Assuming ~500k unique threat domains and ~2M categorized domains (typical UT1 subset):

- SET members: ~40–60 bytes per domain (overhead included) → **~25–35 MB** threats + **~80–120 MB** categories
- Meta keys: negligible

Upstash: prefer batched `SADD` (5k per batch) and single-key `RENAME` per category to stay within command limits during refresh.

## Sources

### Threat feeds (enabled in API)

| Feed | Category | Notes |
|------|----------|-------|
| URLhaus online (malware-filter mirror) | malware | abuse.ch bulk downloads return HTTP 410 |
| Disconnect simple malware | malware | |
| ShadowWhisperer Malware list | malware | |
| OpenPhish | phishing | |
| Phishing Army | phishing | |
| Botvrij.eu IOC domains | botnet | |

**Optional:** PhishTank (`PHISHTANK_APP_KEY`) — disabled unless key is set.

**Removed (dead/wrong type):** URLhaus hostfile (410), ThreatFox hostfile (410), Feodo domain list (404), SSLBL (404, IP/hash), malwaredomains.com (404), ransomwaretracker (503), ransomware.live API (404), DGA feed (unreachable), legacy cryptominers GitHub list (404).

### Content categories

**UT1 blacklists** — Université Toulouse Capitole, [https://dsi.ut-capitole.fr/blacklists/](https://dsi.ut-capitole.fr/blacklists/), **CC BY-SA 4.0**. Loaded daily by `CategoryFeedsService`; UT1 category names are mapped to Flux Shield category IDs (`social_networks` → `social_media`, `audio-video` → `streaming`, etc.).

**Attribution:** Domain categorization data includes UT1 Blacklists © Université Toulouse 1 Capitole, licensed under CC BY-SA.

## Owner setup (optional)

| Variable | Required | Description |
|----------|----------|-------------|
| `PHISHTANK_APP_KEY` | No | Enables PhishTank CSV feed with your registered app key |
| `REDIS_URL` | Yes in production | Same Upstash/`rediss://` URL as the rest of the API (already required) |

No new required env vars for boot.
