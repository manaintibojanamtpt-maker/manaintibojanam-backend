#!/usr/bin/env bash
set -euo pipefail

PROJECT="${GCP_PROJECT:-bhojanos-staging}"
BUCKET="${GCS_CHECKPOINTS_BUCKET:-bhojanos-staging-checkpoints}"
LABEL="${1:-scheduled}"

echo "Exporting projection checkpoints to gs://${BUCKET}/checkpoints/${LABEL}"
gcloud firestore export \
  "gs://${BUCKET}/checkpoints/${LABEL}" \
  --project="${PROJECT}" \
  --collection-ids="projections"

echo "Checkpoint export complete"
