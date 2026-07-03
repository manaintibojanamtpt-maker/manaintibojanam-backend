# IaC Deployment Guide

**Document ID:** BHOS-IAC-DEPLOY-001  
**Version:** 1.0  
**Status:** Artifacts ready — not executed

## Prerequisites

- GCP org access, project `bhojanos-staging`
- GitHub secrets: `GCP_WIF_PROVIDER`, `GCP_TERRAFORM_SA`, `GCP_CI_SA`, `LD_STAGING_API_TOKEN`
- Terraform 1.6+, Helm 3.14+, kubectl
- ARB approval: READY_FOR_STAGING_BUILD

## Phase 1 — Terraform (GCP foundation)

```bash
cd terraform/environments/staging
terraform init
terraform plan -var-file=terraform.tfvars
# Manual approval gate → terraform apply
```

**Provisions:** VPC, NAT, GKE, Firestore, Secret Manager, GCS buckets, Artifact Registry, IAM, monitoring alerts.

## Phase 2 — Feature flags

```bash
export LD_API_TOKEN=<from-secret-manager>
bash scripts/flags/launchdarkly-init.sh
bash scripts/flags/prod-flag-guard.sh  # verify prod all OFF
```

## Phase 3 — Kubernetes base

```bash
gcloud container clusters get-credentials bhojanos-staging-gke --region asia-south1
kubectl apply -k k8s/staging/
```

## Phase 4 — Helm deploy (GitHub Actions recommended)

Trigger workflow `iac-deploy-staging` with `confirm=DEPLOY`.

Deploy order:
1. otel-collector (DaemonSet)
2. prometheus, grafana, alertmanager
3. bhojanos-api, workers, outbox, replay

All 23 spine flags **OFF** via `helm/values/staging.yaml`.

## Phase 5 — Tenant provisioning

```bash
bash scripts/staging/provision-tenants.sh
bash scripts/backup/firestore-export.sh  # T-0 baseline
```

## Phase 6 — Smoke tests

Trigger `iac-smoke-tests` workflow:
- 1033/1033 SDK regression
- Health probes: `/health/live`, `/health/ready`, `/health/projection`
- Grafana: `prod_spine_flags_enabled_count == 0`

## Phase 7 — Soak enablement

Follow [STAGING-CHECKLIST.md](../staging/m6-m7-unified-soak/STAGING-CHECKLIST.md) — manual sequential flag enable only after Phase A complete.

**STOP.** Do not enable production flags from this guide.
