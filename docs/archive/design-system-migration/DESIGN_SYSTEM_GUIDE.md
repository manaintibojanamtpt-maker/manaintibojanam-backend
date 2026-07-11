# BhojanOS Storefront Design System — Developer Guide

**Version:** Phase 5  
**Date:** 2026-07-10  
**Location:** `src/design-system/`

---

## 1. Purpose

One shared presentation layer for Founder Store, OrderBhojan (Phase 6+), Owner, and Admin. Business logic stays in app `features/`, `hooks/`, `contexts/`, and `services/`.

**Source of truth:** Mana Inti Bojanam Founder Store visuals — never redesign, only extract and reuse.

---

## 2. Folder structure

```
src/design-system/
├── index.ts                 # Public barrel — ONLY supported import path
├── tokens/                  # CSS + TS token constants
│   ├── colors.css
│   ├── typography.css
│   ├── spacing.css
│   ├── radius.css
│   ├── elevation.css
│   ├── glass.css
│   ├── motion.css
│   └── index.ts
├── styles/
│   ├── index.css            # Token bundle (NOT wired to app yet)
│   └── soft-buttons.css
├── primitives/              # Atomic UI (buttons, cards, sections)
├── skeleton/                # Shimmer skeleton system
├── layout/                  # Shell chrome + bottom sheet + pure views
├── cart/                    # Floating cart UI
├── food/                    # MenuItemCard, Banner
├── marketplace/             # Search + kitchen cards
├── orders/                  # OrderTracking, DigitalInvoice
├── location/                # AutoLocationForm, HeaderLocationDropdown
└── storybook/
    └── catalog.ts           # Isolated render metadata (no Storybook installed)
```

---

## 3. Component ownership

| Domain | Owns | Does NOT own |
|--------|------|--------------|
| `primitives/` | Buttons, cards, badges, sections | Business state |
| `layout/` | Header, BottomNav, BottomSheet, pure views | Firestore polling |
| `cart/` | Cart pill UI | Cart persistence (Zustand/Firestore) |
| `food/` | Menu card presentation | Menu API |
| `marketplace/` | Search/kitchen card JSX | Discovery ranking logic |
| `orders/` | Tracking + invoice UI | Order state machines |
| `location/` | Address wizard UI | Geocoding services |

**Wired containers** live in `src/components/` when they need Firestore/hooks:
- `ActiveOrderStrip` → renders `ActiveOrderStripView`
- `StorefrontInstallButton` → renders `StorefrontInstallButtonView`

---

## 4. Import rules

### ✅ Allowed

```typescript
import {
  BottomNav,
  MenuItemCard,
  SoftButton,
  Skeleton,
} from '../design-system';
// or
import { Header } from '@/design-system';
```

Lazy loading via barrel:

```typescript
const OrderTracking = lazy(() =>
  import('../design-system').then((m) => ({ default: m.OrderTracking })),
);
```

### ❌ Forbidden (enforced by `validate-architecture.mjs`)

```typescript
// Deep imports
import Header from '../design-system/layout/Header';

// Design-system importing components
import BottomSheet from '../../components/BottomSheet';
```

### Composition slots (app wires business logic)

```tsx
<BottomNav activeOrderSlot={<ActiveOrderStrip />} />
<Header installSlot={<StorefrontInstallButton variant="icon" />} />
```

---

## 5. Token usage

Tokens exist in `tokens/*.css` and `tokens/index.ts`. **Not activated globally** — `src/index.css` still powers the Founder Store.

| Token file | Contents |
|------------|----------|
| `colors.css` | `@theme`, MIB `:root` vars |
| `typography.css` | Fonts + text scale |
| `spacing.css` | Spacing + safe-area |
| `radius.css` | Card/button radii |
| `elevation.css` | Shadows |
| `glass.css` | `.mib-glass`, hero gradient |
| `motion.css` | Durations, shimmer |

**Future activation:**

```typescript
import '@bhojan/storefront-design-system/styles'; // styles/index.css
```

**Runtime constants:**

```typescript
import { colors, breakpoints, elevation } from '@/design-system';
```

---

## 6. Extension rules

1. **Extract, don't duplicate** — copy from founder UI verbatim
2. **No new visuals** — match existing Tailwind classes exactly
3. **Props over hooks** — prefer injected callbacks for OrderBhojan adapters
4. **Pure views** for anything needing Firestore — container in app layer
5. **Export through barrel** — add to domain `index.ts` then `design-system/index.ts`
6. **Update storybook catalog** — `storybook/catalog.ts` for new public components

---

## 7. Contribution guidelines

### Adding a component

1. Copy presentation file to correct domain folder
2. Fix imports to use `../../lib`, `../../context` only if founder already did
3. Add export to domain `index.ts`
4. Add to root `index.ts` if not already covered by `export *`
5. Leave compatibility stub in `src/components/` until Phase 8
6. Run `node scripts/design-system/validate-architecture.mjs`
7. Run `npm run build:web`

### Splitting wired + view

When a component needs Firestore/hooks:

1. Extract JSX to `*View.tsx` in design-system (props only)
2. Keep container in `src/components/` or app `features/`
3. Wire via slot prop or parent composition

---

## 8. Storybook readiness

Catalog: `src/design-system/storybook/catalog.ts`

Each entry documents:
- Export name
- Required providers (`router`, `cart`, `tenant`, `auth`, `delivery`)
- Isolation notes

Install Storybook in a future phase using catalog as the component index.

---

## 9. Validation commands

```bash
node scripts/design-system/validate-architecture.mjs
npm run build:web
npm run lint
```

---

## 10. Phase roadmap

| Phase | Action |
|-------|--------|
| 5 ✅ | Stabilize DS, remove leaks, public API |
| 6 | OrderBhojan presentation swap via adapters |
| 7 | Delete experience CSS + BDS |
| 8 | Remove compatibility stubs, codemod imports |
