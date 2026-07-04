# M1.5 Architecture Report — Marketplace Experience Shell

## Scope

```
┌─────────────────────────────────────────────────────────────┐
│ OrderBhojan M1.5 Experience Shell                            │
│  Home · Search · Cart · Orders · Profile (UI only)          │
│  Mock catalog (TanStack Query + static data)                │
│  Zustand: cart preview, favorites, category selection       │
│  BDS v1.0 components exclusively                            │
├─────────────────────────────────────────────────────────────┤
│  ✕ No Marketplace API calls in experience flows             │
│  ✕ No Discovery / Location / Restaurant / Cart checkout     │
└─────────────────────────────────────────────────────────────┘
```

## Module Layout

```
src/features/experience/
├── domain/experience.types.ts
├── data/mockCatalog.ts
├── store/          # cartPreview, favorites, category
├── hooks/          # mock queries, greeting
└── ui/
    ├── home/       # Hero, banner, categories, rails
    ├── search/     # Recent/popular/trending UI
    ├── cart/       # Empty + mock preview
    ├── orders/     # Empty state
    ├── layout/     # ExperienceBottomNav
    └── shared/     # Tiles, skeletons, floating cart
```

## Data Flow

1. **Featured restaurants** — `useFeaturedRestaurants()` resolves static mock after artificial delay
2. **Skeleton sections** — Nearby, Top Rated, Cloud Kitchens, Recently Ordered remain skeleton-only
3. **Cart preview** — `useCartPreviewStore` toggles BDS `FloatingCart` on mock ADD
4. **Favorites** — Local Zustand persist; no API

## Navigation

Five-item bottom nav: Home, Search, Cart, Orders, Profile. Animated indicator via CSS (`data-active`).

## Auth Integration

- Profile accessible to guests (sign-in CTA)
- Orders requires authentication (`RequireAuth`)
- Hero header reads `useAuth()` for greeting and avatar

## Styling Strategy

- All UI from `@bhojan/design-system`
- `experience-shell.css` adds layout/motion using `--bds-*` tokens only
- `prefers-reduced-motion` disables animations

## Testing

| Layer | Coverage |
|-------|----------|
| Unit | Greeting, mock catalog, route wiring |
| Boundaries | No marketplace API in experience module |
| BDS | Storybook story file presence for key components |
| Gate | lint, test, build, performance, certify:bds, gate:m1 |

## Deferred

M2 Location, M3 Discovery, M5 Restaurant, M7 Cart, M8 Checkout
