# Performance Report

## Measurements (`npm run test:performance`)

| Metric | Limit | Notes |
|--------|-------|-------|
| Production build time | ≤120s | Measured on gate run |
| JS bundle (dist/assets) | ≤800 KB | Vite code-split output |
| Theme switch | Instant | CSS variable swap, no full reload |
| First paint | Dev-verified | BDS CSS single import |

## Bundle Impact

Adding `@bhojan/design-system` increases OrderBhojan bundle vs M0 local primitives; offset by removing duplicate component code and unused deps (`lucide-react`, `react-hot-toast`).

## Re-render

Theme toggle updates CSS variables on `<html>` — minimal React re-render scope.

## Recommendations (Future)

- Lazy-load heavy BDS marketplace components on route activation
- `optimizeDeps.include` configured in Vite
