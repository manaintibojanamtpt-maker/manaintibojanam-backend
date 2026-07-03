# M6 PR-8 — Order Projection Parity Validation Report

**Program:** BHOS-M6-A  
**PR:** M6 PR-8 — Order Projection Parity Validation  
**Date:** 2026-06-26  
**Status:** Complete — awaiting ARB approval  
**SDK Version:** `0.8.0-order-parity`

---

## 1. Executive Summary

M6 PR-8 delivers **order projection parity validation infrastructure** that compares legacy order documents against shadow projection read models. Both sources are normalized into a canonical view and compared field-by-field without modifying either model.

**Validation only.** OrderSDK continues reading the legacy source. No adapter switch, no production routing, no Firestore migration, no runtime consumers. Penta flag gate defaults OFF.

---

## 2. Architecture

```
Legacy Order Document
  ↓
OrderParityMapper (legacy)
  ↓
Canonical Legacy View
                    ╲
                     ╲
Projection Read Model
  ↓
OrderParityMapper (projection)
  ↓
Canonical Projection View
  ↓
OrderParityComparator
  ↓
OrderParityReport
  ↓
STOP — OrderSDK reads legacy source
```

---

## 3. Parity Algorithm

```
1. Check penta flag gate (all five flags required)
2. Validate orderId
3. Load legacy order via LegacyOrderReadPort
4. Load projection read model via ProjectionOrderReadPort
5. Map both to OrderCanonicalModel (ignore metadata)
6. Compare business fields via domain rules
7. Resolve outcome (MATCH | MISSING_* | FIELD_MISMATCH | VERSION_MISMATCH)
8. Optionally persist OrderParityReportRecord
9. Accumulate OrderParityStatistics
10. Emit telemetry
```

---

## 4. Canonical Mapping

| Field | Legacy Source | Projection Source |
|-------|---------------|-------------------|
| `orderId` | `order.id` | `readModel.orderId` |
| `tenantId` | `order.tenantId` | `readModel.tenantId` |
| `status` | Normalized `order.status` | Normalized `readModel.status` |
| `branchId` | Optional metadata | `readModel.branchId` |
| `customerId` | `order.userId` | `readModel.customerId` |
| `currency` | Default `INR` | `readModel.currency` |
| `totalAmount` | `order.totalAmount` | `readModel.totalAmount` |
| `createdAt` | Resolved timestamp | `readModel.createdAt` |
| `updatedAt` | Resolved timestamp | `readModel.updatedAt` |
| `version` | `ORDER_PAYLOAD_VERSION` | `readModel.version` |
| `lineItems` | `order.items` | Empty (PR-7 scope) |

**Ignored:** `projectionVersion`, snapshot IDs, telemetry, checkpoint metadata.

---

## 5. Difference Categories

| Outcome | Meaning |
|---------|---------|
| `MATCH` | All comparable fields identical |
| `MISSING_IN_PROJECTION` | Legacy exists, projection absent |
| `MISSING_IN_LEGACY` | Projection exists, legacy absent |
| `FIELD_MISMATCH` | One or more business fields differ |
| `VERSION_MISMATCH` | Schema version differs |
| `UNSUPPORTED_EVENT` | Neither source available |

---

## 6. Statistics

| Metric | Tracked |
|--------|---------|
| `totalCompared` | Total parity runs |
| `matched` | MATCH outcomes |
| `mismatched` | Non-match outcomes |
| `missingInProjection` | Projection gaps |
| `missingInLegacy` | Legacy gaps |
| `versionMismatches` | Version drift |
| `fieldMismatches` | Field drift |
| `unsupportedEvents` | Invalid comparisons |

---

## 7. Telemetry

| Event | When |
|-------|------|
| `order_parity_started` | Comparison begins |
| `order_parity_completed` | Comparison finishes |
| `order_parity_failed` | Load or validation failure |
| `order_parity_match` | Outcome is MATCH |
| `order_parity_mismatch` | Outcome is not MATCH |

---

## 8. Feature Flags

| Flag | Default | Required |
|------|---------|----------|
| `FF_EVENT_PLATFORM_ENABLED` | OFF | Yes |
| `FF_EVENT_PROJECTION_ENABLED` | OFF | Yes |
| `FF_EVENT_PROJECTION_RUNTIME_ENABLED` | OFF | Yes |
| `FF_ORDER_READ_PROJECTION_ENABLED` | OFF | Yes |
| `FF_ORDER_PROJECTION_PARITY_ENABLED` | OFF | Yes |

---

## 9. Generated Files

### SDK — `src/sdk/events/parity/order/`

| File | Purpose |
|------|---------|
| `OrderParityValidator.ts` | Input validation |
| `OrderParityComparator.ts` | Load, map, compare orchestration |
| `OrderParityMapper.ts` | Legacy/projection → canonical |
| `OrderParityReport.ts` | In-memory report repository |
| `OrderParityTelemetry.ts` | Telemetry hooks |
| `OrderParityFactory.ts` | Infrastructure wiring |
| `README.md` | Module documentation |

### Domain — `src/domain/events/parity/order/`

| File | Purpose |
|------|---------|
| `OrderCanonicalModel.ts` | Canonical types + normalization |
| `OrderParityRules.ts` | Comparison rules and comparator |
| `OrderParityResult.ts` | Outcome types |
| `OrderParityDifference.ts` | Field-level differences |
| `OrderParityStatistics.ts` | Aggregate statistics |
| `README.md` | Domain documentation |

### Ports — `src/sdk/events/contracts/orderParityPorts.ts`

`LegacyOrderReadPort`, `ProjectionOrderReadPort`, `ParityReportRepositoryPort`

### Tests

| File | Tests |
|------|-------|
| `eventSdkOrderParity.test.ts` | 12 |
| `orderParityDomain.test.ts` | 11 |

---

## 10. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Premature adapter switch | No OrderSDK changes; validation only |
| False MATCH confidence | Line items not in PR-7 projection — reported as FIELD_MISMATCH |
| Production impact | Penta flag gate; all flags default OFF |
| Model mutation | Comparator is read-only |
| Firestore migration pressure | In-memory ports only |

---

## 11. Rollback Plan

1. Disable `FF_ORDER_PROJECTION_PARITY_ENABLED` (default OFF)
2. No data migration — in-memory reports only
3. OrderSDK unaffected
4. Revert SDK version to `0.7.0-order-projection` if needed

---

## 12. Migration Roadmap

| Phase | PR | Status |
|-------|-----|--------|
| Shadow read model | PR-7 ✅ | Complete |
| **Parity validation** | **PR-8 ✅** | **Complete** |
| OrderSDK adapter switch | PR-9 🔒 | ARB blocked |
| Production routing | Future | After parity proven |

---

## 13. Definition of Ready

- [x] PR-7 order read projection available
- [x] Legacy order document shape defined in domain
- [x] Canonical comparison fields agreed
- [x] ARB scope approved for validation only

---

## 14. Definition of Done

- [x] Parity infrastructure exists
- [x] Canonical comparator implemented
- [x] Reports generated and persisted (in-memory)
- [x] Statistics generated
- [x] Penta flag gate enforced
- [x] Telemetry events emitted
- [x] Deterministic tests with mock repositories
- [x] No production behavior changes
- [x] SDK version bumped to `0.8.0-order-parity`

---

## 15. Certification Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Validation only — no adapter switch | ✅ |
| 2 | OrderSDK unchanged | ✅ |
| 3 | No Firestore migration | ✅ |
| 4 | No runtime wiring | ✅ |
| 5 | No production consumers | ✅ |
| 6 | All flags default OFF | ✅ |
| 7 | Neither model mutated | ✅ |
| 8 | Deterministic tests pass | ✅ |
| 9 | Additive changes only | ✅ |
| 10 | Rollback-safe | ✅ |

---

**STOP.** Do not proceed to M6 PR-9 (OrderSDK Projection Adapter) without explicit ARB approval and successful parity validation.
