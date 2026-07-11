# BhojanOS Unified Design System — Repository Audit

**Agent:** Repository Auditor (Agent 1)  
**Phase:** 1  
**Status:** ✅ COMPLETE — validation gate passed  
**Date:** 2026-07-10  
**Rule:** No code modifications in this phase.

---

## Validation checklist

- [x] Folder structure documented
- [x] Dependency graph documented
- [x] Duplicate UI matrix produced
- [x] Duplicate CSS catalogued
- [x] Unused / orphaned components identified
- [x] Large components (>500 LOC) listed
- [x] Typography / color / animation duplication mapped
- [x] Cross-app import boundaries verified
- [x] Risk report included
- [x] Rollback strategy (audit-only — N/A)

---

## Executive summary

The monorepo runs **three parallel UI systems** with **zero shared component imports** between Founder and OrderBhojan:

| System | Location | Files | Consumer |
|--------|----------|-------|----------|
| **Founder Storefront (SOURCE OF TRUTH)** | `src/components/` | 134 `.tsx` | BhojanOS root app |
| **BDS (duplicate)** | `packages/design-system/` | 50 components | OrderBhojan only |
| **Experience CSS (duplicate)** | `orderbhojan/src/styles/experience-*.css` | 13 files, **4,866 lines** | OrderBhojan only |

OrderBhojan: **74 files** import `@bhojan/design-system`.  
Founder: **0 imports** from BDS or OrderBhojan.  
Cross-app imports (`src/` ↔ `orderbhojan/`): **none**.

**Verdict:** Migration is required. Founder UI is approved and complete; BDS + Experience CSS must be retired after extraction to `src/design-system/`.

---

## 1. Folder structure

```
Manaintibojanam_final2/
├── src/                              # BhojanOS platform app
│   ├── components/                   # 134 files — SOURCE OF TRUTH (mixed concerns)
│   │   ├── ui/                       # 14 shared primitives
│   │   ├── marketplace/              # 11 discovery/search
│   │   ├── marketing/                # 20 (NOT storefront — do not extract)
│   │   ├── owner/                    # 28 (app-specific)
│   │   ├── admin/                    # 7 (app-specific)
│   │   └── *.tsx                     # 50 storefront shell + page components
│   ├── pages/                        # Route screens
│   ├── context/                      # Cart, Auth, Tenant
│   ├── lib/                          # Facades, delivery, location
│   └── index.css                     # Founder tokens (@theme, mib-*)
│
├── orderbhojan/                      # Customer marketplace (separate Vite app)
│   ├── src/features/                 # Business logic + BDS presentation
│   ├── src/styles/                   # 13 experience-*.css (DELETE TARGET)
│   └── package.json                  # @bhojan/design-system dependency
│
├── packages/
│   ├── design-system/                # 50 BDS components (MERGE then DELETE)
│   └── marketplace-contracts/        # DTOs only — keep
│
├── backend-lib/                      # API — not UI
└── docs/design-system-migration/     # This migration program
```

**Target structure (Phase 2+):**

```
src/
├── design-system/          # Extracted storefront UI
├── apps/
│   ├── founder-store/
│   ├── orderbhojan/
│   ├── owner/
│   └── admin/
└── shared/
    ├── hooks/
    ├── contexts/
    ├── adapters/
    └── services/
```

---

## 2. Dependency graph

```
                    ┌─────────────────────────┐
                    │ marketplace-contracts   │  (DTOs, zero UI)
                    └───────────┬─────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
   backend-lib/           orderbhojan/          root package.json
   (API routes)           (customer PWA)        (BhojanOS platform)
         │                      │
         │                      ├── @bhojan/design-system (50 components)
         │                      ├── @tanstack/react-query
         │                      ├── zustand
         │                      └── firebase (client)
         │
         └── Firestore / Express

   src/ (BhojanOS)
         ├── src/components (134) — NO BDS import
         ├── framer-motion, lucide-react, tailwind
         ├── firebase, capacitor (mobile)
         └── express server.ts (backend)

   packages/design-system
         └── peer: react — used ONLY by orderbhojan
```

**Build order coupling:** `orderbhojan` prebuild compiles `../packages/design-system` + `../packages/marketplace-contracts`.

**Circular dependency risk:** **LOW** — no `src` ↔ `orderbhojan` imports. Moderate intra-feature coupling in OrderBhojan (`experience` hub imports from `discovery`, `restaurant`, `food`).

---

## 3. Duplicate UI matrix (70 rows, 26 triple-stack)

### Navigation (8 rows)

| Founder (KEEP) | BDS (DELETE) | OrderBhojan (DELETE) |
|----------------|--------------|----------------------|
| `BottomNav.tsx` | `NavIsland`, `SideNav`, `MiniNavIsland` | `ExperienceBottomNav.tsx` |
| `Header.tsx` | `ContextHeader` | — |
| `StorefrontDesktopHeader.tsx` | `ContextHeader` | `ob-px2-compact-header` |
| `Navbar.tsx` ⚠️ orphaned | `Navigation` | — |

### Cart (5 rows)

| Founder | BDS | OrderBhojan |
|---------|-----|-------------|
| `FloatingMiniCart.tsx` | `FloatingCart` | `MarketplaceFloatingCart.tsx` |
| `DesktopFloatingCart.tsx` | `CartBar` | `CartExperiencePage.tsx` (panel style) |
| `FlyToCartAnimation.tsx` | — | `FoodFloatingPreview.tsx` |

### Food cards (11 rows)

| Founder | BDS | OrderBhojan |
|---------|-----|-------------|
| **`MenuItemCard.tsx`** | `FoodCard`, `FoodRow` | `FoodCardItem.tsx` |
| `MarketplaceKitchenCard.tsx` | `RestaurantCard` | `DiscoveryRestaurantCard.tsx` |
| `MarketplaceSearchResultCard.tsx` | `RestaurantCard` | `SearchResultRow.tsx` |
| — | `DishPoster` | `HomeDishPoster`, `FoodFeaturedPoster` |
| — | `RestaurantPoster` | `HomeRestaurantPoster.tsx` |

### Hero (7 rows)

| Founder | BDS | OrderBhojan |
|---------|-----|-------------|
| `Banner.tsx`, `Home.tsx` hero | `ImmersiveHero` | **`KitchenDoorHero.tsx`** ❌ |
| `MobileRestaurantHeader.tsx` ⚠️ | `RestaurantHero` | `RestaurantExperiencePage` |

### Search (11 rows)

| Founder | BDS | OrderBhojan |
|---------|-----|-------------|
| `MarketplaceSearchBar.tsx` | `SearchBar`, `PremiumSearch` | `SearchExperience`, `HomeSearchBar` |
| `MarketplaceSearchFilterChips.tsx` | `Chip` | `SearchFiltersBar` |
| `MarketplaceSearchResults.tsx` | — | `SearchResultsSection` |

### Skeleton (5 rows)

| Founder | BDS | OrderBhojan |
|---------|-----|-------------|
| **`SkeletonSystem.tsx`** | `Skeleton` | `ExperienceSkeletons.tsx` |
| `ui/Skeleton.tsx` | `Skeleton` | — |

### Tracking (7 rows)

| Founder | BDS | OrderBhojan |
|---------|-----|-------------|
| **`OrderTracking.tsx`** (1,010 LOC) | `Timeline` | `TrackingPage` + `OrderTimeline` |
| `CourierTrackingTimeline.tsx` | — | `DeliveryTrackingPanel` |
| `DigitalInvoice.tsx` | — | `OrderInvoiceSheet.tsx` |

### Checkout / Location (6 rows)

| Founder | BDS | OrderBhojan |
|---------|-----|-------------|
| `pages/Checkout.tsx` | `BillSummary` | `CheckoutPage.tsx` |
| **`AutoLocationForm.tsx`** (494 LOC) | `AddressInput` | `DeliveryLocationWizard`, `AddressFormSheet` |

### Buttons / Glass (10 rows)

| Founder | BDS | OrderBhojan |
|---------|-----|-------------|
| `ui/SoftButton.tsx`, `ui/CTAButton.tsx` | `Button` | Used in ~40 OB files |
| `ui/GlassCard.tsx` | `Card`, `GlassSurface` | `mib-glass`, tracking panels |
| `BottomSheet.tsx` | `BottomSheet` | `FoodCustomizeSheet` |

**Totals:** 33 Founder↔BDS pairs · 16 Founder↔OB pairs · 24 BDS↔OB pairs · **26 triple-stack (F–B–O)**

---

## 4. Duplicate CSS

### OrderBhojan `experience-*.css` (4,866 lines total)

| File | Lines | Conflicts with founder |
|------|------:|------------------------|
| `experience-premium.css` | 705 | `index.css` mib-* / premium utilities |
| `experience-checkout.css` | 651 | `Checkout.tsx` layout |
| `experience-food.css` | 527 | `Menu.tsx` |
| `experience-home-v2.css` | 532 | **`index.css`** — Evening Kitchen palette |
| `experience-px2-layout.css` | 486 | `App.tsx` LayoutWrapper |
| `experience-premium-m65.css` | 449 | M6.5 evolution layer |
| `experience-restaurant.css` | 225 | `Home.tsx` restaurant |
| `experience-profile-v3.css` | 205 | `Account.tsx` |
| `experience-tracking-v3.css` | 301 | **`OrderTracking.tsx`** |
| `experience-shell.css` | 364 | Global shell |
| `experience-search.css` | 170 | Marketplace search |
| `experience-location.css` | 180 | `AutoLocationForm` |
| `experience-discovery.css` | 71 | `MarketplaceHome` |

### Founder CSS (`src/index.css` + utilities)

- `@theme`: `--color-primary #FF7A00`, `--color-brand-bg #070504`
- `--font-sans`: Plus Jakarta Sans · `--font-display`: Outfit
- Utilities: `.mib-glass`, `.mib-food-card`, `.mib-primary-action`, `.shimmer`

### BDS CSS (`packages/design-system/src/styles/`)

- `bds.css` + `bds-px2.css` — semantic tokens abstracted from founder but **overridden** by OB experience CSS

### Conflicting themes (OrderBhojan — DELETE)

| Wrong (OB) | Correct (Founder) |
|------------|-------------------|
| `#0a0706` charcoal | `#070504` brand-bg |
| `#e8a838` turmeric | `#ff6b35` / `#FF7A00` |
| `#c4622d` copper | orange / red-600 accents |
| Fraunces | Outfit (display) |
| Figtree | Plus Jakarta Sans (body) |
| `ob-stove-glow-frame` | `mib-glass` / founder gradients |
| `ob-*` (~1,200+ class usages) | Tailwind + mib utilities |

---

## 5. Unused / orphaned components

| Component | Path | Status |
|-----------|------|--------|
| `Navbar.tsx` | `src/components/Navbar.tsx` (462 LOC) | **Zero imports** — dead code |
| `Footer.tsx` | `src/components/Footer.tsx` | **Zero imports** — superseded by `EnterpriseFooter` |
| `MobileRestaurantHeader.tsx` | `src/components/MobileRestaurantHeader.tsx` | **Zero imports** — pattern reference only |
| `Testimonials.tsx` | `src/components/Testimonials.tsx` | Imported but `{false && <Testimonials />}` on Home |
| `TrustSection` strip variant | `src/components/TrustSection.tsx` | `variant="strip"` never consumed |

**Recommendation:** Do not migrate orphans into `design-system/`. Archive or delete after founder re-export validation.

---

## 6. Large components (>500 LOC in `src/components/`)

| File | LOC | Domain |
|------|----:|--------|
| `OrderTracking.tsx` | 1,010 | Customer tracking — **extract as-is** |
| `admin/InvestorDataRoomPanel.tsx` | 597 | Admin — stays in apps/admin |
| `owner/OwnerLayout.tsx` | 530 | Owner — stays in apps/owner |
| `AiOrderingWidget.tsx` | 504 | Menu AI — extract to design-system if reused |

**Near threshold (400–499 LOC):** `AutoLocationForm.tsx` (494), `Navbar.tsx` (462, orphaned), `RecipeEditorPanel.tsx` (450).

**Pages >500 LOC (out of scope but noted):** `AdminPanel.tsx` (~2,623), `Checkout.tsx` (~1,428), `Home.tsx` (~1,420).

---

## 7. Typography duplication

| Role | Founder (`index.css`) | BDS (`tokens/typography.ts`) | OrderBhojan (experience CSS) |
|------|----------------------|------------------------------|------------------------------|
| Body | Plus Jakarta Sans | `--bds-font-sans` (Figtree in OB override) | **Figtree** ❌ |
| Display | Outfit | `--bds-font-display` (Fraunces in OB) | **Fraunces** ❌ |
| Weights | 400–900 | Token scale | Mixed BDS + custom |
| Micro labels | `text-[8px]` uppercase tracking | BDS `microLabel` | `ob-*` labels |

---

## 8. Color duplication

| Token | Founder | BDS palette | OB Evening Kitchen |
|-------|---------|-------------|-------------------|
| Primary | `#FF7A00` | `#FF6B35` | `#e8a838` ❌ |
| Background | `#070504` | `#070504` neutral.950 | `#0a0706` ❌ |
| Card | `#120D0A` | neutral.800 | tamarind `#1c1210` ❌ |
| Text | `#FFFAF3` | neutral.50 | rice flour `#fff6eb` ≈ |
| Accent red | `#FF6B35`, `red-600` | orange.500 | copper `#c4622d` ❌ |

**Three orange families coexist:** `#FF7A00`, `#FF6B00`, `#ff6b35`.

---

## 9. Animation duplication

| Pattern | Founder | BDS | OrderBhojan |
|---------|---------|-----|-------------|
| Bottom nav spring hide | `BottomNav` framer | — | BDS static `NavIsland` |
| Menu item whileInView | `MenuItemCard` | `MotionReveal` | `MotionReveal` |
| Tracking scroll bar | `OrderTracking` | — | Custom CSS timeline |
| Shimmer skeleton | `SkeletonSystem` `.shimmer` | BDS pulse | `ExperienceSkeletons` |
| Fly-to-cart | `FlyToCartAnimation` | — | — |
| Page enter | `App.tsx` AnimatePresence | `MotionPage` | `MotionPage` |
| Soft glow CTA | `soft-buttons.css` | — | partial `btn-orange` |

---

## 10. Tailwind duplication

- **Founder:** Utility-first throughout `src/pages/` and `src/components/`
- **OrderBhojan:** Near-zero Tailwind in features — semantic `ob-*` CSS instead
- **BDS:** CSS variables + component-scoped classes in `bds.css`

**Result:** Three styling paradigms for the same visual language.

---

## 11. OrderBhojan page → founder mapping

| OB Route | OB presentation files | Founder clone |
|----------|-------------------------|---------------|
| `/` | `HomeExperiencePage`, `KitchenDoorHero` | `MarketplaceHome.tsx` |
| `/search` | `SearchExperience` | `MarketplaceSearchBar` + Results |
| `/restaurant/:slug` | `RestaurantExperiencePage` | `Home.tsx` |
| `/restaurant/:slug/menu` | `FoodExperiencePage` | `Menu.tsx` + `MenuItemCard` |
| `/cart` | `CartExperiencePage` | Cart drawer panel |
| `/checkout` | `CheckoutPage` | `Checkout.tsx` |
| `/orders` | `OrdersExperiencePage` | `MyOrders.tsx` |
| `/orders/:id/track` | `TrackingPage` | **`OrderTracking.tsx`** |
| `/profile` | `ProfilePage` | `Account.tsx` |
| `/auth` | `AuthShellPage` | `Login.tsx` |
| Location | `DeliveryLocationWizard` | **`AutoLocationForm.tsx`** |

---

## 12. Risk report

| Risk | Severity | Owner agent |
|------|----------|-------------|
| Evening Kitchen deployed to prod (`3f755ed`) | **Critical** | Agent 6 + 7 |
| BDS deeply wired (74 import sites) | **High** | Agent 6 + 8 |
| `OrderTracking.tsx` 1,010 LOC — fragile extract | **High** | Agent 3 |
| CartContext (founder) vs Zustand (OB) | **Medium** | Agent 9 + adapters |
| MenuItemCard Firestore shape vs marketplace DTO | **Medium** | Agent 9 |
| Owner/marketing mixed in `src/components/` | **Low** | Agent 2 scope boundary |
| Build break during import refactor | **Medium** | Agent 8 + 10 |

---

## 13. Rollback strategy

Phase 1 is read-only — no rollback needed.

For downstream phases:
- Feature flag: `FF_UNIFIED_STOREFRONT_DS=false` keeps legacy BDS + experience CSS
- Git tags per phase: `ds-migration-phase-N`
- OrderBhojan: retain `packages/design-system` until Phase 6 deletion gate passes
- Founder: compatibility re-exports at old `src/components/*` paths until Phase 8 complete

---

## 14. Change log

| Date | Agent | Action |
|------|-------|--------|
| 2026-07-10 | Agent 1 | Initial repository audit complete |

---

## 15. Gate decision

**Phase 1: PASS** — Agent 2 (Design System Architect) is authorized to proceed.

**Next deliverable:** `DESIGN_SYSTEM_PLAN.md`
