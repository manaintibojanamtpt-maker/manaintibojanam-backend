# M8 PR-9 — Pricing Projection Soak & Certification Report

**Program:** BHOS-M8  
**Milestone:** M8 PR-9 — Pricing Projection Soak & Certification  
**Status:** Complete — Awaiting Architecture Review Board approval  
**Date:** 2026-07-03

---

## Executive Summary

M8 PR-9 delivers **Pricing Projection Soak & Certification** — evidence-only certification infrastructure that consumes pricing parity reports, evaluates health, and generates readiness assessments. No PricingSDK routing, adapter switch, Event Platform wiring, or Firestore integration.

**Test result:** 1228 / 1228 passing (+16 from PR-8 baseline of 1212).

---

## Architecture Validation

| Constraint | Status |
|------------|--------|
| PricingSDK contracts unchanged | ✓ |
| DTOs unchanged | ✓ |
| Existing pricing domain unchanged (additive parity/soak/) | ✓ |
| Repository / orchestration / facade unchanged | ✓ |
| PR-6 projection foundation unchanged | ✓ |
| PR-7 shadow projection unchanged | ✓ |
| PR-8 parity validation unchanged | ✓ |
| M1–M7 frozen platforms untouched | ✓ |
| No Firestore / runtime / React | ✓ |
| No Event / Menu / Order integration | ✓ |
| Feature flags default OFF | ✓ |
| Triple gate required | ✓ |

---

## Generated Files

### Domain (`src/domain/pricing/parity/soak/`)

| File | Purpose |
|------|---------|
| `PricingProjectionThresholds.ts` | Configurable soak thresholds |
| `PricingProjectionHealthScore.ts` | GREEN / AMBER / RED health model |
| `PricingProjectionReadiness.ts` | READY / CONDITIONAL / NOT_READY certification |
| `PricingProjectionTrend.ts` | IMPROVING / STABLE / DEGRADING trend analysis |
| `PricingProjectionCertificationRules.ts` | Metrics, health, certification, report builder |
| `README.md` | Domain documentation |

### SDK (`src/sdk/pricing/parity/soak/`)

| File | Purpose |
|------|---------|
| `pricingProjectionSoakPorts.ts` | Report source, certification repository, infrastructure ports |
| `PricingProjectionSoakRunner.ts` | Soak pipeline with triple-gate |
| `PricingProjectionAnalyzer.ts` | Parity report → certification report |
| `PricingProjectionMetrics.ts` | Metrics aggregation from parity reports |
| `PricingProjectionCertification.ts` | In-memory certification repository |
| `PricingProjectionTelemetry.ts` | Placeholder telemetry hooks |
| `PricingProjectionFactory.ts` | Infrastructure factory |
| `README.md` | SDK documentation |

### Feature Flag (additive)

| Flag | Default | Environment Variable |
|------|---------|---------------------|
| `FF_PRICING_PROJECTION_SOAK_ENABLED` | `false` | `VITE_FF_PRICING_PROJECTION_SOAK_ENABLED` |

### Tests

| File | Tests |
|------|-------|
| `pricingProjectionSoakDomain.test.ts` | 5 |
| `pricingProjectionSoak.test.ts` | 11 |

---

## Soak Flow

```
FF_PRICING_PROJECTION_ENABLED
AND FF_PRICING_PROJECTION_PARITY_ENABLED
AND FF_PRICING_PROJECTION_SOAK_ENABLED
        ↓
Load parity reports
        ↓
Aggregate metrics
        ↓
Evaluate health (GREEN / AMBER / RED)
        ↓
Generate certification (READY / CONDITIONAL / NOT_READY)
        ↓
Analyze trend (IMPROVING / STABLE / DEGRADING)
        ↓
Persist certification (optional via runSoak)
        ↓
Emit telemetry
        ↓
STOP
```

---

## Health Model

| Status | Criteria |
|--------|----------|
| **GREEN** | Parity ≥ 99%, field parity ≥ 99%, missing ≤ 1% |
| **AMBER** | Parity ≥ 95%, below GREEN thresholds |
| **RED** | Parity < 95%, critical mismatches, or insufficient sample |

---

## Certification Matrix

| Certification | Criteria |
|---------------|----------|
| **READY** | GREEN health, min sample met, latency acceptable, no critical mismatches |
| **CONDITIONAL** | Parity ≥ 97%, minor issues |
| **NOT_READY** | RED health, critical mismatch, or insufficient sample |

Critical outcomes: `VERSION_MISMATCH`, `MISSING_IN_PROJECTION`.

---

## Trend Analysis

| Direction | Condition |
|-----------|-----------|
| **IMPROVING** | Late window parity > early window parity |
| **STABLE** | Difference within ±0.5% |
| **DEGRADING** | Late window parity < early window parity |

---

## Metrics

| Metric | Description |
|--------|-------------|
| `totalComparisons` | Parity reports analyzed |
| `successfulComparisons` | MATCH outcomes |
| `parityPercent` | Match rate |
| `fieldParityPercent` | Non-field-mismatch rate |
| `missingPercent` | Missing-in-projection or legacy rate |
| `averageLatencyMs` | Mean comparison duration |
| `p95LatencyMs` | 95th percentile latency |
| `mismatchDistribution` | Field-level mismatch counts |

---

## Telemetry

| Event | When |
|-------|------|
| `pricing_projection_soak_started` | Soak begins |
| `pricing_projection_soak_completed` | Soak finished |
| `pricing_projection_soak_failed` | Load or internal failure |
| `pricing_projection_readiness_generated` | Readiness assessment produced |
| `pricing_projection_certification_generated` | Certification report produced |

---

## Feature Flag

Triple gate required:

1. `FF_PRICING_PROJECTION_ENABLED`
2. `FF_PRICING_PROJECTION_PARITY_ENABLED`
3. `FF_PRICING_PROJECTION_SOAK_ENABLED`

All default **OFF**. Any flag OFF → `NOT_CONFIGURED`.

---

## Testing Summary

| Area | Coverage |
|------|----------|
| READY certification | ✓ |
| CONDITIONAL certification | ✓ |
| NOT_READY certification | ✓ |
| GREEN / AMBER / RED health | ✓ |
| Trend detection (improving, stable) | ✓ |
| Metrics aggregation | ✓ |
| Telemetry | ✓ |
| Minimum sample | ✓ |
| Critical mismatches | ✓ |
| Feature flag OFF | ✓ |
| Triple gate | ✓ |
| Certification persistence | ✓ |
| Latency percentiles | ✓ |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental adapter switch | No SDK/facade wiring; evidence-only certification |
| Production routing | Triple feature gate, all OFF by default |
| Parity layer regression | Separate soak directory; PR-8 files untouched |
| False READY certification | Min sample, critical mismatch, latency thresholds |

---

## Rollback Plan

1. Set `VITE_FF_PRICING_PROJECTION_SOAK_ENABLED=false` (default).
2. Remove test entries from `package.json` if reverting entirely.
3. Delete `src/domain/pricing/parity/soak/` and `src/sdk/pricing/parity/soak/` directories.
4. Revert additive flag in `featureFlags.ts`.
5. No database, runtime, or deployment changes to revert.

---

## Definition of Done

- [x] Health model operational
- [x] Certification operational
- [x] Trend analysis operational
- [x] Metrics generated
- [x] Telemetry operational
- [x] Feature flags OFF by default
- [x] No PricingSDK routing
- [x] No Event Platform wiring
- [x] Documentation complete
- [x] All tests passing (1228)

---

## Certification Checklist

| Item | Status |
|------|--------|
| PricingSDK unchanged | ✓ |
| DTOs unchanged | ✓ |
| Domain (PR-2) unchanged | ✓ |
| Repository unchanged | ✓ |
| Orchestration unchanged | ✓ |
| Facade unchanged | ✓ |
| PR-6 foundation unchanged | ✓ |
| PR-7 shadow projection unchanged | ✓ |
| PR-8 parity validation unchanged | ✓ |
| M1–M7 frozen | ✓ |
| No Firestore | ✓ |
| No runtime consumers | ✓ |
| Deterministic tests | ✓ |

---

**STOP — M8 PR-10 (Pricing Operational Validation) requires explicit ARB approval.**
