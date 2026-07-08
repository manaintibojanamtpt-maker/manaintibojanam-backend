# Animation Improvements

**Stack:** Framer Motion (keep) + BDS motion tokens + CSS `@media (prefers-reduced-motion)`.

---

## Current state (M6.5)

| Animation | Quality | Score |
|-----------|---------|-------|
| Page enter fade | Basic | 6/10 |
| Section stagger reveal | Good spring | 7/10 |
| Bottom nav indicator | Good layout spring | 8/10 |
| MotionPress (Add) | Scale only | 6/10 |
| Hero carousel | Opacity crossfade | 5/10 |
| Blur-up images | Good | 7/10 |
| Favorite burst | CSS class toggle | 5/10 |
| Skeleton shimmer | Generic gradient | 4/10 |
| Shared transitions | None | 0/10 |
| Fly-to-cart | None | 0/10 |

**Motion Score: 7.0 / 10** — fails 9/10 gate.

---

## Required animations (UX-2.0)

### Tier 1 — Native feel

| Animation | Spec |
|-----------|------|
| **Fly-to-cart** | Food thumb scales down + bezier path to cart icon, 400ms spring |
| **Shared hero** | Restaurant cover → menu header shared layoutId transition |
| **Add button** | Scale 0.92 → 1 + ripple ring + haptic |
| **Cart enter/exit** | Spring from bottom, blur backdrop |
| **Nav indicator** | Existing — add slight overshoot damping tune |

### Tier 2 — Delight

| Animation | Spec |
|-----------|------|
| **Carousel slide** | Horizontal spring slide + parallax on image |
| **Category rail active** | layoutId pill behind active chip |
| **Section reveal** | Stagger 50ms, y: 24→0, opacity, spring stiffness 260 |
| **Skeleton → content** | Crossfade morph, not pop |
| **Favorite burst** | 6 particle dots, orange, 300ms |
| **Offer chip pulse** | Subtle scale breathe on hero offers |

### Tier 3 — Polish

| Animation | Spec |
|-----------|------|
| **Theme transition** | 200ms color crossfade on `data-bds-theme` change |
| **Search expand** | Field height + width spring on focus |
| **Pull-to-refresh** | Elastic indicator with food icon rotation |
| **Scroll-linked hero** | translateY + scale 1→1.08 on hero image |

---

## Performance budget

- All animations GPU-only: `transform`, `opacity`, `filter`
- Max 3 simultaneous layoutId animations
- `LazyMotion` + `domAnimation` (keep)
- No animation on low-end: respect `prefers-reduced-motion` → instant or opacity-only
- Target 60fps on iPhone 12 / Pixel 6 equivalent

---

## Implementation home

Move animation primitives to BDS:

```
packages/design-system/src/motion/
  MotionReveal.tsx
  MotionPage.tsx
  MotionPress.tsx
  FlyToCart.tsx
  SharedHero.tsx
  useReducedMotion.ts (re-export)
```

OrderBhojan consumes BDS motion only — delete local `premiumMotion.tsx` after migration.

---

## Visual Gate motion criteria (9/10)

- [ ] Fly-to-cart on every add action
- [ ] Shared transition on primary navigation paths (home→restaurant→menu)
- [ ] Zero janky layout shifts during animation
- [ ] Reduced motion path tested on all animations
- [ ] Carousel uses spring physics, not opacity-only
- [ ] Skeleton morphs into content
