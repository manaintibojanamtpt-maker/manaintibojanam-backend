# BhojanOS Infrastructure as Code

**Verdict:** READY_FOR_IAC_DEPLOYMENT  
**Blueprint:** [docs/staging/infrastructure/](../staging/infrastructure/)

## Directory Structure

```
terraform/          GCP infrastructure (staging full, others template)
helm/               Kubernetes Helm charts (9 charts)
k8s/                Base K8s manifests + staging kustomization
.github/workflows/  CI/CD pipelines (6 workflows)
scripts/            Rollback, flags, backup, tenant provisioning
infra/containers/   Worker container Dockerfiles (health shells)
docs/iac/           Operational documentation
```

## Quick Start (requires ARB approval)

1. Bootstrap Terraform state bucket
2. `terraform apply` in `terraform/environments/staging`
3. Initialize LaunchDarkly: `scripts/flags/launchdarkly-init.sh`
4. Deploy via GitHub Actions: `iac-deploy-staging`
5. Provision tenants: `scripts/staging/provision-tenants.sh`
6. Run smoke tests: `iac-smoke-tests`

## Documentation

| Document | Purpose |
|----------|---------|
| [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) | End-to-end deploy sequence |
| [RUNBOOKS.md](./RUNBOOKS.md) | Incident runbooks |
| [SRE-OPERATIONS-GUIDE.md](./SRE-OPERATIONS-GUIDE.md) | SRE daily operations |
| [PLATFORM-OPS-CHECKLIST.md](./PLATFORM-OPS-CHECKLIST.md) | Pre-soak checklist |
| [DAY-2-OPERATIONS.md](./DAY-2-OPERATIONS.md) | Ongoing ops |
| [COST-ESTIMATE.md](./COST-ESTIMATE.md) | Monthly cost |
| [SECURITY-REVIEW.md](./SECURITY-REVIEW.md) | Security controls |
| [OPERATIONAL-READINESS.md](./OPERATIONAL-READINESS.md) | Readiness gates |
| [SCALABILITY-REVIEW.md](./SCALABILITY-REVIEW.md) | Scale path |
| [RISK-MATRIX.md](./RISK-MATRIX.md) | Risk register |
| [IAC-READINESS-REPORT.md](./IAC-READINESS-REPORT.md) | Final verdict |

**STOP.** No terraform apply or kubectl deploy without explicit ops approval.
