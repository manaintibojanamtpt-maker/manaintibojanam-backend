# Screen Blueprints — PX1.5

**Frame reference:** Mobile 375×812 · Tablet 820×1180 · Desktop 1440×900  
**Annotation key:** `[n]` = spacing in px · `(BDS Component)` = required component

---

## 1. HOME

### Mobile portrait — Light (375×812)

```
┌────────────────────────────────────── 375px
│ [safe-top 12px min]                  │
│ [1] LocationChip (glass) 32h  ←16→   │  y: 12+safe
├──────────────────────────────────────┤
│                                      │
│         HERO 40vh = 325px            │  ImmersiveHero
│         (full bleed food photo)      │  AppetiteImage aspect 16:10
│         gradient scrim bottom        │
│                                      │
│  [2] microLabel "NEAR YOU"     ←16→  │  y: hero-120
│  [3] displayHero "Hyderabadi…"       │  max 2 lines
│  [4] body craving line               │  1 line
│  [5] PremiumSearch pill 48h    ←16→  │  integrated in hero bottom
├──────────────────────────────────────┤  y: 325
│ [6] Category PremiumChip ×5    ←16→  │  72px circles, gap 12
│      scroll-x                        │
├──────────────────────────────────────┤  +48 section
│ microLabel + heading "Restaurants"     │
│ [7] RestaurantCard immersive ×N      │  280w, 16:10, gap 16
│      horizontal Rail                 │
├──────────────────────────────────────┤  +48
│ microLabel + "Trending dishes"         │
│ [8] FoodRow compact ×N scroll-x      │
├──────────────────────────────────────┤  +48
│ Trust strip ★4.9 · Fresh · Fast      │  caption, 20px icons
├──────────────────────────────────────┤
│         (scroll content)             │
│                                      │
│  [9] NavIsland 64h + safe-bottom     │  fixed
└──────────────────────────────────────┘
```

| # | Spec |
|---|------|
| Hero | 40% viewport height, edge-to-edge, no side margin |
| Search | Inside hero, 16px inset, full width minus 32px |
| Section gaps | 48px |
| Nav | Floating, max-width 340px, centered, 16px from bottom + safe |

**Components:** `ImmersiveHero`, `PremiumSearch`, `LocationChip`, `PremiumChip`, `RestaurantCard`, `FoodRow`, `NavIsland`

### Mobile portrait — Dark
Same layout. `food` theme: bg `#070504`, glass warm, cream text. Prototype: `prototypes/home-mobile-dark.svg`

### Mobile landscape (812×375)
Hero max 40vh (~150px). Categories single row. NavIsland compact 56px.

### Tablet (820×1180)
Split row: hero 55% left (50vh), location+search+craving 45% right top. Categories 2-row grid 88px. Restaurants 2-col grid. NavIsland centered max 480px.

### Desktop (1440×900)
SideNav 240px left. Hero band 65vh full content width. Discovery 3-col grid. No bottom NavIsland.

**States:** loading → `skeleton-state.svg` · error → `error-state.svg` · empty → `empty-state.svg`

---

## 2. DISCOVERY

Discovery extends home feed when `FF_OB_DISCOVERY` on — same visual language as home restaurant grid.

### Mobile
- Filters: `SegmentedControl` sticky below search, 44px
- Collection rails: `OfferCard` horizontal 200w
- Grid mode toggle: rail / grid (icon only)
- Restaurant cards: same `RestaurantCard immersive`

**Prototype:** `prototypes/discovery-mobile.svg`

---

## 3. SEARCH

### States (mobile 375×812)

| State | Layout |
|-------|--------|
| Zero | Back + PremiumSearch autofocus · Recent chips · Trending · Collections 2-col |
| Typing | Suggestions dropdown below field, max 5 |
| Results | Restaurant rows 72px thumb · FoodRow compact |
| No results | PremiumEmpty + trending fallback |
| Filters | Chip bar below header when results active |

**Field:** 48px height, pill radius, glass warm, **no trailing disabled icons**.

**Prototype:** `prototypes/search-mobile.svg`

---

## 4. RESTAURANT

### Mobile portrait

```
┌──────────────────────────────────────
│ ← ContextHeader (collapsing)         │  sticky
├──────────────────────────────────────
│ RestaurantHero 45vh edge-to-edge     │
│ gradient scrim                       │
├──────────────────────────────────────
│    (logo 80px overlap -40px)         │
│ displayXl name                       │
│ caption ★4.8 · 25m · 2.1km · ₹40    │
├──────────────────────────────────────  +24
│ OfferBanner rail 120h                │
├──────────────────────────────────────  +24
│ Quick: Favorite · Share              │  56h, no Call/Direction
├──────────────────────────────────────  +32
│ Highlights 3× photo chip 96px        │
├──────────────────────────────────────  +32
│ Menu preview FoodRow ×3 + link       │
├──────────────────────────────────────  +32
│ About accordion (collapsed)          │
├──────────────────────────────────────  +24
│ Gallery 2-col                        │
├──────────────────────────────────────  +24
│ Policies compact                     │
├──────────────────────────────────────
│ FloatingCTA "Open Menu" 52h          │  sticky
│ MiniNavIsland 48h                    │
└──────────────────────────────────────
```

### Desktop (1440×900)
Gallery left 58% sticky hero · Info panel right 42% · CTA inline in panel.

**Prototype:** `prototypes/restaurant-mobile.svg`, `prototypes/restaurant-desktop.svg`

---

## 5. MENU

### Mobile portrait

```
┌──────────────────────────────────────
│ ContextHeader + StickyCategoryRail   │  44px chips, scroll-spy
├──────────────────────────────────────
│ FoodCard spotlight 21:9 (optional)   │
├──────────────────────────────────────  +32
│ microLabel category name             │
│ FoodRow ×N                           │  min 112h each
│   titleSm · caption · priceLg · thumb│
│   appetite ADD                       │
├──────────────────────────────────────  +48 next category
│ ...                                  │
├──────────────────────────────────────
│ CartBar (when items > 0)             │  56h + safe
│ MiniNavIsland                        │
└──────────────────────────────────────
```

**Spacing:** FoodRow card-inset 20px, between rows 0 (divider subtle), between categories 48px.

**Prototype:** `prototypes/menu-mobile.svg`

---

## 6. CUSTOMIZATION SHEET

- BottomSheet warm-glass, snap 45% / 90%
- Handle 36×4px centered
- FoodRow header compact
- SegmentedControl variants
- Chip add-ons multi
- Input special instructions
- QuantityStepper
- Primary full-width 52h

**Prototype:** `prototypes/customization-sheet.svg`

---

## 7. FLOATING CART

### CartBar (menu overlay)
56px · restaurant name · "3 items" · ₹847 · chevron · spring slide up

### Cart page
RestaurantCard compact header · FoodRow + stepper per line · BillSummary · Proceed locked elegant

**Prototype:** `prototypes/floating-cart.svg`

---

## 8. PROFILE

### Guest
Warm gradient hero · "Welcome" display · Sign in primary · Continue ghost · 3 benefit rows

### Logged-in
Avatar 96px glow ring · name title · quick tiles Orders/Addresses/Favorites · settings list · sign out ghost

**Forbidden:** UID, email dump as debug, Firestore, providers, milestone text.

**Prototype:** `prototypes/profile-mobile.svg`

---

## 9. EMPTY / ERROR / LOADING / SKELETON

| State | Component | Copy example |
|-------|-----------|--------------|
| Empty cart | PremiumEmpty | "Your cart is empty" |
| Empty search | PremiumEmpty | "No results for biryani" |
| Error network | ErrorState | "Connection lost" |
| Loading app | loading-state | food plate silhouette pulse |
| Skeleton home | skeleton-state | hero-food + 1 rail shape |

**Prototypes:** respective SVG in `prototypes/`

---

## Annotation legend (all screens)

- **Red inset lines:** 16px content margin mobile
- **Orange:** Primary CTA zones
- **Dashed:** Scroll overflow regions
- **Blue:** Safe area padding

Interaction: [INTERACTION-SPECIFICATION.md](./INTERACTION-SPECIFICATION.md)  
Motion: [MOTION-SPECIFICATION.md](./MOTION-SPECIFICATION.md)
