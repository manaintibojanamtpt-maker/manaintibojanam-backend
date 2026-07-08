# BDS Migration Checklist

Use this checklist when DRB approves integration. **Do not start before approval.**

## Pre-flight

- [ ] `npm run gate:bds` passes on `main`
- [ ] Storybook published or accessible to QA
- [ ] Migration owner assigned per product

## OrderBhojan

- [ ] Add `@bhojan/design-system` dependency
- [ ] Import `styles.css` in `main.tsx`
- [ ] Wrap root with `DesignSystemProvider`
- [ ] Replace `shared/components/Button`
- [ ] Replace `shared/components/Card`
- [ ] Replace `shared/components/Skeleton`
- [ ] Remove duplicate token values from OrderBhojan theme
- [ ] Run `gate:m0`
- [ ] Visual QA on bootstrap shell

## BhojanOS — Marketing Pages

- [ ] About, Platform, Contact pages use BDS Section/Card/Button
- [ ] Remove hardcoded colors from new marketing components
- [ ] Verify SEO/schema unchanged

## BhojanOS — Owner Portal

- [ ] MetricCard for dashboard KPIs
- [ ] Replace SoftButton with BDS Button (feature-flagged)
- [ ] Owner layout uses BDS TopBar pattern

## BhojanOS — Customer Storefront

- [ ] **Deferred** — separate milestone after owner portal validation

## Regression

- [ ] GA-3 billing tests pass (`test:unit` tenantCheckoutConfig)
- [ ] No SDK/Firestore schema changes
- [ ] Lighthouse a11y ≥ 90 on migrated pages

## Post-migration

- [ ] Delete obsolete shared UI duplicates
- [ ] Update DEVELOPER-GUIDE in each product
- [ ] Announce BDS as mandatory for new UI work
