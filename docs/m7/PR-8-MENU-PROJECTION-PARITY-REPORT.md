# M7 PR-8 — Menu Projection Parity Validation Report

**Program:** BHOS-M7  
**PR:** M7 PR-8 — Menu Projection Parity Validation  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-8 delivers **catalog-centric parity validation** between legacy menu repository reads and shadow projection read models. Canonical comparison, parity reports, and statistics are operational — **validation only**. No MenuSDK routing switch, no adapter switch, no Firestore, no Event Platform wiring.

Feature flags `FF_MENU_PROJECTION_ENABLED` and `FF_MENU_PROJECTION_PARITY_ENABLED` remain **OFF** by default. MenuSDK continues to read legacy sources only.

---

## 2. Architecture

```
Legacy Menu Repository
        │
        ▼
MenuParityMapper → Canonical Catalog Model
        ▲
        │
Projection Repository
        │
        ▼
MenuParityComparator → Parity Report → STOP
```

---

## 3. Canonical Model

| Field | Compared |
|-------|----------|
| `catalogId` | Yes |
| `tenantId` | Yes |
| `branchId` | Yes |
| `catalogVersion` | Yes (version mismatch category) |
| `status` | Yes |
| `categoryCount` | Yes |
| `itemCount` | Yes |
| `modifierGroupCount` | Yes |
| `comboCount` | Yes |
| `updatedAt` | Yes |

**Ignored:** `projectionVersion`, snapshot metadata, telemetry, checkpoint IDs.

---

## 4. Comparison Rules

| Outcome | Condition |
|---------|-----------|
| `MATCH` | All comparable fields equal |
| `FIELD_MISMATCH` | Non-version field drift |
| `VERSION_MISMATCH` | `catalogVersion` differs |
| `MISSING_IN_PROJECTION` | Legacy present, projection absent |
| `MISSING_IN_LEGACY` | Projection present, legacy absent |
| `UNSUPPORTED` | Both sources absent |

Read-only — neither side is mutated.

---

## 5. Statistics

| Metric | Description |
|--------|-------------|
| `totalCompared` | Total comparisons run |
| `matchPercent` | Match rate |
| `fieldParityPercent` | Field-level parity rate |
| `missingPercent` | Missing source rate |
| Mismatch counters | By outcome category |
| `averageComparisonDurationMs` | Mean comparison duration |

---

## 6. Telemetry

| Event | When |
|-------|------|
| `menu_parity_started` | Comparison begins |
| `menu_parity_completed` | Comparison finishes |
| `menu_parity_failed` | Load/validation failure |
| `menu_parity_match` | Outcome is `MATCH` |
| `menu_parity_mismatch` | Outcome is not `MATCH` |

---

## 7. Generated Files

### Domain — `src/domain/menu/parity/`

| File | Purpose |
|------|---------|
| `MenuCanonicalModel.ts` | Canonical catalog model + legacy document type |
| `MenuParityRules.ts` | Comparison rules |
| `MenuParityDifference.ts` | Field diff records |
| `MenuParityStatistics.ts` | Counters + summary percentages |
| `MenuParityResult.ts` | Outcome types + report record |

### SDK — `src/sdk/menu/parity/`

| File | Purpose |
|------|---------|
| `menuParityPorts.ts` | Legacy/projection/report ports |
| `MenuParityMapper.ts` | Source → canonical mapper |
| `MenuParityComparator.ts` | Comparison orchestration |
| `MenuParityValidator.ts` | Input validation |
| `MenuParityReport.ts` | In-memory report repository |
| `MenuParityTelemetry.ts` | Telemetry emitter |
| `MenuParityFactory.ts` | `createMenuParityInfrastructure()` |

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental MenuSDK routing | No SDK integration in this PR |
| Port name collision | Separate `parity/` module |
| False confidence from in-memory ports | Test-only; Firestore deferred |
| Flag accidentally ON | Dual gate; both default OFF |

---

## 9. Rollback

1. Delete `src/domain/menu/parity/` and `src/sdk/menu/parity/`  
2. Revert `FF_MENU_PROJECTION_PARITY_ENABLED` from feature flags  
3. Remove test entries from `test:sdk`  

No frozen-layer behavioral changes to revert.

---

## 10. Migration Roadmap

| Phase | Action |
|-------|--------|
| PR-8 (this) | Parity validation foundation |
| PR-9+ | Soak & certification (blocked — ARB) |
| Future | Adapter switch only after certification |

---

## 11. Definition of Ready

- [x] M7 PR-1 through PR-7 complete  
- [x] Shadow projection read model defined  
- [x] Legacy catalog document shape defined  

---

## 12. Definition of Done

- [x] Canonical comparison operational  
- [x] Parity reports generated  
- [x] Statistics with percentages generated  
- [x] Telemetry operational  
- [x] Feature flags OFF by default  
- [x] No MenuSDK routing  
- [x] Tests mock repositories only  
- [x] Documentation complete  

---

## 13. Certification Checklist

- [x] Validation only — no production behavior change  
- [x] MenuSDK still reads legacy  
- [x] Catalog-centric canonical model  
- [x] All outcome codes verified  
- [x] No frozen layer modifications (shadow projection untouched)  
- [x] All tests passing  

**STOP.** Do not begin M7 PR-9 until explicit ARB approval.
