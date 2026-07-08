# PX2 BDS Compliance Report

**BDS version:** 1.1.0-px2

## Rule

No OrderBhojan-only UI components. All new patterns live in `packages/design-system`.

## Components used

- ImmersiveHero, PremiumSearch, PremiumChip, FoodRow, FoodRowAddButton
- RestaurantHero, FloatingCTA, MiniNavIsland, NavIsland, SideNav
- StickyCategoryRail, PremiumEmpty, MotionPage, MotionReveal, MotionPress, GlassSurface
- AppetiteImage (via RestaurantHero / FoodRow)

## Local wrappers

| File | Role |
|------|------|
| FoodCategoryRail.tsx | Maps menu categories → StickyCategoryRail items (data adapter only) |
| premiumMotion.tsx | Re-exports BDS motion (M65 gate artifact) |

## Certification

`npm run certify:bds` — component adoption 100%, theme adoption 100%.
