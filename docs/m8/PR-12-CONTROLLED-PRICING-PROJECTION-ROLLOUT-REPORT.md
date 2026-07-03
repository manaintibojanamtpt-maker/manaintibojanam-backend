# M8 PR-12 — Controlled Pricing Projection Rollout Report

**Program:** BHOS-M8  
**Milestone:** M8 PR-12 — Controlled Pricing Projection Rollout  
**Status:** Complete — Awaiting Architecture Review Board approval  
**Date:** 2026-07-03

---

## Executive Summary

M8 PR-12 delivers the **standalone Pricing Projection Rollout Policy Engine** with staged percentage configuration (0% → 100%), manual promotion gates, automatic rollback recommendations, metrics, and telemetry. This is **policy only** — not wired into PricingSDK or Pricing Read Adapter. Legacy remains the authoritative read source. Feature flag defaults OFF.

**Test result:** 1305 / 1305 passing (+30 from PR-11 baseline of 1275).

---

## Architecture Validation

| Constraint | Status |
|------------|--------|
| PricingSDK unchanged | ✓ |
| DTOs unchanged | ✓ |
| Read Adapter unchanged | ✓ |
| Not wired into createPricingSDK() | ✓ |
| Not wired into Pricing Read Adapter | ✓ |
| PR-6 through PR-11 layers unchanged | ✓ |
| M1–M7 frozen platforms untouched | ✓ |
| No Firestore / runtime / React | ✓ |
| Independent rollout feature flag | ✓ |

---

## Generated Files

### Domain (`src/domain/pricing/rollout/`)

| File | Purpose |
|------|---------|
| `RolloutStage.ts` | Stages 0–5 with projection percentages |
| `RolloutPolicy.ts` | Promotion, rollback, routing evaluation |
| `RolloutDecision.ts` | Decision types |
| `RolloutHealth.ts` | Health snapshot signals |
| `RolloutThresholds.ts` | Parity, fallback, latency, telemetry thresholds |
| `RolloutMetadata.ts` | Module identity and reason constants |
| `README.md` | Domain documentation |

### SDK (`src/sdk/pricing/rollout/`)

| File | Purpose |
|------|---------|
| `pricingProjectionRolloutPorts.ts` | Policy, metrics, decision ports |
| `PricingProjectionRolloutPolicy.ts` | In-memory stage store |
| `PricingProjectionRolloutStrategy.ts` | Deterministic bucketing delegate |
| `PricingProjectionRolloutEvaluator.ts` | Routing, promotion, rollback orchestrator |
| `PricingProjectionRolloutMetrics.ts` | Request, fallback, promotion metrics |
| `PricingProjectionRolloutTelemetry.ts` | `pricing_projection_rollout_*` events |
| `PricingProjectionRolloutConfiguration.ts` | Stage and threshold configuration |
| `PricingProjectionRolloutFactory.ts` | Infrastructure factory |
| `pricingRolloutFeatureFlags.ts` | Independent rollout flag |
| `README.md` | SDK documentation |

### Feature Flag (additive, independent)

| Flag | Default | Environment Variable |
|------|---------|---------------------|
| `FF_PRICING_PROJECTION_ROLLOUT_ENABLED` | `false` | `VITE_FF_PRICING_PROJECTION_ROLLOUT_ENABLED` |

### Tests

| File | Tests |
|------|-------|
| `pricingRolloutDomain.test.ts` | 15 |
| `pricingProjectionRollout.test.ts` | 14 |

---

## Rollout Stages

| Stage | Label | Projection % |
|-------|-------|--------------|
| 0 | Legacy Only | 0% |
| 1 | Canary 1% | 1% |
| 2 | Pilot 5% | 5% |
| 3 | Expanded 25% | 25% |
| 4 | Majority 50% | 50% |
| 5 | Full 100% | 100% |

Configuration only. No runtime consumers. No automatic promotion.

---

## Promotion Matrix

All gates must pass:

| Gate | Requirement |
|------|-------------|
| Feature flag | `FF_PRICING_PROJECTION_ROLLOUT_ENABLED` ON |
| Manual approval | `manualApprovalGranted === true` |
| Projection soak | READY |
| Operational validation | GREEN |
| Repository | Projection repository healthy |
| Fallback rate | ≤ 2% |
| Telemetry | Health score ≥ 90 |
| Rollback | No active rollback triggers |

---

## Rollback Matrix

| Trigger | Action |
|---------|--------|
| Projection unavailable | Legacy recommendation |
| Parity < 99% | Legacy recommendation |
| Operational RED | Legacy recommendation |
| Fallback rate > 2% | Legacy recommendation |
| P95 latency > 500ms | Legacy recommendation |

Routing also forces legacy when health gates fail before percentage bucketing.

---

## Routing Flow

```
Evaluate flag
      ↓
Rollback conditions
      ↓
Promotion conditions (for promote only)
      ↓
Stage
      ↓
Stable bucket (routingKey → 0–99)
      ↓
Projection recommendation
      ↓
STOP (policy only — no runtime routing)
```

---

## Metrics

| Metric | Description |
|--------|-------------|
| `totalRequests` | Total routing evaluations |
| `projectionRequests` | Projection route selections |
| `legacyRequests` | Legacy route selections |
| `fallbackCount` | Automatic fallback events |
| `fallbackRate` | Fallback percentage |
| `promotionCount` | Manual promotions |
| `rollbackCount` | Rollback-triggered routes |
| `averageLatency` | Average latency from health |
| `p95Latency` | P95 latency from health |
| `repositoryHealth` | Projection repository status |
| `operationalHealth` | Operational validation status |
| `parityPercent` | Parity percentage |

---

## Telemetry

| Event | When |
|-------|------|
| `pricing_projection_rollout_started` | Evaluation begins |
| `pricing_projection_rollout_completed` | Evaluation finished |
| `pricing_projection_rollout_stage_changed` | Stage transition |
| `pricing_projection_rollout_promoted` | Manual promotion |
| `pricing_projection_rollout_blocked` | Promotion blocked |
| `pricing_projection_rollout_fallback` | Rollback fallback |

---

## Testing Summary

| Area | Coverage |
|------|----------|
| Factory resolution | ✓ |
| Stage transitions | ✓ |
| Promotion gates | ✓ |
| Rollback gates | ✓ |
| Routing decisions | ✓ |
| Stable bucket / determinism | ✓ |
| Metrics | ✓ |
| Telemetry | ✓ |
| Feature flag OFF | ✓ |
| Manual approval | ✓ |
| Repository unhealthy | ✓ |
| Parity unhealthy | ✓ |
| Operational unhealthy | ✓ |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental SDK wiring | Not imported by createPricingSDK() |
| Accidental adapter wiring | Not imported by Pricing Read Adapter |
| Production routing | Flag OFF by default; policy evaluation only |
| Prior layer regression | Separate rollout directory; PR-6–PR-11 untouched |

---

## Rollback Plan

1. Set `VITE_FF_PRICING_PROJECTION_ROLLOUT_ENABLED=false` (default).
2. Remove test entries from `package.json` if reverting entirely.
3. Delete `src/domain/pricing/rollout/` and `src/sdk/pricing/rollout/` directories.
4. No database, runtime, or deployment changes to revert.

---

## Definition of Done

- [x] Rollout engine implemented
- [x] Promotion policy operational
- [x] Rollback policy operational
- [x] Metrics operational
- [x] Telemetry operational
- [x] Feature flag OFF by default
- [x] PricingSDK unchanged
- [x] No PricingSDK wiring
- [x] No Adapter wiring
- [x] Documentation complete
- [x] All tests passing (1305)

---

## Certification Checklist

| Item | Status |
|------|--------|
| PricingSDK unchanged | ✓ |
| DTOs unchanged | ✓ |
| Read Adapter unchanged | ✓ |
| PR-6–PR-11 unchanged | ✓ |
| M1–M7 frozen | ✓ |
| No Firestore | ✓ |
| No runtime consumers | ✓ |
| Deterministic tests | ✓ |
| Not wired into SDK or adapter | ✓ |

---

**STOP — M8 PR-13 (Pricing Projection Read Switch Certification) requires explicit ARB approval.**
