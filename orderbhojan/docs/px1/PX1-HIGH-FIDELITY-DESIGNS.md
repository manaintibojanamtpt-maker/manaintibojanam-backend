# PX1 High-Fidelity Product Designs

**Program:** PX1  
**Stage:** 2 — High-Fidelity Product Design  
**Status:** Complete — **DRB review required before Stage 4**

**Note:** Textual high-fidelity specifications with layout grids, token bindings, and state matrices. Figma frames to be produced by Design team from this document. **Do not implement until DRB signs off.**

---

## Design system binding

All specs reference **BDS v1.1 (PX1)** tokens — see [PX1-BDS-EVOLUTION.md](./PX1-BDS-EVOLUTION.md). No local OrderBhojan components.

**Theme default:** `food` (warm dark luxury). Light mode: cream kitchen morning.

---

## 1. Home

### Mobile (375×812)

#### Frame A — Hero viewport (above fold)

| Element | Token / spec |
|---------|--------------|
| Background | `--bds-color-background-luxury` |
| Hero image | `ImmersiveHero` — 62vh, `object-fit: cover`, edge-to-edge |
| Scrim | `--bds-gradient-hero-scrim` |
| microLabel | `NEAR YOU` · `--bds-type-micro-label` · `--bds-color-primary` |
| Headline | `--bds-type-display-hero` · cream · max 2 lines |
| Craving subline | `--bds-type-body` · `--bds-color-text-secondary` · 1 line rotate |
| Search pill | `PremiumSearch` variant `floating` · 48px height · glass warm |
| Location | `LocationChip` compact · top-left · glass · 32px height |

**Spacing:** Hero text inset `--bds-space-4` (16px) horizontal, `--bds-space-7` (48px) from bottom of hero to category row.

#### Frame B — Below fold

| Section | Layout |
|---------|--------|
| Categories | `PremiumChip` circles 72px · food photo fill · gap `--bds-space-3` |
| Section header | microLabel + `--bds-type-heading` · gap `--bds-space-2` |
| Restaurant rail | `RestaurantCard` size `immersive` · 280px width · 16:10 cover |
| Trending | `FoodRow` compact · horizontal scroll |
| Trust strip | 3 stats · `--bds-type-caption` · icons 20px · single row |

#### Interactions
- Hero swipe: spring slide, parallax image 20px offset
- Card press: scale 0.98 + glow `--bds-shadow-glow-primary`
- NavIsland: auto-hide scroll threshold 80px

### Tablet (820×1180)

- Hero 50vh left 55% + greeting/search stack right 45%
- Categories: 2-row grid, 88px circles
- Restaurants: 2-column grid, not rail only
- NavIsland centered, max-width 480px

### Desktop (1440×900)

- Left rail nav (240px) replaces bottom NavIsland
- Hero band full-width 65vh
- Discovery 3-column restaurant grid
- Content max `--bds-layout-max-wide` (1400px)

### Dark / Light

| Mode | Hero scrim | Glass | Text |
|------|------------|-------|------|
| Dark (food) | `#070504` 85% bottom | warm brown 72% | `#FFFAF3` |
| Light | `#FFFAF3` 40% bottom | cream glass 80% | `#120D0A` |

### States matrix

| State | Hero | Rails | Nav |
|-------|------|-------|-----|
| Loading | `Skeleton shape="hero-food"` | 1 rail skeleton | visible |
| Error | static fallback image | hidden | visible |
| Empty | illustration | PremiumEmpty | visible |
| Success | live carousel | all navigate | visible |

---

## 2. Restaurant

### Mobile

#### Hero block (RestaurantHero component)

```
Height: 45vh min, 52vh max
Cover: AppetiteImage aspect 16:9, blur-up
Gradient: hero-scrim bottom 60%
Logo: 80px circle, -40px overlap into body, --bds-shadow-food-card
Name: displayXl, 2 line clamp
Meta: caption single row — ★4.8 · 25 min · 2.1 km · ₹40 delivery
```

#### Body (compressed)

| Block | Height budget |
|-------|---------------|
| OfferBanner rail | 120px |
| Quick actions | 56px (Favorite, Share only) |
| Highlights | 3 photo chips 96px |
| Menu preview | 3× FoodRow compact + link |
| About accordion | collapsed default, 1 paragraph max |

#### FloatingCTA
- Fixed bottom: `--bds-space-4` above safe-bottom (or above MiniNavIsland)
- Button: primary full-width, "Open Menu", 52px height
- Shadow: `--bds-shadow-lift-soft`

### Tablet
- Split: hero left 50% sticky, content scroll right 50%
- Menu preview → 2-column FoodRow grid

### Desktop
- Airbnb listing pattern: hero gallery left 58%, info panel sticky right 42%
- FloatingCTA becomes inline primary in panel

### Motion
- `layoutId="restaurant-cover"` from home card
- Scroll: header opacity 1→0.95, title scale 1→0.85
- Parallax: cover translateY scroll × 0.3

---

## 3. Menu

### Mobile

#### Header stack
```
ContextHeader: collapsed 56px / expanded 72px
Title: restaurant name truncated
StickyCategoryRail: 44px chips, scroll-x, active layoutId pill
```

#### FoodRow (primary layout mobile)
```
┌──────────────────────────────────────────┐
│ titleSm (1 line)              ┌────────┐ │
│ caption desc (2 line)         │ 96×96  │ │
│ priceLg                       │ image  │ │
│ [veg dot] [prep time]         │ [ADD]  │ │
│                               └────────┘ │
└──────────────────────────────────────────┘
Padding: --bds-space-card-inset (20px)
Gap text/image: --bds-space-4
ADD pill: Button variant appetite, white/orange, 36px, floating on image corner
```

#### Featured spotlight (top)
- Single dish: 21:9 banner image, name overlay, price, ADD

#### CartBar
- `CartBar` component: restaurant name · N items · ₹total · chevron
- Spring slide up when count > 0

### Tablet
- Sidebar: StickyCategoryRail vertical 240px fixed left
- Content: FoodRow full width right

### Desktop
- Optional 3-pane: sidebar | menu list | cart preview dock 320px

---

## 4. Search

### Field (PremiumSearch)
- Single row: back + input + clear
- No trailing disabled icons
- Height 48px, radius `--bds-radius-pill`
- Focus: lift 2px + `--bds-shadow-glow-primary` subtle

### Browse panel
- Recent: max 5 chips, dismiss X per chip
- Trending: warm chips with emoji optional
- Collections: 2-column photo cards 16:10

### Results
- Restaurant: 72px thumb + title + meta row + chevron
- Food: FoodRow compact
- Divider: `--bds-color-divider` 1px, not card borders

---

## 5. Profile

### Guest state
```
ImmersiveHero variant profile — warm gradient, no photo
display: "Welcome to OrderBhojan"
body: "Sign in to save favorites and reorder faster"
Primary: Sign In
Secondary: Continue browsing
Benefits: 3 icon rows (Favorites, Addresses, Faster checkout)
```

### Signed-in state
```
Avatar 96px centered, warm ring glow
title: display name
caption: member since / phone masked
Tiles row: Orders | Addresses | Favorites — 3 equal glass tiles
List: Notifications, Diet preferences, Help, Sign out
```

**Zero developer fields.**

---

## 6. Cart Preview

### With items
```
heading: Cart
RestaurantCard compact header (logo + name)
Line items: FoodRow + QuantityStepper + line price
Divider
BillSummary: subtotal, delivery, taxes (mock static)
Proceed button: primary, full width
  state locked: opacity 0.7, lock icon, no ugly disabled gray
Footer caption: none (or tooltip on long-press Proceed)
```

### Empty
```
PremiumEmpty
Illustration: empty thali/plate warm vector
title: "Your cart is empty"
description: "Discover dishes nearby"
action: Explore restaurants
```

---

## 7. Floating Navigation (NavIsland)

```
Position: fixed bottom, center, max-width 360px
Height: 64px + safe-bottom
Background: --bds-color-glass-warm, blur 20px
Radius: --bds-radius-nav-island (2.5rem)
Shadow: --bds-shadow-nav-island
Items: 5, icon + micro label optional
Active: layoutId indicator dot, --bds-color-primary, haptic
Desktop ≥1280: hidden → SideNav rail
Immersive routes: MiniNavIsland 48px, back + home + cart
```

---

## 8. Bottom Sheets

### Address selector
- Map thumb 120px optional top
- Saved addresses list with label + line
- GPS row with pulse icon
- Guest sign-in card at bottom if guest

### Customize (see Blueprint Step 5)
- BDS BottomSheet variant warm-glass
- Snap points: 45%, 90%

### Dialogs
- BDS Dialog variant warm — confirm remove item, sign out

---

## 9. Loading & Skeletons

| Context | Skeleton shape |
|---------|----------------|
| Home hero | Plate + steam silhouette |
| Restaurant cover | 16:9 rounded rect |
| FoodRow | Text bars + square thumb |
| Restaurant card | Cover + 2 text bars |
| Profile | Circle + 3 bars |
| Search | Field + chip row |

**Rule:** Max 2s shimmer → content or empty. Never infinite.

---

## 10. Dark Mode (all screens)

- Default theme: `food` (warm dark)
- All glass: brown-tinted, never neutral gray
- Food photos: `filter: brightness(0.96) sepia(0.04)` subtle warm
- Elevation via glow, not borders

See [PX1-DARK-MODE-REPORT.md](./PX1-DARK-MODE-REPORT.md).

---

## 11. Foldables & landscape

### Foldable (inner display ~884px)
- Dual pane when unfolded: list left 45% | detail right 55%
- Home: restaurant list | hero preview

### Landscape phone
- Hero max 40vh
- NavIsland side dock right optional
- Category rail vertical left on menu

See [PX1-RESPONSIVE-REPORT.md](./PX1-RESPONSIVE-REPORT.md).

---

## Annotation requirements (DRB sign-off)

Before Stage 4 approval, Design must attach:

| Screen | Mobile L/D | Tablet L/D | Desktop L/D |
|--------|------------|------------|-------------|
| Home | ☐ | ☐ | ☐ |
| Restaurant | ☐ | ☐ | ☐ |
| Menu | ☐ | ☐ | ☐ |
| Search | ☐ | ☐ | ☐ |
| Profile | ☐ | ☐ | ☐ |
| Cart Preview | ☐ | ☐ | ☐ |
| Customize sheet | ☐ | — | — |
| Address sheet | ☐ | — | — |
| Empty states (each) | ☐ | — | — |
| Skeleton states | ☐ | — | — |

**Final question per frame:** *App Store screenshot test — world-class? YES/NO*

---

## Rejection criteria (current v0.8.5-m65)

| Screen | Verdict | Reason |
|--------|---------|--------|
| Home | **REJECT** | Greeting-first, skeleton rails, dead tiles |
| Restaurant | **REJECT** | Brochure scroll, placeholders, nav loss |
| Menu | **REJECT** | M7 copy, AI badges, vertical grid mobile |
| Search | **REJECT** | Dead results, disabled icons |
| Profile | **REJECT** | Developer panel |
| Cart | **REJECT** | Mock language |

All screens require **full rebuild**, not patch.

**Next stage:** [PX1-BDS-EVOLUTION.md](./PX1-BDS-EVOLUTION.md)
