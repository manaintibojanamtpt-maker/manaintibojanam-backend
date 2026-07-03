#!/usr/bin/env bash
set -euo pipefail

PROJECT="${GCP_PROJECT:-bhojanos-staging}"
BUCKET="${GCS_BACKUPS_BUCKET:-bhojanos-staging-backups}"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)

echo "Exporting Firestore for ${PROJECT} to gs://${BUCKET}/firestore/${TIMESTAMP}"
gcloud firestore export "gs://${BUCKET}/firestore/${TIMESTAMP}" --project="${PROJECT}"

echo "Export complete: gs://${BUCKET}/firestore/${TIMESTAMP}"
