# Accessibility Specification — PX1.5

**Standard:** WCAG 2.1 Level AA minimum  
**Visual certification includes a11y at ≥9.5**

---

## Color contrast

| Pair | Ratio | Pass |
|------|-------|------|
| cream `#FFFAF3` on `#070504` | 16.8:1 | AAA |
| muted `#D0C4B5` on `#070504` | 9.2:1 | AAA |
| primary `#FF7A00` on `#070504` | 5.8:1 | AA large |
| `#120D0A` on `#FFFAF3` (light) | 14.1:1 | AAA |
| microLabel on glass | verify ≥4.5:1 per bg | required |

All new glass surfaces must pass contrast audit in both themes.

---

## Touch targets

- Minimum **48×48px** interactive area (padding allowed)
- FoodRow ADD: 36px visual + 48px hit slop
- NavIsland items: 48px width min
- Category chips: 44px height min (36px + 4px slop vertical)

---

## Focus

- Visible focus ring 2px primary offset 2px on all interactives
- Focus order: logical DOM order, skip link first
- Skip link: "Skip to main content" sr-only until focus

---

## Screen readers

| Screen | Requirements |
|--------|--------------|
| Home | sr-only h1 "OrderBhojan Home" |
| Restaurant | cover alt="{name} restaurant" |
| Menu | aria-label on ADD "Add {dish} to cart" |
| Cart | aria-live polite on count/total change |
| Search | combobox pattern, aria-expanded suggestions |
| Profile | no UID in DOM |

---

## Motion & vestibular

```css
@media (prefers-reduced-motion: reduce) {
  /* All specs in MOTION-SPECIFICATION reduced paths */
}
```

- No auto-carousel advance >5s without pause control
- Parallax disabled
- Fly-to-cart disabled → badge increment only

---

## Keyboard

| Context | Keys |
|---------|------|
| Search suggestions | ↑↓ navigate, Enter select, Esc dismiss |
| Menu categories | ←→ scroll rail |
| Bottom sheet | Esc close, focus trap |
| Dialog | Esc close, focus trap |
| Cart | stepper arrow keys |

---

## Color independence

- Veg/non-veg: icon + text label, not color alone
- Rating: star icon + number
- Offers: text + badge

---

## False affordances (forbidden)

- Disabled Call/Direction/ voice icons visible
- Buttons that look enabled but are inert
- Infinite loading without announcement

---

## Testing checklist

- [ ] VoiceOver iOS full journey
- [ ] TalkBack Android full journey
- [ ] Keyboard-only desktop all screens
- [ ] 200% zoom no horizontal scroll clip
- [ ] Windows High Contrast
- [ ] axe-core zero critical on all routes

---

## Accessibility annotations on prototypes

Each prototype SVG includes `<desc>` with role structure for DRB review.
