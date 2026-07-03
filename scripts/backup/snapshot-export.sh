#!/usr/bin/env bash
set -euo pipefail

PROJECT="${GCP_PROJECT:-bhojanos-staging}"
BUCKET="${GCS_SNAPSHOTS_BUCKET:-bhojanos-staging-snapshots}"
LABEL="${1:-scheduled}"

echo "Exporting projection snapshots to gs://${BUCKET}/snapshots/${LABEL}"
gcloud firestore export \
  "gs://${BUCKET}/snapshots/${LABEL}" \
  --project="${PROJECT}" \
  --collection-ids="projections"

echo "Snapshot export complete"
