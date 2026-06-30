#!/usr/bin/env bash
# Scan a single app into SonarQube. Usage: sonar-scan.sh <api|web>
set -euo pipefail

APP="${1:?Usage: sonar-scan.sh <api|web>}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.sonar ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.sonar
  set +a
fi

SONAR_HOST_URL="${SONAR_HOST_URL:-http://localhost:9000}"

if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "Error: SONAR_TOKEN is not set. Copy .env.sonar.example to .env.sonar"
  exit 1
fi

case "$APP" in
  api)
    APP_DIR="apps/api"
    WORKSPACE="cedarrose-opshub-api"
    PROJECT_KEY="cedar-rose-questionnaire-api"
    ;;
  web)
    APP_DIR="apps/web"
    WORKSPACE="cedarrose-opshub-web"
    PROJECT_KEY="cedar-rose-questionnaire-web"
    ;;
  *)
    echo "Unknown app: $APP (use api or web)"
    exit 1
    ;;
esac

echo "=== ${PROJECT_KEY} ==="


echo "Uploading analysis from ${APP_DIR} ..."
(
  cd "${ROOT}/${APP_DIR}"
  npx sonar-scanner \
    -Dsonar.host.url="${SONAR_HOST_URL}" \
    -Dsonar.token="${SONAR_TOKEN}" \
    -Dsonar.projectKey="${PROJECT_KEY}"
)

echo "Dashboard: ${SONAR_HOST_URL}/dashboard?id=${PROJECT_KEY}"
