# Menu Domain (M7 PR-2)

Pure domain boundary for the BhojanOS Catalog Kernel. **No SDK or infrastructure imports.**

## Architecture

```
Presentation (future)
        ↓
MenuFacade (future)
        ↓
MenuSDK (frozen contracts — M7 PR-1)
        ↓
Domain (this module)
        ↓
Repository (future — M7 PR-3+)
```

## Structure

| Path | Purpose |
|------|---------|
| `catalog/` | MenuCatalog, MenuCategory, MenuItem, catalog rules |
| `pricing/` | PriceSnapshot, EffectivePrice, price validation |
| `availability/` | AvailabilityState, MenuAvailability, aggregation |
| `modifiers/` | ModifierGroup, Modifier, selection rules |
| `combos/` | Combo, combo validation |
| `validation/` | Domain validators and error types |
| `shared/` | Constants, reason codes, result helpers |

Business rules belong **only** inside `src/domain/menu/`.

**STOP.** Do not begin M7 PR-3 until ARB approval.
