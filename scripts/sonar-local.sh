#!/usr/bin/env bash
set -euo pipefail

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
  echo "Error: SONAR_TOKEN is not set."
  echo ""
  echo "1. Open ${SONAR_HOST_URL}/account/security"
  echo "2. Generate a User token"
  echo "3. cp .env.sonar.example .env.sonar"
  echo "4. Set SONAR_TOKEN=... in .env.sonar"
  echo "5. Re-run: npm run sonar:local"
  exit 1
fi

echo "Checking SonarQube at ${SONAR_HOST_URL} ..."
if ! curl -sf "${SONAR_HOST_URL}/api/system/status" | grep -q '"status":"UP"'; then
  echo "Error: SonarQube is not reachable at ${SONAR_HOST_URL}"
  exit 1
fi

bash "${ROOT}/scripts/sonar-scan.sh" api
bash "${ROOT}/scripts/sonar-scan.sh" web

echo ""
echo "All analyses complete."
echo "  API: ${SONAR_HOST_URL}/dashboard?id=cedar-rose-questionnaire-api"
echo "  Web: ${SONAR_HOST_URL}/dashboard?id=cedar-rose-questionnaire-web"
echo ""
echo "Note: The old 'cedarrose-opshub' project was from a root-level scan."
echo "      Delete it in SonarQube → Projects if you no longer need it."
