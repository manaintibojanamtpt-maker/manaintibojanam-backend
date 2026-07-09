# BhojanOS Infrastructure as Code

**Status:** READY_FOR_IAC_DEPLOYMENT (artifacts only — not executed)  
**Authority:** [Staging Infrastructure Blueprint](../docs/staging/infrastructure/)

## Layout

```
terraform/
├── modules/           # Reusable GCP modules
└── environments/      # Per-environment roots
    ├── development/   # Template
    ├── qa/            # Template
    ├── integration/   # Template
    ├── staging/       # Full implementation
    ├── production/    # Template
    ├── dr/            # Template
    └── sandbox/       # Template
```

## Environments

| Environment | Status | Purpose |
|-------------|--------|---------|
| **staging** | Full IaC | M6/M7 72h soak |
| development, qa, integration, production, dr, sandbox | Templates | Copy from staging, adjust vars |

## Usage (do not run without ARB approval)

```bash
cd terraform/environments/staging
terraform init
terraform plan -var-file=terraform.tfvars
# terraform apply — requires ARB + ops approval
```

## State

- **Backend:** GCS bucket `bhojanos-terraform-state` (created by bootstrap)
- **Prefix:** `staging/` per environment

## Prerequisites

- GCP org access
- Terraform >= 1.6
- Workload Identity Federation for GitHub Actions

**STOP.** No `terraform apply` in CI without manual approval gate.
