#!/usr/bin/env bash
# Grant superadmin OR repair duplicate user docs in bhojanos-prod.
#
# Grant superadmin:
#   CRON_SECRET=... EMAIL=manaintibojanamtpt@gmail.com ./scripts/grant-superadmin.sh
#
# Repair duplicates only (merge onto Auth UID):
#   CRON_SECRET=... EMAIL=manaintibojanamtpt@gmail.com ./scripts/grant-superadmin.sh repair
#   CRON_SECRET=... EMAIL=... ./scripts/grant-superadmin.sh repair delete

set -euo pipefail

API="${API_URL:-https://manaintibojanam-backend.onrender.com}"
SECRET="${CRON_SECRET:?Set CRON_SECRET to your Render CRON_SECRET env var}"
EMAIL="${EMAIL:?Set EMAIL to the Firebase Auth email}"

MODE="${1:-grant}"

if [[ "$MODE" == "repair" || "$MODE" == "repair-delete" ]]; then
  DELETE=false
  [[ "$MODE" == "repair-delete" ]] && DELETE=true
  echo "POST ${API}/api/platform/repair-user-by-email"
  curl -sS -X POST "${API}/api/platform/repair-user-by-email" \
    -H "Content-Type: application/json" \
    -d "{\"secret\":\"${SECRET}\",\"email\":\"${EMAIL}\",\"deleteOrphans\":${DELETE}}" 
else
  BODY="{\"secret\":\"${SECRET}\",\"email\":\"${EMAIL}\""
  if [[ -n "${UID:-}" ]]; then
    BODY+=", \"uid\":\"${UID}\""
  fi
  BODY+="}"
  echo "POST ${API}/api/platform/grant-superadmin"
  curl -sS -X POST "${API}/api/platform/grant-superadmin" \
    -H "Content-Type: application/json" \
    -d "${BODY}"
fi

echo ""
echo "Verify in Firebase Console:"
echo "  1. Authentication → Users → copy UID for ${EMAIL}"
echo "  2. Firestore → users → doc ID must EXACTLY match that UID"
echo "  3. role field on THAT doc must be superadmin"
echo "Then sign in at https://www.bhojanos.com/super-admin/login"
