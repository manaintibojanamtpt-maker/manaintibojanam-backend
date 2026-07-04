# BDS-2 Integration Report

**Milestone:** BDS-2 — Integration & Certification  
**Status:** Complete  
**OrderBhojan:** `0.2.0-bds2`  
**BDS:** `@bhojan/design-system@1.0.0`

## Summary

OrderBhojan M0 shell fully consumes Bhojan Design System v1.0. All legacy UI primitives in `src/shared/components/` were removed. Layouts, pages, providers, and error handling now use BDS exclusively.

## Integration Points

| Area | Change |
|------|--------|
| Bootstrap | `@bhojan/design-system/styles.css` + `DesignSystemProvider` |
| Layouts | `MarketplaceLayout`, `AuthLayout`, `FullScreenLayout`, `ResponsiveLayout` |
| Pages | Home, Foundation, Auth, all placeholder routes |
| Toast | `BdsToastProvider` wrapping BDS `Toast` |
| Error | `ErrorBoundary` uses BDS `Card`, `Button`, `ErrorState` |

## Routes Certified

`/`, `/foundation`, `/auth`, `/discovery`, `/search`, `/menu`, `/cart`, `/profile`, and all M0 placeholder routes.

## Out of Scope (Honored)

No authentication, discovery, search, menu, cart, checkout, payments, orders, or BhojanOS changes.

## Gate

```bash
cd orderbhojan && npm run gate:bds2
```
