# M7 PR-1 — Menu & Catalog SDK Foundation Report

**Program:** BHOS-M7  
**PR:** M7 PR-1 — Menu & Catalog SDK Foundation  
**Date:** 2026-06-27  
**Version:** `MENU_SDK_VERSION = 0.1.0-foundation`  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-1 establishes the **MenuSDK foundation** — the first platform of the BhojanOS Catalog Kernel. This PR delivers public contracts, DTOs, repository ports, feature flags, stub/default adapters, and factory wiring.

**Contracts only. Stub implementation only.** All public methods return `NOT_CONFIGURED`. No business logic, no Firestore, no UI, no projections, no runtime wiring. Zero production impact.

---

## 2. Architecture

```
Presentation (future)
        ↓
MenuFacade (future)
        ↓
MenuSDK ← createMenuSDK()
        ↓
MenuRepository (future)
        ↓
Persistence (future)
```

Menu becomes the canonical read/write platform for everything sellable. PR-1 establishes the **contract shell** only.

---

## 3. Repository Audit

Legacy menu paths identified (not modified in PR-1):

| Location | Pattern | Notes |
|----------|---------|-------|
| `src/services/api.ts` | `menu` collection reads/writes | Legacy Firestore menu CRUD |
| `src/services/api.ts` | `buildRepeatOrderLines` | Menu item lookup for repeat orders |
| Owner API routes | `/api/owner/menu/items` | HTTP menu item management |

**Migration strategy:** Strangle legacy menu paths through MenuSDK in future PRs. M1–M6 frozen platforms untouched.

---

## 4. SDK Contracts

### `MenuSDK` (`contracts/MenuSDK.ts`)

| Method | Input | Output |
|--------|-------|--------|
| `getMenu` | `MenuQuery` | `SdkAsyncResult<Menu>` |
| `getMenuItem` | `MenuItemQuery` | `SdkAsyncResult<MenuItem>` |
| `listCategories` | `MenuCategoryQuery` | `SdkAsyncResult<MenuCategory[]>` |
| `searchMenu` | `MenuSearchQuery` | `SdkAsyncResult<MenuSearchResult>` |
| `getModifierGroups` | `ModifierGroupQuery` | `SdkAsyncResult<ModifierGroup[]>` |
| `getCombo` | `ComboQuery` | `SdkAsyncResult<Combo>` |
| `validateMenu` | `MenuValidationInput` | `SdkResult<MenuValidationResult>` |

### Ports (contracts only — no implementations)

| Port | Responsibility |
|------|----------------|
| `MenuRepository` | Canonical menu persistence reads |
| `MenuProjectionRepository` | Projected menu reads |
| `MenuValidator` | Menu validation |
| `MenuSearchProvider` | Menu search |
| `MenuAvailabilityProvider` | Item availability |

---

## 5. DTO Overview

| DTO | File |
|-----|------|
| `Menu` | `dto/menu.ts` |
| `MenuCategory` | `dto/category.ts` |
| `MenuItem` | `dto/item.ts` |
| `ModifierGroup`, `Modifier` | `dto/modifier.ts` |
| `Combo` | `dto/combo.ts` |
| `PriceReference`, `AvailabilityReference`, `BranchOverrideReference` | `dto/references.ts` |
| `MenuQuery`, `MenuSearchQuery`, etc. | `dto/queries.ts` |
| `MenuSearchResult` | `dto/search.ts` |
| `MenuValidationResult` | `dto/validation.ts` |
| `MenuMetadata` | `dto/metadata.ts` |

---

## 6. Feature Flags

| Flag | Default | Env Key | Purpose |
|------|---------|---------|---------|
| `FF_MENU_ENABLED` | OFF | `VITE_FF_MENU_ENABLED` | Master menu SDK gate |
| `FF_MENU_SEARCH_ENABLED` | OFF | `VITE_FF_MENU_SEARCH_ENABLED` | Menu search (future) |
| `FF_MENU_PROJECTION_ENABLED` | OFF | `VITE_FF_MENU_PROJECTION_ENABLED` | Menu projection reads (future) |

Factory behavior:
- Flag OFF → `StubMenuAdapter` (NOT_CONFIGURED)
- Flag ON → `DefaultMenuAdapter` placeholder (NOT_CONFIGURED)

---

## 7. Testing

| File | Tests | Coverage |
|------|-------|----------|
| `menuSdkFoundation.test.ts` | 14 | Version, flags, factory, stub, default, validation, ports |
| `menuDomainFoundation.test.ts` | 2 | Domain constants and messages |

Run: `npm run test:sdk`

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental production menu routing | All flags default OFF; all methods NOT_CONFIGURED |
| Breaking frozen M1–M6 platforms | No modifications to certified SDKs |
| Premature Firestore coupling | No persistence adapters in PR-1 |
| Contract drift | Version `0.1.0-foundation`, `MENU_SDK_FROZEN = false` until ARB freeze |

---

## 9. Rollback

1. Remove `src/sdk/menu/` and `src/domain/menu/` (except any consumed paths)
2. Remove test entries from `package.json` `test:sdk`
3. Remove `docs/m7/` PR-1 artifacts
4. No runtime impact — nothing wired to Presentation

---

## 10. Migration Roadmap

| PR | Scope |
|----|-------|
| PR-1 (this PR) | Contracts, stub, flags |
| PR-2 | Menu domain foundation (blocked — await ARB) |
| PR-3+ | Repository adapters, Firestore strangler |
| Future | MenuFacade, Presentation integration |

---

## 11. Definition of Ready

- [x] M1–M6 platforms certified and frozen
- [x] 780/780 baseline tests passing
- [x] Catalog Kernel architecture scoped
- [x] No modifications to frozen SDKs

---

## 12. Definition of Done

- [x] MenuSDK foundation exists
- [x] Public contracts defined
- [x] Stub adapter operational (NOT_CONFIGURED)
- [x] Default placeholder adapter exists
- [x] Feature flags default OFF
- [x] Version `0.1.0-foundation`
- [x] `MENU_SDK_FROZEN = false`
- [x] Mock-only deterministic tests
- [x] No Firestore, UI, projections, or runtime wiring
- [x] Documentation complete
- [x] M7 PR-2 not started

---

## 13. Generated Files

### SDK — `src/sdk/menu/`

| Path | Purpose |
|------|---------|
| `version.ts` | `MENU_SDK_VERSION`, `MENU_SDK_FROZEN` |
| `shared/constants.ts` | `MENU_SDK_MODULE` |
| `shared/options.ts` | `CreateMenuSDKOptions` |
| `featureFlags/featureFlags.ts` | Flag defaults + env keys |
| `contracts/MenuSDK.ts` | Public interface |
| `dto/*` | Menu DTOs |
| `repository/*` | Port contracts |
| `adapters/notConfigured.ts` | NOT_CONFIGURED helpers |
| `adapters/StubMenuAdapter.ts` | Stub adapter |
| `adapters/DefaultMenuAdapter.ts` | Placeholder adapter |
| `factory/createMenuSDK.ts` | Factory |
| `validation/validateMenuQuery.ts` | Structural validation |
| `errors/menuErrors.ts` | Error messages |
| `types/branded.ts` | Branded IDs |
| `types/index.ts` | Type barrel |
| `README.md` | Module documentation |

### Domain — `src/domain/menu/`

| Path | Purpose |
|------|---------|
| `types/MenuDomainTypes.ts` | Domain type placeholders |
| `validation/MenuDomainValidation.ts` | Domain validation messages |
| `shared/MenuDomainConstants.ts` | Domain constants |
| `README.md` | Domain boundary docs |

---

## STOP — PR-2 Prohibited

Do **not** begin M7 PR-2 (Menu Domain Foundation) until explicit Architecture Review Board approval.
