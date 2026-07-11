# Technical Debt — Phase 6 Discovery Migration

**Last updated:** 2026-07-10  
**Owner:** Agent 2 — Discovery Migration

---

## Pre-existing lint issues (do not block migration)

Recorded per Chief Architect Milestone 2A decision. **Not introduced by 2A or 2B.**

| File | Rule | Issue |
|------|------|-------|
| `orderbhojan/src/features/location/ui/AddressFormSheet.tsx:64` | `react-hooks/set-state-in-effect` | `setSelection()` called synchronously inside `useEffect` on sheet open |
| `orderbhojan/src/features/location/ui/DeliveryLocationWizard.tsx:60` | `react-hooks/set-state-in-effect` | `setStep('detect')` and related resets inside `useEffect` on wizard open |

**Impact:** ESLint `npm run lint` fails with 4 errors (2 rules × effect chains).  
**Mitigation:** Refactor to keyed remount or derive initial state from `open` prop — separate location-engine task.  
**Migration gate:** Does not block Phase 6 presentation work.

---

## Pre-existing CSS / tooling warnings

| Issue | Location | Notes |
|-------|----------|-------|
| `@import` order warning (Google Fonts) | `src/design-system/tokens/typography.css` via OB `globals.css` | Build succeeds; cosmetic PostCSS warning |
| BDS + Founder DS dual CSS | `orderbhojan/src/styles/globals.css` | Expected until Phase 7 CSS cleanup |

---

## New issues introduced (2A + 2B + 2C + 2D)

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| TD-6-01 | Nested `Section` wrappers (home page + collection rails) | Low | Accepted — spacing intentional |
| TD-6-02 | `MarketplaceBadge.id` extended with `offer`, `closed`, `kitchen_format` | Low | Documented; founder type updated |
| TD-6-03 | ~~`SearchResultRow` picks up new card via shim without 2C search layout migration~~ | Low | **Resolved in 2C** |
| TD-6-04 | `MarketplaceRestaurantTile` still BDS; unused in routes | Low | Phase 7 or delete if confirmed dead |
| TD-6-05 | `experience-search.css` loaded but hot-path rules orphaned | Low | Phase 7 CSS cleanup |
| TD-6-06 | `MarketplaceSearchResults` not used wholesale — sectioned OB response mapped to primitives | Low | Accepted — preserves business logic |
| TD-6-07 | Test suite updated for DS migration (`m15`, `m65`, `px2`) | Low | Documented |
| TD-6-08 | `DiscoveryFiltersBar` still BDS Chip/Button (filter logic unchanged) | Low | Phase 7 filter chip migration |
| TD-6-09 | `useOnlineStatus` is presentation-only — does not integrate React Query offline mode | Low | Accepted — banner UX only |
| TD-6-10 | `OrderBhojanDiscoveryStatePanel` shim delegates to UX state | Low | Phase 7 remove shim |

---

## Dependency analysis

```
RestaurantPublic / MockRestaurant
        ↓ mapRestaurantToKitchenCard (presentation)
MarketplaceKitchenCard (view model)
        ↓
MarketplaceKitchenCardView (src/design-system)
        ↑ favoriteSlot wired in OrderBhojanKitchenCard
useFavoritesStore, useRestaurantFeatureEnabled (unchanged)
```

- **No new npm dependencies** in 2B.
- **No Firestore / React Query / discovery engine imports** in design-system card.
- **Adapter imports only** from OrderBhojan (`@bhojan/storefront-design-system/marketplace/*`, `primitives/*`).

---

## Remaining duplicate components (Phase 7)

- BDS `Card`, `Rail`, `RestaurantPoster`, `Badge` used in non-listing flows
- BDS `PremiumSearch`, custom `ob-search-suggestions` in legacy files (shimmed)
- `experience-discovery.css`, `experience-premium.css`, `experience-search.css` orphaned rules
- `MarketplaceRestaurantTile.tsx` (orphaned)
- Shim files: `DiscoveryRestaurantCard.tsx`, `HomeRestaurantPoster.tsx`, `SearchExperience.tsx`, `SearchResultRow.tsx`, …
- `presentation/states/` shims via `OrderBhojanDiscoveryStatePanel` and `ExperienceEmptyStates`
- `ExperienceSkeletons.tsx` retained for non-discovery surfaces
