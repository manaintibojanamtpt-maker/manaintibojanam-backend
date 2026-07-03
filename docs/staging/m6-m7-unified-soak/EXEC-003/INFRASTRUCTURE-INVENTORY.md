# EXEC-003 Infrastructure Inventory

**Execution ID:** BHOS-STAGING-SOAK-EXEC-003  
**Date:** 2026-07-03  
**Project (planned):** `bhojanos-staging`  
**Project (observed):** **Not accessible**

---

## GCP Resources

| Resource | Planned ID / name | Status | Region |
|----------|-------------------|--------|--------|
| GCP Project | `bhojanos-staging` | **NOT PROVISIONED** | — |
| VPC | `bhojanos-staging-vpc` | **NOT PROVISIONED** | — |
| Subnet (app) | `bhojanos-staging-app` | **NOT PROVISIONED** | — |
| Subnet (workers) | `bhojanos-staging-workers` | **NOT PROVISIONED** | — |
| Subnet (GKE) | `bhojanos-staging-gke` | **NOT PROVISIONED** | — |
| Cloud Router/NAT | `bhojanos-staging-router` | **NOT PROVISIONED** | — |
| GKE Cluster | `bhojanos-staging-gke` | **NOT PROVISIONED** | asia-south1 |
| Firestore | `(default)` native | **NOT PROVISIONED** | — |
| Artifact Registry | `bhojanos-staging` | **NOT PROVISIONED** | asia-south1 |

---

## Cloud Storage Buckets

| Bucket | Purpose | Status |
|--------|---------|--------|
| `bhojanos-terraform-state` | TF state | **404 — not found** |
| `bhojanos-staging-evidence` | Soak evidence | **404 — not found** |
| `bhojanos-staging-backups` | Firestore backups | **NOT PROVISIONED** |
| `bhojanos-staging-checkpoints` | Checkpoints | **NOT PROVISIONED** |
| `bhojanos-staging-snapshots` | Snapshots | **NOT PROVISIONED** |
| `bhojanos-staging-replay-corpus` | Replay data | **NOT PROVISIONED** |
| `bhojanos-staging-logs` | Central logs | **NOT PROVISIONED** |

---

## IAM Service Accounts (planned — not created)

| SA | Purpose | Status |
|----|---------|--------|
| `staging-api-sa@bhojanos-staging.iam.gserviceaccount.com` | API | **NOT CREATED** |
| `staging-order-projection-sa@...` | Order worker | **NOT CREATED** |
| `staging-menu-projection-sa@...` | Menu worker | **NOT CREATED** |
| `staging-outbox-sa@...` | Outbox | **NOT CREATED** |
| `staging-replay-sa@...` | Replay | **NOT CREATED** |
| `staging-ops-ci@...` | CI/CD | **NOT CREATED** |
| `prod-flag-guard-sa@...` | Prod guard | **NOT CREATED** |

---

## Secret Manager (planned — not created)

| Secret | Status |
|--------|--------|
| `staging-firebase-sa-json` | **NOT CREATED** |
| `staging-launchdarkly-sdk-key` | **NOT CREATED** |
| `staging-launchdarkly-api-token` | **NOT CREATED** |
| `staging-otel-exporter-otlp-headers` | **NOT CREATED** |
| `staging-grafana-api-key` | **NOT CREATED** |
| `staging-replay-admin-token` | **NOT CREATED** |
| `staging-pagerduty-staging-key` | **NOT CREATED** |

---

## IaC Artifacts (present — not applied)

| Artifact | Location | Applied |
|----------|----------|---------|
| Terraform staging | `terraform/environments/staging/` | **No** |
| Helm charts (×9) | `helm/charts/` | **No** |
| K8s base | `k8s/staging/` | **No** |

---

**Total provisioned resources: 0**

**STOP.**
