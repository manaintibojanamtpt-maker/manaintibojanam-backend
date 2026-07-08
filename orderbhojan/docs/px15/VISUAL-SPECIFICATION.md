# Visual Specification — OrderBhojan PX1.5

**Canonical visual language.** All screens must conform.

---

## Brand essence

**OrderBhojan** = Mana Inti Bojanam warmth × world-class consumer product craft.

| Pillar | Expression |
|--------|------------|
| Warmth | Brown-black luxury, cream text, orange glow |
| Food-first | Photography owns first 40% viewport on home |
| Regional authenticity | Copy tone: approachable, local, trustworthy — not corporate |
| Comfort | Generous spacing, soft corners, no dashboard density |
| Trust | Hygiene/rating cues, no debug UI, no broken loops |

**Quality benchmarks:** Apple (photography hierarchy), Airbnb (listing immersion), Uber Rider (compact rows, persistent nav), Shopify Shop (product clarity), Arc/Linear (motion precision).

**Never copy** their layouts or branding.

---

## Color system

### Primary palette (BDS v1.0 + PX1.5 extensions)

| Name | Hex | Role |
|------|-----|------|
| Orange 500 | `#FF7A00` | Primary CTA, active states |
| Orange 600 | `#FF6B35` | Gradient end, accent |
| Orange 400 | `#FF9F43` | Hover |
| Cream 50 | `#FFFAF3` | Light text / light bg |
| Brown 950 | `#070504` | Luxury dark bg |
| Brown 800 | `#120D0A` | Surface / cards |
| Brown strong | `#1A1410` | Elevated surface |
| Muted | `#D0C4B5` | Secondary text dark |
| Muted light | `#B9ADA1` | Secondary text light mode |
| Bestseller gold | `#D4A574` | Ribbon badges |

### Semantic

| Semantic | Dark (food) | Light (foodLight) |
|----------|-------------|-------------------|
| background | `#070504` | `#FFFAF3` |
| surface | `#120D0A` | `#FFF8F0` |
| text-primary | `#FFFAF3` | `#120D0A` |
| text-secondary | `#D0C4B5` | `#6B635C` |
| divider | rgba(255,255,255,0.06) | rgba(18,13,10,0.08) |
| offer-bg | rgba(255,122,0,0.12) | rgba(255,122,0,0.08) |

---

## Photography art direction

1. **Warm lighting** — golden hour, steam, texture
2. **Single subject** per frame — one dish or one restaurant ambiance
3. **Close crop** on mobile thumbs — filling frame
4. **Color grade** — +5% warmth, no blue cast
5. **Dark mode** — subtle `brightness(0.96) sepia(0.04)` overlay via `AppetiteImage`
6. **Hero scrim** — gradient bottom 60%, `#070504` at 92% opacity (dark)

---

## Corner radius

| Element | Radius |
|---------|--------|
| Hero / cover | clamp(0px, 0vw, 0px) edge-to-edge mobile; 24px desktop container |
| Food thumb | 16px |
| Restaurant card | 28px (`1.75rem`) |
| NavIsland | 40px (`2.5rem`) |
| Chips / pills | 9999px full |
| Bottom sheet top | 24px |

---

## Iconography

- **Library:** Lucide-compatible strokes via BDS `Icon`
- **Size:** 20px inline, 24px nav, 48px empty states
- **Stroke:** 1.75px default
- **Color:** inherit text or primary for active

---

## Badge & ribbon hierarchy (max 2 per food item)

Priority order:
1. Offer / discount
2. Bestseller / Chef pick
3. Veg / Non-veg dot
4. Prep time

**Forbidden:** Generic "AI" badge on all items.

---

## Visual hierarchy rules

1. **One hero per viewport** — no competing headlines
2. **Price always heavier** than description
3. **microLabel above heading** for sections — never below
4. **Metadata single line** — truncate with ellipsis
5. **Imagery bleeds edge**; text inset 16px minimum

---

## Anti-patterns (rejected)

- Greeting-first home without food hero
- Permanent skeleton sections
- White gray neutral dark mode
- Card borders as primary elevation
- Dashboard multi-column equal-weight widgets
- Milestone / debug copy
- Disabled icons in search field
- UID on profile

---

## Cohesion checklist

Every screen shares:
- Same warm glass formula
- Same 8pt spacing rhythm
- Same typography scale
- Same NavIsland / SideNav
- Same motion spring constants
- Same food row pattern on mobile menu

---

## Prototype reference

See [`prototypes/`](./prototypes/) for pixel visualizations.

Spec binding: [DESIGN-FREEZE.md](./DESIGN-FREEZE.md)
