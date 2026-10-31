# Nebula DNS — droplet TLS certificates (gitignored)
#
# Do NOT commit private keys. Generate locally or sync from Caddy after ACME issuance.
#
# Quick start (self-signed, dev / bootstrap only):
#   ./scripts/generate-dns-certs.sh
#
# Production (recommended):
#   1. Start Caddy once so ACME issues a cert for dns1 + dns2 (single site block in Caddyfile)
#   2. Run ./scripts/sync-caddy-certs.sh to copy the Let's Encrypt cert (both SANs) into this directory
#      as server.crt / server.key for dnsdist DoT (:853) and internal DoH (:8443)
#   3. Enable systemd/nebula-dns-sync-certs.timer on the droplet to re-sync after Caddy renewal
#
# Caddy terminates public HTTPS for api.nebuladns.io and proxies DoH on :443 to dnsdist.
