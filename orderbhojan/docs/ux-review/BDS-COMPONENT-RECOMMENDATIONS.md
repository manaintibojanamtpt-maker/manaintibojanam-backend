# BDS Component Recommendations

**Rule:** Extend `@bhojan/design-system` — never create local UI duplicates in OrderBhojan.

---

## New components

| Component | Purpose | Replaces |
|-----------|---------|----------|
| **`FoodRow`** | Horizontal mobile menu row — text left, square photo right, floating ADD pill | Custom `FoodCardItem` grid layout |
| **`FoodRowSkeleton`** | Shaped loading placeholder matching FoodRow geometry | Generic `Skeleton` bars |
| **`ImmersiveHero`** | Full-bleed image + gradient overlay + floating content slot | Ad-hoc hero divs across pages |
| **`GlassSurface`** | Warm brown-tinted blur container with tokenized border | Inline `backdrop-filter` + M65 classes |
| **`WarmCard`** | MIB-style radial gradient food card with glow hover | BDS `Card` + custom CSS |
| **`NavIsland`** | Floating bottom nav shell with indicator + safe-area | `ExperienceBottomNav` wrapper + CSS |
| **`ContextHeader`** | Collapsing sticky header with scroll-linked opacity/size | Duplicated header patterns |
| **`PremiumEmpty`** | Emotional empty state with illustration slot + single CTA | Raw `EmptyState` + milestone copy |
| **`OfferChip`** | Compact offer pill for hero integration | Multiple `Badge`/`Chip` variants |
| **`AppetiteImage`** | Blur-up + dominant color + aspect ratio enforced | Manual blur-up hooks per card |
| **`SectionReveal`** | Motion wrapper with reduced-motion fallback (move from OB) | `premiumMotion.tsx` local component |
| **`HapticPress`** | Wrapper firing `navigator.vibrate` patterns on tap | `MotionPress` without haptics |

---

## Extended components

| Component | Extension |
|-----------|-----------|
| **`FoodCard`** | Add `layout="row" \| "card"` variant; row = mobile default |
| **`RestaurantCard`** | Add `size="immersive" \| "compact"`; immersive = edge-bleed cover |
| **`FloatingCart`** | Add `variant="preview" \| "active"`; spring enter/exit built-in |
| **`BottomSheet`** | Add `variant="warm-glass"`; map thumbnail header slot |
| **`SearchBar`** | Add `variant="floating" \| "sticky"`; remove trailing icon cluster default |
| **`Rail`** | Add `snap="mandatory"` + larger touch chips for category |
| **`Skeleton`** | Add `shape="food-row" \| "restaurant-tile" \| "hero"` |
| **`Chip`** | Add `warm` variant with orange glow active state |
| **`Badge`** | Remove generic "AI" usage — add `bestseller`, `chef`, `offer` semantic variants |
| **`QuantityStepper`** | Add haptic feedback prop + spring animation |
| **`Button`** | Add `appetite` variant — white/orange floating ADD pill (MIB pattern) |

---

## Components to deprecate in OrderBhojan (migrate to BDS)

| Local pattern | Action |
|---------------|--------|
| `premiumMotion.tsx` | Move `MotionReveal`, `MotionPage`, `MotionPress` to BDS `motion/` |
| `experience-premium-m65.css` card classes | Replace with BDS component variants |
| `MarketplaceRestaurantTile` | Extend BDS `RestaurantCard` |
| `MarketplaceFoodTile` | Extend BDS `FoodCard` row variant |
| Inline restaurant hero markup | `ImmersiveHero` component |

---

## Component API principles

1. **Food-first defaults** — row layout on mobile, card on tablet+
2. **Warm by default** — glass and surfaces use warm tokens
3. **Motion built-in** — spring + reduced-motion at component level
4. **No milestone props** — components never accept "preview" or "mock" copy
5. **Touch-safe** — 48px minimum enforced in component, not CSS override

---

## BDS version target

**BDS v1.1** — UX-2.0 component extensions (non-breaking additions to v1.0 frozen API)

---

## Design Board approval required before implementation

Each new component needs DRB sign-off on API surface before OrderBhojan consumes it.
