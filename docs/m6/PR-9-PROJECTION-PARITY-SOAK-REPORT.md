# M6 PR-9 — Projection Parity Soak & Readiness Certification Report

**Program:** BHOS-M6-A  
**PR:** M6 PR-9 — Projection Parity Soak & Readiness Certification  
**Date:** 2026-06-26  
**Status:** Complete — awaiting ARB approval  
**SDK Version:** `0.9.0-projection-soak`

---

## 1. Executive Summary

M6 PR-9 delivers **projection parity soak and readiness certification infrastructure** that consumes parity reports over time, aggregates metrics, calculates health scores, and generates certification recommendations.

**Certification only.** OrderSDK continues reading the legacy source. No adapter switch, no production routing, no Firestore migration, no runtime consumers. Hexa flag gate defaults OFF.

---

## 2. Architecture

```
Legacy Orders
  ↓
Parity Validator (PR-8)
  ↓
Parity Reports
  ↓
Parity Statistics
  ↓
ProjectionParitySoakRunner
  ↓
ProjectionParityAnalyzer
  ↓
Certification Report
  ↓
STOP
```

---

## 3. Metrics

| Metric | Description |
|--------|-------------|
| `totalComparisons` | Reports analyzed |
| `successfulComparisons` | MATCH outcomes |
| `fieldMismatches` | FIELD_MISMATCH count |
| `missingProjections` | MISSING_IN_PROJECTION count |
| `missingLegacy` | MISSING_IN_LEGACY count |
| `versionMismatches` | VERSION_MISMATCH count |
| `unsupportedEvents` | UNSUPPORTED_EVENT count |
| `averageLatencyMs` | Mean comparison latency |
| `p95LatencyMs` | 95th percentile latency |
| `parityPercent` | MATCH / total × 100 |
| `fieldParityPercent` | Non-field-mismatch / total × 100 |
| `missingProjectionPercent` | Missing projection / total × 100 |
| `missingLegacyPercent` | Missing legacy / total × 100 |
| `mismatchDistribution` | Field-level mismatch counts |

---

## 4. Health Score

| Status | Criteria |
|--------|----------|
| `GREEN` | Parity ≥ 99%, missing projection ≤ 1%, missing legacy ≤ 0.5%, field mismatch ≤ 2% |
| `AMBER` | Parity ≥ 95% but below GREEN thresholds |
| `RED` | Parity < 95% or critical threshold breaches |

Score = parity % minus configurable penalties (sample size, latency, mismatches).

---

## 5. Certification Rules

| Certification | Criteria |
|---------------|----------|
| `READY` | GREEN health, parity ≥ 99.5%, sample ≥ 10, P95 latency ≤ 500ms |
| `CONDITIONAL` | Parity ≥ 97% but not READY |
| `NOT_READY` | RED health, insufficient sample, or parity below conditional threshold |

Thresholds are configurable via `ParitySoakThresholds`.

---

## 6. Readiness Matrix

| Health | Certification | Action |
|--------|---------------|--------|
| GREEN | READY | Eligible for ARB review — no auto switch |
| GREEN | CONDITIONAL | Remediate gaps before ARB |
| AMBER | CONDITIONAL | Continue soak, investigate mismatches |
| AMBER | NOT_READY | Blocked — expand sample / fix drift |
| RED | NOT_READY | Blocked — remediate before re-certification |

---

## 7. Telemetry

| Event | When |
|-------|------|
| `projection_soak_started` | Soak analysis begins |
| `projection_soak_completed` | Soak analysis finishes |
| `projection_soak_failed` | Load or validation failure |
| `projection_readiness_generated` | Readiness score computed |
| `projection_certification_generated` | Certification report produced |

---

## 8. Feature Flags

| Flag | Default | Required |
|------|---------|----------|
| `FF_EVENT_PLATFORM_ENABLED` | OFF | Yes |
| `FF_EVENT_PROJECTION_ENABLED` | OFF | Yes |
| `FF_EVENT_PROJECTION_RUNTIME_ENABLED` | OFF | Yes |
| `FF_ORDER_READ_PROJECTION_ENABLED` | OFF | Yes |
| `FF_ORDER_PROJECTION_PARITY_ENABLED` | OFF | Yes |
| `FF_ORDER_PROJECTION_SOAK_ENABLED` | OFF | Yes |

---

## 9. Generated Files

### SDK — `src/sdk/events/parity/soak/`

| File | Purpose |
|------|---------|
| `ProjectionParitySoakRunner.ts` | Soak orchestration |
| `ProjectionParityAnalyzer.ts` | Health + certification analysis |
| `ProjectionParityMetrics.ts` | Metrics aggregation |
| `ProjectionParityCertification.ts` | In-memory certification repository |
| `ProjectionParityTelemetry.ts` | Telemetry hooks |
| `ProjectionParityFactory.ts` | `createProjectionParitySoakInfrastructure()` |
| `README.md` | Module documentation |

### Domain — `src/domain/events/parity/soak/`

| File | Purpose |
|------|---------|
| `ParityCertificationRules.ts` | Metrics, health, certification logic |
| `ParityHealthScore.ts` | Health score types |
| `ParityReadiness.ts` | Readiness + recommendation |
| `ParityTrend.ts` | Trend analysis |
| `ParityThresholds.ts` | Configurable thresholds |
| `README.md` | Domain documentation |

### Ports — `src/sdk/events/contracts/paritySoakPorts.ts`

`ParitySoakReportSourcePort`, `ParityCertificationRepositoryPort`

### Tests

| File | Tests |
|------|-------|
| `eventSdkProjectionParitySoak.test.ts` | 11 |
| `paritySoakDomain.test.ts` | 11 |

---

## 10. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Premature adapter switch | No OrderSDK changes; certification only |
| False READY confidence | Configurable thresholds; min sample size |
| Production impact | Hexa flag gate; all flags default OFF |
| Parity framework modification | Additive soak layer only; PR-8 untouched |
| Firestore migration pressure | In-memory repositories only |

---

## 11. Rollback Plan

1. Disable `FF_ORDER_PROJECTION_SOAK_ENABLED` (default OFF)
2. No data migration — in-memory certification store only
3. OrderSDK unaffected
4. Revert SDK version to `0.8.0-order-parity` if needed

---

## 12. Migration Roadmap

| Phase | PR | Status |
|-------|-----|--------|
| Parity validation | PR-8 ✅ | Complete |
| **Parity soak & certification** | **PR-9 ✅** | **Complete** |
| OrderSDK adapter switch | PR-10 🔒 | ARB + soak + staging blocked |
| Production routing | Future | After explicit rollout approval |

---

## 13. Definition of Ready

- [x] PR-8 parity reports and statistics available
- [x] Certification thresholds defined
- [x] Health and readiness models agreed
- [x] ARB scope approved for soak/certification only

---

## 14. Definition of Done

- [x] Parity metrics generated from reports
- [x] Readiness score generated (GREEN/AMBER/RED)
- [x] Certification report generated (READY/CONDITIONAL/NOT_READY)
- [x] `FF_ORDER_PROJECTION_SOAK_ENABLED` added (default OFF)
- [x] Hexa flag gate enforced
- [x] Telemetry events emitted
- [x] Deterministic tests with mock repositories
- [x] No production behavior changes
- [x] SDK version bumped to `0.9.0-projection-soak`

---

## 15. Certification Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Certification only — no adapter switch | ✅ |
| 2 | OrderSDK unchanged | ✅ |
| 3 | Parity framework unchanged | ✅ |
| 4 | No Firestore migration | ✅ |
| 5 | No runtime wiring | ✅ |
| 6 | All flags default OFF | ✅ |
| 7 | Metrics + readiness + certification generated | ✅ |
| 8 | Deterministic tests pass | ✅ |
| 9 | Additive changes only | ✅ |
| 10 | Rollback-safe | ✅ |

---

**STOP.** Do not proceed to M6 PR-10 (OrderSDK Projection Adapter Switch) without successful parity soak, ARB approval, staging validation, and explicit production rollout approval.
