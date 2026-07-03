# EXEC-003 Blockers

**Execution ID:** BHOS-STAGING-SOAK-EXEC-003  
**Date:** 2026-07-03  
**Status:** Bootstrap **STOPPED** — do not proceed to Phase 2

---

## Critical Blockers (P0)

| ID | Blocker | Observed evidence | Remediation | Owner |
|----|---------|-------------------|-------------|-------|
| **B1** | GCP project `bhojanos-staging` missing | `gcloud projects describe bhojanos-staging` → permission denied; `gcloud projects list --filter=bhojanos` → **0 items** | Create project under org OR grant `manaintibojanamtpt@gmail.com` access; set billing | Platform Ops / GCP Admin |
| **B2** | Terraform CLI not installed | `terraform version` → **command not found** | Install Terraform ≥1.6 OR use GitHub Actions `iac-terraform-apply` with WIF | SRE |
| **B3** | Helm CLI not installed | `helm version` → **command not found** | Install Helm ≥3.14 OR deploy via CI workflow | SRE |
| **B4** | kubectl not installed | `kubectl version` → **command not found** | Install kubectl OR use Cloud Shell / CI | SRE |
| **B5** | Terraform state bucket missing | `gsutil ls gs://bhojanos-terraform-state` → **404 BucketNotFoundException** | Bootstrap state bucket before `terraform init` | Platform Ops |

---

## High Blockers (P1)

| ID | Blocker | Observed evidence | Remediation |
|----|---------|-------------------|-------------|
| **B6** | GCS evidence buckets missing | `gsutil ls gs://bhojanos-staging-evidence` → **404** | Created by Terraform module `storage` on apply |
| **B7** | GitHub Actions WIF not verified | Workflows reference `GCP_WIF_PROVIDER`, `GCP_TERRAFORM_SA`, `GCP_CI_SA` — **not validated this execution** | Configure WIF + repo secrets per `docs/iac/DEPLOYMENT-GUIDE.md` |
| **B8** | LaunchDarkly staging project not verified | No API token available; `launchdarkly-init.sh` **not executed** | Create LD project `bhojanos-staging`; store token in Secret Manager |
| **B9** | G0 approval gates not signed | No Platform Ops / Security / ARB sign-offs recorded | Complete Phase 0 checklist before apply |

---

## Accessible GCP Projects (observed)

The active account has access to these projects — **none match `bhojanos-staging`**:

| PROJECT_ID | NAME |
|------------|------|
| booming-alchemy-492609-t2 | mana-inti-bojanam-pune |
| mana-inti-bojanam-pune | mana-inti-bojanam-pune |
| mana-inti-bojanam-pune-492610 | mana-inti-bojanam-pune-new |
| gen-lang-client-0133200823 | Gemini Project |
| project-2003a91a-cd3d-427d-a7a | My First Project |
| project-cef72fd0-f2b6-4d14-984 | My First Project |

**Important:** Production Firebase projects must **not** be used for staging soak per blueprint isolation rule. A **dedicated** `bhojanos-staging` project is required.

---

## Tooling Status

| Tool | Required | Observed |
|------|----------|----------|
| gcloud | Yes | ✅ 572.0.0 |
| gsutil | Yes | ✅ (via SDK) |
| terraform | Yes | ❌ Not installed |
| helm | Yes | ❌ Not installed |
| kubectl | Yes | ❌ Not installed |
| npm / test:sdk | Baseline only | ✅ 1033/1033 |

---

## Stop Rule Applied

Per runbook: *"If cloud credentials, permissions, billing, networking, or deployment tools are unavailable, stop immediately."*

**Stopped after Phase 1 verification.** Phases 2–7 not attempted.

---

## Unblock Sequence for EXEC-004

```
1. Create bhojanos-staging GCP project + enable billing
2. Bootstrap gs://bhojanos-terraform-state
3. Install terraform, helm, kubectl (or use CI-only path)
4. Configure GitHub WIF secrets
5. terraform apply (staging)
6. Helm deploy via iac-deploy-staging workflow
7. provision-tenants.sh + launchdarkly-init.sh
8. Phase 6 validation → EXEC-004 72h soak
```

---

**STOP.**
