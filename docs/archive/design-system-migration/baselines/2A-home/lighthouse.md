# Lighthouse Baseline — 2A Home

**Route:** `/`  
**Date:** 2026-07-10  
**Capture tool:** Chrome Lighthouse (Incognito, throttled)

## Capture steps

1. `cd orderbhojan && npm run build && npm run preview`
2. Open `http://localhost:4173/` (or dev server port)
3. Run Lighthouse for Performance, Accessibility, Best Practices, SEO
4. Repeat at desktop (1440px), tablet (768px), mobile (390px)

## Expected scores (target)

| Category | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Performance | ≥ 85 | ≥ 80 | ≥ 75 |
| Accessibility | ≥ 95 | ≥ 95 | ≥ 95 |
| Best Practices | ≥ 90 | ≥ 90 | ≥ 90 |
| SEO | ≥ 90 | ≥ 90 | ≥ 90 |

## Recorded scores

| Viewport | Performance | Accessibility | Best Practices | SEO | Notes |
|----------|-------------|---------------|----------------|-----|-------|
| Desktop | _pending capture_ | _pending_ | _pending_ | _pending_ | |
| Tablet | _pending capture_ | _pending_ | _pending_ | _pending_ | |
| Mobile | _pending capture_ | _pending_ | _pending_ | _pending_ | |

## Key audit checks

- Hero LCP element: `OrderBhojanHomeHero` image/text
- Color contrast: white on `#030303`
- Tap targets: category chips, search launcher
- `prefers-reduced-motion`: DS motion tokens
