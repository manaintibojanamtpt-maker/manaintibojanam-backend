# PX2 Implementation Report

**Version:** 0.9.0-px2  
**Program:** PX2 — Design-to-Code Implementation  
**Source of truth:** `docs/px15/DESIGN-FREEZE.md`

## Scope

Faithful translation of approved PX1.5 design into production React via BDS v1.1-px2. Presentation-only changes; routing, APIs, auth, and business logic frozen.

## Phases completed

| Phase | Status | Notes |
|-------|--------|-------|
| 1 Design System | Done | BDS 1.1.0-px2 — ImmersiveHero, FoodRow, NavIsland, PremiumSearch, motion tokens |
| 2 Home | Done | 40vh ImmersiveHero, PremiumSearch, PremiumChip |
| 3 Restaurant | Done | RestaurantHero, MiniNavIsland, FloatingCTA |
| 4 Menu | Done | FoodRow, StickyCategoryRail, MiniNavIsland |
| 5 Search | Done | PremiumSearch sticky variant |
| 6 Profile | Done | Consumer shell, food theme |
| 7 Bottom sheets | Partial | FoodCustomizeSheet retained; styled via existing food CSS |
| 8 Navigation | Done | NavIsland + SideNav via ExperienceBottomNav |
| 9 Dark mode | Done | `food` theme default via AppProviders |
| 10 Responsive | Done | Safe-area utilities in experience-px2-layout.css |

## Files added

- `src/styles/experience-px2-layout.css`
- `tests/px2-design-implementation.test.ts`
- `scripts/gate-px2.mjs`
- `docs/px2/*`

## Files deprecated (not deleted — gate:m65 regression)

- `src/styles/experience-premium-m65.css`

## Gate

Run `npm run gate:px2` from `orderbhojan/`.
