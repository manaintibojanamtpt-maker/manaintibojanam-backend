# IaC Readiness Report

**Document ID:** BHOS-IAC-READY-001  
**Date:** 2026-06-27  
**Subject:** M6/M7 Staging Infrastructure as Code

## Summary

Production-quality Infrastructure as Code has been generated for BhojanOS staging, faithfully implementing the approved blueprint at `docs/staging/infrastructure/`. No application code, SDK, DTO, or Firestore schema changes were made.

## Deliverables

| Category | Count | Location |
|----------|-------|----------|
| Terraform modules | 9 | `terraform/modules/` |
| Terraform environments | 7 (1 full + 6 template) | `terraform/environments/` |
| Helm charts | 9 | `helm/charts/` |
| K8s manifests | Base + staging kustomize | `k8s/` |
| GitHub Actions | 6 | `.github/workflows/iac-*.yml` |
| Scripts | 15+ | `scripts/` |
| Container Dockerfiles | 5 | `infra/containers/` |
| Ops documentation | 11 | `docs/iac/` |

## Staging services implemented

- API, Order Projection Worker, Menu Projection Worker
- Replay Service, Outbox Publisher, Projection Runtime (worker deploy)
- OTEL Collector, Prometheus, Grafana, Alertmanager
- Checkpoint/Snapshot stores (GCS + Firestore export scripts)
- Firestore (Terraform module)
- Redis: **not provisioned** (justified — optional per blueprint)
- LaunchDarkly: 23 flags, all default OFF, kill switch, prod guard

## Success criteria

| Criterion | Met |
|-----------|-----|
| Infrastructure reproducible | Yes — Terraform + Helm |
| Fully automated | Yes — GitHub Actions |
| No manual cloud config | Yes — IaC only |
| Environment isolation | Yes — separate project + templates |
| Least privilege | Yes — per-service SA + RBAC |
| Repeatable deployment | Yes — workflow_dispatch + Helm |
| Rollback automation | Yes — L1–L4 scripts + workflow |
| Production-safe defaults | Yes — all flags OFF |

## Verdict

# **READY_FOR_IAC_DEPLOYMENT**

Proceed to bootstrap Terraform state, apply staging environment, and execute deployment guide — subject to ARB approval and ops staffing.

**STOP.** No terraform apply, kubectl deploy, or cloud provisioning executed in this deliverable.
