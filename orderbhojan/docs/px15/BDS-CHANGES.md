# BDS Changes — PX1.5

**Target release:** `@bhojan/design-system` v1.1-px15  
**Rule:** All PX1.5 UI patterns become BDS exports. OrderBhojan has zero local components.

---

## New token files / extensions

| File | Change |
|------|--------|
| `tokens/colors.ts` | +warm luxury, glass, glow, badge gold, gradients |
| `tokens/typography.ts` | +displayHero, microLabel, titleSm, priceLg, scriptAccent |
| `tokens/spacing.ts` | +section gaps 48/64/80, cardInset, touchMin, layout* |
| `tokens/shadows.ts` | +foodCard, navIsland, glowPrimary, liftSoft |
| `tokens/motion.ts` | **NEW** — spring, durations |
| `tokens/radius.ts` | +foodCard, navIsland, thumb |
| `utilities/safeArea.css` | **NEW** |
| `themes/food.css` | **NEW** — warm dark |
| `themes/foodLight.css` | **NEW** — cream light |

---

## New components

| Component | Priority | Storybook |
|-----------|----------|-----------|
| `ImmersiveHero` | P0 | ✓ |
| `RestaurantHero` | P0 | ✓ |
| `FoodRow` | P0 | ✓ |
| `NavIsland` | P0 | ✓ |
| `MiniNavIsland` | P0 | ✓ |
| `SideNav` | P0 | ✓ |
| `PremiumSearch` | P0 | ✓ |
| `PremiumChip` | P0 | ✓ |
| `StickyCategoryRail` | P0 | ✓ |
| `ContextHeader` | P0 | ✓ |
| `GlassSurface` | P0 | ✓ |
| `AppetiteImage` | P0 | ✓ |
| `CartBar` | P0 | ✓ |
| `FloatingCTA` | P1 | ✓ |
| `OfferBanner` | P1 | ✓ |
| `HeroCarousel` | P1 | ✓ |
| `PremiumEmpty` | P1 | ✓ |
| `WarmCard` | P1 | ✓ |

---

## Extended components

| Component | Extension |
|-----------|-----------|
| `FoodCard` | `layout="row" \| "card" \| "spotlight"` |
| `RestaurantCard` | `size="immersive" \| "compact" \| "grid"` |
| `BottomSheet` | `variant="warm-glass"`, snapPoints |
| `Button` | `variant="appetite"` |
| `Skeleton` | `shape="hero-food" \| "food-row" \| "restaurant-tile"` |
| `Text` | variants: displayHero, microLabel, titleSm, priceLg, scriptAccent |
| `ThemeProvider` | modes food, foodLight |
| `FloatingCart` | spring animations built-in |
| `QuantityStepper` | haptic prop |
| `SearchBar` | deprecated default trailing icons — use PremiumSearch |

---

## Motion package (`motion/`)

| Export | Source |
|--------|--------|
| MotionPage | PX1.5 spec |
| MotionReveal | PX1.5 spec |
| MotionPress | PX1.5 spec |
| SharedHero | PX1.5 spec |
| FlyToCart | PX1.5 spec |
| useHaptic | PX1.5 spec |

---

## ARB constraints

- Non-breaking v1.0 API
- No business logic in BDS
- Presentation only
- Tree-shakeable exports

---

## BDS gate (pre-implementation)

```bash
npm run gate:bds-px15   # to be created at implementation time
```

Requirements:
- All new components have Storybook stories
- a11y addon pass per component
- Token documentation generated

---

## Versioning

| Package | Version |
|---------|---------|
| design-system | 1.1.0-px15 |
| orderbhojan | 0.9.0-px1 (after implementation) |

Design freeze version: **0.8.9-px15**

---

## DRB + ARB approval

- [ ] Component API surfaces approved
- [ ] Token naming approved  
- [ ] Storybook visual matches prototypes

See [COMPONENT-MAPPING.md](./COMPONENT-MAPPING.md)
