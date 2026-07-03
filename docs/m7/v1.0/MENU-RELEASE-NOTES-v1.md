# Menu Platform Release Notes v1.0

**Version:** 1.0.0 (frozen)  
**Date:** 2026-06-27  
**PR range:** M7 PR-1 through PR-15  
**Runtime:** `MENU_SDK_VERSION = 1.0.0` · `MENU_SDK_FROZEN = true`  
**Tag:** `menu-platform-v1.0`  
**Authority:** ADR-023

---

## Highlights

Menu & Catalog Platform v1.0 is **certified and frozen**. Metadata promotion (PR-15) completes the M7 Catalog Kernel program. Public contracts are stable; all feature flags default **OFF**; legacy remains authoritative.

**Key facts:**

- 7-method frozen `MenuSDK` public contract
- `MenuFacade` presentation boundary
- `MENU_SDK_VERSION = 1.0.0` · `MENU_SDK_FROZEN = true`
- Legacy remains authoritative read source
- All 9 feature flags default **OFF**
- 1033/1033 tests passing
- No production routing

---

## PR-15 — Metadata Promotion

| Change | Before | After |
|--------|--------|-------|
| `MENU_SDK_VERSION` | `0.1.0-foundation` | `1.0.0` |
| `MENU_SDK_FROZEN` | `false` | `true` |
| ADR-023 | Proposed | Accepted |

**No behaviour changes.** Signatures, DTOs, flags, and routing unchanged.

---

## What's included

### Core SDK (PR-1 through PR-4)

- `MenuSDK` contract with 7 public methods
- `MenuRepository` read port
- Domain catalog, pricing, validation models
- Orchestrated adapter with feature flag gating
- Stub adapter when disabled

### Presentation (PR-5)

- `MenuFacade` — sole presentation entry point

### Projection chain (PR-6 through PR-10)

- Projection foundation (coordinator, checkpoint, snapshot)
- Shadow catalog projection (metadata read model)
- Parity validation (legacy vs projection comparison)
- Soak certification (health monitoring)
- Operational validation (lag, drift, replay evidence)

### Read infrastructure (PR-11 through PR-13)

- Read adapter (legacy ↔ projection routing) — standalone
- Staged rollout policy (stages 0–5) — standalone
- Switch certification (GO/NO-GO decision packages) — standalone

### Certification & metadata (PR-14, PR-15)

- Full v1.0 documentation pack
- ADR-023 accepted
- Version constants promoted

---

## What's NOT included

| Excluded | Reason |
|----------|--------|
| Production routing | Await staging soak + ARB |
| Firestore migration | Future ADR |
| UI / React components | Out of scope |
| MenuSDK → adapter wiring | Explicit future ADR |
| Production soak | Post-freeze staging |

---

## Version exports

```typescript
MENU_SDK_VERSION  // '1.0.0'
MENU_SDK_FROZEN   // true
```

---

## Breaking changes

**None.** PR-15 promotes metadata only. Behaviour identical to pre-promotion.

---

## Upgrade path

No upgrade required — all flags default OFF. Consumers may assert:

```typescript
assert(MENU_SDK_VERSION === '1.0.0');
assert(MENU_SDK_FROZEN === true);
```

Future activation follows [MENU-COMPATIBILITY-MATRIX.md](./MENU-COMPATIBILITY-MATRIX.md) staging enable sequence.

---

## Known issues

| Issue | Severity | Workaround |
|-------|----------|------------|
| Projection covers catalog metadata only | Low | Legacy authoritative for items |
| Adapter not wired to MenuSDK | By design | Use legacy path |
| No production benchmarks | Low | Staging soak required |

---

## Pre-tag checklist

- [x] Public methods documented
- [x] DTOs documented
- [x] ADR-023 accepted
- [x] `MENU_SDK_VERSION = 1.0.0`
- [x] `MENU_SDK_FROZEN = true`
- [x] SDK tests pass (`npm run test:sdk`)
- [ ] Git tag `menu-platform-v1.0` applied (after merge)
- [ ] **72h staging soak** before production flag enablement

---

## Contributors

BhojanOS Platform Engineering — M7 Catalog Kernel initiative.

---

**STOP.** M7 PR-15 complete. Production activation prohibited until staging soak and explicit ARB approval.
