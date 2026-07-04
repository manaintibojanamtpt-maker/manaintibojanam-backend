# M6 Release Notes — Food Experience Platform

**Version:** `0.8.0-m6`  
**Tag:** `orderbhojan-v0.8.0-m6`

## Summary

Restaurants now offer a **premium food browsing experience** — discover, customize, and preview dishes before the M7 cart platform.

## What's new

- **Food Experience Layer** (`src/features/food/`)
- **Menu page** — sticky category rail, featured dishes, category sections, recommendations, best sellers, chef specials, today's specials
- **Food cards** — large imagery, dietary badges, offer chips, quantity stepper, animated add
- **Customization sheet** — variants (size/weight) and add-ons with special instructions placeholder
- **Floating cart preview** — preview-only bar (not M7 checkout)
- **Marketplace API** — menu, categories, recommended, bestsellers endpoints
- **TanStack Query** — cache, retry, location invalidation
- **Feature flag** — `FF_OB_MENU` (default OFF)
- **M5 integration** — Open Menu CTA when flag enabled

## Enable in dev

```bash
VITE_FF_OB_RESTAURANT=true
VITE_FF_OB_MENU=true
VITE_MSW_ENABLED=true
```

Visit: `/restaurant/demo-biryani-house/menu`

## Quality gate

```bash
npm run gate:m6
```

## Not included

Cart platform (M7), checkout, payments, orders, tracking.
