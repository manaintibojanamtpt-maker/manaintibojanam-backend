# Founder Store — Design System Adoption Report

**Agent:** Founder Design System Adoption (Phase 4)  
**Status:** ✅ COMPLETE — stopped awaiting Phase 5 approval  
**Date:** 2026-07-10  
**Scope:** Founder Store import paths only — zero JSX/CSS/logic changes

---

## Mission outcome

The Founder Store (Mana Inti Bojanam customer storefront) now imports presentation components **directly from `src/design-system/`**, proving the shared design system is production-ready without changing visuals.

---

## Validation checklist

- [x] Import-only changes (no JSX, CSS, Tailwind, animation, props, or logic edits)
- [x] OrderBhojan untouched
- [x] `packages/design-system` untouched
- [x] Experience CSS untouched
- [x] Firestore / hooks / contexts / services untouched
- [x] `npm run build:web` — **PASS**
- [x] `npm run lint` — no new errors in migrated files (pre-existing `backend-lib/` errors unchanged)
- [x] Module graph resolves directly to `src/design-system/*` (3988 modules, down from 4001 via re-export bypass)

---

## Files modified (7)

| File | Imports updated |
|------|----------------:|
| `src/App.tsx` | 6 |
| `src/pages/Home.tsx` | 2 |
| `src/pages/Menu.tsx` | 3 |
| `src/pages/Checkout.tsx` | 3 |
| `src/pages/Login.tsx` | 1 |
| `src/pages/MyOrders.tsx` | 1 |
| `src/pages/MarketplaceHome.tsx` | 3 |
| **Total** | **19** |

---

## Components migrated (by migration order)

### 1. Buttons

| Component | Old import | New import | Consumer |
|-----------|------------|------------|----------|
| `SoftButton` | `../components/ui/SoftButton` | `../design-system/primitives/SoftButton` | `Login.tsx`, `Checkout.tsx` |

### 2–4. UI primitives / Glass / Skeletons

| Component | New import path | Consumer |
|-----------|-----------------|----------|
| `Skeleton`, skeleton variants | `../design-system/skeleton/SkeletonSystem` | `Home.tsx`, `Menu.tsx`, `Checkout.tsx` |

### 5. Layout

| Component | New import path | Consumer |
|-----------|-----------------|----------|
| `Header` | `./design-system/layout/Header` | `App.tsx` |
| `StorefrontDesktopHeader` | `./design-system/layout/StorefrontDesktopHeader` | `App.tsx` |
| `BottomNav` | `./design-system/layout/BottomNav` | `App.tsx` |

### 6. Floating cart

| Component | New import path | Consumer |
|-----------|-----------------|----------|
| `FloatingMiniCart` | `./design-system/cart/FloatingMiniCart` | `App.tsx` |
| `DesktopFloatingCart` | `./design-system/cart/DesktopFloatingCart` | `App.tsx` |

### 7. Food

| Component | New import path | Consumer |
|-----------|-----------------|----------|
| `MenuItemCard` | `../design-system/food/MenuItemCard` | `Home.tsx`, `Menu.tsx` |
| `Banner` | `../design-system/food/Banner` | `Menu.tsx` |

### 8. Marketplace (Founder discovery only)

| Component | New import path | Consumer |
|-----------|-----------------|----------|
| `MarketplaceKitchenCardView` | `../design-system/marketplace/MarketplaceKitchenCard` | `MarketplaceHome.tsx` |
| `MarketplaceSearchBar` | `../design-system/marketplace/MarketplaceSearchBar` | `MarketplaceHome.tsx` |
| `MarketplaceSearchResults` | `../design-system/marketplace/MarketplaceSearchResults` | `MarketplaceHome.tsx` |

### 9. Orders

| Component | New import path | Consumer |
|-----------|-----------------|----------|
| `OrderTracking` | `./design-system/orders/OrderTracking` (lazy) | `App.tsx` |
| `DigitalInvoice` | `../design-system/orders/DigitalInvoice` | `MyOrders.tsx` |

### 10. Location

| Component | New import path | Consumer |
|-----------|-----------------|----------|
| `AutoLocationForm` | `../design-system/location/AutoLocationForm` (lazy) | `Checkout.tsx` |

**Note:** `HeaderLocationDropdown` is consumed internally by `StorefrontDesktopHeader` inside design-system — no page-level import change required.

---

## Remaining imports (intentionally unchanged)

### Founder Store — not yet extracted to design-system

| Import | File | Reason |
|--------|------|--------|
| `MarketplaceHomeStates` | `MarketplaceHome.tsx` | Not in Phase 3 extraction scope |

### Non–Founder Store (Phase 4 out of scope)

| Import | Files | Portal |
|--------|-------|--------|
| `SoftButton` via `components/ui/` | `AdminLogin`, `BhojanOSSuperAdminLogin`, `OwnerLogin`, `OwnerRegister`, `OnboardingWizard` | Admin / Owner |
| `GlassCard` via `components/ui/` | `NotificationCenter.tsx` | Notifications module |
| Marketing `ui/*` | `EnterpriseFooter`, `MissionVision`, `ExecutiveLeadership`, etc. | Marketing site |

### Compatibility re-exports (Phase 3 stubs — still active)

36 files under `src/components/` remain as re-export stubs for consumers not yet migrated. Founder Store **no longer uses these stubs** for the 19 imports above.

### Internal design-system dependencies (unchanged)

| Dependency | Imported by design-system from |
|------------|-------------------------------|
| `ActiveOrderStrip` | `src/components/ActiveOrderStrip.tsx` |
| `StorefrontInstallButton` | `src/components/StorefrontInstallButton.tsx` |
| `BottomSheet` | `src/components/BottomSheet.tsx` |

---

## Build status

```
npm run build:web  → ✓ PASS (2026-07-10)
  Modules transformed: 3988
  CSS bundle: main-DSi5a7UV.css (295.21 kB — unchanged size)
  PWA precache: 98 entries
```

```
npm run lint (tsc --noEmit)  → Pre-existing backend-lib errors only
  Zero new errors in App.tsx, pages/, or design-system/
```

**Note:** Root `package.json` has no separate `typecheck` script; `npm run lint` runs `tsc --noEmit`.

---

## Visual / DOM verification

| Check | Result |
|-------|--------|
| JSX modified | ❌ None |
| Tailwind classes modified | ❌ None |
| Framer Motion modified | ❌ None |
| CSS files modified | ❌ None |
| Token files modified | ❌ None |
| Import path only | ✅ 19 statements |

Formal pixel regression (Agent 5) recommended before OrderBhojan migration, but Phase 4 introduces **zero presentation diff** by construction.

---

## Risk report

| ID | Risk | Severity | Status |
|----|------|----------|--------|
| R4-01 | Lazy import path break on code-split chunks | Medium | **Mitigated** — build PASS, chunks generated |
| R4-02 | Duplicate module instances via stub + direct import | Low | **Improved** — founder bypasses stubs |
| R4-03 | Owner/admin still on stubs — inconsistent import style | Low | **Accepted** — out of Phase 4 scope |
| R4-04 | `MarketplaceHomeStates` not in DS — split import style | Low | **Accepted** — extract in future phase |
| R4-05 | DS components import legacy `src/components/*` deps | Medium | **Open** — BottomSheet, ActiveOrderStrip |

---

## Rollback plan

Revert import paths in 7 files:

```powershell
git checkout HEAD -- src/App.tsx src/pages/Home.tsx src/pages/Menu.tsx src/pages/Checkout.tsx src/pages/Login.tsx src/pages/MyOrders.tsx src/pages/MarketplaceHome.tsx
```

Founder Store will fall back to Phase 3 compatibility re-exports with identical runtime behavior.

**Tag recommended:** `ds-migration-phase-4`

---

## Change log

| Date | Action |
|------|--------|
| 2026-07-10 | Migrated 19 Founder Store imports to `src/design-system/` |
| 2026-07-10 | `npm run build:web` PASS |
| 2026-07-10 | Stopped — awaiting Phase 5 approval |

---

## Gate decision

**Phase 4: PASS** — Founder Store is the first production consumer of `src/design-system/`.

**STOP** — Do not proceed to OrderBhojan. Await Phase 5 (Founder Preservation / visual regression) approval.
