# Tablet Improvements (768–1024px)

**Current score: 6.0 / 10**

---

## Current behavior

- Home: single column, centered, max-width constraints from shell CSS
- Menu: 2-column food grid
- Restaurant: single column brochure
- Bottom nav: centered floating island (good)
- Search: single column, full width field

**Problem:** Tablet shows a **stretched phone layout**, not a tablet-native experience.

---

## UX-2.0 tablet targets

### Home (768–1024)

| Element | Design |
|---------|--------|
| Hero | 2-column: left greeting+search, right featured food hero image |
| Categories | 2-row grid of larger circular food photos (MIB pattern) |
| Restaurant rails | 2-column card grid instead of horizontal-only rail |
| Trending | 3-column food row grid |

### Menu (768–1024)

| Element | Design |
|---------|--------|
| Layout | **Sidebar + content** — vertical category rail left (240px), food rows right |
| Food items | Horizontal `FoodRow` at full width |
| Header | Compact — restaurant name in sidebar top |
| Preview cart | Bottom bar full width or side dock |

### Restaurant (768–1024)

| Element | Design |
|---------|--------|
| Hero | 60vh cover with overlay content left-aligned |
| Body | 2-column: main info left, quick actions + offers sticky right |
| Gallery | 3-column grid |

### Search (768–1024)

| Element | Design |
|---------|--------|
| Layout | Centered search max 640px, results 2-column grid |

---

## Breakpoint tokens (BDS)

```css
--bds-breakpoint-tablet: 768px;
--bds-breakpoint-tablet-lg: 1024px;
--bds-layout-sidebar-width: 240px;
--bds-layout-tablet-gutter: 24px;
```

---

## Touch on tablet

- Maintain 48px touch targets (not shrink for mouse)
- Support Apple Pencil / stylus hover on iPad (BDS `:hover` at `(pointer: fine)`

---

## Acceptance (9/10)

- [ ] No single-column phone layout on 820px iPad
- [ ] Menu sidebar rail on tablet+
- [ ] Home uses horizontal space (2-col minimum)
- [ ] Bottom nav proportional, not phone-width stretched
