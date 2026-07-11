# BhojanOS Unified Design System — Architecture Plan

**Agent:** Design System Architect (Agent 2)  
**Phase:** 2  
**Status:** ✅ COMPLETE — validation gate passed  
**Prerequisite:** Phase 1 `AUDIT.md` — PASS  
**Date:** 2026-07-10  
**Rule:** No component migration in this phase — plan only.

---

## Validation checklist

- [x] Founder `src/components` studied as immutable source of truth
- [x] Folder hierarchy defined
- [x] Export strategy defined
- [x] Token architecture defined
- [x] Shared component hierarchy defined
- [x] Shared CSS architecture defined
- [x] Import aliases defined (Vite + TypeScript)
- [x] Migration strategy phased with gates
- [x] Risk report included
- [x] Rollback strategy included

---

## 1. Design principles

1. **Founder Store is canonical.** Every visual decision in `src/components` and `src/index.css` wins. No redesign, no approximation.
2. **Extract, don't duplicate.** Move founder components into `src/design-system/`; re-export from old paths during transition.
3. **Presentation only for OrderBhojan.** Hooks, React Query, Zustand, Firestore, routing, and marketplace API stay in `orderbhojan/src/features/`.
4. **One token source.** All colors, typography, spacing, motion from `src/design-system/tokens/`.
5. **Delete parallel systems.** Retire `packages/design-system`, all `experience-*.css`, Evening Kitchen theme, and `ob-*` classes after migration gates pass.
6. **App-specific UI stays in apps.** Owner, admin, marketing pages do not enter the storefront design system.

---

## 2. Folder hierarchy

```
src/
├── design-system/                    # NEW — single BhojanOS storefront UI
│   ├── index.ts                      # Public barrel export
│   ├── tokens/
│   │   ├── index.ts
│   │   ├── colors.css                # From @theme in index.css
│   │   ├── typography.css
│   │   ├── spacing.css
│   │   ├── radius.css
│   │   ├── elevation.css             # shadows
│   │   ├── glass.css                 # .mib-glass, backdrop
│   │   ├── gradients.css             # .mib-hero-gradient, etc.
│   │   ├── motion.css                # keyframes, transitions
│   │   ├── breakpoints.ts            # JS constants for responsive hooks
│   │   └── tokens.ts                 # Typed token object (optional runtime)
│   │
│   ├── styles/
│   │   ├── index.css                 # Single entry: @import tokens + utilities
│   │   ├── base.css                  # html/body from index.css @layer base
│   │   ├── utilities.css             # scrollbar-hide, shimmer, mib-food-card
│   │   └── soft-buttons.css          # Moved from src/styles/
│   │
│   ├── primitives/                   # Atomic UI (from src/components/ui/)
│   │   ├── Button/
│   │   │   ├── SoftButton.tsx        # from ui/SoftButton
│   │   │   ├── CTAButton.tsx
│   │   │   └── index.ts
│   │   ├── Card/
│   │   │   ├── GlassCard.tsx
│   │   │   └── index.ts
│   │   ├── Skeleton/
│   │   │   ├── SkeletonSystem.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── index.ts
│   │   ├── IconContainer.tsx
│   │   ├── MetricCard.tsx
│   │   ├── Section.tsx
│   │   ├── SectionHeader.tsx
│   │   ├── TrustBadge.tsx
│   │   ├── TechBadge.tsx
│   │   ├── TimelineCard.tsx
│   │   ├── ExecutiveCard.tsx
│   │   ├── FeatureCard.tsx
│   │   ├── ProfileImage.tsx
│   │   └── index.ts
│   │
│   ├── layout/                       # Shell chrome
│   │   ├── BottomNav.tsx
│   │   ├── Header.tsx
│   │   ├── StorefrontDesktopHeader.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── LayoutWrapper.tsx         # Extract shell from App.tsx if needed
│   │   └── index.ts
│   │
│   ├── cart/
│   │   ├── FloatingMiniCart.tsx
│   │   ├── DesktopFloatingCart.tsx
│   │   ├── FlyToCartAnimation.tsx
│   │   └── index.ts
│   │
│   ├── food/
│   │   ├── MenuItemCard.tsx          # P0 — canonical food card
│   │   ├── Banner.tsx
│   │   ├── StickyCategoryRail.tsx    # if exists in founder Menu
│   │   └── index.ts
│   │
│   ├── marketplace/
│   │   ├── MarketplaceHome.tsx       # Presentational sections only
│   │   ├── MarketplaceKitchenCard.tsx
│   │   ├── MarketplaceSearchBar.tsx
│   │   ├── MarketplaceSearchFilterChips.tsx
│   │   ├── MarketplaceSearchResults.tsx
│   │   ├── MarketplaceSearchResultCard.tsx
│   │   ├── MarketplaceSearchSortSelector.tsx
│   │   └── index.ts
│   │
│   ├── orders/
│   │   ├── OrderTracking.tsx         # 1,010 LOC — move as-is
│   │   ├── DigitalInvoice.tsx
│   │   ├── CourierTrackingTimeline.tsx
│   │   └── index.ts
│   │
│   ├── location/
│   │   ├── AutoLocationForm.tsx
│   │   ├── HeaderLocationDropdown.tsx
│   │   └── index.ts
│   │
│   ├── checkout/                     # Presentational fragments from Checkout.tsx
│   │   ├── BillSummaryPanel.tsx      # Extract if Checkout.tsx is monolithic
│   │   └── index.ts
│   │
│   ├── profile/                      # Account presentational pieces
│   │   └── index.ts
│   │
│   ├── motion/
│   │   ├── PageTransition.tsx        # AnimatePresence wrapper from App
│   │   └── index.ts
│   │
│   └── adapters/                     # Props bridges — NO business logic
│       ├── types/
│       │   ├── MenuItemViewModel.ts
│       │   ├── OrderTrackingViewModel.ts
│       │   └── CartViewModel.ts
│       └── mappers/                  # Pure functions: DTO → view model
│           └── index.ts
│
├── apps/                             # FUTURE — optional physical split (Phase 8+)
│   ├── founder-store/                # Thin route shells only
│   ├── orderbhojan/
│   ├── owner/
│   └── admin/
│
├── shared/                           # FUTURE — cross-app non-UI
│   ├── hooks/
│   ├── contexts/
│   └── services/
│
└── components/                       # LEGACY — compatibility re-exports only
    ├── BottomNav.tsx                 # export { BottomNav } from '@/design-system/layout'
    └── ...                           # Until Phase 8 import refactor complete
```

### Scope boundary — DO NOT extract

| Path | Reason |
|------|--------|
| `src/components/marketing/*` | Enterprise marketing site — separate visual language |
| `src/components/owner/*` | Owner portal — migrate in later phase |
| `src/components/admin/*` | Admin portal — migrate in later phase |
| `src/components/Enterprise*` | Marketing only |
| Orphaned `Navbar.tsx`, `Footer.tsx` | Dead code — delete, don't extract |

---

## 3. Export strategy

### Public API (`src/design-system/index.ts`)

```typescript
// Tokens (CSS imported by apps, not re-exported as JS)
export * from './tokens/breakpoints';

// Primitives
export * from './primitives';

// Domain components
export * from './layout';
export * from './cart';
export * from './food';
export * from './marketplace';
export * from './orders';
export * from './location';
export * from './checkout';
export * from './profile';
export * from './motion';

// Adapters (view models + mappers only)
export * from './adapters/types';
export * from './adapters/mappers';
```

### Subpath exports (package.json — root app)

Add to root `package.json`:

```json
{
  "exports": {
    "./design-system": "./src/design-system/index.ts",
    "./design-system/styles": "./src/design-system/styles/index.css",
    "./design-system/tokens/*": "./src/design-system/tokens/*"
  }
}
```

### Compatibility re-exports (Phase 3–8)

Every moved founder file keeps a thin stub at the original path:

```typescript
// src/components/BottomNav.tsx
export { BottomNav } from '@/design-system/layout/BottomNav';
export type { BottomNavProps } from '@/design-system/layout/BottomNav';
```

**Rule:** Stubs are deleted only after Agent 8 confirms zero imports to old paths.

### OrderBhojan consumption

```typescript
// orderbhojan/src/features/home/ui/HomeExperiencePage.tsx
import { MarketplaceKitchenCard, BottomNav } from '@bhojan/storefront-design-system';
import { mapKitchenDtoToCardProps } from '@bhojan/storefront-design-system/adapters';
```

Rename strategy: publish `src/design-system` as workspace package `@bhojan/storefront-design-system` OR alias via Vite to `../src/design-system`. Prefer **workspace package** for clean boundaries.

---

## 4. Token architecture

### Source of truth

Extract verbatim from `src/index.css` `@theme` block and utility classes. **Do not merge BDS tokens.**

### Token files

| File | Contents |
|------|----------|
| `colors.css` | `--color-primary`, `--color-brand-bg`, `--mib-orange`, HSL vars |
| `typography.css` | `--font-sans`, `--font-display`, Google Fonts import |
| `spacing.css` | Tailwind spacing scale references + any custom `--mib-*` spacing |
| `radius.css` | Border radius tokens from cards/buttons |
| `elevation.css` | Box shadows from cards, floating cart |
| `glass.css` | `.mib-glass` definition |
| `gradients.css` | `.mib-hero-gradient`, CTA gradients |
| `motion.css` | `@keyframes shimmer`, framer-motion duration constants |
| `breakpoints.ts` | `sm: 640`, `md: 768`, `lg: 1024`, `xl: 1280` |

### Canonical values (override all OB/BDS)

| Token | Value |
|-------|-------|
| `--color-primary` | `#FF7A00` |
| `--color-brand-bg` | `#070504` |
| `--color-card-bg` | `#120D0A` |
| `--color-text-main` | `#FFFAF3` |
| `--font-sans` | Plus Jakarta Sans |
| `--font-display` | Outfit |

### Tailwind v4 integration

`src/design-system/styles/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans...&family=Outfit...');
@import "tailwindcss";
@import "../tokens/colors.css";
@import "../tokens/typography.css";
/* ... */
@import "./base.css";
@import "./utilities.css";
@import "./soft-buttons.css";
```

Founder app `src/index.css` becomes:

```css
@import "./design-system/styles/index.css";
/* App-specific overrides only if absolutely required */
```

---

## 5. Shared component hierarchy

```
Layer 0: tokens + base CSS
Layer 1: primitives (Button, Card, Skeleton, Section)
Layer 2: layout (Header, BottomNav, BottomSheet)
Layer 3: domain (MenuItemCard, OrderTracking, AutoLocationForm)
Layer 4: page shells (in apps — compose Layer 3 + hooks)
Layer 5: adapters (DTO → props — no JSX)
```

### Dependency rules

- Layer N may import Layer N-1 only
- **No** design-system imports from `orderbhojan/` or `features/`
- **No** Firestore, React Query, or Zustand inside design-system components
- Props-only components; callbacks via `onX` handlers

### P0 extraction order (Agent 3)

| Priority | Component | LOC | Risk |
|----------|-----------|----:|------|
| P0 | `MenuItemCard` | ~200 | Medium — cart integration |
| P0 | `BottomNav`, `Header` | ~300 | Low |
| P0 | `SkeletonSystem` | ~150 | Low |
| P0 | `ui/SoftButton`, `ui/CTAButton`, `ui/GlassCard` | ~100 | Low |
| P0 | `FloatingMiniCart`, `DesktopFloatingCart` | ~250 | Medium |
| P1 | `MarketplaceSearchBar`, `MarketplaceKitchenCard` | ~400 | Medium |
| P1 | `AutoLocationForm` | 494 | High — form state external |
| P1 | `OrderTracking` | 1,010 | **Critical** — extract last in P1 batch |
| P2 | `DigitalInvoice`, `Banner` | ~300 | Low |

---

## 6. Shared CSS architecture

### Delete (Agent 7)

```
orderbhojan/src/styles/experience-home-v2.css
orderbhojan/src/styles/experience-profile-v3.css
orderbhojan/src/styles/experience-tracking-v3.css
orderbhojan/src/styles/experience-shell.css
orderbhojan/src/styles/experience-premium.css
orderbhojan/src/styles/experience-food.css
orderbhojan/src/styles/experience-search.css
orderbhojan/src/styles/experience-location.css
orderbhojan/src/styles/experience-checkout.css
orderbhojan/src/styles/experience-discovery.css
orderbhojan/src/styles/experience-restaurant.css
orderbhojan/src/styles/experience-px2-layout.css
orderbhojan/src/styles/experience-premium-m65.css
packages/design-system/src/styles/bds.css
packages/design-system/src/styles/bds-px2.css
```

### Delete fonts (OrderBhojan)

- Fraunces
- Figtree
- Evening Kitchen `theme_color: #0a0706` in `orderbhojan/vite.config.ts` → `#070504`

### Merge into design system

| Current location | Target |
|------------------|--------|
| `src/index.css` @theme | `design-system/tokens/colors.css` |
| `src/index.css` utilities | `design-system/styles/utilities.css` |
| `src/styles/soft-buttons.css` | `design-system/styles/soft-buttons.css` |
| Shimmer keyframes | `design-system/tokens/motion.css` |

### OrderBhojan CSS entry (post-migration)

```typescript
// orderbhojan/src/main.tsx
import '@bhojan/storefront-design-system/styles';
// NO experience-*.css imports
```

---

## 7. Import aliases

### Root app (`vite.config.ts` + `tsconfig.json`)

```typescript
// vite.config.ts resolve.alias
'@/design-system': path.resolve(__dirname, 'src/design-system'),
'@bhojan/storefront-design-system': path.resolve(__dirname, 'src/design-system'),
```

```json
// tsconfig.json paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/design-system/*": ["./src/design-system/*"],
      "@bhojan/storefront-design-system": ["./src/design-system/index.ts"],
      "@bhojan/storefront-design-system/*": ["./src/design-system/*"]
    }
  }
}
```

### OrderBhojan (`orderbhojan/vite.config.ts`)

```typescript
'@bhojan/storefront-design-system': path.resolve(__dirname, '../src/design-system'),
'@bhojan/storefront-design-system/styles': path.resolve(__dirname, '../src/design-system/styles/index.css'),
```

Remove `@bhojan/design-system` alias after Phase 6.

### BDS deprecation shim (temporary)

```typescript
// packages/design-system/src/index.ts — Phase 6 only
export * from '../../../src/design-system';
console.warn('[DEPRECATED] @bhojan/design-system — use @bhojan/storefront-design-system');
```

Delete `packages/design-system` entirely after Agent 8 confirms zero imports.

---

## 8. Migration strategy

### Phase 3 — Component Extraction (Agent 3)

1. Create `src/design-system/` skeleton (folders only)
2. Copy (not rewrite) P0 components from `src/components/`
3. Fix internal imports to use `@/design-system/*`
4. Add compatibility re-exports at old paths
5. Run founder app — must be pixel-identical
6. Output: `MIGRATION_REPORT.md`

**Gate:** Agent 5 visual regression PASS on founder app

### Phase 4 — Token Agent (Agent 4)

1. Split `src/index.css` into token files
2. Wire `design-system/styles/index.css`
3. Replace hardcoded hex in extracted components with CSS variables
4. Output: `TOKEN_REPORT.md`

**Gate:** No visual diff on founder; token grep shows zero `#0a0706`, `#e8a838`, Fraunces

### Phase 5 — Founder Preservation (Agent 5)

1. Capture baseline screenshots (all founder routes)
2. Re-run after Phase 3+4
3. DOM + computed-style diff
4. Output: `VISUAL_REGRESSION.md`

**Gate:** 0 pixel diffs above threshold (≤1px anti-alias tolerance)

### Phase 6 — OrderBhojan Migration (Agent 6)

Per-page presentation swap — **keep all hooks**:

| Step | Action |
|------|--------|
| 6.1 | Add design-system CSS import; remove experience CSS imports |
| 6.2 | Create view-model mappers in `design-system/adapters/` |
| 6.3 | Replace `HomeExperiencePage` UI with founder marketplace components |
| 6.4 | Replace food, cart, checkout, tracking, profile pages |
| 6.5 | Delete OB-only components (`KitchenDoorHero`, `ExperienceBottomNav`, etc.) |
| 6.6 | Update PWA manifest theme to founder tokens |

**Gate:** Agent 9 business logic diff = 0; Agent 5 OB visual match to founder

### Phase 7 — CSS Cleanup (Agent 7)

Delete all files listed in §6. Remove BDS package.

### Phase 8 — Import Refactoring (Agent 8)

1. Codemod `@bhojan/design-system` → `@bhojan/storefront-design-system`
2. Codemod `src/components/X` → `@/design-system/X` where applicable
3. Remove compatibility stubs
4. Verify zero broken imports

### Phase 9 — Business Logic Protection (Agent 9)

Verify unchanged:
- `orderbhojan/src/features/**/hooks/*`
- `orderbhojan/src/features/**/api/*`
- `orderbhojan/src/stores/*`
- React Query keys and cache policies
- Firestore paths
- Auth flows
- Payment / wallet / checkout state machines
- Tracking poll logic

### Phase 10 — QA (Agent 10)

```bash
npm run build          # root
npm run lint           # root
cd orderbhojan && npm run build && npm run lint
cd orderbhojan && npm run gate:prod
```

Output: `FINAL_REPORT.md`

---

## 9. OrderBhojan adapter pattern

Design-system components accept **view models**, not Firestore DTOs:

```typescript
// design-system/adapters/types/MenuItemViewModel.ts
export interface MenuItemViewModel {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  isVeg: boolean;
  onAdd: () => void;
  onCustomize?: () => void;
}

// orderbhojan/src/features/food/adapters/mapMenuItemToViewModel.ts
export function mapMenuItemToViewModel(item: MarketplaceMenuItem, handlers: Handlers): MenuItemViewModel {
  return { ... }; // pure mapping — lives in OB, not design-system
}
```

```tsx
// orderbhojan feature page — logic unchanged
const { data } = useMenuQuery(slug);
return data.items.map(item => (
  <MenuItemCard key={item.id} {...mapMenuItemToViewModel(item, cartHandlers)} />
));
```

---

## 10. Feature flag

```typescript
// orderbhojan/src/config/featureFlags.ts
export const FF_UNIFIED_STOREFRONT_DS =
  import.meta.env.VITE_FF_UNIFIED_STOREFRONT_DS === 'true';
```

- `false` (default during migration): legacy BDS + experience CSS
- `true`: design-system components only

Remove flag after Phase 10 PASS.

---

## 11. Risk report

| Risk | Mitigation |
|------|------------|
| OrderTracking 1,010 LOC has embedded founder Firestore calls | Extract presentational subcomponents first; inject data via props in founder app before moving |
| Checkout.tsx 1,428 LOC monolith | Phase 3 extracts visual panels only; page stays in founder app |
| CartContext vs Zustand | Adapter layer in OB features; design-system cart is display-only |
| BDS tests (`bds-theme.test.ts`, 74 import sites) | Update tests in Phase 6; temporary shim in Phase 6.1 |
| Evening Kitchen in production | Phase 6 is explicit rollback of OB visuals to founder |
| Build size increase from shared DS | Tree-shake via subpath exports; analyze in Phase 10 |

---

## 12. Rollback strategy

| Phase | Rollback |
|-------|----------|
| 3–4 | Revert `src/design-system/`; compatibility stubs still point to original files |
| 5 fail | Block Phase 6; fix extraction before proceeding |
| 6 | Set `FF_UNIFIED_STOREFRONT_DS=false`; restore experience CSS imports |
| 7 | Git revert deletion commit; re-add CSS files from tag |
| 8 | Restore compatibility re-export stubs from `ds-migration-phase-3` tag |

**Git tags:** `ds-migration-phase-{1..10}` at each gate PASS.

---

## 13. Change log

| Date | Agent | Action |
|------|-------|--------|
| 2026-07-10 | Agent 2 | Design system architecture plan complete |

---

## 14. Gate decision

**Phase 2: PASS** — Agent 3 (Component Extraction) is authorized to proceed.

**Next deliverable:** Component extraction + `MIGRATION_REPORT.md`

**Blocked until Phase 5 PASS:** Agent 6 (OrderBhojan Migration)
