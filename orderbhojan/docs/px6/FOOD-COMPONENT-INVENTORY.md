# PX6 Food Component Inventory

## Page shell

| Component | Path | Role |
|---|---|---|
| `FoodExperiencePage` | `src/features/food/ui/FoodExperiencePage.tsx` | PX6 layout orchestration, hero preload, category sections |
| `FoodRestaurantStrip` | `src/features/food/ui/FoodRestaurantStrip.tsx` | Sticky restaurant identity (logo, name, back) |
| `FoodCategoryRail` | `src/features/food/ui/FoodCategoryRail.tsx` | BDS `StickyCategoryRail` scroll-spy delegate |

## Food presentation

| Component | Path | Role |
|---|---|---|
| `FoodFeaturedPoster` | `src/features/food/ui/FoodFeaturedPoster.tsx` | Signature rail — BDS `DishPoster` + badges |
| `FoodCardItem` | `src/features/food/ui/FoodCardItem.tsx` | Category list — BDS `FoodRow` editorial + manifest photos |
| `FoodStoryPanel` | `src/features/food/ui/FoodStoryPanel.tsx` | Chef note, ingredients, pairing in customize sheet |

## Customization & preview

| Component | Path | Role |
|---|---|---|
| `FoodCustomizeSheet` | `src/features/food/ui/FoodCustomizeSheet.tsx` | Bottom sheet — variants, add-ons, quantity, live price |
| `FoodFloatingPreview` | `src/features/food/ui/FoodFloatingPreview.tsx` | BDS `FloatingCart` glass preview (no checkout) |

## BDS extensions (PX6)

| Component | Change |
|---|---|
| `FoodRow` | `AppetiteImage`, manifest props, `editorial` density, `meta` slot, 1-line description clamp |

## Data & photography

| Module | Path | Role |
|---|---|---|
| `food-item-photo-manifest` | `src/features/food/data/food-item-photo-manifest.ts` | foodId → manifest asset mapping |
| `food-photo-manifest` | `src/features/experience/data/food-photo-manifest.ts` | WebP/AVIF/srcset/BlurHash assets (+ dish IDs) |
| `formatters` | `src/features/food/domain/formatters.ts` | `ratingLabel`, `spiceLabel` |

## Hooks

| Hook | Path | Role |
|---|---|---|
| `useCategoryScrollSpy` | `src/features/food/hooks/useCategoryScrollSpy.ts` | Category rail IntersectionObserver |
| `useFoodMenu` | `src/features/food/hooks/useFoodMenu.ts` | Menu query + preview store restaurant scope |
| `useHeroPreload` | `src/features/experience/hooks/useHeroPreload.ts` | First signature dish preload |

## Styles

| File | Scope |
|---|---|
| `src/styles/experience-food.css` | `.ob-food-px6*` layout, motion, glass preview, storytelling |

## Out of scope (CEO lock)

- Order Composer (“Review Order” CTA)
- Checkout, payments, orders, cart page changes
