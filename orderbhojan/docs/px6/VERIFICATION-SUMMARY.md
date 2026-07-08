# PX6 Verification Summary

## Implementation

Food Experience (PX6) — desire-first dish discovery:

- Sticky **restaurant identity strip** (logo, name, back) — restaurant remains visible
- **Signature dishes rail** first viewport — BDS `DishPoster` + manifest photography
- **Sticky category rail** with scroll-spy (`useCategoryScrollSpy` + BDS `StickyCategoryRail`)
- **Editorial food rows** — BDS `FoodRow` with `AppetiteImage`, BlurHash, AVIF/WebP srcset
- **Customize bottom sheet** — variants (`SegmentedControl`), add-ons, quantity, live price, storytelling
- **Floating preview** — BDS `FloatingCart` glass bar (no checkout; Order Composer awaiting CEO approval)
- Restaurant → menu enter transition (`fromRestaurant` navigation state)
- No `placehold.co` in food fixtures — manifest-driven assets only

## QA

| Gate | Result |
|---|---|
| TypeScript + ESLint | PASSED |
| Unit tests | 152/152 PASSED |
| Production build | PASSED |
| Performance smoke | PASSED (1513 KB / 1650 limit) |
| BDS certification | 100% CERTIFIED |
| BDS a11y smoke | PASSED |
| Playwright screenshots | 16 captures in `docs/px6/` |

## Feature flag

Menu page requires `VITE_FF_OB_MENU=true` for local/preview.

## Scope lock

- Home — frozen (not modified except shared manifest assets)
- Restaurant — frozen (only `fromRestaurant` nav state on Open Menu)
- Order Composer / Review Order — **not implemented** (CEO approval pending)
- Checkout, payments, orders, cart page — not touched
