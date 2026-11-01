#!/usr/bin/env bash
# Flux Shield — generate OFFLINE root CA material (never commit output).
set -euo pipefail

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  echo "Usage: $0 [OUTPUT_DIR]"
  echo "Creates flux-shield-root.key and flux-shield-root.crt in OUTPUT_DIR (default: mktemp)."
  echo "NEVER commit generated files or paste private keys into git."
  exit 0
fi

OUT_DIR="${1:-$(mktemp -d)}"
mkdir -p "$OUT_DIR"

if git rev-parse --show-toplevel >/dev/null 2>&1; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  case "$OUT_DIR" in
    "$REPO_ROOT"|"$REPO_ROOT"/*)
      echo "ERROR: Refusing to write root key inside git repo: $OUT_DIR" >&2
      echo "Use: $0 /secure/path/outside/repo" >&2
      exit 1
      ;;
  esac
fi

KEY="$OUT_DIR/flux-shield-root.key"
CRT="$OUT_DIR/flux-shield-root.crt"

echo "Generating 4096-bit root key and 20-year self-signed root cert in:"
echo "  $OUT_DIR"
echo ""
echo "WARNING: Do NOT commit .key/.crt/.pem files. Store the key offline."

openssl genrsa -out "$KEY" 4096
chmod 600 "$KEY"
openssl req -new -x509 -days 7300 -key "$KEY" -out "$CRT" \
  -subj "/CN=Flux Shield Offline Root/O=Flux Labs/C=US"

echo ""
echo "Next steps:"
echo "  1. Move $KEY to offline encrypted storage; delete from shared workstations when done."
echo "  2. Load $CRT into secrets manager as SHIELD_ROOT_CERT_PEM (full PEM)."
echo "  3. Load root private key as SHIELD_ROOT_KEY_PEM only on API secret store (see SHIELD-CA-ROOT-RUNBOOK.md)."
echo "  4. Set SHIELD_CA_MASTER_KEY and SHIELD_BLOCKPAGE_INTERNAL_SECRET on API + shield-blockpage."
