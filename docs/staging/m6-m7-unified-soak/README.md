# M6/M7 Unified 72-Hour Staging Soak Program

**Program ID:** BHOS-STAGING-SOAK-001  
**Date:** 2026-06-27  
**Environment:** **STAGING ONLY** — never production  
**Status:** 📋 EXEC-003 bootstrap **BLOCKED** — infrastructure not provisioned  
**Latest execution:** [EXEC-003/](./EXEC-003/) · Prior: [EXEC-002/](./EXEC-002/)  
**Platforms:** M6 Event Platform v1.0.0 · M7 Menu Platform v1.0.0

---

## Purpose

Produce production-quality operational evidence proving the BhojanOS **Event Spine** (M6) and **Catalog Spine** (M7) are ready for controlled rollout — without modifying frozen SDK contracts, enabling production flags, or wiring adapters.

---

## Deliverables

| Document | Purpose |
|----------|---------|
| [STAGING-SOAK-PLAN.md](./STAGING-SOAK-PLAN.md) | Master 72h soak plan |
| [STAGING-CHECKLIST.md](./STAGING-CHECKLIST.md) | Enable sequence, daily/hourly checklists |
| [PROJECTION-HEALTH-REPORT.md](./PROJECTION-HEALTH-REPORT.md) | Worker, checkpoint, snapshot health |
| [PARITY-REPORT.md](./PARITY-REPORT.md) | Order + Menu parity evidence |
| [REPLAY-REPORT.md](./REPLAY-REPORT.md) | Replay correctness + idempotency |
| [LAG-REPORT.md](./LAG-REPORT.md) | Projection lag + drift |
| [OBSERVABILITY-DASHBOARD.md](./OBSERVABILITY-DASHBOARD.md) | Staging dashboard spec |
| [ROLLBACK-DRILL-REPORT.md](./ROLLBACK-DRILL-REPORT.md) | L1–L4 drill procedures |
| [READINESS-CERTIFICATION.md](./READINESS-CERTIFICATION.md) | READY / CONDITIONAL / NOT READY |
| [GO-NO-GO-REPORT.md](./GO-NO-GO-REPORT.md) | ARB decision package |
| [Ops Execution Runbook](../ops-execution/README.md) | **Deploy + execute** Phases 0–10 (EXEC-002) |

---

## Constraints (immutable)

- ❌ No OrderSDK / MenuSDK / EventSDK contract changes
- ❌ No adapter wiring
- ❌ No production flags
- ❌ No Firestore migrations
- ❌ No UI / Presentation changes
- ✅ Staging-only flag enablement
- ✅ Evidence collection + observability
- ✅ Rollback drills documented and executed in staging

---

## Regression baseline

**1033 / 1033** tests passing (`npm run test:sdk`) — unchanged by this program.

---

## Execution authority

| Role | Responsibility |
|------|----------------|
| **Platform Ops** | Flag enablement, monitoring |
| **SRE** | Dashboards, rollback drills |
| **Platform Architect** | Evidence review |
| **ARB** | GO / CONDITIONAL GO / NO GO |

---

**Status:** ⚠️ Execution attempted (EXEC-001) — **NO GO** — Phases B–E blocked; see [GO-NO-GO-REPORT.md](./GO-NO-GO-REPORT.md)

**STOP.** Staging infrastructure required before soak execution. No production changes.
