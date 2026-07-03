# Operational Readiness — IaC

**Document ID:** BHOS-IAC-OPS-READY-001

| Capability | IaC Artifact | Status |
|------------|--------------|--------|
| Reproducible infra | Terraform modules | Ready |
| Worker deployment | Helm charts ×5 | Ready |
| Observability stack | Helm charts ×4 | Ready |
| CI/CD automation | GitHub Actions ×6 | Ready |
| Rollback L1–L4 | scripts/rollback/ | Ready |
| Flag infrastructure | scripts/flags/ | Ready |
| Tenant provisioning | scripts/staging/ | Ready |
| Backup automation | scripts/backup/ | Ready |
| Runbooks | docs/iac/RUNBOOKS.md | Ready |
| Soak integration | Links to m6-m7-unified-soak | Ready |

## Deployment readiness gates

| Gate | Criteria |
|------|----------|
| G1 Terraform | Plan clean, apply approved |
| G2 Secrets | All placeholders replaced |
| G3 K8s | All deployments Available |
| G4 OBS | Prometheus targets UP |
| G5 Flags | 23 flags OFF, prod guard green |
| G6 Tenants | Manifest in GCS |
| G7 Regression | 1033/1033 |

## Current state

**IaC artifacts:** Complete  
**Cloud provisioned:** No (by design — artifacts only)  
**Soak executable:** After G1–G7 pass
