# Release Notes — Menu & Catalog Platform v1.0.0

**Tag:** `menu-platform-v1.0`  
**Date:** 2026-06-27  
**Authority:** ADR-023  
**Program:** M7 PR-1 through PR-15

---

## Summary

First **stable, frozen** release of the Menu & Catalog Platform. Public contracts are frozen for external-style consumption. PR-15 promotes version metadata only — no new features, no behaviour changes.

---

## What's included

### Public API (frozen)

| Method | Description |
|--------|-------------|
| `getMenu` | Full catalog read |
| `getMenuItem` | Single item read |
| `listCategories` | Category list |
| `searchMenu` | Menu search |
| `getModifierGroups` | Modifier groups |
| `getCombo` | Combo bundle |
| `validateMenu` | Sync validation |

Factory: `createMenuSDK(options?)`

### Types (frozen)

- `Menu`, `MenuItem`, `MenuCategory`, `Combo`, `ModifierGroup`
- Query DTOs: `MenuQuery`, `MenuItemQuery`, etc.
- `MenuSearchResult`, `MenuValidationResult`
- Branded: `MenuItemId`, `MenuCategoryId`, `ComboId`, etc.

### Version exports

```typescript
MENU_SDK_VERSION  // '1.0.0'
MENU_SDK_FROZEN   // true
```

---

## What's NOT included

- Production routing / read switch  
- MenuSDK → adapter wiring  
- Firestore menu migration  
- Production feature-flag rollout (flags default OFF)  
- UI / Presentation components  

---

## Documentation

| Document | Path |
|----------|------|
| Certification | `docs/m7/v1.0/MENU-PLATFORM-CERTIFICATION.md` |
| Public API | `docs/m7/v1.0/MENU-PUBLIC-API-v1.md` |
| Compatibility | `docs/m7/v1.0/MENU-COMPATIBILITY-MATRIX.md` |
| Rollback | `docs/m7/v1.0/MENU-ROLLBACK.md` |
| ADR | `docs/adr/ADR-023-menu-platform-v1-freeze.md` |

---

## Pre-tag checklist

- [x] Public methods documented  
- [x] DTOs documented  
- [x] ADR-023 accepted  
- [x] Version constant promoted to `1.0.0`  
- [x] `MENU_SDK_FROZEN = true`  
- [x] SDK tests pass (`npm run test:sdk`)  
- [ ] Git tag `menu-platform-v1.0` applied  
- [ ] **72h staging soak** before production flag enablement  

---

## Upgrade notes

No breaking changes from `0.1.0-foundation` — behaviour is identical. Consumers should pin to `menu-platform-v1.0` and assert `MENU_SDK_VERSION === '1.0.0'`.

---

## Rollback (metadata only)

```bash
git revert <PR-15-commit-sha>
# Restore MENU_SDK_VERSION = '0.1.0-foundation', MENU_SDK_FROZEN = false
git tag -d menu-platform-v1.0          # local
git push origin :refs/tags/menu-platform-v1.0  # remote, if pushed
```

No runtime rollback required — no behaviour changed.

---

## Known limitations

1. Adapter/rollout not wired into `createMenuSDK()`.  
2. Projection covers catalog metadata only — legacy authoritative for items.  
3. All 9 menu flags default OFF.  
4. No production soak recorded.  

---

*v1.0.0 — Menu Platform freeze. Metadata promotion only. No runtime changes.*
