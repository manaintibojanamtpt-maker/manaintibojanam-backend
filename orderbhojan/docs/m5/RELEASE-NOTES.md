# M5 Release Notes — Restaurant Experience Platform

**Version:** `0.7.0-m5`  
**Tag:** `orderbhojan-v0.7.0-m5`

## Summary

Restaurants become **premium destination pages** — emotional connection before menu, owned by a reusable Restaurant Experience Layer.

## What's new

- **Restaurant Experience Layer** (`src/features/restaurant/`)
- **Edge-to-edge restaurant page** — hero, logo, meta, offers, gallery, hours, policies
- **Quick actions** — share, favorite (with burst animation)
- **Placeholders** — reviews, recommendations, call, directions, Open Menu (M6)
- **Marketplace API** — experience, gallery, offers, highlights endpoints
- **TanStack Query** — cache, retry, location invalidation
- **Feature flag** — `FF_OB_RESTAURANT` (default OFF)
- **Discovery integration** — cards navigate to restaurant when flag enabled

## Enable in dev

```bash
VITE_FF_OB_RESTAURANT=true
VITE_MSW_ENABLED=true
```

Visit: `/restaurant/demo-biryani-house`

## Quality gate

```bash
npm run gate:m5
```

## Not included

Menu (M6), cart, checkout, payments, orders, tracking.
