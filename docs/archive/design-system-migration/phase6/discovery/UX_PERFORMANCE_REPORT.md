# Phase 6 — Milestone 2D: UX Performance Report

**Agent:** 2 — Discovery Migration  
**Date:** 2026-07-10

## Bundle comparison

| Metric | After 2C (Search) | After 2D (UX States) | Delta 2D |
|--------|-------------------|----------------------|------------|
| CSS (gzip) | 39.41 kB (253.55 kB raw) | 39.48 kB (254.08 kB raw) | +0.07 kB gzip |
| JS main chunk (gzip) | 406.95 kB (1,477.43 kB raw) | 408.43 kB (1,484.69 kB raw) | +1.48 kB gzip |
| Precache total | 2,045 KiB | 2,053 KiB | +8 KiB |
| Build time | ~21.5s | ~23.8s | No regression |

## Assessment

| Criterion | Result |
|-----------|--------|
| Skeleton render | ✅ `SkeletonSystem` shimmer — GPU-friendly CSS animation |
| Layout shift | ✅ Skeleton dimensions match content rails |
| Bundle increase | ✅ Raw JS +0.49% — acceptable for unified state layer |
| Memory | ✅ `useOnlineStatus` — two event listeners, no global store |
| Animation | ✅ `motion-reduce:animate-none` on loading spinner |
| Duplicate BDS skeletons in discovery hot path | ✅ Removed (`MenuSkeleton` → `TrendingSkeleton`) |

## New modules

- `OrderBhojanDiscoveryUxState` (+ presets map)
- `OrderBhojanDiscoveryOfflineNotice`
- `useOnlineStatus`

## Removed from hot path

- BDS `MenuSkeleton` in `TrendingFoodsSection`
- Raw shimmer divs in browse skeleton
- BDS `EmptyState` / `ErrorState` in `ExperienceEmptyStates` (shimmed)
