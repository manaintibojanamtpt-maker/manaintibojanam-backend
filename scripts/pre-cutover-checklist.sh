#!/usr/bin/env bash
# Pre-cutover smoke check (run AFTER Render points to bhojanos-prod, BEFORE Vercel flip)
set -euo pipefail

API_URL="${API_URL:-https://manaintibojanam-backend.onrender.com}"

echo "Checking ${API_URL}/api/health ..."
HEALTH=$(curl -sf "${API_URL}/api/health" || true)

if [ -z "$HEALTH" ]; then
  echo "FAIL: health endpoint unreachable"
  exit 1
fi

echo "$HEALTH" | grep -q 'bhojanos-prod' && echo "OK: project is bhojanos-prod" || {
  echo "FAIL: health response does not mention bhojanos-prod"
  echo "$HEALTH"
  exit 1
}

echo "$HEALTH" | grep -q '"backedOff":false' && echo "OK: Firestore not in backoff" || {
  echo "WARN: Firestore may be in backoff — review before Vercel cutover"
  echo "$HEALTH"
}

echo "Pre-cutover backend check passed. Safe to update Vercel Production env and redeploy."
