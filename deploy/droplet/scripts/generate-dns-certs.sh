#!/usr/bin/env bash
# Generate self-signed TLS material for dnsdist DoT/DoH (bootstrap / local dev only).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="${SCRIPT_DIR}/../certs"
mkdir -p "${CERT_DIR}"

DOMAIN="${1:-dns1.nebuladns.io}"

openssl req -x509 -newkey rsa:4096 -sha256 -days 30 -nodes \
  -keyout "${CERT_DIR}/server.key" \
  -out "${CERT_DIR}/server.crt" \
  -subj "/CN=${DOMAIN}" \
  -addext "subjectAltName=DNS:${DOMAIN},DNS:dns2.nebuladns.io,DNS:localhost"

chmod 600 "${CERT_DIR}/server.key"
echo "Wrote ${CERT_DIR}/server.crt and server.key (self-signed, 30 days)"
