# M6 PR-12 — Controlled Projection Read Rollout Report

**Program:** BHOS-M6-A  
**PR:** M6 PR-12 — Controlled Projection Read Rollout  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval  
**Rollout Version:** `0.1.0-projection-rollout`

---

## 1. Executive Summary

M6 PR-12 introduces **controlled projection read rollout infrastructure** — a policy engine for staged percentage-based routing between legacy and projection repositories. The rollout layer sits conceptually between the Order Read Adapter and repository backends.

**This PR does not wire rollout into OrderSDK, the adapter layer, or production routing.** `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` defaults **OFF**. Legacy remains the authoritative read path until M6 PR-13 production certification.

Manual promotion is required at each stage. Automatic rollback returns traffic to legacy on unhealthy signals.

---

## 2. Architecture

```
OrderSDK (unchanged)
      │
      ▼
Order Read Adapter (unchanged — not wired to rollout)
      │
      ▼
Rollout Policy Engine (new — standalone)
      │
 ┌────┴────────┐
 │             │
Legacy     Projection
Repository  Repository
(mock only in tests)
```

---

## 3. Rollout Stages

| Stage | Label | Projection Traffic | Notes |
|-------|-------|-------------------|-------|
| 0 | Legacy Only | 0% | Default stage |
| 1 | Canary | 1% | Explicit promotion required |
| 2 | Pilot | 5% | Explicit promotion required |
| 3 | Expanded | 25% | Explicit promotion required |
| 4 | Majority | 50% | Explicit promotion required |
| 5 | Full | 100% | Explicit promotion required |

**No automatic stage promotion.** Each stage must be explicitly configured via `ProjectionRolloutPolicy.setStage()` or `promote()` after gates pass.

---

## 4. Promotion Rules

Promotion to the next stage requires **all** of:

| Requirement | Gate |
|-------------|------|
| Feature flag | `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` ON |
| Manual approval | `manualApprovalGranted: true` |
| Parity | `parityReady === true` |
| Operational validation | `operationalHealth === 'GREEN'` |
| Projection repository | `projectionRepositoryHealthy === true` |
| Fallback rate | `fallbackRatePercent <= maxFallbackRatePercent` (default 2%) |
| Telemetry | `telemetryHealthScore >= minTelemetryHealthScore` (default 90) |
| No rollback triggers | `evaluateRolloutRollback()` returns `required: false` |

---

## 5. Rollback Rules

Automatic rollback to legacy **immediately** when any of:

| Signal | Threshold (default) | Trigger |
|--------|---------------------|---------|
| Projection unavailable | — | `projectionRepositoryHealthy === false` |
| Parity drop | `< 99%` | `parityPercent < minParityPercent` |
| Operational health | RED | `operationalHealth === 'RED'` |
| Fallback spike | `> 2%` | `fallbackRatePercent > maxFallbackRatePercent` |
| Latency breach | `> 500ms p95` | `p95LatencyMs > maxP95LatencyMs` |

Routing also falls back when parity not READY, operational not GREEN, or repository unhealthy even before percentage bucketing.

---

## 6. Decision Matrix

### Routing

| Flag | Stage | Health | Rollback | Route |
|------|-------|--------|----------|-------|
| OFF | * | * | * | Legacy |
| ON | 0 | * | * | Legacy |
| ON | 1–5 | Unhealthy | Yes | Legacy |
| ON | 1–5 | Healthy | No | Bucket-based (projection if `bucket < stage%`) |

### Promotion

| Flag | Manual Approval | Health | Promotion |
|------|-----------------|--------|-----------|
| OFF | * | * | Blocked |
| ON | No | * | Blocked |
| ON | Yes | Not all gates | Blocked |
| ON | Yes | All gates pass | Allowed to next stage |

---

## 7. Telemetry

| Event | When |
|-------|------|
| `projection_rollout_started` | Rollout evaluation begins |
| `projection_rollout_completed` | Rollout evaluation completes |
| `projection_rollout_stage_changed` | Stage updated after promotion |
| `projection_rollout_fallback` | Automatic rollback routes legacy |
| `projection_rollout_promoted` | Stage promotion succeeds |
| `projection_rollout_blocked` | Promotion blocked |

---

## 8. Feature Flags

| Flag | Default | Env Key | Purpose |
|------|---------|---------|---------|
| `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` | OFF | `VITE_FF_ORDER_PROJECTION_ROLLOUT_ENABLED` | Enable rollout policy evaluation |

Adapter and EventSDK flags remain unchanged and independent.

---

## 9. Generated Files

### SDK — `src/sdk/order/rollout/`

| File | Purpose |
|------|---------|
| `ProjectionRolloutPolicy.ts` | Stage configuration store |
| `ProjectionRolloutStrategy.ts` | Deterministic percentage bucketing |
| `ProjectionRolloutEvaluator.ts` | Routing, promotion, rollback evaluation |
| `ProjectionRolloutMetrics.ts` | In-memory rollout metrics |
| `ProjectionRolloutTelemetry.ts` | Telemetry hooks |
| `ProjectionRolloutFactory.ts` | `createProjectionRolloutInfrastructure()` |
| `ProjectionRolloutConfiguration.ts` | Configuration defaults |
| `projectionRolloutPorts.ts` | Port contracts |
| `rolloutFeatureFlags.ts` | Rollout feature flag |
| `README.md` | Module documentation |

### Domain — `src/domain/order/rollout/`

| File | Purpose |
|------|---------|
| `RolloutDecision.ts` | Routing, promotion, rollback decision types |
| `RolloutStage.ts` | Stage definitions 0–5 |
| `RolloutThresholds.ts` | Configurable thresholds |
| `RolloutHealth.ts` | Health snapshot types |
| `RolloutPolicy.ts` | Pure policy rules |
| `RolloutMetadata.ts` | Constants and reasons |
| `README.md` | Domain documentation |

### Ports

| Port | Responsibility |
|------|----------------|
| `ProjectionRolloutPolicyPort` | Stage configuration |
| `ProjectionRolloutMetricsPort` | Health and request metrics |
| `ProjectionRolloutDecisionPort` | Routing, promotion, rollback |

---

## 10. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Premature production routing | Flag default OFF; not wired to adapter or OrderSDK |
| Uncontrolled traffic shift | Explicit stages; manual approval required |
| Silent degradation | Automatic rollback on unhealthy signals |
| Non-deterministic routing | Stable hash bucket on `routingKey` |
| Parity regression | Rollback on parity below threshold |
| Operational incident | Rollback on RED operational health |

---

## 11. Migration Plan

1. **PR-12 (this PR):** Rollout infrastructure only — policy, metrics, telemetry, tests
2. **Staging soak:** 72-hour soak with rollout flag OFF (no behavior change)
3. **PR-13:** Wire rollout into adapter behind certification gates
4. **Staged promotion:** Manual stage advancement 0 → 1 → 2 → 3 → 4 → 5 in staging
5. **ARB approval:** Architecture Review Board sign-off
6. **Production authorization:** Explicit production switch approval only after full rollout success

---

## 12. Definition of Ready

- [x] M6 PR-11 Order Read Adapter complete
- [x] Projection parity READY certification (PR-9)
- [x] Operational validation GREEN (PR-10)
- [x] 742/742 baseline tests passing before PR-12
- [x] Rollout domain and SDK modules scoped
- [x] No frozen SDK modifications

---

## 13. Definition of Done

- [x] Rollout engine exists (`ProjectionRolloutEvaluator`)
- [x] Promotion policy exists (`evaluateRolloutPromotion`)
- [x] Automatic rollback policy exists (`evaluateRolloutRollback`)
- [x] Manual promotion required (no auto-promotion)
- [x] Feature flag `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` default OFF
- [x] Telemetry events defined and emitted
- [x] Mock-only tests — no Firestore, no UI, no runtime rollout
- [x] No OrderSDK API changes
- [x] No adapter layer changes
- [x] No production behavior changes
- [x] Documentation complete

---

## 14. Certification Checklist

| Check | Status |
|-------|--------|
| OrderSDK public API unchanged | ✅ |
| Adapter layer unchanged | ✅ |
| Projection runtime unchanged | ✅ |
| Business event producers unchanged | ✅ |
| Presentation unchanged | ✅ |
| Rollout flag default OFF | ✅ |
| Legacy remains default path | ✅ |
| Manual promotion enforced | ✅ |
| Automatic rollback implemented | ✅ |
| Deterministic tests passing | ✅ |
| PR-13 not started | ✅ |

---

## 15. STOP — PR-13 Prohibited

Production projection switch remains **prohibited** until:

- 72-hour staging soak completed
- Projection parity remains READY
- Operational validation remains GREEN
- Rollout completed successfully through all stages
- Architecture Review Board approval
- Explicit production authorization

**Legacy remains the authoritative read path until PR-13.**
