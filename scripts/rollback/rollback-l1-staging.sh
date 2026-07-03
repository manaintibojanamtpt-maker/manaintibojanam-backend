#!/usr/bin/env bash
# STAGING ONLY — disables all M6/M7 spine flags via LaunchDarkly API
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLAGS_FILE="${SCRIPT_DIR}/../flags/spine-flags.json"
LD_PROJECT="${LD_STAGING_PROJECT:-bhojanos-staging}"
START=$(date +%s)

if [[ -z "${LD_API_TOKEN:-}" ]]; then
  echo "ERROR: LD_API_TOKEN required"
  exit 1
fi

echo "L1 rollback: disabling all spine flags in ${LD_PROJECT}"

while IFS= read -r flag; do
  echo "DISABLE ${flag}"
  curl -sf -X PATCH \
    -H "Authorization: ${LD_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "https://app.launchdarkly.com/api/v2/flags/${LD_PROJECT}/${flag}" \
    -d '{"patch":[{"op":"replace","path":"/environments/staging/on","value":false}]}' || true
done < <(jq -r '.flags[].key' "$FLAGS_FILE")

# Emergency kill switch
curl -sf -X PATCH \
  -H "Authorization: ${LD_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://app.launchdarkly.com/api/v2/flags/${LD_PROJECT}/EMERGENCY_SPINE_DISABLE_ALL" \
  -d '{"patch":[{"op":"replace","path":"/environments/staging/on","value":true}]}' || true

END=$(date +%s)
echo "L1 completed in $((END - START))s (target < 60s)"
