# Menu Risk Assessment v1.0

**Status:** Frozen — M7 PR-14  
**Date:** 2026-06-27  
**Overall risk level:** **LOW** (flags OFF, legacy authoritative)

---

## 1. Risk matrix

| ID | Risk | Likelihood | Impact | Level | Mitigation |
|----|------|------------|--------|-------|------------|
| R1 | Accidental production flag enable | Low | High | **Medium** | All flags OFF; L1 rollback < 1 min |
| R2 | Adapter wired prematurely | Low | High | **Medium** | Not wired in `createMenuSDK()`; no integration test |
| R3 | Projection parity failure | Medium | Medium | **Medium** | Parity validation (PR-8); legacy authoritative |
| R4 | Projection lag / drift | Medium | Medium | **Medium** | Operational validation (PR-10); soak (PR-9) |
| R5 | Incomplete item projection | High | Low | **Low** | Catalog metadata only by design; legacy for items |
| R6 | Performance under load | Medium | Medium | **Medium** | Staging soak required; no prod benchmarks yet |
| R7 | Firestore migration complexity | High | High | **High** | Deferred to future ADR; not in v1.0 scope |
| R8 | MenuSDK version drift | Low | Low | **Low** | PR-15 metadata promotion after ARB |
| R9 | Cross-platform regression | Low | High | **Low** | M1–M6 frozen; full 1033 suite |
| R10 | Certification bypass | Low | Critical | **Medium** | `productionActivationProhibited: true` |
| R11 | Observability gap in prod | Medium | Medium | **Medium** | Documented; dashboards deferred |
| R12 | Rollout percentage error | Low | High | **Medium** | Staged rollout (PR-12); L2 rollback |

---

## 2. Risk detail

### R1 — Accidental production flag enable

**Scenario:** Operator enables menu flags in production without ARB approval.

**Mitigation:**
- All 9 flags default OFF
- L1 rollback disables all flags in < 1 minute
- Governance requires ARB sign-off per flag
- No production activation in v1.0 certification

**Residual risk:** Low

---

### R2 — Adapter wired prematurely

**Scenario:** Future PR wires adapter into `createMenuSDK()` without certification.

**Mitigation:**
- v1.0 explicitly does NOT wire adapter
- ADR-023 prohibits wiring without explicit approval
- PR-13 certification must be `READY` before wiring PR
- Adapter tests verify standalone behaviour only

**Residual risk:** Low (with governance)

---

### R3 — Projection parity failure

**Scenario:** Shadow projection diverges from legacy data.

**Mitigation:**
- PR-8 parity comparator with field-level mismatch reporting
- Legacy always authoritative — projection is shadow-only
- Parity telemetry alerts on mismatch
- Staging soak validates match rate > 99.9%

**Residual risk:** Medium (during staging soak)

---

### R4 — Projection lag / drift

**Scenario:** Projection falls behind legacy updates.

**Mitigation:**
- PR-10 operational validation (lag, drift, replay)
- PR-9 soak health monitoring
- Checkpoint-based incremental refresh
- Alert thresholds documented in observability guide

**Residual risk:** Medium (during activation)

---

### R5 — Incomplete item projection

**Scenario:** Consumers expect full item data from projection; only metadata available.

**Mitigation:**
- Documented limitation in architecture and performance reports
- Legacy authoritative for item reads
- Full item projection deferred to future ADR
- Adapter routes to legacy for item reads by default

**Residual risk:** Low (by design)

---

### R7 — Firestore migration complexity

**Scenario:** Future Firestore migration causes data loss or extended downtime.

**Mitigation:**
- Not in v1.0 scope — requires separate ADR
- Strangler pattern supports dual-read during migration
- L2 adapter rollback to legacy
- L4 emergency recovery procedures documented

**Residual risk:** High (future — requires dedicated planning)

---

### R10 — Certification bypass

**Scenario:** Production activation without PR-13 certification.

**Mitigation:**
- Every certification package includes `productionActivationProhibited: true`
- Governance requires certification `READY` or `CONDITIONAL`
- ARB is final authority for production activation
- Rollout stages enforce incremental enablement

**Residual risk:** Low (with governance enforcement)

---

## 3. Outstanding risks (accept for v1.0 freeze)

| Risk | Accept rationale |
|------|------------------|
| No production benchmarks | Staging soak required before activation |
| No Firestore migration plan | Explicitly deferred |
| Adapter not wired | By design — legacy safe |
| No prod observability dashboards | Deployed during activation phase |
| Catalog-metadata projection only | Legacy covers item reads |

---

## 4. Prerequisites before production activation

1. ARB approval of ADR-023
2. PR-15 version promotion
3. 72-hour staging soak (health > 0.95, parity > 99.9%)
4. PR-13 certification `READY` or `CONDITIONAL`
5. Observability dashboards deployed
6. L1 + L2 rollback drill completed
7. Explicit MenuSDK → adapter wiring PR approved
8. On-call runbook updated with rollback procedures

---

## 5. Risk acceptance

**Accepted for v1.0 documentation freeze:**

- All risks mitigated to Low or acceptable Medium with flags OFF
- No production activation in this release
- Legacy authoritative guarantees no customer impact
- Full rollback procedures documented and testable

**Risk owner:** Platform Architect  
**Review date:** Upon ARB approval of ADR-023
