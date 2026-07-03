# Risk Matrix — IaC Deployment

**Document ID:** BHOS-IAC-RISK-001

| ID | Risk | L | I | Mitigation | Owner |
|----|------|---|---|------------|-------|
| R1 | Terraform state bucket loss | L | C | GCS versioning + backup | SRE |
| R2 | Secret placeholder deployed | M | H | CI check + manual G2 gate | Ops |
| R3 | Flag accidentally ON at deploy | M | C | Helm values all false + CI lint | SRE |
| R4 | Workload Identity misbinding | M | H | Terraform + kubectl verify script | Platform |
| R5 | GKE upgrade breaks workers | L | M | Maintenance window + PDB | SRE |
| R6 | Insufficient synthetic data | L | M | 10-tenant manifest with volume tiers | Ops |
| R7 | Observability gap during soak | M | M | OBS deploy before workers (Phase 4 order) | SRE |
| R8 | Cost overrun | L | L | No Redis, min replicas, autoscale caps | FinOps |
| R9 | Container shell vs runtime gap | M | M | Health shells for infra phase; runtime bind at deploy | Platform |
| R10 | Cross-env secret leak | L | C | Separate projects + WIF scoped SAs | Security |

**Legend:** L=Likelihood, I=Impact (L/M/H/C)

## Residual risk

Container images use infrastructure health shells until frozen SDK runtime is bound at deploy — acceptable for IaC phase; runtime wiring is a deploy-time concern, not an SDK change.
