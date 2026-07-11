# Restaurant UX Component Mapping — Phase 6 / Milestone 3D

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10  
**Status:** ✅ Mapping complete — Milestone 3D implementation complete

---

## Restaurant page (`/restaurant/:restaurantSlug`)

| Current Component | File | Founder DS Replacement | Presentation Wire | Migration Status |
| ----------------- | ---- | ---------------------- | ----------------- | ---------------- |
| Loading skeleton | `OrderBhojanRestaurantSkeleton` | `RestaurantHeroSkeleton` + `Skeleton` | `OrderBhojanRestaurantSkeleton` | ✅ Complete |
| Error + retry | Inline `OrderBhojanDiscoveryUxState` | `MarketplaceUxStateView` | `OrderBhojanRestaurantErrorState` | ✅ Complete |
| Offline banner | — (missing) | `GlassCard` offline pattern | `OrderBhojanDiscoveryOfflineNotice` | ✅ Complete |
| Offline full state | — (missing) | `MarketplaceUxStateView` `offline` | `OrderBhojanRestaurantErrorState` | ✅ Complete |
| Restaurant closed | Disabled CTA only | `OrderBhojanRestaurantClosedBanner` | New presentation | ✅ Complete |
| Maintenance | — (missing) | `MarketplaceUxStateView` `maintenance` | `OrderBhojanRestaurantMaintenanceState` | ✅ Complete |
| State shell | Inline `div` wrappers | `OrderBhojanRestaurantUxShell` | New presentation | ✅ Complete |

---

## Menu page (`/restaurant/:restaurantSlug/menu`)

| Current Component | File | Founder DS Replacement | Presentation Wire | Migration Status |
| ----------------- | ---- | ---------------------- | ----------------- | ---------------- |
| Loading skeleton | `OrderBhojanFoodMenuSkeleton` | `CategorySkeleton` + `MenuItemSkeleton` | `OrderBhojanFoodMenuSkeleton` | ✅ Complete |
| Error + retry | Inline `OrderBhojanDiscoveryUxState` | `MarketplaceUxStateView` | `OrderBhojanMenuErrorState` | ✅ Complete |
| Menu empty | — (missing) | Founder empty pattern | `OrderBhojanMenuEmptyState` | ✅ Complete |
| Offline banner | — (missing) | `OrderBhojanDiscoveryOfflineNotice` | Wired in experience | ✅ Complete |
| Out of stock | `MenuItemCardView` | DS sold-out label | Existing (3B) | ✅ Complete |
| Category empty section | `return null` | Silent skip | Preserved — intentional | ✅ Complete |

---

## Customization sheet (3C — unchanged in 3D)

| State | Handling | Status |
| ----- | -------- | ------ |
| Loading | N/A — sheet opens with food data | ✅ |
| Error | Parent menu error state | ✅ |

---

## Legacy components (retain until Phase 7)

| Component | File | Action |
| --------- | ---- | ------ |
| `ExperienceSkeletons` | `features/experience/ui/shared/` | **Not in restaurant hot path** — home only |
| `ExperienceEmptyStates` | `features/experience/ui/shared/` | Shim → discovery states |
| BDS `PremiumEmpty` | cart, checkout, tracking | **Out of scope** — not restaurant |

---

## Founder DS components used (3D)

| DS Component | Usage |
| ------------ | ----- |
| `MarketplaceUxStateView` | Generic empty / error / offline / loading |
| `RestaurantHeroSkeleton` | Restaurant page loading |
| `CategorySkeleton` | Menu category rail loading |
| `MenuItemSkeleton` | Menu item rows loading |
| `Skeleton` | Layout placeholders |
| `GlassCard` | Offline notice, closed banner |
| `SectionHeader` | State titles |
| `SoftButton` | Retry actions |

---

## Behaviour preservation

| Behaviour | Preserved via |
| --------- | ------------- |
| React Query loading/error | `useRestaurantExperience`, `useFoodMenu` unchanged |
| Retry | `query.refetch()` callbacks unchanged |
| Closed restaurant | `openStatus === 'closed'` — CTA disabled + banner |
| Sold out items | `food.availability` → card VM |
| Offline detection | `useOnlineStatus` — presentation only |

---

## Implementation order

1. `MarketplaceUxStateView` in `src/design-system/marketplace/`
2. `RestaurantHeroSkeleton` in `SkeletonSystem`
3. `presentation/states/restaurant/*` state components
4. Refactor `OrderBhojanDiscoveryUxState` to delegate to DS view
5. Wire restaurant + menu experiences
6. Validation + deliverables + `RESTAURANT_COMPLETION_REPORT.md`
7. `MIGRATION_GOVERNANCE.md`

---

## Checkpoint

**Milestone 3D complete. Agent 3 CLOSED.**

**STOP — do not begin Checkout.**
