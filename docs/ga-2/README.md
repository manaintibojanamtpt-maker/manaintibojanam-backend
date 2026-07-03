# GA-2 — Customer Onboarding & Production Stabilization

**Program:** BhojanOS SaaS · Post-production milestone  
**Status:** Active  
**Architecture:** Legacy read path only — projection infrastructure dormant

---

## Documents

| Document | Purpose |
|----------|---------|
| [GA-2-CUSTOMER-ONBOARDING-STABILIZATION.md](./GA-2-CUSTOMER-ONBOARDING-STABILIZATION.md) | Primary runbook |
| [ONBOARDING-CHECKLIST.md](./ONBOARDING-CHECKLIST.md) | Owner onboarding verification |
| [MONITORING.md](./MONITORING.md) | Production observability |
| [BACKUP-AND-RESTORE.md](./BACKUP-AND-RESTORE.md) | Daily backup & restore drill |
| [QUALITY-GATES.md](./QUALITY-GATES.md) | Pre/post stabilization gates |
| [GA-2-DEPLOYMENT-REPORT.md](./GA-2-DEPLOYMENT-REPORT.md) | Milestone completion report |

---

## Quick commands

```bash
# Verify GA-2 deliverables + legacy flags OFF
npm run verify:ga2

# Full quality gate
npm run gate:ga2

# Production Firestore backup (requires gcloud + prod bucket)
bash scripts/backup/firestore-export-prod.sh
```

---

## Scope

**In scope:** Customer onboarding, owner dashboard metrics, guest order tracking, help center, KYC bank details, production backups, monitoring runbooks.

**Out of scope:** Projection activation, new SDKs, Inventory v2, Checkout v2, Kubernetes, Terraform.

---

## STOP

Do **not** enable projection architecture until real production usage validates the legacy path and ARB approves.
