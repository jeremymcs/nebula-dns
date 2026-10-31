#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes \
  -keyout "${DIR}/server.key" \
  -out "${DIR}/server.crt" \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:dnsdist"
chmod 600 "${DIR}/server.key"
echo "Generated ${DIR}/server.{crt,key}"
