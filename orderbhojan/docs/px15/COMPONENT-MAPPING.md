# Component Mapping — PX1.5

**Rule:** Every screen element maps to a BDS component. No screen-specific UI.

---

## HOME

| UI element | BDS component | Props / variant |
|------------|---------------|-----------------|
| Hero block | `ImmersiveHero` | `height="40vh"`, `scrim="hero"` |
| Hero image | `AppetiteImage` | aspect 16:10, blur-up |
| Location | `LocationChip` | `variant="compact"`, glass |
| Craving line | `Text` | `variant="body"` |
| Section eyebrow | `Text` | `variant="microLabel"` |
| Headline | `Text` | `variant="displayHero"` |
| Search | `PremiumSearch` | `variant="floating"` |
| Categories | `PremiumChip` | photo fill, 72px |
| Restaurant cards | `RestaurantCard` | `size="immersive"` |
| Restaurant rail | `Rail` | snap mandatory |
| Trending dishes | `FoodRow` | `density="compact"` |
| Trust strip | `Text` + `Icon` | caption |
| Bottom nav | `NavIsland` | 5 items |
| Floating cart | `FloatingCart` | when count > 0 |
| Loading | `Skeleton` | shape hero-food, restaurant-tile |
| Empty | `PremiumEmpty` | illustration slot |

---

## DISCOVERY

| UI element | BDS component |
|------------|---------------|
| Filters | `SegmentedControl` |
| Collections | `OfferCard` in `Rail` |
| Grid toggle | `Button` variant ghost + Icon |
| Cards | `RestaurantCard` immersive |

---

## SEARCH

| UI element | BDS component |
|------------|---------------|
| Header back | `Button` ghost + Icon |
| Field | `PremiumSearch` variant sticky |
| Recent/trending | `Chip` |
| Collections | `WarmCard` + AppetiteImage |
| Result restaurant | `RestaurantCard` size compact row |
| Result food | `FoodRow` compact |
| No results | `PremiumEmpty` |
| Filters | `Chip` bar |

---

## RESTAURANT

| UI element | BDS component |
|------------|---------------|
| Header | `ContextHeader` collapsing |
| Cover | `RestaurantHero` |
| Logo | `Avatar` size xl |
| Name | `Text` displayXl |
| Meta | `Text` caption + Badge |
| Offers | `OfferBanner` |
| Actions | `Button` ghost + Icon |
| Highlights | `PremiumChip` photo |
| Menu preview | `FoodRow` ×3 |
| About | `Accordion` (BDS extend) or collapsible Card |
| Gallery | `AppetiteImage` grid |
| Policies | `Text` body in WarmCard |
| CTA | `FloatingCTA` |
| Mini nav | `MiniNavIsland` |

---

## MENU

| UI element | BDS component |
|------------|---------------|
| Header | `ContextHeader` |
| Category rail | `StickyCategoryRail` |
| Spotlight | `FoodCard` layout spotlight |
| Section label | `Text` microLabel |
| Items | `FoodRow` |
| ADD | `Button` variant appetite |
| Stepper | `QuantityStepper` |
| Cart bar | `CartBar` |
| Customize | `BottomSheet` warm-glass |
| Variants | `SegmentedControl` |
| Add-ons | `Chip` multi |
| Instructions | `Input` |

---

## CART

| UI element | BDS component |
|------------|---------------|
| Header | `Text` heading |
| Restaurant | `RestaurantCard` compact |
| Lines | `FoodRow` + QuantityStepper |
| Summary | `BillSummary` |
| Proceed | `Button` primary locked state |
| Empty | `PremiumEmpty` |

---

## PROFILE

| UI element | BDS component |
|------------|---------------|
| Hero | `GlassSurface` + Avatar |
| Name | `Text` title |
| Guest CTA | `Button` primary/secondary |
| Quick tiles | `WarmCard` ×3 |
| Settings | `Card` list rows |
| Sign out | `Button` ghost |

---

## STATES

| State | BDS component |
|-------|---------------|
| Loading | `Loader` + Skeleton shapes |
| Error | `ErrorState` |
| Empty | `PremiumEmpty` |
| Toast | `Toast` |

---

## Motion wrappers

| Wrapper | BDS export |
|---------|------------|
| Page enter | `MotionPage` |
| Section stagger | `MotionReveal` |
| Press | `MotionPress` |
| Hero transition | `SharedHero` |
| Add animation | `FlyToCart` |

---

## Forbidden in OrderBhojan

- `premiumMotion.tsx` (delete at implementation)
- `experience-premium-m65.css` (delete)
- `MarketplaceRestaurantTile` (replace)
- `MarketplaceFoodTile` (replace)
- `FoodCardItem` custom article (replace with FoodRow)
- Any `ob-m65-*` or `ob-px*` CSS classes for components

Layout utilities only in single `experience-layout.css` if needed (max 200 lines, ARB approved).
