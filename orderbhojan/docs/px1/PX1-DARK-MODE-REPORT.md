# PX1 Dark Mode Report

**Program:** PX1  
**Stage:** Design + certification template  
**Owner:** Experience Evolution (18)

---

## Strategy

**Default theme:** BDS `food` — MIB warm dark luxury, not neutral system dark.

Light mode: `foodLight` — cream kitchen morning (`#FFFAF3` bg).

---

## Token stack (dark / food)

| Role | Token | Value |
|------|-------|-------|
| Background | `--bds-color-background-luxury` | `#070504` |
| Surface | `--bds-color-surface-warm` | `#120D0A` |
| Surface elevated | `--bds-color-surface-warm-strong` | `#1A1410` |
| Text primary | `--bds-color-text-primary` | `#FFFAF3` |
| Text muted | `--bds-color-text-secondary` | `#D0C4B5` |
| Border | `--bds-color-divider` | `rgba(255,255,255,0.05)` |
| Border warm | `--bds-color-glass-warm-border` | `rgba(255,170,95,0.12)` |
| Glass | `--bds-color-glass-warm` | brown 72% mix |
| Glow | `--bds-shadow-glow-primary` | orange 25% |

---

## Per-screen dark treatment

| Screen | Before (m65) | PX1 target |
|--------|--------------|------------|
| Home | Partial M65 override | Full warm gradient + hero scrim |
| Restaurant | Hero ok, body neutral | Warm cards + glow hover |
| Menu | Partial food card | FoodRow warm surface + image warm filter |
| Search | Partial field | Full glass warm |
| Profile | BDS default gray | Warm hero glass |
| Cart | BDS default | Warm line items |
| NavIsland | Neutral glass | Brown glass + orange indicator |
| Sheets | White/gray | warm-glass variant |

---

## Image treatment (dark)

```css
.bds-appetite-image--dark {
  filter: brightness(0.96) sepia(0.04);
}
```

Hero scrim deepened 5% vs light for text legibility.

---

## Light mode (foodLight)

| Role | Value |
|------|-------|
| Background | `#FFFAF3` |
| Surface | `#FFF8F0` |
| Text | `#120D0A` |
| Shadow | warm-tinted, not gray |
| Glass | cream 80% mix |

---

## Theme switch

- 200ms crossfade on `data-bds-theme` change
- Respect `prefers-color-scheme` when `theme="system"` maps to food/foodLight
- No flash of wrong theme on load (inline script in index.html)

---

## Certification

- [ ] All 7 screens audited dark + light with screenshots
- [ ] WCAG AA contrast on warm dark verified
- [ ] Food photos appetizing in both modes (DRB subjective ≥9.5)

**Dark Mode category target: ≥9.5**

**Status:** ☐ Pending implementation
