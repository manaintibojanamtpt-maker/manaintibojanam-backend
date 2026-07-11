# Phase 6 — Milestone 2B: Performance Report

**Agent:** 2 — Discovery Migration  
**Date:** 2026-07-10

## Bundle comparison

| Metric | After 2A (Home) | After 2B (Listing) | Delta 2B |
|--------|---------------|---------------------|----------|
| CSS (gzip) | 37.35 kB (251.14 kB raw) | 39.27 kB (252.82 kB raw) | +1.92 kB gzip |
| JS main chunk (gzip) | 388.62 kB (1,470.64 kB raw) | 405.71 kB (1,473.18 kB raw) | +17.09 kB gzip* |
| Precache total | 2,036 KiB | 2,040 KiB | +4 KiB |

\* Gzip delta includes module graph reordering; raw JS +2.54 kB only.

## Assessment

| Criterion | Result |
|-----------|--------|
| Unnecessary bundle increase | ✅ No — raw JS +0.17% |
| Tree-shaking maintained | ✅ Adapter path imports only |
| Lazy loading preserved | ✅ `loading="lazy"` default; spotlight uses `eager` |
| Duplicated components at runtime | ✅ Single `MarketplaceKitchenCardView` implementation |
| BDS listing components in hot path | ✅ Removed from discovery rails |

## Module graph

New modules in OrderBhojan bundle:
- `OrderBhojanKitchenCard` / `OrderBhojanMockKitchenCard`
- `mapRestaurantToKitchenCard`
- Enhanced `MarketplaceKitchenCardView` (shared with Founder marketplace)

Removed from hot path (still in repo):
- BDS `Card`, `Rail`, `Avatar`, `RestaurantPoster` for listing surfaces

## Recommendations (Phase 7+, not implemented)

1. Code-split `MarketplaceKitchenCardView` spotlight variant if menu/checkout migration grows barrel.
2. Remove unused `MarketplaceRestaurantTile` if confirmed dead.
3. Drop orphaned `experience-premium.css` listing rules after CSS cleanup gate.
