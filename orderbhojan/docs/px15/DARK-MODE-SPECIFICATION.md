# Dark Mode Specification — PX1.5

**Default theme:** `food` (warm dark)  
**Light theme:** `foodLight` (cream kitchen)

---

## Theme tokens

### food (dark) — default

| Token | Value |
|-------|-------|
| background | `#070504` |
| surface | `#120D0A` |
| surface-elevated | `#1A1410` |
| text-primary | `#FFFAF3` |
| text-secondary | `#D0C4B5` |
| text-tertiary | `#B9ADA1` |
| primary | `#FF7A00` |
| primary-hover | `#FF9F43` |
| divider | `rgba(255,255,255,0.06)` |
| glass-bg | `color-mix(in srgb, #120D0A 72%, transparent)` |
| glass-border | `rgba(255,170,95,0.12)` |
| hero-scrim | `linear-gradient(to top, rgba(7,5,4,0.92) 0%, transparent 55%)` |
| glow-hover | `0 0 30px -10px rgba(255,107,53,0.25)` |

### foodLight (light)

| Token | Value |
|-------|-------|
| background | `#FFFAF3` |
| surface | `#FFF8F0` |
| surface-elevated | `#FFFFFF` |
| text-primary | `#120D0A` |
| text-secondary | `#6B635C` |
| primary | `#FF7A00` |
| divider | `rgba(18,13,10,0.08)` |
| glass-bg | `color-mix(in srgb, #FFF8F0 85%, transparent)` |
| glass-border | `rgba(255,122,0,0.15)` |
| hero-scrim | `linear-gradient(to top, rgba(255,250,243,0.88) 0%, transparent 50%)` |
| shadow | warm-tinted rgba(255,107,53,0.08) |

---

## Per-component dark treatment

| Component | Dark | Light |
|-----------|------|-------|
| ImmersiveHero | deep scrim, gloss on image | lighter scrim, warm shadow |
| NavIsland | brown glass, orange active | cream glass, orange active |
| FoodRow | warm surface gradient | white surface, soft shadow |
| PremiumSearch | glass warm | glass cream |
| BottomSheet | `#120D0A` 92% | `#FFF8F0` 95% |
| Skeleton | shimmer `#1A1410`→`#2A2623` | `#F4EDE4`→`#FFFAF3` |
| PremiumEmpty | cream illustration on dark | warm illustration on light |

---

## Image treatment

| Mode | Filter |
|------|--------|
| food | brightness(0.96) sepia(0.04) |
| foodLight | none |

---

## Theme resolution

| User preference | App theme |
|-----------------|-----------|
| system dark | food |
| system light | foodLight |
| explicit food | food |
| explicit foodLight | foodLight |

Inline script in HTML prevents flash of wrong theme.

---

## Switch animation

200ms crossfade on color tokens. Reduced motion: instant.

---

## Prototype pairs

Every screen requires light + dark SVG:
- `home-mobile-light.svg` / `home-mobile-dark.svg`
- Others: dark default; light noted in spec where applicable

---

## MIB alignment

MIB `#070504` stack is canonical dark — **not** neutral `#121212` Material dark.

---

## Certification

DRB verifies food photos remain appetizing in both modes at ≥9.5 subjective score.
