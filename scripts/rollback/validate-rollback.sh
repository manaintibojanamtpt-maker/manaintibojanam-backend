#!/usr/bin/env bash
set -euo pipefail

echo "=== Post-rollback validation ==="

# 1. SDK regression
npm run test:sdk

# 2. Health probes
kubectl port-forward svc/bhojanos-api 8080:80 -n bhojanos-staging-spine &
PF_PID=$!
sleep 5
curl -sf http://localhost:8080/health/live
curl -sf http://localhost:8080/health/ready
kill $PF_PID 2>/dev/null || true

# 3. Flag state (requires LD_API_TOKEN)
if [[ -n "${LD_API_TOKEN:-}" ]]; then
  ENABLED=$(curl -sf -H "Authorization: ${LD_API_TOKEN}" \
    "https://app.launchdarkly.com/api/v2/flags/bhojanos-staging?env=staging" | \
    jq '[.items[] | select(.environments.staging.on == true)] | length')
  if [[ "$ENABLED" -gt 0 ]]; then
    echo "WARN: ${ENABLED} flags still enabled (kill switch may be ON)"
  fi
fi

echo "Validation complete — upload evidence to gs://bhojanos-staging-evidence/rollback/"
