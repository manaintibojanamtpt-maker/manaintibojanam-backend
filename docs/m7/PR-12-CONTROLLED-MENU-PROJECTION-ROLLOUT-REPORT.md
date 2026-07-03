# M7 PR-12 — Controlled Menu Projection Rollout Report

**Program:** BHOS-M7  
**PR:** M7 PR-12 — Controlled Menu Projection Rollout  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-12 delivers a **standalone menu projection rollout policy engine** with staged percentage configuration, manual promotion gates, automatic rollback rules, metrics, and telemetry. This is infrastructure only — **not wired into MenuSDK or Menu Read Adapter**. Legacy remains the authoritative read source. Feature flag defaults OFF.

---

## 2. Architecture

```
MenuSDK (unchanged)
      │
      ▼
Menu Read Adapter (unchanged — not wired)
      │
      ▼
Projection Rollout Policy Engine (NEW — standalone)
      │
 ┌────┴──────────┐
 │               │
Legacy      Projection
Repository   Repository
```

No runtime routing. Stages are configuration and policy evaluation only.

---

## 3. Rollout Stages

| Stage | Label | Projection % |
|-------|-------|--------------|
| 0 | Legacy Only | 0% |
| 1 | Canary | 1% |
| 2 | Pilot | 5% |
| 3 | Expanded | 25% |
| 4 | Majority | 50% |
| 5 | Full | 100% |

Stages require explicit manual promotion. No automatic promotion.

---

## 4. Promotion Matrix

All gates must pass:

| Gate | Requirement |
|------|-------------|
| Feature flag | `FF_MENU_PROJECTION_ROLLOUT_ENABLED` ON |
| Manual approval | `manualApprovalGranted === true` |
| Projection | Soak certification READY |
| Operational | Validation GREEN |
| Repository | Projection repository healthy |
| Fallback rate | ≤ 2% |
| Telemetry | Health score ≥ 90 |
| Rollback | No active rollback triggers |

---

## 5. Rollback Matrix

| Trigger | Action |
|---------|--------|
| Projection unavailable | Legacy recommendation |
| Parity below 99% | Legacy recommendation |
| Operational RED | Legacy recommendation |
| Fallback rate > 2% | Legacy recommendation |
| P95 latency > 500ms | Legacy recommendation |

Routing also forces legacy when health gates fail before percentage bucketing.

---

## 6. Telemetry

| Event | When |
|-------|------|
| `menu_projection_rollout_started` | Evaluation begins |
| `menu_projection_rollout_completed` | Evaluation finishes |
| `menu_projection_rollout_stage_changed` | Stage updated |
| `menu_projection_rollout_promoted` | Promotion succeeds |
| `menu_projection_rollout_blocked` | Promotion blocked |
| `menu_projection_rollout_fallback` | Rollback triggered |

---

## 7. Metrics

| Metric | Description |
|--------|-------------|
| `totalRequests` | Total routing evaluations |
| `projectionRequests` | Routed to projection |
| `legacyRequests` | Routed to legacy |
| `fallbackRequests` | Fallback count |
| `fallbackRatePercent` | Fallback rate |
| `promotionCount` | Successful promotions |
| `rollbackCount` | Rollback triggers |
| `averageLatencyMs` | Average latency signal |
| `p95LatencyMs` | P95 latency signal |
| `repositoryHealthy` | Repository health |
| `projectionHealth` | Operational health proxy |
| `operationalHealth` | Operational validation health |
| `parityHealthPercent` | Parity percent |

---

## 8. Feature Flag

| Flag | Default | Env Key |
|------|---------|---------|
| `FF_MENU_PROJECTION_ROLLOUT_ENABLED` | OFF | `VITE_FF_MENU_PROJECTION_ROLLOUT_ENABLED` |

---

## 9. Generated Files

### SDK — `src/sdk/menu/rollout/`

| File | Purpose |
|------|---------|
| `ProjectionRolloutPolicy.ts` | In-memory stage store |
| `ProjectionRolloutStrategy.ts` | Deterministic bucketing |
| `ProjectionRolloutEvaluator.ts` | Orchestrator |
| `ProjectionRolloutMetrics.ts` | Request/health metrics |
| `ProjectionRolloutTelemetry.ts` | Telemetry hooks |
| `ProjectionRolloutFactory.ts` | Infrastructure wiring |
| `ProjectionRolloutConfiguration.ts` | Config defaults |
| `projectionRolloutPorts.ts` | Port contracts |
| `rolloutFeatureFlags.ts` | Feature flag |
| `README.md` | Module documentation |

### Domain — `src/domain/menu/rollout/`

| File | Purpose |
|------|---------|
| `RolloutPolicy.ts` | Promotion, rollback, routing rules |
| `RolloutStage.ts` | Stage definitions |
| `RolloutDecision.ts` | Decision types |
| `RolloutHealth.ts` | Health snapshot |
| `RolloutThresholds.ts` | Configurable thresholds |
| `RolloutMetadata.ts` | Version + reason constants |
| `README.md` | Domain documentation |

### Tests

| File | Tests |
|------|-------|
| `menuRolloutDomain.test.ts` | 15 |
| `menuProjectionRollout.test.ts` | 12 |

---

## 10. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental production routing | Not wired into MenuSDK or adapter |
| Uncontrolled promotion | Manual approval required |
| Silent degradation | Automatic rollback rules |
| False confidence | Multi-gate promotion + health thresholds |

---

## 11. Rollback Plan

1. Keep `FF_MENU_PROJECTION_ROLLOUT_ENABLED` OFF (default)
2. No MenuSDK or adapter wiring — zero production impact
3. Fully additive module — safe to revert
4. Legacy remains authoritative

---

## 12. Migration Roadmap

| Phase | PR | Status |
|-------|-----|--------|
| Menu read adapter layer | PR-11 ✅ | Complete |
| **Controlled projection rollout** | **PR-12 ✅** | **Complete** |
| Read switch certification | PR-13 🔒 | ARB blocked |
| Production routing | Future | Explicit approval required |

---

## 13. Definition of Ready

- [x] PR-11 menu read adapter available
- [x] PR-10 operational validation available
- [x] Stage model and thresholds agreed
- [x] ARB scope approved for rollout infrastructure only

---

## 14. Definition of Done

- [x] Standalone rollout engine created
- [x] Promotion policy operational
- [x] Rollback policy operational
- [x] Rollout metrics generated
- [x] Telemetry operational
- [x] `FF_MENU_PROJECTION_ROLLOUT_ENABLED` added (default OFF)
- [x] Mock deterministic tests pass
- [x] No MenuSDK or adapter wiring
- [x] No production behavior changes

---

## 15. Certification Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Not wired into MenuSDK | ✅ |
| 2 | Not wired into Menu Read Adapter | ✅ |
| 3 | MenuFacade unchanged | ✅ |
| 4 | PR-6–PR-11 unchanged | ✅ |
| 5 | No Firestore / runtime wiring | ✅ |
| 6 | Flag default OFF | ✅ |
| 7 | Manual promotion only | ✅ |
| 8 | Automatic rollback rules | ✅ |
| 9 | Deterministic tests pass | ✅ |
| 10 | Additive + rollback-safe | ✅ |

---

**STOP.** Do not proceed to M7 PR-13 (Menu Projection Read Switch Certification) until ARB approval.
