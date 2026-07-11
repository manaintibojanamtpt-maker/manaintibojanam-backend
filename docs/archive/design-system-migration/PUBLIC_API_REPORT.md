# Design System — Public API Report

**Phase:** 5  
**Date:** 2026-07-10  
**Entry point:** `src/design-system/index.ts`

---

## Validation checklist

- [x] Root barrel `index.ts` exports all public domains
- [x] Domain barrels exist (`layout/`, `cart/`, `food/`, `orders/`, `location/`, `primitives/`, `marketplace/`, `skeleton/`, `tokens/`)
- [x] Founder Store uses barrel only (no deep imports)
- [x] `validate-architecture.mjs` PASS
- [x] No duplicate `Skeleton` export (pulse → `PulseSkeleton`, shimmer → `Skeleton`)
- [x] Type exports for layout slot props
- [x] Lazy-load pattern documented for default exports

---

## Public exports by domain

### Tokens (`tokens/index.ts`)

| Export | Type |
|--------|------|
| `colors`, `fonts`, `spacing`, `radius`, `elevation`, `motion`, `breakpoints`, `glass` | `const` objects |
| `tokenStyles` | CSS path map |

### Primitives (`primitives/index.ts`)

| Export | Kind |
|--------|------|
| `SoftButton`, `SoftButtonTone`, `SoftButtonSize`, `SoftButtonProps` | component + types |
| `CTAButton` | component |
| `GlassCard` | component |
| `PulseSkeleton` | component (animate-pulse variant) |
| `Section`, `SectionHeader` | components |
| `IconContainer`, `MetricCard`, `TrustBadge`, `TechBadge` | components |
| `TimelineCard`, `ExecutiveCard`, `Executive` | components |
| `FeatureCard`, `ProfileImage` | components |

### Skeleton (`skeleton/SkeletonSystem.tsx` via barrel)

| Export | Description |
|--------|-------------|
| `Skeleton` | Shimmer base |
| `MenuItemSkeleton`, `CategorySkeleton`, `RecommendedSkeleton`, `TrendingSkeleton`, `HomeBentoSkeleton` | Composed placeholders |

### Layout (`layout/index.ts`)

| Export | Default | Props type |
|--------|:-------:|------------|
| `BottomNav` | ✓ | `BottomNavProps` (`activeOrderSlot?`) |
| `Header` | ✓ | `HeaderProps` (`installSlot?`) |
| `StorefrontDesktopHeader` | ✓ | `StorefrontDesktopHeaderProps` (`installSlot?`) |
| `BottomSheet` | ✓ | `BottomSheetProps` |
| `ActiveOrderStripView` | — | `ActiveOrderStripViewProps` |
| `StorefrontInstallButtonView` | — | `StorefrontInstallButtonViewProps` |

### Cart (`cart/index.ts`)

| Export |
|--------|
| `FloatingMiniCart` |
| `DesktopFloatingCart` |

### Food (`food/index.ts`)

| Export |
|--------|
| `MenuItemCard` |
| `Banner` |

### Marketplace (`marketplace/index.ts`)

| Export |
|--------|
| `HighlightedText` |
| `MarketplaceSearchAutocomplete` |
| `MarketplaceSearchBar` |
| `MarketplaceSearchFilterChips` |
| `MarketplaceSearchFilterDrawer` |
| `MarketplaceSearchResultCard`, `MarketplaceSearchResultCardView` |
| `MarketplaceSearchResults` |
| `MarketplaceSearchSortSelector` |
| `MarketplaceSearchStates` |
| `MarketplaceKitchenCardView` |

### Orders (`orders/index.ts`)

| Export |
|--------|
| `OrderTracking` |
| `DigitalInvoice` |

### Location (`location/index.ts`)

| Export |
|--------|
| `AutoLocationForm` |
| `HeaderLocationDropdown` |

### Meta

| Export | Purpose |
|--------|---------|
| `DESIGN_SYSTEM_STYLES` | Path to `styles/index.css` for future opt-in |

---

## Import examples (Founder Store — canonical)

```typescript
// Shell
import { Header, BottomNav, StorefrontDesktopHeader, FloatingMiniCart, DesktopFloatingCart } from './design-system';

// Pages
import { MenuItemCard, Banner, Skeleton, SoftButton, DigitalInvoice } from '../design-system';
import { MarketplaceKitchenCardView, MarketplaceSearchBar, MarketplaceSearchResults } from '../design-system';

// Lazy
const OrderTracking = lazy(() => import('./design-system').then((m) => ({ default: m.OrderTracking })));
```

---

## Deep import policy

| Status | Pattern |
|--------|---------|
| ❌ Blocked in app code | `from '../design-system/layout/Header'` |
| ✅ Required | `from '../design-system'` |
| ✅ Allowed in DS internals | `from './BottomSheet'` within `layout/` |
| ✅ Allowed for stubs | `src/components/*` re-exports |

---

## Orphan / unreachable exports

None — all barrel exports are referenced by Founder Store or marketing stubs.

---

## Gate

**Public API: COMPLETE** — ready for OrderBhojan `import from '@bhojan/storefront-design-system'`
