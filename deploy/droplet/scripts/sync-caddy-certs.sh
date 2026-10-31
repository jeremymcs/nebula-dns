#!/usr/bin/env bash
# Copy Caddy-issued certificates into deploy/droplet/certs for dnsdist DoT/DoH.
# Run on the droplet after Caddy has obtained ACME certs for dns1/dns2 hostnames.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="${SCRIPT_DIR}/../certs"
CADDY_DATA="${CADDY_DATA:-/var/lib/docker/volumes/nebula-dns_caddy_data/_data}"

PRIMARY_DOMAIN="${1:-dns1.nebuladns.io}"

CERT_PATH=$(find "${CADDY_DATA}/certificates/acme-v02.api.letsencrypt.org-directory" \
  -path "*${PRIMARY_DOMAIN}*" -name "*.crt" 2>/dev/null | head -1)

if [[ -z "${CERT_PATH}" ]]; then
  echo "Could not find Caddy certificate for ${PRIMARY_DOMAIN} under ${CADDY_DATA}" >&2
  echo "Start Caddy first and confirm ACME succeeded (docker compose logs caddy)." >&2
  exit 1
fi

KEY_PATH="${CERT_PATH%.crt}.key"
if [[ ! -f "${KEY_PATH}" ]]; then
  echo "Missing key file: ${KEY_PATH}" >&2
  exit 1
fi

mkdir -p "${CERT_DIR}"
cp "${CERT_PATH}" "${CERT_DIR}/server.crt"
cp "${KEY_PATH}" "${CERT_DIR}/server.key"
chmod 600 "${CERT_DIR}/server.key"
echo "Synced Caddy certs to ${CERT_DIR}/server.{crt,key}"
echo "Restart dnsdist: docker compose restart dnsdist"
