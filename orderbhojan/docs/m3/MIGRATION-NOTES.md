# M3 Migration Notes — Marketplace Discovery Engine

## Version

`0.5.0-m3`

## Enabling discovery

Discovery is **OFF** by default. Enable in development:

```bash
VITE_FF_OB_DISCOVERY=true
VITE_MSW_ENABLED=true
# Optional — location-aware nearby rails
VITE_FF_LOCATION_ENABLED=true
```

## Architecture change

Home restaurant rails no longer use M1.5 mock hooks when `FF_OB_DISCOVERY=true`.

```
Home → Discovery Engine → Marketplace API → Collections → Restaurant Cards
```

The experience layer never calls `getMarketplaceApiClient()` directly for restaurants.

## API endpoints (new)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/marketplace/discovery` | Full home feed |
| `GET /api/marketplace/discovery/nearby` | Nearby (API-backed in MSW) |
| `GET /api/marketplace/discovery/featured` | Featured rail |
| `GET /api/marketplace/discovery/trending` | Trending rail |
| `GET /api/marketplace/discovery/cloud-kitchens` | Cloud kitchens |
| `GET /api/marketplace/discovery/top-rated` | Top rated |
| `GET /api/marketplace/discovery/offers` | Offers |
| `GET /api/marketplace/discovery/:collectionId` | Other collections |

Legacy `GET /api/marketplace/discover` remains unchanged for backward compatibility.

## Fallback behaviour

When `FF_OB_DISCOVERY=false`, M1.6 mock restaurant rails are preserved unchanged.

## Location integration

Discovery reads M2 `useActiveLocation()` coordinates. When location is unavailable, defaults to Hyderabad demo coordinates (`17.4401, 78.3489`). Location changes invalidate TanStack Query discovery cache.

## Out of scope (M3)

Restaurant detail, menu, cart, checkout, payments, orders, tracking, search platform, BhojanOS changes.
