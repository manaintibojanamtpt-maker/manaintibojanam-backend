# M3 Release Notes — Marketplace Discovery Engine

**Version:** `0.5.0-m3`  
**Tag:** `orderbhojan-v0.5.0-m3`

## Summary

OrderBhojan home transforms from mock restaurant shells into a **data-driven discovery feed** powered by a reusable Discovery Engine.

## What's new

- **Discovery Engine** (`src/features/discovery/`) — ranking, filtering, collections, sort, personalization hooks
- **Marketplace Discovery API client** — `/api/marketplace/discovery/*` endpoints
- **MSW mocks** — 11+ restaurants, 20 collection types
- **TanStack Query hooks** — cache, stale time, retry, location invalidation
- **Discovery UI** — horizontal rails, filters, skeletons, empty/error/retry, load-more pagination
- **Feature flag** — `FF_OB_DISCOVERY` (default OFF)

## Collections supported

Nearby, Featured, Top Rated, Fast Delivery, Cloud Kitchens, Trending, Recommended, meal-time rails, Offers, Festival Specials, Popular Near You, New on OrderBhojan, Healthy Choices, Family Meals, Beverages, Desserts, Recently Added.

Only **Nearby** is marked API-backed initially; others use MSW until backend is ready.

## Enable in dev

```bash
VITE_FF_OB_DISCOVERY=true
VITE_MSW_ENABLED=true
```

## Quality gate

```bash
npm run gate:m3
```

## Not included

Menu, cart, checkout, payments, orders, tracking, search (M4).
