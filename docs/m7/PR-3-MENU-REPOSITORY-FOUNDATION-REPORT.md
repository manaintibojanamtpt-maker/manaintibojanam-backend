# M7 PR-3 — Menu Repository Foundation Report

**Program:** BHOS-M7  
**PR:** M7 PR-3 — Menu Repository Foundation  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-3 introduces the **menu repository persistence abstraction** — persistence models, `MenuPersistencePort`, record-to-DTO mapper, `MenuRepositoryAdapter`, stub repository, and factory resolution.

**Persistence abstraction only.** No Firestore implementation, no wiring into `createMenuSDK()`, no UI, no projections. Business rules remain in `src/domain/menu/`. Zero production impact.

---

## 2. Architecture

```
Presentation (future)
        ↓
MenuFacade (future)
        ↓
MenuSDK (contracts — unchanged)
        ↓
MenuRepository
        ↓
MenuPersistencePort (contract)
        ↓
Future Firestore Adapter (M7 PR-4+)
```

Repository owns **I/O and mapping only**. Domain validation is prohibited in the repository layer.

---

## 3. Repository Design

| Component | Responsibility |
|-----------|----------------|
| `MenuPersistencePort` | Raw persistence reads |
| `MenuRepositoryAdapter` | Port → `MenuRepository` + DTO mapping |
| `StubMenuRepository` | NOT_CONFIGURED fallback |
| `MenuRepositoryFactory` | Dependency injection resolution |
| `MenuRepositoryMapper` | Record → DTO transforms |

---

## 4. Persistence Models

| Record | Purpose |
|--------|---------|
| `MenuRecord` | Menu header |
| `CategoryRecord` | Category row |
| `MenuItemRecord` | Item row |
| `ModifierGroupRecord` | Modifier group row |
| `ModifierRecord` | Modifier row |
| `ComboRecord` | Combo row |
| `PriceRecord` | Price snapshot |
| `AvailabilityRecord` | Availability snapshot |
| `BranchOverrideRecord` | Branch override row |

Pure persistence shapes — no Firestore types.

---

## 5. Mapping Strategy

| Persistence | SDK DTO |
|-------------|---------|
| `MenuRecord` + categories + items | `Menu` |
| `CategoryRecord` | `MenuCategory` |
| `MenuItemRecord` | `MenuItem` |
| `ModifierGroupRecord` | `ModifierGroup` |
| `ComboRecord` | `Combo` |
| `MenuSearchRecordResult` | `MenuSearchResult` |

Structural filtering (active/inactive, sort order) is allowed. Business validation is not.

---

## 6. Dependency Injection

`createMenuRepository()` resolution priority:

1. Injected `MenuRepository`
2. `FF_MENU_ENABLED` ON + `MenuPersistencePort` → `MenuRepositoryAdapter`
3. `StubMenuRepository`

**Not wired into `createMenuSDK()`** — orchestration arrives in M7 PR-4.

---

## 7. Error Mapping

| Code | Handling |
|------|----------|
| `NOT_FOUND` | Pass through |
| `UNAVAILABLE` | Pass through |
| `NOT_CONFIGURED` | Pass through |
| `VALIDATION` | Pass through |
| Other | Map to `UNAVAILABLE` |

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Business logic in repository | Mapping/filtering only; domain unchanged |
| Accidental MenuSDK wiring | Factory standalone; createMenuSDK untouched |
| Firestore coupling | Port contract only; no adapter |
| Breaking frozen contracts | MenuRepository interface unchanged |

---

## 9. Rollback

1. Remove M7 PR-3 files under `src/sdk/menu/repository/` (new files only)
2. Revert `types/index.ts` repository exports
3. Remove tests and `docs/m7/PR-3-*`
4. No runtime impact

---

## 10. Migration Roadmap

| PR | Scope |
|----|-------|
| PR-3 (this PR) | Persistence port, mapper, adapter, stub, factory |
| PR-4 | Menu SDK orchestration (blocked — await ARB) |
| PR-5+ | Firestore persistence adapter |

---

## 11. Definition of Ready

- [x] M7 PR-1 MenuSDK foundation complete
- [x] M7 PR-2 Menu domain foundation complete
- [x] 811/811 baseline tests passing
- [x] MenuSDK contracts and domain frozen

---

## 12. Definition of Done

- [x] Repository abstraction exists
- [x] Persistence port exists (no implementation)
- [x] Mapper exists
- [x] Factory exists
- [x] Stub repository exists
- [x] Feature flags remain OFF (no new flags)
- [x] No MenuSDK wiring
- [x] No Firestore adapter
- [x] Deterministic mock-port tests
- [x] Documentation complete
- [x] M7 PR-4 not started

---

## STOP — PR-4 Prohibited

Do **not** begin M7 PR-4 (Menu SDK Orchestration) until explicit Architecture Review Board approval.
