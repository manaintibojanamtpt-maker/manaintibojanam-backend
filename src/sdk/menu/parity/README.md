# Menu Projection Parity (M7 PR-8)

Validation-only parity between **legacy menu repository** reads and **shadow projection** read models. No MenuSDK routing switch. No Firestore.

## Architecture

```
Legacy Menu Repository → MenuParityMapper → Canonical Catalog Model
Projection Repository  → MenuParityMapper → Canonical Catalog Model
                                              ↓
                                    MenuParityComparator
                                              ↓
                                       Parity Report
                                              ↓
                                            STOP
```

## Feature flags

- `FF_MENU_PROJECTION_ENABLED`
- `FF_MENU_PROJECTION_PARITY_ENABLED` (default OFF)

## Factory

`createMenuParityInfrastructure()`

**STOP.** Await ARB approval before M7 PR-9 (Menu Projection Soak & Certification).
