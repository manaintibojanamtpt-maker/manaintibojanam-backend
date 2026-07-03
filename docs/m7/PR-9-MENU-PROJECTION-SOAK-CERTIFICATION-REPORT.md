# M7 PR-9 — Menu Projection Soak & Certification Report

**Program:** BHOS-M7  
**PR:** M7 PR-9 — Menu Projection Soak & Certification  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-9 delivers **menu projection soak and certification** — evidence-only analysis over parity reports. Health scoring, readiness certification, trend analysis, and metrics are operational. **No MenuSDK routing, no adapter switch, no Firestore.** Feature flags remain **OFF** by default. MenuSDK continues reading legacy sources only.

---

## 2. Architecture

```
Parity Reports
        ↓
MenuProjectionSoakRunner
        ↓
MenuProjectionAnalyzer
        ↓
Certification Report
        ↓
STOP
```

---

## 3. Health Model

| Status | Meaning |
|--------|---------|
| `GREEN` | Parity ≥ 99%, field parity ≥ 99%, missing ≤ 1% |
| `AMBER` | Parity ≥ 95% but below green gates |
| `RED` | Below amber thresholds or insufficient sample |

---

## 4. Certification Rules

| Status | Gates |
|--------|-------|
| `READY` | GREEN health, parity ≥ 99%, field parity ≥ 99%, missing ≤ 1%, latency OK, no critical mismatches, sample ≥ minimum |
| `CONDITIONAL` | Parity ≥ 97% but not all READY gates |
| `NOT_READY` | RED health, insufficient sample, or critical mismatch |

**Critical outcomes:** `VERSION_MISMATCH`, `MISSING_IN_PROJECTION`

---

## 5. Trend Analysis

Compares early vs late parity windows:

| Direction | Condition |
|-----------|-----------|
| `IMPROVING` | Late parity > early + threshold |
| `STABLE` | Within threshold |
| `DEGRADING` | Late parity < early - threshold |

---

## 6. Metrics

| Metric | Description |
|--------|-------------|
| `totalComparisons` | Reports analyzed |
| `successfulComparisons` | MATCH outcomes |
| `parityPercent` | Match rate |
| `fieldParityPercent` | Non-field-mismatch rate |
| `missingPercent` | Combined missing rate |
| `averageLatencyMs` | Mean comparison duration |
| `p95LatencyMs` | 95th percentile latency |
| `mismatchDistribution` | Field-level mismatch counts |

---

## 7. Telemetry

| Event | When |
|-------|------|
| `menu_projection_soak_started` | Soak analysis begins |
| `menu_projection_soak_completed` | Soak analysis finishes |
| `menu_projection_soak_failed` | Load or gate failure |
| `menu_projection_readiness_generated` | Readiness computed |
| `menu_projection_certification_generated` | Certification computed |

---

## 8. Generated Files

### Domain — `src/domain/menu/parity/soak/`

| File | Purpose |
|------|---------|
| `MenuProjectionThresholds.ts` | Readiness gates + defaults |
| `MenuProjectionHealthScore.ts` | GREEN/AMBER/RED scoring |
| `MenuProjectionReadiness.ts` | READY/CONDITIONAL/NOT_READY |
| `MenuProjectionTrend.ts` | Trend analysis |
| `MenuProjectionCertificationRules.ts` | Full certification pipeline |

### SDK — `src/sdk/menu/parity/soak/`

| File | Purpose |
|------|---------|
| `menuProjectionSoakPorts.ts` | Report source + certification ports |
| `MenuProjectionSoakRunner.ts` | Soak orchestration |
| `MenuProjectionAnalyzer.ts` | Report → certification |
| `MenuProjectionMetrics.ts` | Metrics aggregation |
| `MenuProjectionCertification.ts` | In-memory certification store |
| `MenuProjectionTelemetry.ts` | Telemetry emitter |
| `MenuProjectionFactory.ts` | `createMenuProjectionSoakInfrastructure()` |

---

## 9. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Premature adapter switch | Evidence only; no routing |
| False READY from small samples | Configurable min sample size |
| Critical mismatch overlooked | VERSION_MISMATCH + MISSING_IN_PROJECTION block READY |

---

## 10. Rollback

1. Delete `src/domain/menu/parity/soak/` and `src/sdk/menu/parity/soak/`  
2. Revert `FF_MENU_PROJECTION_SOAK_ENABLED` from feature flags  
3. Remove test entries from `test:sdk`  

No frozen-layer behavioral changes to revert.

---

## 11. Migration Roadmap

| Phase | Action |
|-------|--------|
| PR-9 (this) | Soak & certification evidence |
| PR-10+ | Operational validation (blocked — ARB) |
| Future | Adapter switch only after certification + ARB |

---

## 12. Definition of Ready

- [x] M7 PR-1 through PR-8 complete  
- [x] Parity reports available as input  
- [x] Parity validation frozen  

---

## 13. Definition of Done

- [x] Health model operational  
- [x] Certification generated  
- [x] Trend analysis operational  
- [x] Metrics operational  
- [x] Telemetry operational  
- [x] Feature flags OFF by default  
- [x] No MenuSDK routing  
- [x] Tests mock repositories only  
- [x] Documentation complete  

---

## 14. Certification Checklist

- [x] Evidence only — no production behavior change  
- [x] MenuSDK still reads legacy  
- [x] READY / CONDITIONAL / NOT_READY verified  
- [x] GREEN / AMBER / RED verified  
- [x] Trend analysis verified  
- [x] Frozen layers untouched  
- [x] All tests passing  

**STOP.** Do not begin M7 PR-10 until explicit ARB approval.
