#!/usr/bin/env bash
# STAGING ONLY — restore checkpoints from GCS export
set -euo pipefail

PROJECT="${GCP_PROJECT:-bhojanos-staging}"
BUCKET="${GCS_CHECKPOINTS_BUCKET:-bhojanos-staging-checkpoints}"
EXPORT_PATH="${1:-checkpoints/T-0}"

echo "L4 rollback: scaling workers to 0"
kubectl scale deployment order-projection-worker menu-projection-worker -n bhojanos-staging-spine --replicas=0

echo "L4 rollback: executing L1"
"$(dirname "$0")/rollback-l1-staging.sh"

echo "L4 rollback: importing Firestore export gs://${BUCKET}/${EXPORT_PATH}"
gcloud firestore import "gs://${BUCKET}/${EXPORT_PATH}" --project="${PROJECT}"

echo "L4 rollback: scaling workers back"
kubectl scale deployment order-projection-worker menu-projection-worker -n bhojanos-staging-spine --replicas=2

echo "L4 initiated — run parity dry-run before re-enabling flags"
