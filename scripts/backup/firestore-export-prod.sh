#!/usr/bin/env bash
# GA-2 — Daily Firestore export for bhojanos-prod
set -euo pipefail

PROJECT="${GCP_PROJECT:-bhojanos-prod}"
BUCKET="${GCS_BACKUPS_BUCKET:-bhojanos-prod-backups}"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
DEST="gs://${BUCKET}/firestore/${TIMESTAMP}"

echo "=== GA-2 Production Firestore Backup ==="
echo "Project: ${PROJECT}"
echo "Destination: ${DEST}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI not found. Install Google Cloud SDK."
  exit 1
fi

gcloud firestore export "${DEST}" --project="${PROJECT}"

echo ""
echo "Export complete."
echo "Verify: gcloud firestore operations list --project=${PROJECT}"
echo "Restore: see docs/ga-2/BACKUP-AND-RESTORE.md"
