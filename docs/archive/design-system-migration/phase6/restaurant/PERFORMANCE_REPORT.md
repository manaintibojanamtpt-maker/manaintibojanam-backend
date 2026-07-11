# Phase 6 — Milestone 3A: Performance Report

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10

## Bundle comparison

| Metric | After 2D (Discovery) | After 3A (Restaurant Shell) | Delta 3A |
|--------|----------------------|----------------------------|----------|
| CSS (gzip) | 39.48 kB (254.08 kB raw) | 39.93 kB (257.17 kB raw) | +0.45 kB gzip |
| JS main chunk (gzip) | 408.43 kB (1,484.69 kB raw) | 409.10 kB (1,487.50 kB raw) | +0.67 kB gzip |
| Precache total | 2,053 KiB | 2,059 KiB | +6 KiB |

## Assessment

| Criterion | Result |
|-----------|--------|
| Unnecessary bundle increase | ✅ No — raw JS +0.19% |
| Tree-shaking maintained | ✅ Adapter subpath imports only |
| Cover preload preserved | ✅ `useHeroPreload` unchanged |
| Gallery lazy load preserved | ✅ `useLazyInView` unchanged |
| BDS `RestaurantHero` in hot path | ✅ Removed |

## New modules

- `OrderBhojanRestaurantExperience` + 6 sibling presentation modules

## Removed from hot path

- BDS `RestaurantHero`, `FloatingCTA`, `GlassSurface`, `MotionPage`, `MotionReveal`, `PremiumEmpty`, `Skeleton` (restaurant page)
