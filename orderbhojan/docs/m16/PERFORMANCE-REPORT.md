# M1.6 Performance Report

## Bundle

| Metric | Value |
|--------|-------|
| JS assets (post-build) | ~1387 KB (limit 1500 KB) |
| Premium CSS | ~12 KB additional (no new JS dependencies) |

## Optimizations (Visual Layer)

- `loading="lazy"` + `decoding="async"` on hero/restaurant imagery
- Blur-up CSS transition on hero cover (no layout shift after load)
- CSS-only animations (GPU-friendly transforms)
- No new npm packages

## Lighthouse Readiness

Static smoke validates viewport, theme-color, safe-area, reduced-motion:

```bash
npm run test:lighthouse
```

Full Lighthouse audit: run manually in Chrome DevTools on production build.

## Future (Post-M2)

- Route-level code splitting for menu/checkout
- Image CDN with responsive `srcset`
