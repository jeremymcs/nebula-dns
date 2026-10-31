#!/usr/bin/env bash
# Copy Caddy-issued certificates into deploy/droplet/certs for dnsdist DoT/DoH.
# Run on the droplet after Caddy has obtained ACME certs for dns1/dns2 hostnames.
#
# Usage:
#   ./scripts/sync-caddy-certs.sh [primary-domain] [--reload-if-changed]
#
# Caddy stores ACME data under the compose volume (see README). The Caddyfile uses a
# single site block for dns1 + dns2 so Let's Encrypt issues one cert with both SANs.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DROPLET_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CERT_DIR="${SCRIPT_DIR}/../certs"
CADDY_DATA="${CADDY_DATA:-/var/lib/docker/volumes/nebula-dns_caddy_data/_data/caddy}"

PRIMARY_DOMAIN="dns1.nebuladns.io"
RELOAD_IF_CHANGED=false

for arg in "$@"; do
  case "${arg}" in
    --reload-if-changed)
      RELOAD_IF_CHANGED=true
      ;;
    *)
      PRIMARY_DOMAIN="${arg}"
      ;;
  esac
done

SECONDARY_DOMAIN="${SECONDARY_DOMAIN:-dns2.nebuladns.io}"

ACME_DIR="${CADDY_DATA}/certificates/acme-v02.api.letsencrypt.org-directory"
if [[ ! -d "${ACME_DIR}" ]]; then
  echo "Caddy certificate directory not found: ${ACME_DIR}" >&2
  echo "Check CADDY_DATA (default: ${CADDY_DATA}) and that Caddy has completed ACME." >&2
  echo "Hint: docker volume inspect nebula-dns_caddy_data" >&2
  exit 1
fi

cert_has_san() {
  local cert_file="$1"
  local name="$2"
  openssl x509 -in "${cert_file}" -noout -ext subjectAltName 2>/dev/null | grep -Fq "DNS:${name}"
}

pick_cert_path() {
  local candidate best=""
  while IFS= read -r candidate; do
    [[ -z "${candidate}" ]] && continue
    if cert_has_san "${candidate}" "${PRIMARY_DOMAIN}" && cert_has_san "${candidate}" "${SECONDARY_DOMAIN}"; then
      echo "${candidate}"
      return 0
    fi
    if [[ -z "${best}" ]] && cert_has_san "${candidate}" "${PRIMARY_DOMAIN}"; then
      best="${candidate}"
    fi
  done < <(find "${ACME_DIR}" -name '*.crt' -type f 2>/dev/null | sort)

  if [[ -n "${best}" ]]; then
    echo "${best}"
    return 0
  fi
  return 1
}

CERT_PATH=""
if ! CERT_PATH="$(pick_cert_path)"; then
  echo "Could not find a Caddy certificate for ${PRIMARY_DOMAIN} (and ideally ${SECONDARY_DOMAIN}) under ${ACME_DIR}" >&2
  echo "Start Caddy first and confirm ACME succeeded (docker compose logs caddy)." >&2
  exit 1
fi

KEY_PATH="${CERT_PATH%.crt}.key"
if [[ ! -f "${KEY_PATH}" ]]; then
  echo "Missing key file: ${KEY_PATH}" >&2
  exit 1
fi

mkdir -p "${CERT_DIR}"

OLD_CRT_HASH=""
OLD_KEY_HASH=""
if [[ -f "${CERT_DIR}/server.crt" ]]; then
  OLD_CRT_HASH="$(sha256sum "${CERT_DIR}/server.crt" | awk '{print $1}')"
fi
if [[ -f "${CERT_DIR}/server.key" ]]; then
  OLD_KEY_HASH="$(sha256sum "${CERT_DIR}/server.key" | awk '{print $1}')"
fi

cp "${CERT_PATH}" "${CERT_DIR}/server.crt"
cp "${KEY_PATH}" "${CERT_DIR}/server.key"
chmod 600 "${CERT_DIR}/server.key"

NEW_CRT_HASH="$(sha256sum "${CERT_DIR}/server.crt" | awk '{print $1}')"
NEW_KEY_HASH="$(sha256sum "${CERT_DIR}/server.key" | awk '{print $1}')"

echo "Synced Caddy cert to ${CERT_DIR}/server.{crt,key}"
echo "  source: ${CERT_PATH}"
if cert_has_san "${CERT_DIR}/server.crt" "${SECONDARY_DOMAIN}"; then
  echo "  SANs include ${PRIMARY_DOMAIN} and ${SECONDARY_DOMAIN} (DoT/DoH name match for both)"
else
  echo "  WARNING: cert may not include ${SECONDARY_DOMAIN}; ensure Caddyfile lists both hostnames in one site block" >&2
fi

if [[ "${RELOAD_IF_CHANGED}" == true ]]; then
  if [[ "${OLD_CRT_HASH}" == "${NEW_CRT_HASH}" && "${OLD_KEY_HASH}" == "${NEW_KEY_HASH}" ]]; then
    echo "Certificate unchanged; skipping dnsdist restart"
    exit 0
  fi
  echo "Certificate changed; restarting dnsdist"
  (cd "${DROPLET_DIR}" && docker compose restart dnsdist)
else
  echo "Restart dnsdist when ready: (cd ${DROPLET_DIR} && docker compose restart dnsdist)"
fi
