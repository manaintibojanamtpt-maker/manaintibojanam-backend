# Menu Platform Public API v1.0

**Status:** Frozen (documentation) — runtime `0.1.0-foundation` until PR-15  
**Date:** 2026-06-27  
**Source:** `src/sdk/menu/contracts/MenuSDK.ts`

---

## 1. MenuSDK (frozen public contract)

| Method | Input | Output | Notes |
|--------|-------|--------|-------|
| `getMenu` | `MenuQuery` | `SdkAsyncResult<Menu>` | Full catalog read |
| `getMenuItem` | `MenuItemQuery` | `SdkAsyncResult<MenuItem>` | Single item |
| `listCategories` | `MenuCategoryQuery` | `SdkAsyncResult<MenuCategory[]>` | Category list |
| `searchMenu` | `MenuSearchQuery` | `SdkAsyncResult<MenuSearchResult>` | Search hits |
| `getModifierGroups` | `ModifierGroupQuery` | `SdkAsyncResult<ModifierGroup[]>` | Modifier groups |
| `getCombo` | `ComboQuery` | `SdkAsyncResult<Combo>` | Combo bundle |
| `validateMenu` | `MenuValidationInput` | `SdkResult<MenuValidationResult>` | Sync validation |

### Factory

```typescript
createMenuSDK(options?: CreateMenuSDKOptions): MenuSDK
```

**Default behaviour:** `FF_MENU_ENABLED` OFF → `StubMenuAdapter` → `NOT_CONFIGURED`.

---

## 2. MenuRepository (frozen read port)

| Method | Input | Output |
|--------|-------|--------|
| `getMenu` | `MenuQuery` | `SdkAsyncResult<Menu>` |
| `getMenuItem` | `MenuItemQuery` | `SdkAsyncResult<MenuItem>` |
| `listCategories` | `MenuCategoryQuery` | `SdkAsyncResult<MenuCategory[]>` |
| `getCombo` | `ComboQuery` | `SdkAsyncResult<Combo>` |

---

## 3. MenuFacade (frozen presentation surface)

Presentation MUST use `MenuFacade` — not MenuSDK, MenuRepository, or domain directly.

| Operation | Maps to MenuSDK |
|-----------|-----------------|
| `loadMenu` | `getMenu` |
| `loadMenuItem` | `getMenuItem` |
| `loadCategories` | `listCategories` |
| `searchMenu` | `searchMenu` |
| `loadModifierGroups` | `getModifierGroups` |
| `loadCombo` | `getCombo` |
| `validateMenu` | `validateMenu` |

Source: `src/lib/menu/MenuFacade.ts`

---

## 4. Standalone infrastructure (NOT part of MenuSDK public API)

These modules exist for staging evidence. They are **not wired** into `createMenuSDK()`:

| Module | Factory | Purpose |
|--------|---------|---------|
| Read Adapter | `createMenuAdapterInfrastructure()` | Legacy ↔ projection routing |
| Rollout | `createMenuProjectionRollout()` | Staged percentage policy |
| Switch Certification | `createMenuCertificationInfrastructure()` | GO/NO-GO decision packages |
| Operational Validation | `createMenuOperationalInfrastructure()` | Lag/drift/replay evidence |
| Parity | `createMenuParityInfrastructure()` | Shadow parity comparison |
| Soak | `createMenuProjectionSoakInfrastructure()` | Soak certification |

---

## 5. DTO stability

All DTOs in `src/sdk/menu/dto/` are frozen for v1.0:

- `Menu`, `MenuItem`, `MenuCategory`, `Combo`, `ModifierGroup`
- Query DTOs: `MenuQuery`, `MenuItemQuery`, etc.
- `MenuSearchResult`, `MenuValidationResult`
- Branded types: `MenuItemId`, `MenuCategoryId`, `ComboId`, etc.

Breaking changes require ADR + major version bump post-freeze.

---

## 6. Error model

Standard `SdkAsyncResult<T>` / `SdkResult<T>` from SDK core.

Common codes: `NOT_CONFIGURED`, `VALIDATION`, `NOT_FOUND`, `UNAVAILABLE`.

---

**STOP.** No contract changes without ADR-023 governance.
