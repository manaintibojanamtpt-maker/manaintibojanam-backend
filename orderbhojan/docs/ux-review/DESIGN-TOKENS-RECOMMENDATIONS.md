# Design Token Recommendations (BDS)

**Principle:** Improve BDS — never bypass or duplicate.  
**Source:** MIB `src/index.css` warmth + UX reference apps.

---

## New tokens required

### Color — warm surfaces

| Token | Value | Purpose |
|-------|-------|---------|
| `--bds-color-glass-warm` | `color-mix(in srgb, #120D0A 72%, transparent)` | Brown-tinted glass (MIB `mib-glass`) |
| `--bds-color-glass-warm-border` | `rgba(255, 170, 95, 0.12)` | Warm glass edge |
| `--bds-color-glow-primary` | `0 0 30px -10px rgba(255, 107, 53, 0.25)` | Food hover glow |
| `--bds-color-surface-warm` | `#120D0A` | Card base (MIB `--mib-surface`) |
| `--bds-color-surface-warm-strong` | `#1A1410` | Elevated warm surface |
| `--bds-color-background-luxury` | `#070504` | Default dark bg (MIB `--mib-bg`) |

### Color — food semantics

| Token | Purpose |
|-------|---------|
| `--bds-color-badge-bestseller` | `#D4A574` / `#F4C27A` (MIB gold badges) |
| `--bds-color-badge-chef` | Warm amber variant |
| `--bds-color-overlay-hero` | `linear-gradient(to top, rgba(7,5,4,0.92) 0%, transparent 55%)` |

### Typography

| Token | Spec | Purpose |
|-------|------|---------|
| `--bds-font-accent-script` | `'Great Vibes', cursive` | Emotional hero accent (MIB) |
| `--bds-type-display-hero` | `clamp(2.75rem, 8vw, 5rem) / 0.95 / 900` | Home hero beyond displayXl |
| `--bds-type-micro-label` | `0.625rem / 900 / 0.25em letter-spacing / uppercase` | MIB micro-labels |
| `--bds-type-price-lg` | `1.25rem / 800 / -0.02em` | Dominant price hierarchy |

### Spacing

| Token | Value | Purpose |
|-------|-------|---------|
| `--bds-space-section-lg` | `48px` (6×8pt) | Luxury section gap |
| `--bds-space-section-xl` | `64px` (8×8pt) | Hero-to-content breathing |
| `--bds-space-card-inset` | `20px` | Premium card internal padding |
| `--bds-space-touch-min` | `48px` | Enforced touch target |

### Radius

| Token | Value | Purpose |
|-------|-------|---------|
| `--bds-radius-food-card` | `1.75rem` (28px) | MIB card radius |
| `--bds-radius-hero` | `clamp(1.25rem, 3vw, 2rem)` | Edge-bleed hero corners |
| `--bds-radius-nav-island` | `2.5rem` | MIB floating nav |

### Shadow

| Token | Purpose |
|-------|---------|
| `--bds-shadow-food-card` | MIB `--mib-shadow-card` stack |
| `--bds-shadow-nav-island` | Floating nav elevation |
| `--bds-shadow-lift-soft` | M65 ambient lift |

### Motion

| Token | Purpose |
|-------|---------|
| `--bds-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `--bds-duration-reveal` | `0.5s` |
| `--bds-duration-press` | `0.12s` |

### Image

| Token | Purpose |
|-------|---------|
| `--bds-aspect-food-row` | `1 / 1` (square thumb in horizontal row) |
| `--bds-aspect-food-hero` | `16 / 10` |
| `--bds-aspect-restaurant-cover` | `16 / 9` |

---

## Theme mode recommendation

Add BDS theme mode: **`food`** (already in type union, underutilized)

- Default dark = luxury warm (`#070504` stack), not neutral gray
- Light mode = cream `#FFFAF3` bg with warm surfaces
- System mode resolves to `food` not generic light/dark

---

## Migration path

1. Add tokens to `packages/design-system/src/tokens/`
2. Expose in `bds.css` as CSS variables
3. Deprecate `--ob-m65-*` local tokens — migrate to BDS
4. Remove duplicate definitions across `experience-shell`, `experience-premium`, `experience-premium-m65`

---

## Acceptance

UX-2.0 Visual Gate requires all new surfaces consume BDS tokens only — zero `--ob-m65-*` additions.
