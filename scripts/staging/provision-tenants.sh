#!/usr/bin/env bash
set -euo pipefail

PROJECT="${GCP_PROJECT:-bhojanos-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== BhojanOS Staging Tenant Provisioning ==="
echo "Project: ${PROJECT}"

# Generate manifest
npx tsx "${SCRIPT_DIR}/seed-tenants.ts"

echo "Uploading manifest to GCS"
gsutil cp "${SCRIPT_DIR}/tenant-manifest.json" "gs://bhojanos-staging-evidence/tenants/manifest.json"

echo "Tenant provisioning manifest ready."
echo "Firestore writes require Firebase Admin credentials — run after Secret Manager bootstrap:"
echo "  GOOGLE_APPLICATION_CREDENTIALS=/var/secrets/google/sa.json npx tsx seed-tenants.ts --apply"
