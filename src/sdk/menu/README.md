# MenuSDK — Menu & Catalog Platform

**Version:** `1.0.0` · **Frozen:** `true`  
**Certification:** v1.0 frozen — ADR-023 accepted  
**Documentation:** [docs/m7/v1.0/](../../../docs/m7/v1.0/MENU-PLATFORM-CERTIFICATION.md) · [ADR-023](../../../docs/adr/ADR-023-menu-platform-v1-freeze.md) · [Release](../../../docs/releases/menu-platform-v1.0.md)

Menu & Catalog SDK for the BhojanOS Catalog Kernel (M7 PR-1 through PR-15).

---

## Architecture

```
Presentation
     ↓
MenuFacade (PR-5)
     ↓
MenuSDK ← createMenuSDK() (PR-1, PR-4)
     ↓
MenuRepository (PR-2) — LEGACY AUTHORITATIVE
     ↓
Persistence (host-provided)

Standalone (NOT wired to MenuSDK):
  Projection → Parity → Soak → Operational → Adapter → Rollout → Certification
  (PR-6 through PR-13)
```

---

## Public API (frozen v1.0)

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

When `FF_MENU_ENABLED` is OFF (default), all methods return `NOT_CONFIGURED` via stub adapter.

See [MENU-PUBLIC-API-v1.md](../../../docs/m7/v1.0/MENU-PUBLIC-API-v1.md).

---

## Version & compatibility

```typescript
MENU_SDK_VERSION  // '1.0.0'
MENU_SDK_FROZEN   // true
```

- Breaking changes require ADR + major version bump
- All 9 feature flags default **OFF** — zero production behaviour change
- Legacy remains authoritative read source
- Adapter/rollout not wired into `createMenuSDK()`

See [MENU-COMPATIBILITY-MATRIX.md](../../../docs/m7/v1.0/MENU-COMPATIBILITY-MATRIX.md).

---

## Feature flags (all default OFF)

### Core (MenuSDK)

| Flag | Purpose |
|------|---------|
| `FF_MENU_ENABLED` | Master SDK gate |
| `FF_MENU_SEARCH_ENABLED` | Search method gate |
| `FF_MENU_PROJECTION_ENABLED` | Projection foundation |
| `FF_MENU_PROJECTION_PARITY_ENABLED` | Parity validation |
| `FF_MENU_PROJECTION_SOAK_ENABLED` | Soak certification |
| `FF_MENU_OPERATIONAL_VALIDATION_ENABLED` | Operational validation |

### Infrastructure (standalone — not wired to MenuSDK)

| Flag | Purpose |
|------|---------|
| `FF_MENU_PROJECTION_ADAPTER_ENABLED` | Read adapter routing |
| `FF_MENU_PROJECTION_ROLLOUT_ENABLED` | Staged rollout policy |
| `FF_MENU_PROJECTION_CERTIFICATION_ENABLED` | Switch certification |

---

## Module layout

| Path | PR | Wired? |
|------|-----|--------|
| `contracts/` | PR-1 | ✅ Public API |
| `dto/` | PR-1 | ✅ Public API |
| `orchestration/` | PR-4 | ✅ Default path |
| `repository/` | PR-2 | ✅ Injected port |
| `featureFlags/` | PR-1 | ✅ Gating |
| `projection/` | PR-6 | ❌ Standalone |
| `shadow/` | PR-7 | ❌ Standalone |
| `parity/` | PR-8 | ❌ Standalone |
| `operations/` | PR-10 | ❌ Standalone |
| `adapter/` | PR-11 | ❌ Standalone |
| `rollout/` | PR-12 | ❌ Standalone |
| `certification/` | PR-13 | ❌ Standalone |

---

## Testing

- **Menu-focused:** 253 tests (21 files)
- **Full platform:** 1033 / 1033 passing

```bash
npm run test:sdk
```

See [MENU-TEST-MATRIX.md](../../../docs/m7/v1.0/MENU-TEST-MATRIX.md).

---

## Governance

- Legacy remains authoritative read source
- No production routing in v1.0
- No adapter/rollout wiring in MenuSDK
- Breaking changes require ADR + major version bump

See [MENU-GOVERNANCE.md](../../../docs/m7/v1.0/MENU-GOVERNANCE.md).

---

**STOP.** M7 PR-15 complete. Await ARB before production activation or adapter wiring milestones.
