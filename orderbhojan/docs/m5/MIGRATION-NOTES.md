# M5 Migration Notes — Restaurant Experience Platform

## Version

`0.7.0-m5`

## Enabling restaurant pages

```bash
VITE_FF_OB_RESTAURANT=true
VITE_MSW_ENABLED=true
# Optional — location-aware serviceability
VITE_FF_LOCATION_ENABLED=true
# Optional — navigate from discovery cards
VITE_FF_OB_DISCOVERY=true
```

## Architecture

```
/restaurant/:slug → RestaurantRoutePage → RestaurantExperiencePage
  → restaurantExperienceLayer → restaurantApiClient → Marketplace API
```

UI never calls `getMarketplaceApiClient()` directly. `contextToken` stays in the API payload and is stripped by the experience layer (reserved for M6 Menu).

## API endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/marketplace/restaurants/:slug` | Full experience payload |
| `GET /api/marketplace/restaurants/:slug/gallery` | Gallery images |
| `GET /api/marketplace/restaurants/:slug/offers` | Offers |
| `GET /api/marketplace/restaurants/:slug/highlights` | Highlights |

Legacy detail: `GET /api/marketplace/restaurants/:slug?legacy=true`

## Route

Restaurant pages render in **FullScreenLayout** (edge-to-edge, no bottom nav).

Example: `/restaurant/demo-biryani-house`

## Out of scope

Menu, cart, checkout, payments, orders, tracking, BhojanOS changes.

Open Menu CTA is disabled until M6.
