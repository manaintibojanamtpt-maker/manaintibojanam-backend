# Design Tokens — PX1.5

**Target:** BDS v1.1-px15  
**Status:** Proposed for freeze — maps to [DESIGN-FREEZE.md](./DESIGN-FREEZE.md)

---

## Color tokens (new / extended)

```yaml
# Warm luxury
color.background.luxury: "#070504"
color.surface.warm: "#120D0A"
color.surface.warmStrong: "#1A1410"
color.glass.warm: "color-mix(in srgb, #120D0A 72%, transparent)"
color.glass.warmBorder: "rgba(255, 170, 95, 0.12)"
color.glow.primary: "rgba(255, 107, 53, 0.25)"

# Gradients
gradient.heroScrim.dark: "linear-gradient(to top, rgba(7,5,4,0.92) 0%, transparent 55%)"
gradient.heroScrim.light: "linear-gradient(to top, rgba(255,250,243,0.85) 0%, transparent 50%)"
gradient.warmSurface: "radial-gradient(circle at top left, rgba(255,159,28,0.08), transparent 34%), linear-gradient(145deg, rgba(32,23,17,0.98), rgba(12,9,7,0.98))"

# Badge
color.badge.bestseller: "#D4A574"
color.badge.chef: "#F4C27A"
```

---

## Typography tokens (new)

```yaml
type.displayHero:
  size: "clamp(2.75rem, 8vw, 5rem)"
  weight: 900
  lineHeight: 0.95
  family: display
  letterSpacing: "-0.04em"

type.microLabel:
  size: "0.625rem"
  weight: 900
  letterSpacing: "0.25em"
  transform: uppercase

type.titleSm:
  size: "1.25rem"
  weight: 700
  lineHeight: 1.15

type.priceLg:
  size: "1.25rem"
  weight: 800
  letterSpacing: "-0.02em"

type.scriptAccent:
  size: "2.5rem"
  family: "Great Vibes, cursive"
  weight: 400
```

---

## Spacing tokens (8pt)

```yaml
space.section.mobile: 48px    # --bds-space-7
space.section.tablet: 64px    # --bds-space-8
space.section.desktop: 80px   # --bds-space-10
space.card.inset: 20px
space.touch.min: 48px
space.hero.bottom: 32px       # hero content to next section
layout.sidebar: 240px
layout.maxWide: 1400px
layout.gutter.mobile: 16px
layout.gutter.tablet: 24px
layout.gutter.desktop: 32px
```

---

## Radius tokens

```yaml
radius.foodCard: 28px
radius.hero.desktop: 24px
radius.navIsland: 40px
radius.thumb: 16px
radius.sheet: 24px
radius.pill: 9999px
```

---

## Elevation & shadow

```yaml
shadow.foodCard: "0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)"
shadow.navIsland: "0 8px 32px rgba(0,0,0,0.35)"
shadow.glowPrimary: "0 0 30px -10px rgba(255,107,53,0.25)"
shadow.liftSoft: "0 4px 24px rgba(0,0,0,0.2)"
elevation.0: none
elevation.1: shadow.foodCard
elevation.2: shadow.liftSoft
elevation.3: shadow.navIsland
```

---

## Glass & blur

```yaml
glass.warm.background: var(--color.glass.warm)
glass.warm.backdropBlur: 20px
glass.warm.border: 1px solid var(--color.glass.warmBorder)
glass.header.backdropBlur: 24px
glass.header.background: "color-mix(in srgb, #120D0A 80%, transparent)"
```

---

## Motion tokens

```yaml
motion.spring.default:
  stiffness: 260
  damping: 28
motion.spring.snappy:
  stiffness: 400
  damping: 32
motion.duration.page: 400ms
motion.duration.press: 120ms
motion.duration.flyToCart: 400ms
motion.duration.sheet: 350ms
motion.duration.shimmer: 1500ms
motion.duration.theme: 200ms
motion.ease.spring: "cubic-bezier(0.34, 1.56, 0.64, 1)"
```

---

## Safe area

```yaml
safe.top: "env(safe-area-inset-top)"
safe.bottom: "env(safe-area-inset-bottom)"
safe.left: "env(safe-area-inset-left)"
safe.right: "env(safe-area-inset-right)"
safe.minTop: 12px
safe.minBottom: 8px
```

---

## Aspect ratios

```yaml
aspect.hero: "16 / 10"
aspect.restaurantCover: "16 / 9"
aspect.foodSpotlight: "21 / 9"
aspect.foodThumb: "1 / 1"
aspect.collection: "16 / 10"
```

---

## Theme modes

| Mode | ID | Default |
|------|-----|---------|
| Warm dark luxury | `food` | ✓ app default |
| Cream kitchen morning | `foodLight` | light preference |
| System | `system` | resolves to food / foodLight |

---

## Z-index scale

```yaml
z.base: 0
z.stickyHeader: 100
z.categoryRail: 110
z.floatingCart: 200
z.navIsland: 300
z.bottomSheet: 400
z.modal: 500
z.toast: 600
```

---

## Implementation note

Engineers consume via BDS CSS variables only. See [BDS-CHANGES.md](./BDS-CHANGES.md).
