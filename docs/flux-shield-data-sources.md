# Flux Shield — threat feeds & category data

## Redis key scheme (API writer ↔ policy-svc reader)

| Key pattern | Type | Purpose |
|-------------|------|---------|
| `nebula:threats:{category}` | SET | Domains for threat type (`malware`, `phishing`, `botnet`, …). Atomic refresh via `{category}:staging` + `RENAME`. TTL 48h. |
| `nebula:categories:{category}:{shard}` | SET | Sharded content categories (`0..N-1`). Domain → shard via FNV-1a (same in API + policy-svc). TTL 7d. |
| `nebula:feeds:meta:{feedId}` | STRING (JSON) | Last update time, entry count, last error (admin stats). |

Legacy unsharded `nebula:categories:{category}` keys are deleted after a successful sharded load; readers do not use them.

Lookups walk parent domain labels (e.g. `sub.evil.com` → `evil.com`). For each suffix, policy-svc pipelines one `SISMEMBER` per **enabled blocked category** on the matching shard only.

Default shard count: **16** (`CATEGORY_SHARD_COUNT`, 1–256). Upstash Fixed 1GB caps **200 MB per key**; sharding keeps each SET under that limit.

### Estimated Redis memory (order of magnitude)

- Threat SETs: ~500k domains × ~44 B → **~25 MB** total (single key per type).
- UT1 **adult** (~4.6M domains): ~44 B/member → **~202 MB** if stored as one SET (exceeds per-key limit). With **16 shards**: **~287k domains/shard → ~12.6 MB/shard**, **~202 MB** live total.
- Refresh peak (shard-by-shard `RENAME`): roughly **live + one staging shard** (~12.6 MB extra per large category), not 2× full category size.
- API loader peak target: **<500 MB** RAM (stream parse + batched `SADD`, no full-domain array).

Smaller default UT1 subset (no full `adult`): **~60–120 MB** categories total.

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

Tarball is **stream-parsed** (no full in-memory domain list). If the tarball source fails, the loader falls back to the [olbat/ut1-blacklists](https://github.com/olbat/ut1-blacklists) mirror (`domains`, `domains.0`, `domains.1`, …). If a load would shrink an existing category below **50%** of the current live member count (sum of shard `SCARD`s), the swap is skipped, live keys are kept, and `lastError` is recorded.

**Attribution:** Domain categorization data includes UT1 Blacklists © Université Toulouse 1 Capitole, licensed under CC BY-SA.

## Owner setup (optional)

| Variable | Required | Description |
|----------|----------|-------------|
| `PHISHTANK_APP_KEY` | No | Enables PhishTank CSV feed with your registered app key |
| `CATEGORY_FEEDS_ENABLED` | No | Comma-separated UT1 folder names. Default modest set (~60MB Redis est.). **Full `adult` list (~4.6M domains) is not loaded unless this env explicitly includes `adult`.** |
| `CATEGORY_SHARD_COUNT` | No | Shards per Flux category (default `16`). Must match policy-svc if overridden. |
| `INTERNAL_API_SECRET` | No | Enables `/internal/v1/policy/locations/:id/compile` for policy-svc compile-on-miss |
| `POLICY_COMPILE_API_URL` | No | API base URL from policy-svc (e.g. `http://api:3000`) |
| `REDIS_URL` | Yes in production | Same Upstash/`rediss://` URL as the rest of the API (already required) |

Compiled policies (`policy:{locationId}`) are stored **without TTL** and refreshed every 10 minutes plus on API startup.

No new required env vars for boot.
