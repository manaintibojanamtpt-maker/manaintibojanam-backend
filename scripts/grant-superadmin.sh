#!/usr/bin/env bash
# Grant superadmin in bhojanos-prod (one-time bootstrap).
# Usage:
#   CRON_SECRET=your_render_cron_secret EMAIL=bhojanos26@gmail.com ./scripts/grant-superadmin.sh
# Or with UID:
#   CRON_SECRET=... UID=firebase_uid ./scripts/grant-superadmin.sh

set -euo pipefail

API="${API_URL:-https://manaintibojanam-backend.onrender.com}"
SECRET="${CRON_SECRET:?Set CRON_SECRET to your Render CRON_SECRET env var}"

BODY="{\"secret\":\"${SECRET}\""
if [[ -n "${UID:-}" ]]; then
  BODY+=", \"uid\":\"${UID}\""
fi
if [[ -n "${EMAIL:-}" ]]; then
  BODY+=", \"email\":\"${EMAIL}\""
fi
BODY+="}"

echo "POST ${API}/api/platform/grant-superadmin"
curl -sS -X POST "${API}/api/platform/grant-superadmin" \
  -H "Content-Type: application/json" \
  -d "${BODY}" | jq .

echo ""
echo "Then sign out and sign in at https://www.bhojanos.com/super-admin/login"
