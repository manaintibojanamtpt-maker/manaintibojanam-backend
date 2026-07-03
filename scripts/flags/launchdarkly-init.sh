#!/usr/bin/env bash
# Initialize LaunchDarkly staging project with 23 spine flags (all OFF)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLAGS_FILE="${SCRIPT_DIR}/spine-flags.json"
LD_PROJECT="${LD_STAGING_PROJECT:-bhojanos-staging}"

if [[ -z "${LD_API_TOKEN:-}" ]]; then
  echo "ERROR: LD_API_TOKEN required"
  exit 1
fi

echo "Initializing ${LD_PROJECT} with spine flags (default OFF)"

jq -c '.flags[]' "$FLAGS_FILE" | while read -r flag; do
  KEY=$(echo "$flag" | jq -r '.key')
  echo "Creating flag: ${KEY}"
  curl -sf -X POST \
    -H "Authorization: ${LD_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "https://app.launchdarkly.com/api/v2/flags/${LD_PROJECT}" \
    -d "{
      \"key\": \"${KEY}\",
      \"name\": \"${KEY}\",
      \"variations\": [{\"value\": true}, {\"value\": false}],
      \"defaults\": {\"onVariation\": 0, \"offVariation\": 1},
      \"clientSideAvailability\": {\"usingEnvironmentId\": true}
    }" 2>/dev/null || echo "  (may already exist)"
done

echo "Flag initialization complete — verify all OFF in LD console"
