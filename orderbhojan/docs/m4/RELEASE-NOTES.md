# M4 Release Notes — Search Intelligence Platform

**Version:** `0.6.0-m4`  
**Tag:** `orderbhojan-v0.6.0-m4`

## Summary

OrderBhojan search transforms from a static placeholder into a **Search Intelligence Platform** — the single search layer for the entire marketplace.

## What's new

- **SearchPlatform** (`src/features/search/`) — orchestration, ranking hooks, suggestions, analytics
- **Premium full-screen search UX** — sticky bar, animated focus, voice/camera/AI placeholders
- **Zero-state browse** — recent, trending, popular, collections, meal-time rails
- **Composable results** — restaurants, foods, categories, collections, offers, cloud kitchens, brands
- **Reusable filters & sort** — cuisine, veg, distance, rating, ETA, price range
- **TanStack Query** — debounced search, cache, location invalidation
- **Analytics interfaces** — in-memory sink; no external dependency
- **Feature flag** — `FF_OB_SEARCH` (default OFF)

## Enable in dev

```bash
VITE_FF_OB_SEARCH=true
VITE_MSW_ENABLED=true
```

## Quality gate

```bash
npm run gate:m4
```

## Not included

Restaurant experience (M5), menu, cart, checkout, payments, orders, tracking.
