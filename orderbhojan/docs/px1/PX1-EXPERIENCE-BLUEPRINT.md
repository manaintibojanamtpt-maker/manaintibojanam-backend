# PX1 Experience Blueprint

**Program:** PX1 — Product Experience Evolution  
**Version:** `0.9.0-px1`  
**Stage:** 1 — Experience Blueprint  
**Status:** Complete — awaiting DRB review

---

## Purpose

Define every customer journey step **before code**. Each step specifies emotion, hierarchy, interaction, motion, and all state variants (loading, error, empty, success).

**DNA source:** Mana Inti Bojanam warmth + Apple/Airbnb/Uber/Linear/Shopify Shop quality bar.

---

## Journey map

```
Open App
    ↓
Home ──────────────────→ Search
    ↓                         ↓
Restaurant ←──────────────────┘
    ↓
Menu
    ↓
Customization (Bottom Sheet)
    ↓
Cart Preview ─ ─ ─ ─ ─ → [Checkout — PX1 shell only, logic blocked]
    ↓
[Tracking — designed, not implemented]
    ↓
[Reorder — designed, not implemented]
```

**PX1 implementation scope:** Open App through Cart Preview. Checkout/Tracking/Reorder are blueprinted for continuity but **not implemented** per CEO block.

---

## Global principles (every step)

| Principle | Expression |
|-----------|------------|
| Less UI, more food | Photography ≥50% of card/viewport where food is subject |
| Less chrome | No visible milestone/debug copy ever |
| Less borders, more depth | Warm glass + glow shadows, not stroke cards |
| Native feel | Persistent navigation context; haptics on commit actions |
| MIB warmth | Brown-black luxury dark, cream text, orange glow interactions |
| Speed perception | Blur-up images, skeleton→content morph, optimistic UI shells |

---

## Step 0: Open App

### User emotion
**Anticipation → hunger.** First frame must feel like opening a food app, not a web page loading.

### Visual hierarchy
1. Warm background (`#070504` or cream light) — no white flash
2. Branded splash OR immediate home hero (prefer skip splash if LCP hero preloaded)
3. No spinner-only loading

### Interaction
- Cold start: food-shaped skeleton matching home hero geometry
- Warm start: cached hero image instant, content streams in

### Motion
- 300ms fade from splash to home OR crossfade skeleton→hero
- Reduced motion: instant cut, no fade

### States

| State | Treatment |
|-------|------------|
| **Loading** | Full-viewport warm skeleton with food plate silhouette shimmer |
| **Error** | Warm illustration + "Couldn't connect" + Retry — never raw error text |
| **Empty** | N/A at app level |
| **Success** | Home hero visible within 1.5s perceived load |

---

## Step 1: Home

### User emotion
**"I'm hungry. Show me food."** — not "Good morning, Guest."

### Visual hierarchy (mobile, top → bottom)

```
┌─────────────────────────────────────┐
│ [safe-top]                          │
│ Location chip (compact, glass)      │  ← contextual, not hero
├─────────────────────────────────────┤
│                                     │
│   FULL-BLEED FOOD HERO (55–65vh)    │  ← DOMINANT
│   Rotating craving line overlay     │
│   microLabel: "NEAR YOU"            │
│   displayHero: dish/restaurant name │
│   Floating search pill (glass)      │
│                                     │
├─────────────────────────────────────┤
│ Category circles (food photos)      │
├─────────────────────────────────────┤
│ microLabel + Restaurant rail        │
│ [immersive cards — all tappable]    │
├─────────────────────────────────────┤
│ Trending dishes (FoodRow)           │
├─────────────────────────────────────┤
│ Trust strip: ★ Hygienic Fresh       │
├─────────────────────────────────────┤
│ [NavIsland]                         │
│ [FloatingCart if items]             │
└─────────────────────────────────────┘
```

### Interaction
- **Location chip:** tap → Address bottom sheet
- **Search pill:** tap → expand inline OR navigate to Search with focus
- **Hero:** swipe carousel OR auto-advance; tap → restaurant/offer destination
- **Category circle:** tap → filtered restaurant rail (visual filter state)
- **Restaurant card:** tap → Restaurant (shared hero transition)
- **Food row Add:** fly-to-cart + haptic
- **Pull down:** refresh feed (elastic + haptic)

### Motion
- Hero parallax on scroll (image scale 1→1.06)
- Section reveals stagger 50ms spring
- NavIsland hides on scroll down, reveals on scroll up
- Shared `layoutId` from hero card → restaurant cover

### States

| State | Treatment |
|-------|------------|
| **Loading** | Hero skeleton (food-shaped) + 1 rail skeleton max; resolve ≤2s |
| **Error** | Hero fallback static food image + "Restaurants unavailable" + Retry |
| **Empty** | "No restaurants near you" illustration + change address CTA |
| **Success** | Full feed, all cards navigate, zero skeleton persistence |

### Emotion target
**8.5 → 9.5:** User mouths water at hero, not reads greeting.

---

## Step 2: Search

### User emotion
**"I'll find it fast."** — confidence, zero friction.

### Visual hierarchy
```
┌─────────────────────────────────────┐
│ ← Back    [Glass SearchBar — full]  │
├─────────────────────────────────────┤
│ Suggestions (live, below field)     │
├─────────────────────────────────────┤
│ Browse mode:                        │
│   Recent (chips)                    │
│   Trending (chips)                  │
│   Collections (photo cards)         │
│ OR Results mode:                    │
│   Restaurant rows (thumb + meta)    │
│   Food rows (FoodRow)               │
└─────────────────────────────────────┘
```

### Interaction
- Autofocus on entry
- Type → debounced suggestions
- Tap result → navigate (restaurant or food→menu scroll)
- Clear → return to browse
- **No disabled icons** (voice/camera hidden until live)

### Motion
- Field expands 2px lift on focus (spring)
- Results stagger in 30ms
- Keyboard: ↑↓ navigate suggestions, Enter select

### States

| State | Treatment |
|-------|------------|
| **Loading** | Shimmer in suggestion area only |
| **Error** | Inline "Search unavailable" + retry |
| **Empty** | "No results for X" + trending suggestions |
| **Success** | Results navigate on tap |

---

## Step 3: Restaurant

### User emotion
**"I'm inside this kitchen."** — trust, appetite, urgency to order.

### Visual hierarchy (mobile)

```
┌─────────────────────────────────────┐
│ ← [CollapsingContextHeader]         │
├─────────────────────────────────────┤
│ CINEMATIC COVER (45vh)              │
│ gradient scrim                      │
│ Logo overlap + displayXl name       │
│ caption: cuisine · rating · ETA     │
├─────────────────────────────────────┤
│ OfferBanner rail (horizontal)       │
├─────────────────────────────────────┤
│ Quick actions: ♥ Share              │
│ (Call/Direction hidden until live)  │
├─────────────────────────────────────┤
│ Highlights (3 max, photo chips)     │
├─────────────────────────────────────┤
│ Menu preview rail (3 dishes)        │
│ "View full menu →"                  │
├─────────────────────────────────────┤
│ About (collapsed, expand)           │
├─────────────────────────────────────┤
│ [FloatingCTA: Open Menu]            │
│ [MiniNavIsland OR back context]     │
└─────────────────────────────────────┘
```

**Removed from v1 restaurant:** Reviews placeholder, Recommended placeholder, 8-section brochure scroll.

### Interaction
- Cover parallax on scroll
- Header collapses at 120px → glass compact title
- Favorite → burst + haptic
- Menu preview dish tap → Menu scrolled to item
- FloatingCTA sticky above safe-bottom
- **Nav context preserved** — mini nav or floating back-to-home

### Motion
- Shared hero `layoutId` from home card cover
- Favorite particle burst
- FloatingCTA slide up on scroll past hero

### States

| State | Treatment |
|-------|------------|
| **Loading** | Cover skeleton + identity skeleton |
| **Error** | ErrorState with restaurant fallback |
| **Empty** | N/A (404 route) |
| **Success** | Compressed focused layout, CTA visible |

---

## Step 4: Menu

### User emotion
**"I want that."** — peak appetite moment.

### Visual hierarchy (mobile)

```
┌─────────────────────────────────────┐
│ ← Restaurant · Search icon          │
│ [StickyCategoryRail — horizontal]   │
├─────────────────────────────────────┤
│ Featured spotlight (1 large dish)   │
├─────────────────────────────────────┤
│ Category: Biryani                   │
│ ┌─────────────────────────────────┐ │
│ │ FoodRow: name, desc, price │ 📷│ │
│ │                    [ADD pill]   │ │
│ └─────────────────────────────────┘ │
│ ...                                 │
├─────────────────────────────────────┤
│ [CartBar / FloatingCart]            │
└─────────────────────────────────────┘
```

### Interaction
- Category rail scroll-spy + haptic on section change
- FoodRow tap (non-ADD area) → expand detail OR customize if variants
- ADD → fly-to-cart + haptic + stepper replace
- Cart bar tap → Cart Preview
- Search icon → in-menu search filter (visual filter, existing data)

### Motion
- ADD: scale 0.92→1 + ripple + fly-to-cart bezier
- Category active indicator `layoutId` slide
- Section reveal on scroll into view

### States

| State | Treatment |
|-------|------------|
| **Loading** | FoodRow-shaped skeletons ×6 |
| **Error** | "Menu unavailable" + retry |
| **Empty** | "No items match filter" + clear filter |
| **Success** | Full menu, no milestone copy |

---

## Step 5: Customization (Bottom Sheet)

### User emotion
**"My order, my way."** — control without overwhelm.

### Visual hierarchy
```
┌─────────────────────────────────────┐
│ Handle                              │
│ FoodRow header (thumb + name + ₹)   │
│ Variants (SegmentedControl)         │
│ Add-ons (Chip multi-select)         │
│ Special instructions (Input)        │
│ Quantity stepper                    │
│ [Add to cart — primary]             │
└─────────────────────────────────────┘
```

### Interaction
- Sheet snap: half → full on drag
- Variant required → primary disabled until selected
- Add → sheet close + fly-to-cart + line item update
- Instructions persist visually in cart preview

### Motion
- Sheet spring from bottom (BDS BottomSheet)
- Primary button pulse when selection complete

### States

| State | Treatment |
|-------|------------|
| **Loading** | Skeleton in sheet |
| **Error** | Inline error on add |
| **Empty** | N/A |
| **Success** | Sheet closes, cart updates |

---

## Step 6: Cart Preview

### User emotion
**"Almost there."** — satisfaction, anticipation. (Checkout logic blocked — shell only.)

### Visual hierarchy
```
┌─────────────────────────────────────┐
│ Cart                                │
│ Restaurant group header             │
│ ┌─────────────────────────────────┐ │
│ │ FoodRow + stepper + line price  │ │
│ └─────────────────────────────────┘ │
│ BillSummary (subtotal, delivery)    │
│ [Proceed — elegant locked state]    │
│ caption: "Checkout coming soon"     │
│   OR no caption — disabled w/ tooltip│
└─────────────────────────────────────┘
```

**Rule:** Never say "M7" or "mock". Locked checkout is visually premium, not prototype language.

### Interaction
- Stepper updates line totals (preview store — existing)
- Swipe row → remove (spring out)
- Proceed → subtle locked animation + toast "Checkout opening soon"
- Empty → premium empty state

### Motion
- Line items stagger on enter
- Remove: slide-left + fade
- Total updates: number spring count

### States

| State | Treatment |
|-------|------------|
| **Loading** | Row skeletons |
| **Error** | N/A |
| **Empty** | PremiumEmpty with food illustration |
| **Success** | Line items with photos, warm summary |

---

## Step 7: Checkout *(designed, not implemented)*

### User emotion
**"This is safe and fast."**

Blueprint for M7 continuity:
- Single-column mobile: address → payment method → summary → Place Order
- Warm glass cards, no form chrome overload
- Progress stepper top
- **PX1:** Do not implement

---

## Step 8: Tracking *(designed, not implemented)*

### User emotion
**"My food is coming."**

Blueprint:
- Map hero (top 40vh) + timeline steps below
- Live ETA chip with pulse
- **PX1:** Do not implement

---

## Step 9: Reorder *(designed, not implemented)*

### User emotion
**"That was good. Again."**

Blueprint:
- Orders history card with food photo mosaic
- One-tap "Reorder" on past order
- **PX1:** Do not implement

---

## Step 10: Profile

### User emotion
**"This is my account."** — human, trusted.

### Visual hierarchy
```
┌─────────────────────────────────────┐
│ Avatar hero (large, warm glass)     │
│ Name + member since                 │
├─────────────────────────────────────┤
│ Quick tiles: Orders · Addresses · ♥ │
├─────────────────────────────────────┤
│ Preferences (notifications, diet)   │
├─────────────────────────────────────┤
│ Help · Sign out                     │
└─────────────────────────────────────┘
```

**Forbidden:** UID, Firestore, provider list, milestone copy, disabled ghost lists.

### States

| State | Treatment |
|-------|------------|
| **Loading** | Avatar skeleton |
| **Error** | Retry profile |
| **Empty (guest)** | Warm sign-in CTA, benefits list |
| **Success** | Consumer account shell |

---

## Cross-journey navigation model

| From | To | Transition |
|------|-----|------------|
| Home card | Restaurant | Shared hero `layoutId` |
| Restaurant | Menu | Hero compress + slide up |
| Menu | Customize | Bottom sheet spring |
| Any | Cart | CartBar spring expand |
| Search result | Restaurant | Fade + hero reveal |
| Immersive screens | Home | MiniNavIsland always reachable |

**Problem solved:** Tab bar no longer vanishes without replacement.

---

## Emotion arc summary

| Step | Entry emotion | Exit emotion |
|------|---------------|--------------|
| Open App | Curiosity | Anticipation |
| Home | Hunger | Discovery excitement |
| Search | Intent | Confidence |
| Restaurant | Trust | Craving |
| Menu | Desire | Decision |
| Customize | Control | Satisfaction |
| Cart | Anticipation | Readiness |
| Profile | Identity | Comfort |

---

## DRB review checklist

- [ ] Every step has all four state variants defined
- [ ] No milestone/debug copy in any success state
- [ ] Food dominates home first viewport
- [ ] Navigation continuity on immersive routes
- [ ] Checkout/Tracking/Reorder clearly marked out-of-scope for PX1 implementation
- [ ] Emotion targets align with MIB warmth + world-class bar

**Next stage:** [PX1-HIGH-FIDELITY-DESIGNS.md](./PX1-HIGH-FIDELITY-DESIGNS.md)
