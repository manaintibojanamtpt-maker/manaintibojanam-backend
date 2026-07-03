#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-./grafana-backup}"
mkdir -p "$OUT_DIR"

echo "Exporting Grafana dashboards to ${OUT_DIR}"
# Requires GRAFANA_API_KEY from Secret Manager
curl -sf -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
  "http://grafana.bhojanos-staging-spine:3000/api/search?type=dash-db" | \
  jq -r '.[].uid' | while read -r uid; do
    curl -sf -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
      "http://grafana.bhojanos-staging-spine:3000/api/dashboards/uid/${uid}" \
      > "${OUT_DIR}/${uid}.json"
  done

gsutil -m cp -r "${OUT_DIR}" "gs://bhojanos-staging-evidence/dashboards/$(date -u +%Y%m%d)/"
echo "Dashboard backup uploaded to GCS"
