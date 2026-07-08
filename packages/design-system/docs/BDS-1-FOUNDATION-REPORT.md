# BDS-1 Foundation Report

**Milestone:** BDS-1 — Foundation  
**Status:** Complete  
**Version:** `0.1.0-bds1`  
**Date:** 2026-06-26

## Executive Summary

BDS-1 delivers the official Bhojan Design System foundation: semantic design tokens, theme providers, 33 reusable React components, CSS primitives, motion presets, Storybook documentation, unit/a11y tests, and the `npm run gate:bds` quality gate.

This milestone **does not** integrate BDS into BhojanOS or OrderBhojan. Integration awaits DRB/ARB approval.

## Deliverables

### Tokens (`src/tokens/`)

| File | Contents |
|------|----------|
| `colors.ts` | Semantic palette, light/dark/brand/food themes, CSS var mapper |
| `typography.ts` | Display → Rating scale, font families |
| `spacing.ts` | 4px grid |
| `radius.ts` | sm → pill |
| `shadows.ts` / `elevation.ts` | Layered depth |
| `opacity.ts` | State opacities |
| `animation.ts` / `durations.ts` | Motion timing |
| `breakpoints.ts` | Mobile → ultra-wide |
| `zIndex.ts` | Modal, sheet, toast stacking |

### Providers

- `ThemeProvider` — light, dark, brand, food, system
- `MotionProvider` — reduced-motion awareness
- `DesignSystemProvider` — root wrapper + `bds-root`

### Components (33)

Button, Card, RestaurantCard, FoodCard, OfferCard, Badge, Chip, Avatar, Icon, Dialog, BottomSheet, Modal, Drawer, SearchBar, Input, OTPInput, AddressInput, PhoneInput, QuantityStepper, Price, BillSummary, Timeline, CartBar, FloatingCart, Navigation (TopBar, BottomNav, Breadcrumb, Rail, MetricCard), Tabs, SegmentedControl, Skeleton, Loader, Toast, EmptyState, ErrorState, FeatureFlag.

### Styles

`src/styles/bds.css` — token-driven CSS classes. No component hardcodes hex values.

### Quality Gate

```bash
cd packages/design-system && npm run gate:bds
```

Validates: docs, component dirs, tokens, lint, tests, a11y smoke, build, bundle size, Storybook build.

## Success Criteria Met

- [x] Every color from tokens
- [x] Every spacing from tokens
- [x] Reusable components documented in Storybook
- [x] No business logic in components
- [x] WCAG AA foundations (focus rings, reduced motion, sr-only)
- [x] Dark / light / brand / food themes

## Out of Scope (BDS-1)

Authentication, discovery, cart, checkout, payments, orders, analytics features.

## Next Steps (Requires Approval)

1. DRB exit review
2. Migration checklist execution per product
3. Replace OrderBhojan `shared/components` with BDS imports
4. Gradual BhojanOS owner portal adoption

## STOP Condition

BDS-1 complete. **Do not proceed to M1 Authentication or product integration without explicit approval.**
