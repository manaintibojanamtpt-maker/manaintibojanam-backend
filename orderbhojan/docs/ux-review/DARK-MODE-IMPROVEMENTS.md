# Dark Mode Improvements

**Current score: 6.1 / 10** — fails Visual Gate.

---

## Problem

OrderBhojan uses BDS `theme="system"` which resolves to **neutral gray dark**, not MIB **luxury warm dark**. M65 added partial dark overrides for food cards and search field only.

---

## MIB dark reference

```
Background:     #070504  (candlelit black-brown)
Surface:        #120D0A
Surface strong: #1A1410
Text cream:     #FFFAF3
Muted:          #D0C4B5 / #B9ADA1
Border:         rgba(255,255,255,0.05)
Warm border:    rgba(255,170,95,0.12)
Glow:           rgba(255,107,53,0.25)
```

---

## Gap matrix

| Surface | Light | Dark | Issue |
|---------|-------|------|-------|
| Home shell | Warm gradient | Flat neutral | Loses warmth |
| Restaurant hero | Good | Good | Gradient ok |
| Food cards | Glass | Partial warm | M65 override only |
| Bottom nav | Glass island | Neutral glass | Cold |
| Search field | Glass | Partial | Inconsistent |
| Profile | BDS default | BDS default | No premium dark |
| Cart/Orders | BDS default | BDS default | No treatment |
| Location sheet | BDS default | BDS default | Cold white sheet |
| Skeleton shimmer | Gray | Gray | Harsh on warm bg |
| Category chips | Warm active | Neutral active | Loses orange glow |

---

## UX-2.0 dark mode strategy

### 1. Adopt `food` theme as default dark

BDS `ThemeMode` includes `food` — implement as warm dark stack above.

### 2. Warm glass everywhere

Replace neutral `backdrop-filter` with `--bds-color-glass-warm` token.

### 3. Orange glow interactions

All card hovers/active states use `--bds-color-glow-primary` in dark mode.

### 4. Image treatment

- Slight warm overlay on food photos in dark (`sepia(5%) brightness(0.95)`)
- Hero images: deeper gradient scrim for text legibility

### 5. Elevation without borders

Dark mode uses shadow + glow, not borders, for elevation.

### 6. Light mode parity

Light mode should feel like **bright kitchen morning**, not generic white:
- Background: `#FFFAF3` (BDS neutral-50)
- Surfaces: warm white `#FFF8F0`
- Shadows: warm-tinted, not gray

---

## Acceptance (9/10)

- [ ] Every screen audited in dark — no neutral gray fallback surfaces
- [ ] WCAG AA contrast maintained on warm backgrounds
- [ ] Theme switch animation (200ms crossfade)
- [ ] Food photography appetizing in both modes
- [ ] Glass surfaces brown-tinted, not gray
- [ ] Visual parity with MIB dark luxury on home + menu
