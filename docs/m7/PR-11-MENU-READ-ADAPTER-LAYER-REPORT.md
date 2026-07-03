# M7 PR-11 — Menu Read Adapter Layer Report

**Program:** BHOS-M7  
**PR:** M7 PR-11 — Menu Read Adapter Layer  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-11 delivers a **standalone menu read adapter** capable of routing reads between the legacy repository and the shadow projection read model. The adapter evaluates routing gates, normalizes projection DTOs into existing Menu SDK DTOs, and automatically falls back to legacy on any projection failure.

**Not a production switch.** The adapter is **not wired into `createMenuSDK()`**. MenuSDK continues reading the legacy repository. Feature flag defaults OFF.

---

## 2. Architecture

```
Presentation
      │
      ▼
MenuSDK (unchanged)
      │
      ▼
Legacy Repository (authoritative)

Standalone (not wired):
Menu Read Adapter
      │
 ┌────┴──────────┐
 │               │
Legacy      Projection
Repository   Repository
```

Presentation never knows which source the standalone adapter would use.

---

## 3. Routing Decision Matrix

| Condition | Source |
|-----------|--------|
| `FF_MENU_PROJECTION_ADAPTER_ENABLED` OFF | Legacy |
| Projection soak not READY | Legacy (fallback) |
| Operational validation not GREEN | Legacy (fallback) |
| Projection repository unhealthy | Legacy (fallback) |
| All gates pass | Projection |

---

## 4. Fallback Strategy

| Failure | Action |
|---------|--------|
| Projection unavailable | Legacy |
| Projection timeout | Legacy |
| Validation failure | Legacy |
| NOT_FOUND | Legacy |
| Repository failure | Legacy |
| Mapper failure | Legacy |

The adapter never throws due to projection path failure.

---

## 5. Telemetry

| Event | When |
|-------|------|
| `menu_adapter_started` | Read begins |
| `menu_adapter_completed` | Read succeeds |
| `menu_adapter_failed` | Validation or hard failure |
| `menu_adapter_projection_selected` | Projection path chosen |
| `menu_adapter_legacy_selected` | Legacy path chosen |
| `menu_adapter_fallback` | Fallback triggered |

---

## 6. Feature Flag

| Flag | Default | Env Key |
|------|---------|---------|
| `FF_MENU_PROJECTION_ADAPTER_ENABLED` | OFF | `VITE_FF_MENU_PROJECTION_ADAPTER_ENABLED` |

Separate from MenuSDK flags — additive adapter module only.

---

## 7. Generated Files

### SDK — `src/sdk/menu/adapter/`

| File | Purpose |
|------|---------|
| `MenuReadAdapter.ts` | Main router with fallback |
| `LegacyMenuAdapter.ts` | Legacy delegate |
| `ProjectionMenuAdapter.ts` | Projection delegate + normalization |
| `mapProjectionToMenuDto.ts` | Projection → Menu DTO mapper |
| `MenuAdapterFactory.ts` | `createMenuAdapterInfrastructure()` |
| `MenuAdapterValidation.ts` | tenantId, branchId, catalogId, query validation |
| `MenuAdapterTelemetry.ts` | Adapter telemetry |
| `menuAdapterPorts.ts` | Port contracts |
| `menuAdapterFeatureFlags.ts` | Adapter feature flag |
| `README.md` | Module documentation |

### Domain — `src/domain/menu/adapter/`

| File | Purpose |
|------|---------|
| `MenuAdapterDecision.ts` | Decision types |
| `MenuReadSource.ts` | `'legacy' \| 'projection'` |
| `MenuAdapterRules.ts` | `decideMenuReadSource()` |
| `MenuAdapterMetadata.ts` | Version + fallback reasons |
| `README.md` | Domain documentation |

### Tests

| File | Tests |
|------|-------|
| `menuReadAdapter.test.ts` | 13 |
| `menuAdapterDomain.test.ts` | 8 |

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental production switch | Not wired into `createMenuSDK()` |
| MenuSDK API regression | No public contract changes |
| False projection confidence | Four-gate routing + automatic fallback |
| Presentation source leakage | Normalized Menu DTOs only; no source metadata in responses |
| Frozen layer regression | PR-1–PR-10 untouched |

---

## 9. Rollback Plan

1. Keep `FF_MENU_PROJECTION_ADAPTER_ENABLED` OFF (default)
2. No MenuSDK wiring — zero production impact
3. Remove adapter module if needed (fully additive)
4. Legacy remains authoritative read source

---

## 10. Migration Roadmap

| Phase | PR | Status |
|-------|-----|--------|
| Menu operational validation | PR-10 ✅ | Complete |
| **Menu read adapter layer** | **PR-11 ✅** | **Complete** |
| Controlled projection rollout | PR-12 🔒 | ARB blocked |
| Production routing | Future | Explicit approval required |

---

## 11. Definition of Ready

- [x] PR-10 operational validation available
- [x] Projection read model defined (PR-7)
- [x] Routing gates agreed (READY + GREEN + healthy)
- [x] ARB scope approved for standalone adapter only

---

## 12. Definition of Done

- [x] Standalone adapter infrastructure created
- [x] Automatic fallback to legacy operational
- [x] Projection normalization into existing Menu DTOs
- [x] Telemetry operational
- [x] `FF_MENU_PROJECTION_ADAPTER_ENABLED` added (default OFF)
- [x] Mock-based deterministic tests pass
- [x] No MenuSDK wiring
- [x] No production behavior changes
- [x] Frozen platforms untouched

---

## 13. Certification Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Not wired into createMenuSDK() | ✅ |
| 2 | MenuSDK public API unchanged | ✅ |
| 3 | MenuFacade unchanged | ✅ |
| 4 | PR-6–PR-10 unchanged | ✅ |
| 5 | No Firestore / runtime wiring | ✅ |
| 6 | Flag default OFF | ✅ |
| 7 | Fallback on all projection failures | ✅ |
| 8 | Presentation source opaque | ✅ |
| 9 | Deterministic tests pass | ✅ |
| 10 | Additive + rollback-safe | ✅ |

---

**STOP.** Do not proceed to M7 PR-12 (Controlled Menu Projection Rollout) until ARB approval.
