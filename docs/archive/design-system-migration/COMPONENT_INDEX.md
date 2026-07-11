# BhojanOS Design System — Component Index

**Phase:** 3  
**Date:** 2026-07-10  
**Location:** `src/design-system/`

---

## Import paths

| Import | Path |
|--------|------|
| Barrel | `@/design-system` or `src/design-system/index.ts` |
| Styles (Phase 4+) | `src/design-system/styles/index.css` |
| Tokens (JS) | `src/design-system/tokens/index.ts` |

Legacy imports via `src/components/*` re-exports remain valid until Phase 8.

---

## Tokens (`src/design-system/tokens/`)

| File | Contents |
|------|----------|
| `colors.css` | `@theme` block + `:root` MIB variables |
| `typography.css` | Google Fonts import (Plus Jakarta Sans, Outfit) |
| `glass.css` | `.mib-glass`, `.mib-hero-gradient` |
| `motion.css` | `@keyframes shimmer`, `.shimmer` utility |
| `index.ts` | Typed constants: `colors`, `fonts`, `breakpoints` |

---

## Styles (`src/design-system/styles/`)

| File | Contents |
|------|----------|
| `index.css` | Token imports + soft-buttons entry |
| `soft-buttons.css` | `.soft-btn*` pill button system (copy from `src/styles/`) |

---

## Primitives (`src/design-system/primitives/`)

| Component | Export | Default export |
|-----------|--------|:--------------:|
| `SoftButton` | `SoftButton`, `SoftButtonTone`, `SoftButtonSize` | ✓ |
| `CTAButton` | `CTAButton` | — |
| `GlassCard` | `GlassCard` | — |
| `Skeleton` | `Skeleton` (animate-pulse) | — |
| `Section` | `Section` | — |
| `SectionHeader` | `SectionHeader` | — |
| `IconContainer` | `IconContainer` | — |
| `MetricCard` | `MetricCard` | — |
| `TrustBadge` | `TrustBadge` | — |
| `TechBadge` | `TechBadge` | — |
| `TimelineCard` | `TimelineCard` | — |
| `ExecutiveCard` | `ExecutiveCard`, `Executive` | — |
| `FeatureCard` | `FeatureCard` | — |
| `ProfileImage` | `ProfileImage` | — |

**Legacy path:** `src/components/ui/{Name}.tsx` → re-exports

---

## Skeleton (`src/design-system/skeleton/`)

| Export | Description |
|--------|-------------|
| `Skeleton` | Shimmer base skeleton |
| `MenuItemSkeleton` | Menu row placeholder |
| `CategorySkeleton` | Category chip rail |
| `RecommendedSkeleton` | Recommended section |
| `TrendingSkeleton` | Trending carousel item |
| `HomeBentoSkeleton` | Home bento grid |

**Barrel alias:** `ShimmerSkeleton` (in `design-system/index.ts` only)

**Legacy path:** `src/components/SkeletonSystem.tsx` → re-exports

---

## Layout (`src/design-system/layout/`)

| Component | Hooks/contexts used |
|-----------|---------------------|
| `BottomNav` | `CartContext`, `useStorefrontPath`, haptics |
| `Header` | `CartContext`, `TenantContext`, `useStorefrontAuth`, `useStorefrontPath` |
| `StorefrontDesktopHeader` | Same + `HeaderLocationDropdown`, logo asset |

**Legacy paths:** `src/components/{BottomNav,Header,StorefrontDesktopHeader}.tsx`

---

## Cart (`src/design-system/cart/`)

| Component | Description |
|-----------|-------------|
| `FloatingMiniCart` | Mobile snap-state cart pill |
| `DesktopFloatingCart` | XL breakpoint floating cart panel |

**Legacy paths:** `src/components/FloatingMiniCart.tsx`, `DesktopFloatingCart.tsx`

---

## Food (`src/design-system/food/`)

| Component | LOC | Notes |
|-----------|----:|-------|
| `MenuItemCard` | 302 | Framer whileInView, addon BottomSheet |
| `Banner` | 195 | Firestore banner carousel |

**Legacy paths:** `src/components/MenuItemCard.tsx`, `Banner.tsx`

---

## Marketplace (`src/design-system/marketplace/`)

| Component | Role |
|-----------|------|
| `MarketplaceSearchBar` | Search input + autocomplete slot |
| `MarketplaceSearchAutocomplete` | Autocomplete dropdown |
| `MarketplaceSearchFilterChips` | Active filter chips |
| `MarketplaceSearchFilterDrawer` | Filter drawer panel |
| `MarketplaceSearchResults` | Results list orchestrator |
| `MarketplaceSearchResultCard` | Single search result card |
| `MarketplaceSearchSortSelector` | Sort dropdown |
| `MarketplaceSearchStates` | Loading/error/empty states |
| `MarketplaceKitchenCard` | Kitchen discovery card |
| `HighlightedText` | Search highlight helper |

**Legacy paths:** `src/components/marketplace/{Name}.tsx`

---

## Orders (`src/design-system/orders/`)

| Component | LOC | Notes |
|-----------|----:|-------|
| `OrderTracking` | 1,091 | Full tracking UI + Firestore listener |
| `DigitalInvoice` | ~200 | PDF/print invoice modal |

**Legacy paths:** `src/components/OrderTracking.tsx`, `DigitalInvoice.tsx`

---

## Location (`src/design-system/location/`)

| Component | LOC | Notes |
|-----------|----:|-------|
| `AutoLocationForm` | 494 | Map + address wizard modal |
| `HeaderLocationDropdown` | 208 | Desktop location picker |

**Legacy paths:** `src/components/AutoLocationForm.tsx`, `HeaderLocationDropdown.tsx`

---

## Public barrel (`src/design-system/index.ts`)

Exports: tokens, primitives, shimmer skeletons (aliased), layout, cart, food, marketplace, orders, location.

---

## Not in design system (by design)

| Path | Reason |
|------|--------|
| `src/components/marketing/*` | Enterprise marketing — separate visual language |
| `src/components/owner/*` | Owner portal — Phase 6+ |
| `src/components/admin/*` | Admin portal — Phase 6+ |
| `src/components/ActiveOrderStrip.tsx` | Dependency — extract in Phase 3.1 or Phase 6 |
| `src/components/BottomSheet.tsx` | Dependency — extract when MenuItemCard migrates consumers |
| `src/components/StorefrontInstallButton.tsx` | Dependency — PWA install UI |
