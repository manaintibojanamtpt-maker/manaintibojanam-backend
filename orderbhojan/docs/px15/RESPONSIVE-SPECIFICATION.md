# Responsive Specification — PX1.5

---

## Breakpoints (frozen)

| Token | px | Target devices |
|-------|-----|----------------|
| xs | 320–374 | iPhone SE |
| sm | 375–767 | iPhone 14, Pixel |
| md | 768–1023 | iPad portrait |
| lg | 1024–1279 | iPad landscape |
| xl | 1280–1439 | Laptop |
| 2xl | 1440–1919 | Desktop |
| 3xl | 1920–2559 | Full HD |
| 4xl | 2560+ | Ultrawide |

---

## Layout rules by breakpoint

| Breakpoint | Nav | Home | Menu | Content width |
|------------|-----|------|------|---------------|
| 320–767 | NavIsland bottom | 40vh hero, rails | FoodRow, horiz rail | edge-to-edge |
| 768–1023 | NavIsland centered | split hero, 2-col grid | sidebar rail 240px | 24px gutter |
| 1280+ | SideNav 240px | hero band, 3-col | sidebar + optional cart dock | max 1400px |
| 2560+ | SideNav | same | same | max 1400px centered |

**No phone column on desktop.**

---

## Portrait vs landscape (phone)

| Screen | Portrait | Landscape |
|--------|----------|-----------|
| Home hero | 40vh | max 38vh (~150px) |
| Restaurant hero | 45vh | max 40vh |
| Menu categories | horizontal rail | vertical rail left 80px |
| NavIsland | bottom center | bottom or right dock 56px compact |

---

## Foldables

| Posture | Layout |
|---------|--------|
| Folded | Standard sm layout |
| Unfolded ≥884px | Dual pane: list 45% \| detail 55% |
| Hinge | `env(viewport-segment-*` ) gutter 16px each side |

Home unfolded: restaurant list left, hero preview right.  
Menu unfolded: categories | items | cart dock.

Fallback: md tablet layout if API unavailable.

---

## Safe area matrix

| Element | top | bottom | left | right |
|---------|-----|--------|------|-------|
| LocationChip | safe+12 | — | 16 | — |
| ContextHeader | safe | — | 16 | 16 |
| NavIsland | — | safe+8 | 16 | 16 |
| FloatingCTA | — | safe+88 | 16 | 16 |
| CartBar | — | safe+72 | 0 | 0 |
| SideNav | safe | safe | 0 | — |

---

## Typography responsive

All display sizes use `clamp()` — no breakpoint jumps for type.

| Token | clamp |
|-------|-------|
| displayHero | clamp(2.75rem, 8vw, 5rem) |
| displayXl | clamp(2rem, 5vw, 3rem) |

---

## Image srcset

| Context | Widths |
|---------|--------|
| Hero | 640, 960, 1280, 1920 |
| Food thumb | 96, 192, 288 |
| Restaurant card | 280, 560, 840 |

---

## Test matrix (certification)

- [ ] 320×568 portrait
- [ ] 375×812 portrait
- [ ] 390×844 portrait
- [ ] 412×915 portrait
- [ ] 812×375 landscape
- [ ] 768×1024 tablet portrait
- [ ] 1024×768 tablet landscape
- [ ] 1280×800 desktop
- [ ] 1440×900 desktop
- [ ] 1920×1080 desktop
- [ ] 2560×1440 ultrawide
- [ ] Galaxy Fold unfolded

---

## Edge-to-edge rule

Heroes and covers: **zero horizontal margin** on mobile/tablet.  
Text content: **16px inset** minimum.  
Desktop: hero may inset 24px with 24px radius container.
