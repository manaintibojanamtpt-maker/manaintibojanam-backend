# BDS-2 Migration Checklist

## OrderBhojan M0

- [x] Add `@bhojan/design-system@1.0.0` dependency
- [x] Import BDS styles in globals.css
- [x] Wrap app with `DesignSystemProvider`
- [x] Remove local ThemeProvider
- [x] Replace Button, Card, Input, Dialog, BottomSheet, Skeleton
- [x] Migrate ErrorBoundary to BDS components
- [x] Replace react-hot-toast with BdsToastProvider
- [x] Remove lucide-react from shell
- [x] Create MarketplaceLayout, AuthLayout, FullScreenLayout
- [x] Refactor all foundation pages
- [x] Update PWA/HTML theme colors to BDS primary
- [x] Add BDS integration tests
- [x] Add gate:bds2
- [x] Run gate:bds2 — PASS

## BhojanOS

- [ ] Deferred — separate approved milestone

## Post-BDS-2

- [ ] DRB sign-off on certification report
- [ ] M1 Authentication (blocked until approval)
