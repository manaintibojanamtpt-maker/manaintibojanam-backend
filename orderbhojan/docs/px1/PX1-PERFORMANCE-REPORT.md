# PX1 Performance Report

**Program:** PX1  
**Stage:** 5 template — **pending implementation**  
**Owner:** Performance (10)

---

## Targets (PX1)

| Metric | Target | Before (m65) |
|--------|--------|--------------|
| LCP (mobile) | ≤2.5s | ~3.2s est. |
| FCP | ≤1.8s | — |
| CLS | ≤0.1 | — |
| INP | ≤200ms | — |
| Bundle (gzip) | ≤1700 KB | ~1576 KB |
| Animation | 60fps | Partial |
| Image LQIP | <100ms perceived | Partial blur-up |

---

## PX1 performance strategy

### Images
- Preload home hero LCP image (`<link rel="preload">`)
- `AppetiteImage` dominant-color placeholder (<1KB)
- WebP/AVIF with JPEG fallback
- srcset 1x/2x/3x for food thumbs
- Lazy load below-fold only

### Motion
- GPU-only: `transform`, `opacity`, `filter`
- `LazyMotion` + `domAnimation`
- Max 3 concurrent `layoutId` animations
- `will-change` only during active animation

### JavaScript
- BDS tree-shake unused components
- FlyToCart code-split if >15KB
- No new API clients or query layers

### CSS
- Delete 3-layer experience CSS cascade → single layout file
- No `@import` chains in hot path

---

## Gate:px1 performance smoke

- Build size ≤1700 KB (framer-motion + BDS v1.1 budget)
- No raw `px` animation in CSS (transform only)
- Hero preload link present in dist index.html
- Lighthouse smoke: viewport, preconnect, lazy hooks

---

## Measurement plan (post-implementation)

1. Lighthouse CI on home, menu, restaurant (mobile + desktop)
2. WebPageTest 3G slow on home
3. Chrome Performance panel — fly-to-cart 60fps check
4. Bundle analyzer diff vs v0.8.5-m65

---

## Certification score target

**Performance category: ≥9.5** in Visual Certification

**Status:** ☐ Not measured — pending Stage 4
