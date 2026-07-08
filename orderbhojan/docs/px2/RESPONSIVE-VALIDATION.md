# PX2 Responsive Validation

## Breakpoints (per RESPONSIVE-SPECIFICATION.md)

- Mobile: 390px — primary blueprint width
- Tablet: 768px — SideNav hidden, NavIsland centered
- Desktop: 1280px — SideNav visible, main content offset

## Implementation

- `ob-px2-marketplace` — sidebar padding at 1280px+
- ImmersiveHero — 40vh height token
- FoodRow — horizontal layout on mobile per blueprint
- StickyCategoryRail — horizontal scroll with safe-area insets

## Smoke

`npm run test:responsive` included in gate:px2.
