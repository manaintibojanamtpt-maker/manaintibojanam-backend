#!/usr/bin/env bash
# Read-only prod flag guard — CRITICAL alert if any spine flag ON in production
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLAGS_FILE="${SCRIPT_DIR}/spine-flags.json"
LD_PROJECT="${LD_PROD_PROJECT:-bhojanos-production}"

if [[ -z "${LD_PROD_API_TOKEN:-}" ]]; then
  echo "ERROR: LD_PROD_API_TOKEN required (read-only)"
  exit 1
fi

ENABLED=0
while IFS= read -r flag; do
  ON=$(curl -sf -H "Authorization: ${LD_PROD_API_TOKEN}" \
    "https://app.launchdarkly.com/api/v2/flags/${LD_PROJECT}/${flag}" | \
    jq -r '.environments.production.on // false')
  if [[ "$ON" == "true" ]]; then
    echo "CRITICAL: Production flag ${flag} is ON"
    ENABLED=$((ENABLED + 1))
  fi
done < <(jq -r '.flags[] | select(.killSwitch != true) | .key' "$FLAGS_FILE")

# Emit metric for Prometheus/Grafana
echo "prod_spine_flags_enabled_count ${ENABLED}"

if [[ "$ENABLED" -gt 0 ]]; then
  exit 2
fi

echo "OK: All production spine flags OFF"
