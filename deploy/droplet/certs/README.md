# Flux Shield — droplet TLS certificates (gitignored)
#
# Do NOT commit private keys. Generate locally or sync from Caddy after ACME issuance.
#
# Quick start (self-signed, dev / bootstrap only):
#   ./scripts/generate-dns-certs.sh
#
# Production (recommended):
#   1. Start Caddy so ACME issues a certificate for each hostname in the Caddyfile
#      (Flux Shield + legacy nebuladns.io names).
#   2. Run ./scripts/sync-caddy-certs.sh with primary-domain dns1.shield.fluxlabs.net and
#      EXTRA_DOMAINS for additional DoT hostnames — copies server.crt/key plus sni-*.crt/key
#   3. Enable systemd/nebula-dns-sync-certs.timer on the droplet to re-sync after Caddy renewal
#
# Caddy terminates public HTTPS for api.* and proxies DoH on :443 to dnsdist.
# dnsdist DoT (:853) uses GnuTLS with multiple certs for SNI (see deploy/droplet/dnsdist.conf).
