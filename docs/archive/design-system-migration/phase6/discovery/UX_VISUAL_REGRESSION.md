# Phase 6 — Milestone 2D: UX Visual Regression Report

**Agent:** 2 — Discovery Migration  
**Date:** 2026-07-10

## Method

Static comparison of UX state presentation against Founder Store patterns (`MarketplaceHomeStates`, `MarketplaceSearchStates`, `SkeletonSystem`).

---

## Loading states

| Surface | Before | After | Match |
|---------|--------|-------|-------|
| Home feed | `OrderBhojanHomeFeedSkeleton` (2A) | `SkeletonSystem` variants | ✅ |
| Search results | `RecommendedSkeleton` | Unchanged (2C) | ✅ |
| Search browse | Raw `shimmer` divs | `CategorySkeleton` + `Skeleton` | ✅ |
| Trending dishes | BDS `MenuSkeleton` | `TrendingSkeleton` horizontal rail | ✅ |
| Inline loading spinner | — | `Loader2` orange spinner variant | ✅ |

---

## Error states

| Surface | Before | After | Match |
|---------|--------|-------|-------|
| Discovery home | `OrderBhojanDiscoveryStatePanel` | `OrderBhojanDiscoveryUxState` + `GlassCard` + icon | ✅ |
| Mock feed | Silent `null` | Error panel with retry | ✅ |
| Search results | State panel | `no-results` / `error` presets | ✅ |
| Search browse | Missing | Error panel with retry | ✅ |
| Load-more rail | Silent failure | `load-more-error` compact panel | ✅ |

---

## Empty states

| Surface | Before | After | Match |
|---------|--------|-------|-------|
| No kitchens | Text panel | `no-restaurants` + MapPin/Utensils icon | ✅ |
| No search results | Custom title | `no-results` preset | ✅ |
| Browse zero | `GlassCard` (2C) | Unchanged | ✅ |
| Category filter empty | Silent | `empty` compact variant | ✅ |

---

## Offline states

| Surface | Before | After | Match |
|---------|--------|-------|-------|
| Discovery home | None | Banner + offline UX state | ✅ |
| Search | None | Compact offline banner | ✅ |

---

## Responsive

| Breakpoint | UX state card | Match |
|------------|---------------|-------|
| Mobile | Full-width `GlassCard`, stacked buttons | ✅ |
| Tablet | `max-w-lg` centered | ✅ |
| Desktop | Same centered layout | ✅ |

---

## Baseline

See `docs/design-system-migration/baselines/2D-ux-states/` for component tree and metrics.
