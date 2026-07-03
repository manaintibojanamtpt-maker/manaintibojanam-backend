# M7 PR-4 — Menu SDK Orchestration Report

**Program:** BHOS-M7  
**PR:** M7 PR-4 — Menu SDK Orchestration  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-4 wires **MenuSDK orchestration** — `DefaultMenuAdapter` delegates to `MenuSdkOrchestrator`, which coordinates repository reads, domain validation, DTO mapping, error mapping, and telemetry.

`createMenuSDK()` now selects stub vs orchestrated default adapter. **No Firestore, no UI, no MenuFacade, no runtime consumers.** Feature flag remains OFF by default.

---

## 2. Architecture

```
Presentation (future)
        ↓
MenuFacade (future — PR-5)
        ↓
MenuSDK
        ↓
DefaultMenuAdapter
        ↓
MenuSdkOrchestrator
        ↓
MenuRepository → Domain Validation → DTO
```

---

## 3. SDK Flow

1. **SDK structural validation** (`validateMenuQuery`, etc.)
2. **Repository read** via `MenuRepository`
3. **Domain validation** (`MenuDomainValidator`, `ItemValidator`, etc.)
4. **DTO return** (no business logic in orchestrator)

`validateMenu` uses sync `syncCatalogResolver` (branch SDK pattern) because the public contract is synchronous.

---

## 4. Repository Integration

- Uses `createMenuRepository()` from M7 PR-3
- `repositoryEnabled` when `menuRepository` or `persistencePort` injected
- Without injection: orchestrator returns `UNAVAILABLE` (not production routing)
- Mock repositories only in tests

---

## 5. Domain Integration

Reuses frozen domain validators:

- `MenuDomainValidator`
- `CategoryValidator`
- `ItemValidator`
- `ComboValidator`

`MenuDomainMapper` handles DTO ↔ domain structural mapping only.

---

## 6. Error Mapping

| Source | SDK Code |
|--------|----------|
| Repository `NOT_FOUND` | `NOT_FOUND` |
| Repository `UNAVAILABLE` | `UNAVAILABLE` |
| Repository `NOT_CONFIGURED` | `NOT_CONFIGURED` |
| Domain validation failure | `VALIDATION` |
| Repository disabled | `UNAVAILABLE` |

---

## 7. Telemetry

| Event | When |
|-------|------|
| `menu_request` | Method invoked |
| `repository_read` | Before repository call |
| `validation_completed` | After SDK/domain validation |
| `menu_success` | Successful completion |
| `menu_failure` | Error path |

---

## 8. Factory Resolution

```
createMenuSDK()
  1. Injected menuSdk
  2. FF_MENU_ENABLED ON → DefaultMenuAdapter (orchestrated)
  3. Else → StubMenuAdapter
```

Public `createMenuSDK` signature unchanged. `CreateMenuSDKOptions` extended additively (`menuSdk`, `onTelemetry`, `persistencePort`, `syncCatalogResolver`).

---

## 9. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Business logic in SDK layer | Domain validators only; mapper is structural |
| Accidental production routing | Flag default OFF; repository requires injection |
| Contract breakage | MenuSDK interface unchanged |
| Domain duplication | Reuses M7 PR-2 validators |

---

## 10. Rollback

1. Revert `factory/createMenuSDK.ts` to stub-only wiring
2. Remove `src/sdk/menu/orchestration/`
3. Restore `adapters/DefaultMenuAdapter.ts` placeholder
4. Revert tests and docs

---

## 11. Migration Roadmap

| PR | Scope |
|----|-------|
| PR-4 (this PR) | SDK orchestration |
| PR-5 | MenuFacade & Presentation (blocked) |
| PR-6+ | Firestore persistence adapter |

---

## 12. Definition of Ready

- [x] M7 PR-3 repository foundation complete
- [x] M7 PR-2 domain foundation complete
- [x] 825/825 baseline tests passing
- [x] Frozen contracts unchanged

---

## 13. Definition of Done

- [x] MenuSDK orchestrates repository + domain
- [x] Factory selects stub/default correctly
- [x] Repository remains abstract
- [x] Business rules stay in domain
- [x] Feature flags remain OFF
- [x] No Firestore / UI / facade
- [x] Deterministic mock tests
- [x] M7 PR-5 not started

---

## STOP — PR-5 Prohibited

Do **not** begin M7 PR-5 (Menu Facade & Presentation Orchestration) until explicit Architecture Review Board approval.
