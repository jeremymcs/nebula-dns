#!/usr/bin/env bash
# Copy Caddy-issued certificates into deploy/droplet/certs for dnsdist DoT/DoH.
# Run on the droplet after Caddy has obtained ACME certs for DNS hostnames.
#
# Usage:
#   ./scripts/sync-caddy-certs.sh [primary-domain] [--reload-if-changed]
#
# Environment:
#   CADDY_DATA         Path to Caddy data dir inside the Docker volume (see README).
#   SECONDARY_DOMAIN   Legacy name used when picking the primary cert (optional).
#   EXTRA_DOMAINS      Space-separated hostnames whose certs are copied to sni-N.crt/key
#                      for dnsdist DoT SNI (skips names equal to primary-domain).
#
# Caddy stores one Let's Encrypt certificate per site hostname. This script copies the
# cert for primary-domain to server.crt/key (default DoH backend and no-SNI DoT) and
# each EXTRA_DOMAINS name to sni-1.crt/key, sni-2.crt/key, … for GnuTLS SNI on :853.
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

SECONDARY_DOMAIN="${SECONDARY_DOMAIN:-dns2.shield.fluxlabs.net}"
# Production DoT SNI hostnames (override via env or systemd drop-in); primary is usually dns1.shield.fluxlabs.net.
EXTRA_DOMAINS="${EXTRA_DOMAINS:-dns2.shield.fluxlabs.net dns1.nebuladns.io dns2.nebuladns.io}"

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

certs_hash() {
  local dir="$1"
  (
    shopt -s nullglob
    local files=( "${dir}/server.crt" "${dir}/server.key" "${dir}"/sni-*.crt "${dir}"/sni-*.key )
    shopt -u nullglob
    for f in "${files[@]}"; do
      [[ -e "${f}" ]] && sha256sum "${f}"
    done
  ) | sha256sum | awk '{print $1}' || true
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

find_cert_for_name() {
  local name="$1"
  local candidate=""
  while IFS= read -r candidate; do
    [[ -z "${candidate}" ]] && continue
    if cert_has_san "${candidate}" "${name}"; then
      echo "${candidate}"
      return 0
    fi
  done < <(find "${ACME_DIR}" -name '*.crt' -type f 2>/dev/null | sort)
  return 1
}

CERT_PATH=""
if ! CERT_PATH="$(pick_cert_path)"; then
  echo "Could not find a Caddy certificate for ${PRIMARY_DOMAIN} under ${ACME_DIR}" >&2
  echo "Start Caddy first and confirm ACME succeeded (docker compose logs caddy)." >&2
  exit 1
fi

KEY_PATH="${CERT_PATH%.crt}.key"
if [[ ! -f "${KEY_PATH}" ]]; then
  echo "Missing key file: ${KEY_PATH}" >&2
  exit 1
fi

mkdir -p "${CERT_DIR}"

OLD_HASH=""
OLD_HASH="$(certs_hash "${CERT_DIR}")"

cp "${CERT_PATH}" "${CERT_DIR}/server.crt"
cp "${KEY_PATH}" "${CERT_DIR}/server.key"
chmod 600 "${CERT_DIR}/server.key"

rm -f "${CERT_DIR}"/sni-*

sni_idx=1
for name in ${EXTRA_DOMAINS}; do
  [[ "${name}" == "${PRIMARY_DOMAIN}" ]] && continue
  extra_cert=""
  if ! extra_cert="$(find_cert_for_name "${name}")"; then
    echo "WARNING: no Caddy certificate with SAN DNS:${name}; skipping SNI copy" >&2
    continue
  fi
  extra_key="${extra_cert%.crt}.key"
  if [[ ! -f "${extra_key}" ]]; then
    echo "WARNING: missing key for ${name}: ${extra_key}; skipping" >&2
    continue
  fi
  if [[ "${extra_cert}" == "${CERT_PATH}" ]]; then
    continue
  fi
  cp "${extra_cert}" "${CERT_DIR}/sni-${sni_idx}.crt"
  cp "${extra_key}" "${CERT_DIR}/sni-${sni_idx}.key"
  chmod 600 "${CERT_DIR}/sni-${sni_idx}.key"
  echo "extra: ${name} -> sni-${sni_idx}.crt"
  sni_idx=$((sni_idx + 1))
done

NEW_HASH=""
NEW_HASH="$(certs_hash "${CERT_DIR}")"

echo "Synced Caddy cert to ${CERT_DIR}/server.{crt,key}"
echo "  source: ${CERT_PATH}"
echo "  primary: ${PRIMARY_DOMAIN} (default cert when DoT clients send no SNI)"
if [[ "${sni_idx}" -gt 1 ]]; then
  echo "  SNI certs: sni-1 … sni-$((sni_idx - 1)).crt for additional DoT hostnames"
fi

if [[ "${RELOAD_IF_CHANGED}" == true ]]; then
  if [[ "${OLD_HASH}" == "${NEW_HASH}" && -n "${NEW_HASH}" ]]; then
    echo "Certificates unchanged; skipping dnsdist restart"
    exit 0
  fi
  echo "Certificates changed; restarting dnsdist"
  (cd "${DROPLET_DIR}" && docker compose restart dnsdist)
else
  echo "Restart dnsdist when ready: (cd ${DROPLET_DIR} && docker compose restart dnsdist)"
fi
