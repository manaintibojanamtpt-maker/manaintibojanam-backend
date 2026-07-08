# PX2 Visual Verification

Screens implemented against `docs/px15/prototypes/` and `SCREEN-BLUEPRINTS.md`.

## Screen matrix

| Screen | Blueprint | BDS components | Layout class |
|--------|-----------|----------------|--------------|
| Home | home-mobile.svg | ImmersiveHero, PremiumSearch, PremiumChip | bds-px2-page |
| Restaurant | restaurant-mobile.svg | RestaurantHero, MiniNavIsland, FloatingCTA | ob-restaurant-immersive-wrap |
| Menu | menu-mobile.svg | FoodRow, StickyCategoryRail, MiniNavIsland | ob-menu-px2 |
| Search | search-mobile.svg | PremiumSearch | ob-search-px2 |
| Profile | profile-mobile.svg | GlassSurface, Avatar | ob-profile-px2 |
| Cart | cart-empty.svg | PremiumEmpty | ob-cart-px2 |

## Tolerance

Spacing ±2px, typography/color/radius/motion per DESIGN-TOKENS.md.

## Manual verification

Compare local dev (`npm run dev`) against prototype SVGs in `docs/px15/prototypes/` at 390×844 and 1280×800 breakpoints.
