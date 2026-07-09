# Performance Standards

## Budgets (OrderBhojan)

| Metric | Target | Enforced By |
|--------|--------|-------------|
| JS bundle (gzip) | ≤ 1500 KB | `performance-smoke.mjs` |
| Lighthouse Performance | ≥ 85 (mobile) | Performance agent smoke |
| CLS | < 0.1 | Manual / Lighthouse |
| LCP | < 2.5s on 4G | Manual / Lighthouse |

Budgets may tighten per milestone — document in architecture report.

## Required Techniques

### Code Splitting

- Route-level lazy loading (`React.lazy`)
- Heavy features behind dynamic import

### Images

- WebP/AVIF where supported
- Lazy loading (`loading="lazy"`)
- Blur-up placeholder pattern (`useBlurUpImage` in experience layer)
- Explicit width/height to prevent CLS

### Lists

- Virtualize lists > 50 items (react-window / tanstack virtual)
- Pagination or infinite scroll for marketplace catalogs (future API milestones)

### CSS

- Import feature CSS from `main.tsx` — not nested `@import` in Tailwind globals
- Avoid layout-triggering animations on large surfaces

### Network

- TanStack Query caching and stale times
- MSW disabled in production — no mock overhead

### React

- Dedupe React in Vite config
- Avoid unnecessary re-renders in scroll handlers — throttle/debounce

## Measurement

```bash
cd orderbhojan
npm run build
node scripts/performance-smoke.mjs
```

## Milestone Review

Performance agent runs smokes before Release Manager sign-off.

Report includes:

- Bundle size delta vs previous milestone
- Known regressions and follow-ups

## Related

- Agent: [agents/10-performance.md](../agents/10-performance.md)
- [reviews/quality-gates.md](../reviews/quality-gates.md)
