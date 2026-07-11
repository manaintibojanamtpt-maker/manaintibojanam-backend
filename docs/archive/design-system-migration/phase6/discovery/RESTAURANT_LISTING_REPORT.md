# Phase 6 — Milestone 2B: Restaurant Listing Migration Report

**Agent:** 2 — Discovery Migration  
**Status:** ✅ COMPLETE — validation gate passed  
**Date:** 2026-07-10  
**Prerequisite:** Milestone 2A PASS, Chief Architect 2B APPROVED

---

## Executive summary

All restaurant and kitchen **listing presentation** on OrderBhojan home/discovery surfaces now renders through Founder `MarketplaceKitchenCardView`. Business logic (discovery engine, pagination, favorites store, ranking, filters) is unchanged. Legacy component files remain as thin re-export shims for rollback.

---

## Scope completed

| Surface | Status |
|---------|--------|
| Discovery collection rails (nearby, featured, top rated, …) | ✅ |
| Kitchen spotlight (live discovery) | ✅ |
| Mock featured / spotlight feeds (discovery OFF) | ✅ |
| Favorites grid card (via shim) | ✅ |
| Search restaurant rows (via shim; layout is 2C) | ✅ |

---

## Architecture

```
RestaurantPublic | MockRestaurant
        ↓ mapRestaurantToKitchenCard (presentation only)
MarketplaceKitchenCard view model
        ↓
MarketplaceKitchenCardView (src/design-system)
        ↑ OrderBhojanKitchenCard wires favorites + feature flag
```

**Preserved on every card:** name, cuisine, distance, ETA, rating, delivery fee, open status, offers, badges, images, lazy/eager loading, favorite state, click navigation.

---

## Design-system changes

### `MarketplaceKitchenCardView` enhancements
- `variant`: `default` | `spotlight`
- `favoriteSlot`: optional overlay control
- `deliveryFeeLabel` on view model
- Extended `MarketplaceBadge.id` union: `offer`, `closed`, `kitchen_format`
- Founder hover scale, shadow, orange accent

### New exports
- `src/design-system/marketplace/types.ts`
- `src/design-system/marketplace/MarketplaceHomeStates.tsx` (from 2A)

---

## OrderBhojan changes

### New
- `presentation/discovery/OrderBhojanKitchenCard.tsx`
- `presentation/discovery/OrderBhojanMockKitchenCard.tsx`
- `presentation/discovery/mapRestaurantToKitchenCard.ts`

### Migrated
- `DiscoveryCollectionRail` → `Section` + `SectionHeader` + DS cards + `SoftButton` load more
- `FeaturedRestaurantsSection` → Founder section grid
- `HomeKitchenSpotlightMock` → spotlight variant card

### Shims (legacy paths preserved)
- `DiscoveryRestaurantCard` → re-exports `OrderBhojanKitchenCard`
- `HomeRestaurantPoster` → re-exports `OrderBhojanMockKitchenCard`
- `KitchenSpotlightCard` → thin spotlight wrapper

---

## Business logic verification

| System | Modified? |
|--------|-----------|
| `discoveryEngine` / `loadDiscoveryCollection` | ❌ No |
| `useDiscoveryHome` / React Query | ❌ No |
| `useDiscoveryFilterStore` | ❌ No |
| `useFavoritesStore` | ❌ No (wired in presentation only) |
| Pagination / infinite scroll in rails | ❌ No |
| `RestaurantPublic` DTO | ❌ No |
| Routing | ❌ No |
| Ranking / recommendation | ❌ No |

---

## Validation

| Check | Result |
|-------|--------|
| `npm run build` (orderbhojan) | ✅ PASS |
| `npm run build:web` (Founder) | ✅ PASS |
| `validate-architecture.mjs` | ✅ PASS |
| `tests/m3-discovery.test.ts` | ✅ PASS |
| `tests/m15-experience.test.ts` | ✅ PASS |
| `npm run lint` | ⚠️ 4 pre-existing location UI errors — see [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) |

---

## Related deliverables

| Document | Purpose |
|----------|---------|
| [LISTING_COMPONENT_MAPPING.md](./LISTING_COMPONENT_MAPPING.md) | Component mapping table |
| [VISUAL_REGRESSION_REPORT.md](./VISUAL_REGRESSION_REPORT.md) | Visual comparison |
| [PERFORMANCE_REPORT.md](./PERFORMANCE_REPORT.md) | Bundle analysis |
| [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md) | Rollback procedure |
| [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) | Lint + known issues |

---

## Stop condition

**Milestone 2B complete.**

Per Chief Architect execution model:

**STOP — do not begin Milestone 2C (Search), 2D (UX States), Menu, Checkout, Orders, or Profile.**

Await approval before 2C.
