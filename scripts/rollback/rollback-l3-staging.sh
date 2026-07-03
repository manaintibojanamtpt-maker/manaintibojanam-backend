#!/usr/bin/env bash
# STAGING ONLY — redeploy previous known-good SHA via GitHub Actions
set -euo pipefail

PREVIOUS_SHA="${1:?Usage: rollback-l3-staging.sh <git-sha>}"

echo "L3 rollback: triggering redeploy for SHA ${PREVIOUS_SHA}"
gh workflow run iac-deploy-staging.yml \
  -f "image_tag=${PREVIOUS_SHA}" \
  -f "confirm=DEPLOY"

echo "L3 initiated — verify test:sdk 1033/1033 and health probes"
