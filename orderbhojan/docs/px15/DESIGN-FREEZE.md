# DESIGN FREEZE — OrderBhojan PX1.5

**Version:** `0.8.9-px15`  
**Effective upon approval:** CEO + PM + ARB + DRB unanimous sign-off  
**Status:** PROPOSED — not yet frozen

---

## Freeze declaration

Upon approval, this document becomes the **single source of truth** for OrderBhojan product design. Engineering must match it exactly. **No engineer may alter frozen items without DRB approval and version bump.**

---

## Frozen: Typography

| Token | Spec | Usage |
|-------|------|-------|
| `displayHero` | clamp(2.75rem, 8vw, 5rem) / 900 / LH 0.95 / Outfit | Home hero headline only |
| `displayXl` | 3rem / 900 / LH 1.1 / Outfit | Restaurant name |
| `display` | 2.25rem / 800 | Section heroes |
| `heading` | 1.875rem / 700 | Page titles |
| `title` | 1.5rem / 700 | Card titles |
| `titleSm` | 1.25rem / 700 | FoodRow dish name |
| `body` | 0.9375rem / 400 / LH 1.5 | Descriptions |
| `caption` | 0.75rem / 500 | Metadata (ETA, distance) |
| `microLabel` | 0.625rem / 900 / LS 0.25em / uppercase | Section eyebrows |
| `priceLg` | 1.25rem / 800 / LS -0.02em | Primary price |
| `price` | 1.125rem / 700 | Inline price |
| `scriptAccent` | 2.5rem / Great Vibes | Optional hero accent word |

**Font stack:** Plus Jakarta Sans (UI), Outfit (display), Great Vibes (accent — load subset).

---

## Frozen: Spacing (8pt grid)

Base unit: **8px**. All spacing = multiples of 8 except 4px icon gaps.

| Token | px | Use |
|-------|-----|-----|
| space-1 | 4 | Icon gap only |
| space-2 | 8 | Chip internal |
| space-3 | 16 | Card gap, horizontal inset |
| space-4 | 24 | Element separation |
| space-5 | 32 | Subsection gap |
| space-6 | 40 | — |
| space-7 | 48 | **Section gap mobile** |
| space-8 | 64 | **Section gap tablet** |
| space-9 | 72 | Hero bottom breathing |
| space-10 | 80 | **Section gap desktop** |
| card-inset | 20 | FoodRow / card padding |
| touch-min | 48 | Minimum tap target |

---

## Frozen: Layouts

### Mobile home hero
- Hero height: **40% viewport** (40vh, ~325px @ 812)
- Search: **inside hero**, bottom of hero block, 16px inset
- Location chip: top-left, 12px from safe-top + 16px inset

### Mobile food row
- Height: min 112px
- Thumb: 96×96px square, radius 16px
- ADD pill: 36×36px on thumb corner

### Restaurant hero mobile
- Cover: 45vh min, edge-to-edge
- Logo: 80px circle, -40px overlap into body

### Menu category rail
- Sticky height: 44px + safe-top when collapsed
- Chip height: 36px, padding 12px horizontal

### Desktop breakpoint switch
- **NavIsland → SideNav at 1280px**
- Content max: 1400px at 1920+

Full layouts: [SCREEN-BLUEPRINTS.md](./SCREEN-BLUEPRINTS.md)

---

## Frozen: Motion

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Page enter | 400ms | opacity 0→1, spring y 12→0 |
| Shared hero | 450ms | layoutId spring stiffness 260 damping 28 |
| Press | 120ms | scale 0.96 |
| Fly-to-cart | 400ms | bezier path + scale 1→0.3 |
| Bottom sheet | 350ms | spring from bottom |
| Skeleton shimmer | 1500ms loop | linear gradient sweep |
| Theme crossfade | 200ms | ease |

Reduced motion: instant or opacity-only. **No parallax, no fly-to-cart path.**

Full spec: [MOTION-SPECIFICATION.md](./MOTION-SPECIFICATION.md)

---

## Frozen: Navigation

| Context | Component |
|---------|-----------|
| Marketplace tabs (home, search, cart, orders, profile) | `NavIsland` bottom, 64px + safe-bottom |
| Restaurant, menu immersive | `MiniNavIsland` 48px: back · home · cart |
| Desktop ≥1280px | `SideNav` 240px fixed left |
| Nav auto-hide | Scroll down >80px hides NavIsland; scroll up reveals |

---

## Frozen: Cards

| Component | Mobile | Cover ratio |
|-----------|--------|-------------|
| `RestaurantCard` immersive | 280px wide rail | 16:10 |
| `FoodRow` | Full width | 96px thumb 1:1 |
| `FoodCard` spotlight | Full width | 21:9 banner |
| Warm surface | radial warm gradient + `--bds-shadow-food-card` | No hard border |

---

## Frozen: Buttons

| Variant | Spec |
|---------|------|
| `primary` | 52px height mobile, full-width CTAs, `#FF7A00` fill |
| `appetite` | 36px floating ADD, white fill, orange text, radius pill |
| `secondary` | Glass warm border, 48px |
| `ghost` | No border, 48px min touch |

---

## Frozen: Shadows & elevation

| Token | Value |
|-------|-------|
| `food-card` | 0 10px 40px -10px rgba(0,0,0,0.5), inset highlight |
| `nav-island` | 0 8px 32px rgba(0,0,0,0.35) |
| `glow-primary` | 0 0 30px -10px rgba(255,107,53,0.25) |
| `lift-soft` | 0 4px 24px rgba(0,0,0,0.2) |

Elevation levels: 0 flat → 1 card → 2 floating → 3 sheet → 4 modal.

---

## Frozen: Glass & blur

| Surface | Background | Blur | Border |
|---------|------------|------|--------|
| NavIsland | `#120D0A` 72% | 20px | rgba(255,170,95,0.12) |
| Search pill | `#120D0A` 68% | 16px | same |
| ContextHeader scrolled | `#120D0A` 80% | 24px | none |
| BottomSheet | `#120D0A` 92% | 24px | top edge warm |

**Never neutral gray glass.**

---

## Frozen: Safe areas

- All fixed top: `padding-top: max(12px, env(safe-area-inset-top))`
- NavIsland: `padding-bottom: max(8px, env(safe-area-inset-bottom))`
- FloatingCTA: 16px above NavIsland or safe-bottom
- FloatingCart: 16px above NavIsland

---

## Frozen: Dark mode (`food` theme)

| Role | Hex |
|------|-----|
| background | `#070504` |
| surface | `#120D0A` |
| surface-strong | `#1A1410` |
| text | `#FFFAF3` |
| text-muted | `#D0C4B5` |
| primary | `#FF7A00` |

Light (`foodLight`): bg `#FFFAF3`, surface `#FFF8F0`, text `#120D0A`.

---

## Frozen: Interactions

- Every restaurant/food card **must navigate**
- No disabled-looking enabled controls
- No developer/milestone copy in UI
- ADD always triggers fly-to-cart (motion) + haptic
- Search results always navigate
- Profile never shows UID/Firestore

Full spec: [INTERACTION-SPECIFICATION.md](./INTERACTION-SPECIFICATION.md)

---

## Change control

| Change type | Approval |
|-------------|----------|
| Token value adjustment | DRB |
| Layout dimension change | DRB + PM |
| New component | DRB + ARB |
| Motion timing ±>20% | DRB |
| Engineering interpretation | Not allowed — ask DRB |

**Version bump required for any freeze change:** `0.8.9-px15` → `0.8.9-px15.1`

---

## Sign-off

| Role | Approved | Date | Signature |
|------|----------|------|-----------|
| CEO | ☐ | | |
| Product Manager | ☐ | | |
| Architecture Review Board | ☐ | | |
| Design Review Board | ☐ | | |

**When all checked:** Design is **FROZEN**. Stage 4 implementation may begin.
