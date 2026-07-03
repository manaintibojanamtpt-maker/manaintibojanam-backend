# M7 PR-7 — First Menu Shadow Projection Report

**Program:** BHOS-M7  
**PR:** M7 PR-7 — First Menu Shadow Projection  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-7 delivers the **first catalog-centric menu shadow projection** — a `MenuProjectionWorker` that consumes future menu catalog events via **mock envelopes only**. The projection root is the **Catalog Aggregate** with metadata and counts only.

**No Event Platform wiring. No MenuSDK routing. No Firestore. No runtime consumers.** Feature flag `FF_MENU_PROJECTION_ENABLED` remains **OFF** by default.

---

## 2. Architecture

```
Future Menu Events (mock only)
        ↓
MenuProjectionWorker
        ↓
MenuProjectionRepository (read model)
        ↓
MenuProjectionSnapshot
        ↓
STOP
```

Distinct from M7 PR-6 infrastructure (`src/sdk/menu/projection/`) which handles coordinator/checkpoint metadata only.

---

## 3. Projection Lifecycle

1. **Gate** — `FF_MENU_PROJECTION_ENABLED` → `NOT_CONFIGURED` if OFF  
2. **Validate envelope** — supported event type + correlationId  
3. **Validate transition** — create/update/delete rules  
4. **Load existing** — catalog-centric read model by `catalogId`  
5. **Apply builder** — pure domain state transition  
6. **Validate projection** — read model + forbidden field guards  
7. **Persist** — repository + snapshot metadata  
8. **Telemetry** — started → processed → completed / failed  
9. **Return** — `{ applied: true | false }` — never throws  

---

## 4. Read Model Definition

Catalog-centric aggregate root (`MenuCatalogProjectionReadModel`):

| Field | Purpose |
|-------|---------|
| `catalogId` | Aggregate identity |
| `tenantId` | Tenant scope |
| `branchId` | Optional branch scope |
| `catalogVersion` | Immutable catalog version cursor |
| `status` | Catalog lifecycle status |
| `categoryCount` | Category cardinality |
| `itemCount` | Item cardinality |
| `modifierGroupCount` | Modifier group cardinality |
| `comboCount` | Combo cardinality |
| `updatedAt` | Last projection update |
| `projectionVersion` | Shadow projection version |

**Excluded:** pricing, inventory, search index, branch overrides, item/category payloads.

---

## 5. Supported Events

Schema definitions only — no publishers:

| Event | Transition |
|-------|------------|
| `menu.catalog.created.v1` | Create catalog read model |
| `menu.catalog.updated.v1` | Update counts/version (requires existing) |
| `menu.catalog.deleted.v1` | Mark deleted (requires existing) |

---

## 6. Telemetry

| Event | When |
|-------|------|
| `menu_projection_started` | Processing begins |
| `menu_projection_processed` | Event applied successfully |
| `menu_projection_completed` | Full flow completed |
| `menu_projection_failed` | Validation or persistence failure |
| `menu_projection_snapshot_saved` | Snapshot persisted |

---

## 7. Generated Files

### Domain — `src/domain/menu/projections/menu/`

| File | Purpose |
|------|---------|
| `MenuProjectionMetadata.ts` | Event types, payload schemas, identity |
| `MenuProjectionState.ts` | Read model + snapshot record |
| `MenuProjectionBuilders.ts` | Pure state transitions |
| `MenuProjectionValidation.ts` | Validators + forbidden field guards |
| `README.md` | Domain docs |

### SDK — `src/sdk/menu/projections/menu/`

| File | Purpose |
|------|---------|
| `menuProjectionPorts.ts` | Repository, snapshot, worker ports |
| `MenuProjectionWorker.ts` | Shadow worker |
| `MenuProjectionMapper.ts` | Envelope → read model |
| `MenuProjectionRepository.ts` | In-memory read model store |
| `MenuProjectionSnapshot.ts` | Snapshot store |
| `MenuProjectionValidator.ts` | SDK validation wrapper |
| `MenuProjectionTelemetry.ts` | Telemetry emitter |
| `createMenuProjectionWorker.ts` | Factories |
| `README.md` | Module docs |

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Port name collision with PR-6 | Separate module paths (`projection/` vs `projections/menu/`) |
| Premature MenuSDK routing | No SDK integration in this PR |
| Event Platform coupling | Custom `MenuProjectionEnvelope` — no EventSDK imports |
| Catalog vs item-centric drift | Catalog aggregate root from day one |

---

## 9. Rollback

1. Delete `src/domain/menu/projections/menu/` and `src/sdk/menu/projections/menu/`  
2. Remove test entries from `test:sdk`  
3. No frozen-layer changes to revert  

---

## 10. Migration Roadmap

| Phase | Action |
|-------|--------|
| PR-7 (this) | First shadow projection + read model |
| PR-8+ | Parity validation (blocked — ARB) |
| Future | Event publishers, worker wiring, Firestore, MenuSDK read switch |

---

## 11. Definition of Ready

- [x] M7 PR-1 through PR-6 complete  
- [x] Projection infrastructure foundation (PR-6)  
- [x] `FF_MENU_PROJECTION_ENABLED` declared  

---

## 12. Definition of Done

- [x] First shadow menu projection exists  
- [x] Read model stores catalog-centric metadata/counts  
- [x] Snapshot metadata persists  
- [x] Telemetry operational  
- [x] Feature flag OFF by default  
- [x] No MenuSDK integration  
- [x] No Event Platform wiring  
- [x] Tests mock envelopes only  
- [x] Documentation complete  

---

## 13. Certification Checklist

- [x] Shadow projection only — no production wiring  
- [x] Catalog-centric aggregate root  
- [x] Supported events defined (no publishers)  
- [x] Repository + snapshot persistence verified  
- [x] No frozen layer modifications  
- [x] All tests passing  

**STOP.** Do not begin M7 PR-8 until explicit ARB approval.
