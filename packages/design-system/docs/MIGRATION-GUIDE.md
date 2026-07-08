# Migration Guide

**Status:** Pre-integration — await DRB approval before executing.

## OrderBhojan

Current stubs in `orderbhojan/src/shared/components/` will migrate to BDS:

| Current | BDS Replacement |
|---------|-----------------|
| `Button` | `@bhojan/design-system` Button |
| `Card` | BDS Card |
| `Skeleton` | BDS Skeleton |

### Steps

1. Add workspace dependency on `@bhojan/design-system`
2. Wrap app with `DesignSystemProvider`
3. Import `@bhojan/design-system/styles.css` in entry
4. Replace shared components one-by-one
5. Delete duplicated CSS
6. Run OrderBhojan `gate:m0` + visual QA

## BhojanOS Owner Portal

Migrate marketing/owner UI incrementally:

1. **Phase A** — New pages only (About, Platform) consume BDS
2. **Phase B** — Replace `CTAButton`, `GlassCard`, `SoftButton` with BDS equivalents
3. **Phase C** — Owner dashboard metrics use `MetricCard`

Do **not** touch GA-1/GA-2/GA-3 SDK paths during migration.

## Mana Inti Storefront

Reference only for BDS-1. Storefront migration is a separate milestone after owner portal validation.

## CSS Coexistence

During transition, load BDS CSS after Tailwind or scope BDS under `.bds-root` to avoid variable collisions.

## Rollback

Keep feature flag `USE_BDS_COMPONENTS` per surface until parity verified.

## Verification

- Visual snapshot tests per migrated screen
- `gate:bds` pass on design-system package
- Product-specific gates unchanged
