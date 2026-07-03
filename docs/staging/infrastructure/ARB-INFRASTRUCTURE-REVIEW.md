# Architecture Review Board — Infrastructure Review

**Document ID:** BHOS-ARB-INFRA-001  
**Date:** 2026-06-27  
**Reviewer:** Platform Infrastructure Lead · DevOps Architect · SRE · ARB Infrastructure  
**Subject:** BhojanOS Staging Infrastructure Blueprint (BHOS-INFRA-STAGING-001)

---

## 1. Executive Summary

A **complete staging infrastructure blueprint** has been produced to unblock the M6/M7 72-hour soak program. The design provides isolated environments, worker topology, independent feature-flag store, full observability stack, tenant model, secrets management, rollback automation, and disaster recovery — **without modifying any application code or frozen platform contracts**.

### Verdict: **READY_FOR_STAGING_BUILD**

Infrastructure may proceed to provisioning (IaC + cloud resources) subject to cost approval and ops staffing.

---

## 2. Infrastructure Readiness

| Capability | Designed | Blocker removed |
|------------|----------|-----------------|
| Isolated staging project | ✅ | Prod/staging separation |
| Projection workers (order + menu) | ✅ | Workers not running |
| Replay service | ✅ | No replay infra |
| Event outbox monitoring | ✅ | No outbox monitor |
| Independent flag store | ✅ | No flag store |
| Prod flag guard | ✅ | No guardrails |
| Observability (G/P/OTEL) | ✅ | No dashboards |
| 10 tenant model | ✅ | No tenant isolation |
| L1–L4 rollback automation | ✅ | No timed rollback |
| Evidence archive (GCS) | ✅ | No evidence path |

**Readiness score: 5.0 / 5 (design completeness)**

**Build readiness: 0 / 5 (not yet provisioned)** — expected until infra sprint

---

## 3. Operational Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| O1 | Staging/prod project conflation | Medium | Critical | Separate GCP project + CI lint |
| O2 | Flag enable without audit | Medium | High | LD audit + approval workflow |
| O3 | Soak blind without OBS | High | Medium | OBS deploy gate before Phase B |
| O4 | Synthetic data insufficient for parity | Low | Medium | 10-tenant model with volume tiers |
| O5 | 72h soak clock reset on DR | Low | Medium | 6h checkpoint exports |

---

## 4. Deployment Risks

| ID | Risk | Mitigation |
|----|------|------------|
| D1 | Worker deploy with flags ON | CI enforces OFF at deploy |
| D2 | Secret leak in Vercel env | Secret Manager sync + lint |
| D3 | Wrong SHA deployed to staging | Immutable deploy tags |
| D4 | Observability not ready before soak | Phase A gate checklist |

---

## 5. Security Review

| Control | Status |
|---------|--------|
| IAM least privilege | ✅ Designed |
| RBAC groups | ✅ Designed |
| Service accounts per worker | ✅ Designed |
| Secrets in Secret Manager | ✅ Designed |
| Encryption at rest/transit | ✅ Designed |
| Audit logs (flags, secrets, Firestore) | ✅ Designed |
| Prod read-only guard | ✅ Designed |
| No cross-tenant access | ✅ Firestore rules |

**Security review: PASS (design)**

---

## 6. Scalability Review

| Component | Staging soak | Production path |
|-----------|--------------|-----------------|
| Order projection workers | 2–4 replicas | Horizontal partition by tenant |
| Menu projection workers | 2–4 replicas | Same |
| Outbox publisher | 1–2 | Queue-driven scale |
| Firestore | 10 tenants synthetic | Per-tenant isolation at scale |
| Redis (optional) | Single instance | Cluster for prod |

**Scalability: Adequate for 72h soak and production path documented**

---

## 7. Cost Estimate (monthly, staging only)

| Item | Estimate (USD) |
|------|----------------|
| Firestore staging (10 tenants, soak month) | $50–150 |
| Cloud Run workers (4 services, 2 min instances) | $120–250 |
| GCS evidence + backups | $20–40 |
| LaunchDarkly (staging project) | $0–75 (team plan) |
| Grafana Cloud / self-hosted | $0–100 |
| Secret Manager + audit logs | $10–20 |
| **Total staging (soak month)** | **~$200–635 / month** |

Production spine infrastructure deferred until post-soak ARB.

---

## 8. Recommendations

| Priority | Recommendation |
|----------|----------------|
| **P0** | Create GCP project `bhojanos-staging` with IAM as designed |
| **P0** | Provision LaunchDarkly staging project + prod guard job |
| **P0** | Deploy OTEL + Prometheus + Grafana before any flag enable |
| **P0** | Seed 10 tenants per TENANT-PROVISIONING.md |
| **P1** | Implement IaC (`infra/staging/terraform/` or Pulumi) |
| **P1** | Add CI lint: no prod secrets, no spine flags ON in prod deploy |
| **P1** | Schedule L1 rollback drill before Phase B |
| **P2** | Redis optional — defer unless lag tests require it |
| **P2** | Cross-region GCS replica for evidence |

---

## 9. Document index

| Document | Path |
|----------|------|
| Master design | [STAGING-INFRASTRUCTURE.md](./STAGING-INFRASTRUCTURE.md) |
| Deployment | [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) |
| Feature flags | [FEATURE-FLAG-INFRASTRUCTURE.md](./FEATURE-FLAG-INFRASTRUCTURE.md) |
| Observability | [OBSERVABILITY-SETUP.md](./OBSERVABILITY-SETUP.md) |
| Rollback | [ROLLBACK-AUTOMATION.md](./ROLLBACK-AUTOMATION.md) |
| Tenants | [TENANT-PROVISIONING.md](./TENANT-PROVISIONING.md) |
| Secrets | [SECRETS-MANAGEMENT.md](./SECRETS-MANAGEMENT.md) |
| DR | [DISASTER-RECOVERY.md](./DISASTER-RECOVERY.md) |
| Soak program | [../m6-m7-unified-soak/STAGING-SOAK-PLAN.md](../m6-m7-unified-soak/STAGING-SOAK-PLAN.md) |

---

## 10. Path to soak re-execution

```
READY_FOR_STAGING_BUILD
        ↓
Provision infrastructure (1–2 weeks)
        ↓
Deploy workers + OBS (Phase A)
        ↓
Seed tenants + T-0 export
        ↓
Execute soak Phases B–E
        ↓
Populate evidence reports with observed metrics
        ↓
ARB GO-NO-GO re-review
```

---

## 11. Final Verdict

# **READY_FOR_STAGING_BUILD**

The infrastructure blueprint is complete, security-reviewed, and aligned with frozen M6/M7 platforms. **No application code changes required.** Proceed to IaC provisioning and staging deployment per DEPLOYMENT-GUIDE.md.

---

**STOP.** No cloud resources provisioned. No flags enabled. Await infra build sprint before re-executing 72-hour soak.
