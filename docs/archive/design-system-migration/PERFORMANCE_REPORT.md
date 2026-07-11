# Design System — Performance Report

**Phase:** 5  
**Date:** 2026-07-10  
**Build:** `npm run build:web` after Phase 5 stabilization

---

## Summary

| Metric | Phase 4 | Phase 5 | Delta |
|--------|--------:|--------:|------:|
| Modules transformed | 3,988 | 4,004 | +16 |
| Main CSS (`main-*.css`) | 295.21 kB | 295.21 kB | 0 |
| Precache entries | 98 | 97 | -1 |
| DS → `components/` leaks | 4 | **0** | ✅ |

Founder Store remains visually identical. CSS bundle unchanged confirms no token global activation.

---

## Bundle contribution (gzip)

| Chunk | Phase 5 size | Notes |
|-------|-------------:|-------|
| `main-*.js` | 5.05 kB | App entry |
| `appBootstrap-*.js` | 215.34 kB | Shell + design-system barrel (static imports) |
| `checkout-*.js` | 383.53 kB | Checkout page + lazy DS barrel overlap |
| `MarketplaceHome-*.js` | 84.11 kB | Marketplace + DS search components |
| `my-orders-*.js` | 17.84 kB | Orders list + DigitalInvoice |
| `vendor-motion-*.js` | 90.37 kB | framer-motion (shared) |
| `vendor-react-*.js` | 194.19 kB | React (shared) |
| `vendor-firebase-*.js` | 678.64 kB | Firebase (shared) |

**Observation:** `OrderTracking` is no longer a separate lazy chunk — it loads via `import('./design-system')` which shares the barrel with static imports. Acceptable for Phase 5; Phase 6 should add dedicated lazy entry points if needed:

```typescript
// Future optimization (not Phase 5)
export const lazyOrderTracking = () => import('./orders/OrderTracking');
```

---

## Tree shaking

| Check | Result |
|-------|--------|
| Barrel `export *` from domains | Vite/esbuild tree-shakes unused named exports |
| `PulseSkeleton` vs `Skeleton` | Split prevents duplicate export collision |
| Token JS constants | Small — `tokens/index.ts` ~2 KB, tree-shakeable |
| CSS tokens | Not imported globally — zero CSS duplication in build |

**Warning:** Static + dynamic import of same barrel (`App.tsx`, `Checkout.tsx`) prevents splitting `AutoLocationForm` / `OrderTracking` from `appBootstrap`. Documented for Phase 6 optimization.

---

## Lazy loading

| Component | Pattern | Status |
|-----------|---------|--------|
| `OrderTracking` | `lazy(() => import('./design-system').then(...))` | ✅ Works |
| `AutoLocationForm` | Same pattern in Checkout | ✅ Works |
| Layout (Header, BottomNav) | Static from barrel | ✅ Intended — always visible |

---

## Dead exports

| Export | Status |
|--------|--------|
| `PulseSkeleton` | Used by marketing via `ui/Skeleton` stub path only — not dead |
| `ActiveOrderStripView` | Used by `ActiveOrderStrip` container |
| `StorefrontInstallButtonView` | Used by `StorefrontInstallButton` container |
| `DESIGN_SYSTEM_STYLES` | Reserved for Phase 7 token activation — intentional |

No orphan exports in public barrel.

---

## Duplicate dependencies

| Issue | Status |
|-------|--------|
| DS + stub double resolution | **Resolved** — Founder uses barrel directly |
| `Skeleton` name collision | **Resolved** — `PulseSkeleton` vs `Skeleton` |
| Parallel CSS (`index.css` + `tokens/`) | **Open** — tokens not activated; no runtime duplication |
| BDS + Experience CSS | **Untouched** per Phase 5 rules |

---

## Recommendations (Phase 6+, not implemented)

1. Add subpath lazy entries: `design-system/orders/OrderTracking` as optional lazy boundary
2. Split `checkout` chunk — inject view models to reduce Firebase in presentation path
3. Activate `styles/index.css` and remove duplicate MIB vars from `src/index.css`
4. Run `vite build --mode analyze` for chunk graph before OrderBhojan migration

---

## Validation

```
npm run build:web  → PASS (1m 26s)
validate-architecture.mjs → PASS
```

---

## Gate

Performance acceptable for Founder Store production. No regression in CSS bundle size. Barrel coupling documented for Phase 6 optimization.
