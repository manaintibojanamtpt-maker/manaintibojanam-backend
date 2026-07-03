# Security Review — IaC Implementation

**Document ID:** BHOS-IAC-SEC-001  
**Verdict:** PASS (design)

| Control | Implementation |
|---------|----------------|
| IAM least privilege | Per-service SA in `terraform/modules/iam` |
| Workload Identity | GKE → GCP SA binding, no key files in pods |
| Network isolation | Private GKE nodes, network policies, no worker ingress |
| Secrets | Secret Manager only; placeholder lifecycle ignore |
| Encryption | GCP-managed at rest; TLS in transit |
| Prod/staging separation | Separate projects, CI lint blocks prod flags ON |
| RBAC | K8s Role scoped to configmaps + named secrets |
| Audit | LD audit + Cloud Audit Logs + flag-audit GCS |
| Break-glass | Documented in SECRETS-MANAGEMENT.md |
| Container security | runAsNonRoot, read-only SA mount |

## CI gates

- Terraform plan blocks prod `VITE_FF_*=true`
- Deploy workflow verifies no enabled flags in ConfigMaps
- Prod apply workflow restricted to `production` environment with approval

## Open items (post-deploy)

- [ ] VPC Service Controls (optional P2)
- [ ] Binary Authorization for GKE (P2)
- [ ] External Secrets Operator sync (P1)
