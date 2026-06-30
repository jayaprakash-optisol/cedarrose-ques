#!/usr/bin/env bash
set -euo pipefail

generate_pair() {
  local name="$1"
  local dir="${2:-keys}"
  mkdir -p "$dir"

  if openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$dir/$name-private.pem" 2>/dev/null; then
    openssl rsa -pubout -in "$dir/$name-private.pem" -out "$dir/$name-public.pem" 2>/dev/null
    chmod 600 "$dir/$name-private.pem"
    echo "Generated: $dir/$name-private.pem, $dir/$name-public.pem"
  else
    echo "ERROR: Failed to generate $name key pair" >&2
    exit 1
  fi
}

generate_pair "access"
generate_pair "questionnaire"

echo ""
echo "Done. Set env vars:"
echo "  JWT_ACCESS_PRIVATE_KEY_PATH=keys/access-private.pem"
echo "  JWT_ACCESS_PUBLIC_KEY_PATH=keys/access-public.pem"
echo "  JWT_QUESTIONNAIRE_PRIVATE_KEY_PATH=keys/questionnaire-private.pem"
echo "  JWT_QUESTIONNAIRE_PUBLIC_KEY_PATH=keys/questionnaire-public.pem"
