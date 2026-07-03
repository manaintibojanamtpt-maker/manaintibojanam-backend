# M6 PR-11 — Order Read Adapter Layer Report

**Program:** BHOS-M6-A  
**PR:** M6 PR-11 — Order Read Adapter Layer  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval  
**Adapter Version:** `0.1.0-order-read-adapter`

---

## 1. Executive Summary

M6 PR-11 introduces an **order read adapter layer** capable of routing reads between legacy and projection repositories via `FF_ORDER_PROJECTION_ADAPTER_ENABLED`. The adapter is **not wired into production** `createOrderSDK` — legacy remains the default path.

Automatic fallback to legacy occurs when parity is not READY, operational validation is not GREEN, or the projection repository is unavailable.

**No public OrderSDK API changes. No Presentation changes. No production routing.**

---

## 2. Architecture

```
Presentation
  ↓
OrderSDK (unchanged public API)
  ↓
OrderReadAdapter (new — not wired by default)
  ├─ LegacyOrderAdapter → LegacyOrderRepositoryPort
  └─ ProjectionOrderAdapter → ProjectionOrderRepositoryPort
  ↓
OrderReadModel DTO (unchanged)
```

---

## 3. Routing Strategy

1. Evaluate `FF_ORDER_PROJECTION_ADAPTER_ENABLED`
2. Check parity READY via `OrderAdapterReadinessPort`
3. Check operational GREEN via `OrderAdapterReadinessPort`
4. Check projection repository availability
5. Route to projection if all gates pass; otherwise legacy
6. On projection read failure, automatic fallback to legacy

---

## 4. Fallback Rules

| Condition | Source | Fallback |
|-----------|--------|----------|
| Flag OFF | Legacy | No |
| Parity not READY | Legacy | Yes |
| Operational not GREEN | Legacy | Yes |
| Projection repo unavailable | Legacy | Yes |
| Projection read fails | Legacy | Yes |
| All gates pass | Projection | No |

---

## 5. Decision Matrix

| Flag | Parity | Operational | Repo | Source |
|------|--------|-------------|------|--------|
| OFF | * | * | * | Legacy |
| ON | NOT READY | * | * | Legacy (fallback) |
| ON | READY | NOT GREEN | * | Legacy (fallback) |
| ON | READY | GREEN | Unavailable | Legacy (fallback) |
| ON | READY | GREEN | Available | Projection |

---

## 6. Telemetry

| Event | When |
|-------|------|
| `order_adapter_started` | Read operation begins |
| `order_adapter_completed` | Read completes |
| `order_adapter_failed` | Validation or hard failure |
| `order_adapter_fallback` | Fallback to legacy triggered |
| `order_adapter_projection_selected` | Projection path chosen |
| `order_adapter_legacy_selected` | Legacy path chosen |

---

## 7. Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `FF_ORDER_PROJECTION_ADAPTER_ENABLED` | OFF | Enable projection read routing |

All existing EventSDK flags remain unchanged.

---

## 8. Generated Files

### SDK — `src/sdk/order/adapter/`

| File | Purpose |
|------|---------|
| `OrderReadAdapter.ts` | Main routing adapter |
| `LegacyOrderAdapter.ts` | Legacy repository delegation |
| `ProjectionOrderAdapter.ts` | Projection repository delegation |
| `OrderAdapterFactory.ts` | `createOrderReadAdapterInfrastructure()` |
| `OrderAdapterTelemetry.ts` | Telemetry hooks |
| `OrderAdapterValidation.ts` | Input validation |
| `mapProjectionToOrderReadModel.ts` | DTO normalization |
| `orderAdapterPorts.ts` | Port contracts |
| `orderAdapterFeatureFlags.ts` | Adapter flag |
| `README.md` | Module documentation |

### Domain — `src/domain/order/adapter/`

| File | Purpose |
|------|---------|
| `OrderAdapterDecision.ts` | Decision types |
| `OrderReadSource.ts` | Source enum |
| `OrderAdapterRules.ts` | Routing rules |
| `OrderAdapterMetadata.ts` | Constants |
| `README.md` | Domain documentation |

### Tests

| File | Tests |
|------|-------|
| `orderReadAdapter.test.ts` | 9 |
| `orderAdapterDomain.test.ts` | 7 |

---

## 9. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental production switch | Not wired into `createOrderSDK`; flag default OFF |
| OrderSDK API breakage | Public API unchanged; adapter is additive |
| Incomplete projection DTO | Normalization fills defaults; fallback on failure |
| Presentation exposure of source | Source never exposed to Presentation |

---

## 10. Rollback Plan

1. Keep `FF_ORDER_PROJECTION_ADAPTER_ENABLED` OFF (default)
2. Do not wire adapter into `createOrderSDK`
3. Legacy repository remains authoritative
4. Remove adapter imports if needed — no migration

---

## 11. Migration Roadmap

| Phase | PR | Status |
|-------|-----|--------|
| Operational validation | PR-10 ✅ | Complete |
| **Read adapter layer** | **PR-11 ✅** | **Complete** |
| Projection read rollout | PR-12 🔒 | ARB blocked |
| Production routing | Future | After 72h soak + rollout approval |

---

## 12. Definition of Ready

- [x] PR-10 operational validation available
- [x] PR-7 projection read model defined
- [x] OrderSDK read API frozen (ADR-013)
- [x] ARB scope approved for adapter layer only

---

## 13. Definition of Done

- [x] OrderSDK public API unchanged
- [x] Adapter introduced with routing capability
- [x] Legacy remains default
- [x] Projection path isolated behind gates
- [x] Automatic fallback works
- [x] `FF_ORDER_PROJECTION_ADAPTER_ENABLED` added (default OFF)
- [x] Deterministic tests with mock repositories
- [x] No production behavior changes
- [x] Documentation complete

---

## 14. Certification Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Not a production switch | ✅ |
| 2 | OrderSDK public API unchanged | ✅ |
| 3 | Presentation unchanged | ✅ |
| 4 | Legacy remains default | ✅ |
| 5 | Automatic fallback works | ✅ |
| 6 | Flag default OFF | ✅ |
| 7 | Source hidden from Presentation | ✅ |
| 8 | Deterministic tests pass | ✅ |
| 9 | Additive changes only | ✅ |
| 10 | Rollback-safe | ✅ |

---

**STOP.** Do not proceed to M6 PR-12 (Projection Read Rollout) until parity certified, operational GREEN, 72-hour staging soak, ARB approval, and explicit production rollout approval.
