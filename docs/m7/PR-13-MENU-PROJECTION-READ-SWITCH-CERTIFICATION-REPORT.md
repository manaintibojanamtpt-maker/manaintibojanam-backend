# M7 PR-13 — Menu Projection Read Switch Certification Report

**Program:** BHOS-M7  
**PR:** M7 PR-13 — Menu Projection Read Switch Certification  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-13 delivers a **standalone menu projection read switch certification engine** that aggregates evidence from parity, soak, operational validation, rollout, lag, replay, drift, and governance sources. It evaluates readiness and generates decision packages with explicit `legacyAuthoritative: true` and `productionActivationProhibited: true`.

**Certification only.** No MenuSDK wiring, no adapter switch, no rollout activation, no production routing. Feature flag defaults OFF.

---

## 2. Architecture

```
Operational Evidence
        ↓
Menu Projection Certification Engine
        ↓
Readiness Evaluation
        ↓
Decision Package (GO | CONDITIONAL_GO | NO_GO)
        ↓
STOP
```

---

## 3. Evidence Matrix

| Source | Evidence Type |
|--------|---------------|
| Projection Parity | `parity.certified`, `parityPercent` |
| Projection Soak | `soak.soakComplete`, `soakHours` |
| Operational Validation | `operational.health` |
| Rollout Metrics | `rollout.rolloutHealthy`, `fallbackRatePercent` |
| Projection Health | `projectionHealth.repositoryHealthy` |
| Lag | `lag.maximumLagMs`, `p95LagMs` |
| Replay | `replay.replaySuccessPercent` |
| Drift | `drift.unresolvedCriticalCount` |
| Governance | `governance.arbApprovalRecorded` |
| Rollback Statistics | `rollback.rollbackRatePercent` |

---

## 4. Readiness Matrix

| Status | Condition |
|--------|-----------|
| `READY` | All gates pass, no critical blockers |
| `CONDITIONAL` | Minor warnings, parity ≥ 95%, no RED operational |
| `NOT_READY` | Any critical blocker |

### READY Gates

- Parity certified ≥ 99%
- Operational GREEN
- Soak complete ≥ 72h
- Repository healthy
- Replay success ≥ 99%
- Maximum lag ≤ 30s
- No critical drift
- Governance approved
- Rollout healthy
- Rollback rate ≤ 2%

---

## 5. Decision Package

| Status | goNoGo |
|--------|--------|
| `READY` | `GO` |
| `CONDITIONAL` | `CONDITIONAL_GO` |
| `NOT_READY` | `NO_GO` |

**Always included:**
- `legacyAuthoritative: true`
- `productionActivationProhibited: true`

---

## 6. Telemetry

| Event | When |
|-------|------|
| `menu_projection_certification_started` | Certification begins |
| `menu_projection_certification_completed` | Certification finishes |
| `menu_projection_certification_failed` | Failure |
| `menu_projection_certification_ready` | READY status |
| `menu_projection_certification_not_ready` | NOT_READY status |

---

## 7. Feature Flag

| Flag | Default | Env Key |
|------|---------|---------|
| `FF_MENU_PROJECTION_CERTIFICATION_ENABLED` | OFF | `VITE_FF_MENU_PROJECTION_CERTIFICATION_ENABLED` |

---

## 8. Generated Files

### SDK — `src/sdk/menu/certification/`

| File | Purpose |
|------|---------|
| `MenuProjectionCertification.ts` | Orchestrator |
| `MenuCertificationEvaluator.ts` | Evidence → report → persist |
| `MenuCertificationEvidence.ts` | Evidence collector + healthy fixture |
| `MenuCertificationReport.ts` | Report generator |
| `MenuCertificationTelemetry.ts` | Telemetry hooks |
| `MenuCertificationFactory.ts` | Infrastructure wiring |
| `InMemoryMenuCertificationRepository.ts` | In-memory store |
| `menuCertificationPorts.ts` | Port contracts |
| `menuCertificationFeatureFlags.ts` | Feature flag |
| `README.md` | Module documentation |

### Domain — `src/domain/menu/certification/`

| File | Purpose |
|------|---------|
| `MenuProjectionReadinessRules.ts` | Readiness evaluation |
| `MenuCertificationStatus.ts` | Status + decision package |
| `MenuCertificationEvidence.ts` | Evidence bundle types |
| `MenuCertificationMetadata.ts` | Block reasons, GO/NO-GO |
| `MenuCertificationThresholds.ts` | Configurable thresholds |
| `README.md` | Domain documentation |

### Tests

| File | Tests |
|------|-------|
| `menuProjectionCertificationDomain.test.ts` | 10 |
| `menuProjectionSwitchCertification.test.ts` | 11 |

---

## 9. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental production switch | `productionActivationProhibited: true` always |
| MenuSDK regression | Not wired into MenuSDK |
| False GO confidence | Multi-gate readiness + blockers |
| Frozen layer regression | PR-1–PR-12 untouched |

---

## 10. Rollback Plan

1. Keep `FF_MENU_PROJECTION_CERTIFICATION_ENABLED` OFF (default)
2. No wiring — zero production impact
3. Fully additive module — safe to revert
4. Legacy remains authoritative

---

## 11. Migration Roadmap

| Phase | PR | Status |
|-------|-----|--------|
| Controlled projection rollout | PR-12 ✅ | Complete |
| **Read switch certification** | **PR-13 ✅** | **Complete** |
| Platform v1.0 certification & freeze | PR-14 🔒 | ARB blocked |
| Production activation | Future | Explicit approval required |

---

## 12. Definition of Ready

- [x] PR-10 operational validation available
- [x] PR-11 read adapter available
- [x] PR-12 rollout policy available
- [x] Evidence matrix agreed
- [x] ARB scope approved for certification only

---

## 13. Definition of Done

- [x] Standalone certification engine created
- [x] Evidence aggregation operational
- [x] Readiness evaluation operational
- [x] Decision package generation operational
- [x] Telemetry operational
- [x] `FF_MENU_PROJECTION_CERTIFICATION_ENABLED` added (default OFF)
- [x] Every package states legacy authoritative + production prohibited
- [x] Mock deterministic tests pass
- [x] No MenuSDK, adapter, or rollout wiring

---

## 14. Certification Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Not wired into MenuSDK | ✅ |
| 2 | Not wired into Menu Read Adapter | ✅ |
| 3 | Not wired into rollout engine | ✅ |
| 4 | PR-1–PR-12 unchanged | ✅ |
| 5 | Flag default OFF | ✅ |
| 6 | legacyAuthoritative always true | ✅ |
| 7 | productionActivationProhibited always true | ✅ |
| 8 | Deterministic tests pass | ✅ |
| 9 | Additive + rollback-safe | ✅ |
| 10 | No production routing | ✅ |

---

**STOP.** Do not proceed to M7 PR-14 (Menu Platform v1.0 Certification & Freeze) until ARB approval.
