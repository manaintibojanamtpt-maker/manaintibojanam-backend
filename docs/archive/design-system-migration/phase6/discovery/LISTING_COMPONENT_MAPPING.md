# Listing Component Mapping — Phase 6 / Milestone 2B

**Agent:** 2 — Discovery Migration  
**Date:** 2026-07-10

| Current OrderBhojan Component | Founder Design System Component | Migration Status |
| ----------------------------- | ------------------------------- | ---------------- |
| `DiscoveryRestaurantCard` | `MarketplaceKitchenCardView` via `OrderBhojanKitchenCard` | ✅ Complete |
| `KitchenSpotlightCard` | `MarketplaceKitchenCardView` (`variant="spotlight"`) via `OrderBhojanKitchenCard` | ✅ Complete |
| `HomeRestaurantPoster` | `MarketplaceKitchenCardView` via `OrderBhojanMockKitchenCard` | ✅ Complete |
| `HomeKitchenSpotlightMock` | `OrderBhojanMockKitchenCard` (`variant="spotlight"`) | ✅ Complete |
| `FeaturedRestaurantsSection` | `Section` + `SectionHeader` + `OrderBhojanMockKitchenCard` grid/rail | ✅ Complete |
| `DiscoveryCollectionRail` | `Section` + `SectionHeader` + `OrderBhojanKitchenCard` + `SoftButton` | ✅ Complete |
| `PremiumListingCard` (BDS `Card` + `premium-card` CSS) | `MarketplaceKitchenCardView` | ✅ Replaced (was `DiscoveryRestaurantCard`) |
| `OfferCard` (BDS `Badge variant="offer"`) | `MarketplaceKitchenCardView` badge slot | ✅ Complete |
| `RestaurantGrid` (BDS `Rail` horizontal layout) | Founder `Section` + responsive flex/grid | ✅ Complete |
| `MarketplaceRestaurantTile` | `MarketplaceKitchenCardView` | ⏸ Deferred — unused in runtime routes (dead export) |
| `SearchResultRow` (restaurant rows) | Inherits via `DiscoveryRestaurantCard` re-export | ✅ Presentation only (search page is 2C) |
| `FavoritesPage` grid | Inherits via `DiscoveryRestaurantCard` re-export | ⏸ Out of Agent 2 scope; card presentation updated |

## Presentation wiring layer

| File | Role |
|------|------|
| `orderbhojan/src/presentation/discovery/OrderBhojanKitchenCard.tsx` | `RestaurantPublic` → DS card + favorites |
| `orderbhojan/src/presentation/discovery/OrderBhojanMockKitchenCard.tsx` | `MockRestaurant` → DS card + favorites |
| `orderbhojan/src/presentation/discovery/mapRestaurantToKitchenCard.ts` | View-model mappers (no business logic) |

## Legacy files retained (rollback / Phase 7)

| File | Runtime use |
|------|-------------|
| `DiscoveryRestaurantCard.tsx` | Re-export shim → `OrderBhojanKitchenCard` |
| `HomeRestaurantPoster.tsx` | Re-export shim → `OrderBhojanMockKitchenCard` |
| `KitchenSpotlightCard.tsx` | Thin wrapper → spotlight variant |
| `experience-discovery.css` | Loaded globally; listing classes unused at runtime |
| `experience-premium.css` | `.ob-restaurant-tile` rules orphaned for listing |
