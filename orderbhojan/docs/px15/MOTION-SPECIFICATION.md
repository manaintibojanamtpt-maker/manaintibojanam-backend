# Motion Specification — PX1.5

**Specification only.** No Framer Motion code. Engineers implement via BDS motion tokens.

---

## Principles

1. Motion **communicates** — never decorates
2. **60 FPS** — transform/opacity only
3. **Spring physics** for UI; ease for fades
4. **Reduced motion** — instant or opacity-only fallback
5. Max **3** simultaneous shared-element transitions

---

## Spring constants (frozen)

| Name | Stiffness | Damping | Use |
|------|-----------|---------|-----|
| default | 260 | 28 | page, sections, nav indicator |
| snappy | 400 | 32 | sheet, button release |
| gentle | 180 | 24 | carousel slide |

---

## Page transitions

| Route | Enter | Exit |
|-------|-------|------|
| Tab switch | fade 400ms + y 12→0 | fade 200ms |
| Push (home→restaurant) | shared hero layoutId 450ms | fade previous |
| Push (restaurant→menu) | hero compress y + fade title 350ms | — |
| Modal/sheet | spring bottom 350ms | reverse |
| Pop back | reverse shared hero OR slide right 300ms | — |

**Reduced motion:** crossfade 200ms only, no y transform, no shared hero.

---

## Shared element transitions

| Pair | layoutId | Notes |
|------|----------|-------|
| Home RestaurantCard cover → RestaurantHero cover | `restaurant-cover-{id}` | borderRadius 28→0 |
| Restaurant logo → Menu header avatar | `restaurant-logo-{id}` | scale preserve |
| FoodRow thumb → Customize header thumb | `food-thumb-{id}` | optional |

---

## Hero collapse (ContextHeader)

| Scroll | Effect |
|--------|--------|
| 0–80px | Header full opacity, title hidden |
| 80–160px | Cover parallax translateY scroll×0.3 |
| >160px | Header glass compact, title visible scale 0.85→1 |

Duration: scroll-linked (no time-based). Reduced motion: binary collapsed at 160px, no parallax.

---

## Search expansion

| State | Motion |
|-------|--------|
| Focus | translateY -2px, shadow glow 200ms spring |
| Blur | reverse |
| Suggestions appear | height auto 250ms spring snappy, items stagger 30ms opacity |

---

## Favorite animation

1. Scale heart 1→1.3→1 (200ms snappy)
2. 6 particles orange, radial burst 300ms
3. Haptic success
4. Reduced motion: fill color toggle only

---

## Fly-to-cart

1. Clone thumb 96px at source position
2. bezier curve to cart icon center
3. scale 1→0.3, opacity 1→0.8 over 400ms
4. Cart icon bounce scale 1→1.15→1
5. Haptic medium
6. Reduced motion: cart badge number spring increment only

---

## Bottom sheet

| Phase | Motion |
|-------|--------|
| Open | y 100%→snap point, backdrop opacity 0→0.5, 350ms spring |
| Drag | follow finger, velocity dismiss |
| Snap | nearest of 45%, 90% |
| Close | y to 100%, backdrop fade |

Scrim tap: close if allowed.

---

## Dialog

- Scale 0.95→1 + opacity 0→1, 250ms spring snappy
- Focus trap on open

---

## Skeleton shimmer

- Gradient sweep left→right 1500ms linear infinite
- Shape matches final component geometry
- Transition to content: crossfade 300ms, shimmer opacity 0

**Max display:** 2000ms then force empty/error state.

---

## Loading (app)

- Food plate silhouette opacity pulse 0.4↔0.8 1200ms ease-in-out
- No spinner-only full screen

---

## NavIsland indicator

- `layoutId` slide between tabs, spring default
- Reduced motion: instant position jump

---

## Carousel (home hero)

- Horizontal spring slide, 400ms
- Parallax: active image scale 1.02, adjacent 0.98
- Dot indicator width morph
- Reduced motion: instant cut

---

## Button press

- scale 0.96, 120ms, release spring
- Primary: optional ripple ring opacity 0.3→0 400ms

---

## Theme switch

- CSS variables crossfade 200ms ease on `data-bds-theme`
- No flash: inline theme script before paint

---

## Performance budget

- No motion >500ms except shimmer loop
- Cancel animations on unmount
- `will-change` only during active animation

---

## Documentation per screen

| Screen | Primary motions |
|--------|-----------------|
| Home | carousel, section reveal, nav hide, shared hero |
| Restaurant | parallax, header collapse, FloatingCTA slide |
| Menu | category layoutId, fly-to-cart, CartBar slide |
| Search | field lift, suggestion stagger |
| Sheet | bottom spring, fly-to-cart |
| Cart | row stagger, remove slide |

---

## Engineer handoff

Implement via BDS: `MotionPage`, `MotionReveal`, `MotionPress`, `SharedHero`, `FlyToCart` — see [BDS-CHANGES.md](./BDS-CHANGES.md).
