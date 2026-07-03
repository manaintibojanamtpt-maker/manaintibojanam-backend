# EXEC-003 Tenant Report

**Execution ID:** BHOS-STAGING-SOAK-EXEC-003  
**Date:** 2026-07-03

---

## Tenant Provisioning Status

| Class | Tenant IDs | Planned | Provisioned | Isolation verified |
|-------|------------|---------|-------------|-------------------|
| Primary | soak-primary-001..003 | 3 | **0** | ❌ |
| Secondary | soak-secondary-001..005 | 5 | **0** | ❌ |
| Control | soak-control-001..002 | 2 | **0** | ❌ |
| **Total** | | **10** | **0** | ❌ |

---

## Synthetic Datasets

| Dataset | Planned | Status |
|---------|---------|--------|
| Menu templates | `scripts/staging/datasets/menu-template.json` | **Artifact only — not applied** |
| Order templates | `scripts/staging/datasets/order-template.json` | **Artifact only — not applied** |
| Replay corpus (×4) | GCS | **Not uploaded** |
| Tenant manifest | GCS | **Not uploaded** |

---

## Firestore

| Check | Status |
|-------|--------|
| Staging Firestore instance | **Not provisioned** |
| T-0 baseline export | **Not executed** |
| Cross-tenant deny rules | **Not deployed** |

---

## Verdict

**NOT PROVISIONED** — Phase 4 blocked by Phase 2 failure.

**STOP.**
