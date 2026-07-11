# Phase 6 — Shell Feature Migration Report

**Agent:** 1 — Shell Migration  
**Status:** ✅ COMPLETE — validation gate passed  
**Date:** 2026-07-10  
**Prerequisite:** Phase 5 PASS, Chief Architect Phase 6 APPROVED

---

## Scope

| Owned | Migrated |
|-------|----------|
| `MarketplaceLayout` | ✅ |
| Compact header (non-home routes) | ✅ via `MarketplaceCompactHeaderView` |
| Bottom navigation | ✅ via `OrderBhojanBottomNav` → `MarketplaceBottomNavView` |
| Floating cart | ✅ via `OrderBhojanFloatingCart` → `MarketplaceFloatingCartView` |
| Location header slot | ✅ `LocationChip` wired into compact header |
| Safe areas | ✅ preserved on header, main, nav, cart |
| Scroll hide/show nav | ✅ `main-scroll-container` + adapter scroll listener |

| Deferred (other agents / follow-up) | Reason |
|-------------------------------------|--------|
| Global search bar on home | Owned by Discovery (Agent 2) — lives in `KitchenDoorHero` |
| Desktop top nav with inline links | Founder `StorefrontDesktopHeader` is tenant-coupled; marketplace uses compact header + bottom nav for parity |
| BDS `SideNav` rail | Removed intentionally — Evening Kitchen rollback to Founder glass bottom nav |

---

## Architecture

```
OrderBhojan business logic (Zustand, React Router, location feature)
        ↓ props / callbacks
orderbhojan/src/presentation/shell/
  OrderBhojanBottomNav.tsx
  OrderBhojanFloatingCart.tsx
        ↓
src/design-system/adapters/marketplace/
  MarketplaceBottomNavView.tsx
  MarketplaceFloatingCartView.tsx
  MarketplaceCompactHeaderView.tsx
```

**Import rule:** Shell imports **adapter paths only** (not full `@bhojan/storefront-design-system` barrel) to avoid typechecking Founder app internals during OrderBhojan `tsc`.

---

## Files changed

### OrderBhojan (new)

- `orderbhojan/src/presentation/shell/OrderBhojanBottomNav.tsx`
- `orderbhojan/src/presentation/shell/OrderBhojanFloatingCart.tsx`
- `orderbhojan/src/presentation/shell/index.ts`

### OrderBhojan (modified)

- `orderbhojan/src/shared/layouts/MarketplaceLayout.tsx` — wires new shell adapters
- `orderbhojan/vite.config.ts` — `@bhojan/storefront-design-system` alias, `lucide-react` dedupe
- `orderbhojan/tsconfig.json` — path mappings for design-system + lucide
- `orderbhojan/package.json` — added `lucide-react`
- `orderbhojan/src/styles/globals.css` — `@source` for Founder DS Tailwind classes

### Founder design-system (modified)

- `src/design-system/adapters/marketplace/*` — props-only marketplace shell views (created in prior session)
- `MarketplaceBottomNavView` / `MarketplaceFloatingCartView` — removed `lg:hidden` / `xl:hidden` for Founder parity

### Intentionally unchanged (Phase 7 deletion gate)

- `orderbhojan/src/features/experience/ui/layout/ExperienceBottomNav.tsx`
- `orderbhojan/src/features/experience/ui/shared/MarketplaceFloatingCart.tsx`
- `packages/design-system` (BDS)
- All `experience-*.css` layers

---

## Replaced vs retained

| Before (BDS / Experience) | After (Founder DS adapters) |
|---------------------------|-----------------------------|
| `ExperienceBottomNav` → `NavIsland` + `SideNav` | `OrderBhojanBottomNav` → `MarketplaceBottomNavView` |
| `MarketplaceFloatingCart` → BDS `FloatingCart` | `OrderBhojanFloatingCart` → `MarketplaceFloatingCartView` |
| Inline compact header markup + `ob-*` classes | `MarketplaceCompactHeaderView` + slots |

Business logic preserved: cart Zustand store, nav paths, home filter reset, location sheets, routing.

---

## Validation

| Check | Result |
|-------|--------|
| `npm run build` (orderbhojan) | ✅ PASS |
| `tsc --noEmit` | ✅ PASS |
| `tests/m15-experience.test.ts` | ✅ 16/16 |
| `tests/px2-design-implementation.test.ts` | ✅ 11/11 |
| Firestore / hooks / routing modified | ✅ No |
| BDS deleted | ✅ No (Phase 7) |

---

## Visual regression report

**Method:** Static comparison of Founder `BottomNav` / `FloatingMiniCart` class structures against marketplace adapters.

| Element | Founder | OrderBhojan (post-migration) | Match |
|---------|---------|------------------------------|-------|
| Bottom nav pill | `rounded-[2.5rem]`, glass blur, orange active dot | Same via adapter | ✅ |
| Nav item typography | `text-[8px] font-black tracking-[0.2em]` | Same | ✅ |
| Floating cart bar | `#120D0A/90`, orange gradient CTA | Same | ✅ |
| Compact header | sticky, `bg-black/90`, safe-area top | Same | ✅ |
| Nav items | Home, Menu, Orders, Profile (tenant) | Home, Search, Cart, Orders, Profile (marketplace) | ⚠️ Expected route diff |

**Manual QA recommended:** Home route (no compact header), cart expand/collapse, checkout hides floating cart, iOS safe-area insets.

---

## Risk report

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R6-S01 | Barrel import pulls Founder internals into OB `tsc` | High | **Mitigated** — adapter-only imports |
| R6-S02 | Dual `lucide-react` instances (root vs OB) | Medium | **Mitigated** — OB dependency + tsconfig path + vite alias |
| R6-S03 | Tailwind classes in DS not scanned by OB | Medium | **Mitigated** — `@source` in `globals.css` |
| R6-S04 | Legacy `ExperienceBottomNav` still exported | Low | Accept until Phase 7; no runtime use in layout |
| R6-S05 | No marketplace desktop top nav with global search | Medium | Documented; Discovery agent owns home search; optional future `MarketplaceDesktopHeaderView` |
| R6-S06 | `cn()` via Founder `lib/utils` in adapter bundle | Low | Accept; only `tailwind-merge` + `clsx` pulled |

---

## Remaining duplicates

| Duplicate | Location | Removal |
|-----------|----------|---------|
| `ExperienceBottomNav` | `features/experience/ui/layout/` | Phase 7 |
| `MarketplaceFloatingCart` | `features/experience/ui/shared/` | Phase 7 |
| BDS `NavIsland`, `SideNav`, `FloatingCart` | `packages/design-system` | Phase 7 |
| `experience-px2-layout.css` sidenav padding | `orderbhojan/src/styles/` | Phase 7 CSS cleanup |

---

## Rollback plan

1. Revert `MarketplaceLayout.tsx` to import `ExperienceBottomNav` and `MarketplaceFloatingCart`.
2. Remove `orderbhojan/src/presentation/shell/` directory.
3. Revert `vite.config.ts`, `tsconfig.json`, `globals.css`, `package.json` alias/dependency changes.
4. Run `npm run build` — BDS shell path is unchanged and still present.

**Rollback time:** &lt; 15 minutes. No data migration. No API changes.

---

## Gate for Agent 2 (Discovery)

Shell validation **PASS**. Agent 2 (Discovery) may proceed.

**STOP** — await Chief Architect review before Agent 2 starts if required by program governance.
