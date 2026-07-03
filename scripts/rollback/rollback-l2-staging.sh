#!/usr/bin/env bash
# STAGING ONLY — disables adapter + rollout flags
set -euo pipefail

LD_PROJECT="${LD_STAGING_PROJECT:-bhojanos-staging}"
START=$(date +%s)

ADAPTER_FLAGS=(
  "FF_ORDER_PROJECTION_ADAPTER_ENABLED"
  "FF_ORDER_PROJECTION_ROLLOUT_ENABLED"
  "FF_MENU_PROJECTION_ADAPTER_ENABLED"
  "FF_MENU_PROJECTION_ROLLOUT_ENABLED"
)

for flag in "${ADAPTER_FLAGS[@]}"; do
  echo "DISABLE ${flag}"
  curl -sf -X PATCH \
    -H "Authorization: ${LD_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "https://app.launchdarkly.com/api/v2/flags/${LD_PROJECT}/${flag}" \
    -d '{"patch":[{"op":"replace","path":"/environments/staging/on","value":false}]}' || true
done

END=$(date +%s)
echo "L2 completed in $((END - START))s (target < 5m)"
