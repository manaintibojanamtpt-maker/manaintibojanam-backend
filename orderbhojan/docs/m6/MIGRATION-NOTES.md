# M6 Migration Notes — Food Experience Platform

## Feature flag

Add to your environment when ready to test:

```bash
VITE_FF_OB_MENU=true
VITE_FF_OB_RESTAURANT=true
VITE_MSW_ENABLED=true
```

Default remains **OFF** in production builds.

## Routing

| Route | Component |
|-------|-----------|
| `/restaurant/:restaurantSlug/menu` | `FoodRoutePage` → `FoodExperiencePage` |

Restaurant page **Open Menu** CTA navigates here when `FF_OB_MENU` is enabled.

## Architecture

```
Restaurant Page → Food Experience Layer → Food API Client → Marketplace API
```

UI components never import `getMarketplaceApiClient` directly.

## Preview store

`foodPreviewStore` holds **preview quantities only** — not the M7 cart platform. Persist key: `ob-food-preview-m6`.

## API endpoints (MSW)

- `GET /api/marketplace/restaurants/:slug/menu`
- `GET /api/marketplace/restaurants/:slug/categories`
- `GET /api/marketplace/restaurants/:slug/recommended`
- `GET /api/marketplace/restaurants/:slug/bestsellers`

## Not included

Cart checkout, payments, orders, tracking, notifications (M7+).
