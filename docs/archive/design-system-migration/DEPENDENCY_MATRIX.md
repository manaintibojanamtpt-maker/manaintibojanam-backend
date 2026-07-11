# Design System — Dependency Matrix

**Phase:** 5 — Design System Stabilization  
**Date:** 2026-07-10  
**Scope:** `src/design-system/` internal and external dependencies

---

## 1. Internal leaks (design-system → src/components)

| Before Phase 5 | After Phase 5 | Resolution |
|----------------|---------------|------------|
| `BottomSheet` ← `src/components/BottomSheet` | **None** | Moved to `layout/BottomSheet.tsx` |
| `ActiveOrderStrip` ← `src/components/ActiveOrderStrip` | **None** | Composition slot `activeOrderSlot` on `BottomNav` |
| `StorefrontInstallButton` ← `src/components/StorefrontInstallButton` | **None** | Composition slots `installSlot` on `Header` / `StorefrontDesktopHeader` |

**Validation:** `scripts/design-system/validate-architecture.mjs` — **0 leaks**

---

## 2. App-layer wiring (src → design-system + containers)

| Container (business logic) | View (design-system) | Wired in |
|---------------------------|----------------------|----------|
| `src/components/ActiveOrderStrip.tsx` | `layout/ActiveOrderStripView.tsx` | `App.tsx` → `BottomNav activeOrderSlot` |
| `src/components/StorefrontInstallButton.tsx` | `layout/StorefrontInstallButtonView.tsx` | `App.tsx` → `Header` / `StorefrontDesktopHeader` `installSlot` |

Containers retain: Firestore, hooks, contexts. Views are pixel-identical presentation.

---

## 3. Design-system → app infrastructure (allowed)

These are **not** UI component leaks — shared platform utilities consumed by storefront presentation:

| Category | Modules imported | Used by |
|----------|------------------|---------|
| **Contexts** | `CartContext`, `AuthContext`, `TenantContext` | Layout, cart, orders, location |
| **Hooks** | `useStorefrontPath`, `useStorefrontAuth`, `useStoreBranding` | Layout, orders |
| **Lib** | `utils`, `deliveryFee`, `tenantPath`, `orderDisplay`, `orderTrackingReads`, `guestOrders`, `useDeliveryState`, `customerLocation/*`, `marketplace/*` | Food, location, marketplace, orders |
| **Services** | `NotificationService` | `OrderTracking` |
| **Types** | `src/types` | Orders, location |
| **SDK** | `sdk/core/resultHelpers` | `AutoLocationForm` |
| **Firebase** | `firebase/firestore`, `lib/firebase-db` | Banner, OrderTracking, HeaderLocationDropdown |
| **Assets** | `assets/bhojan-os-logo.png` | `StorefrontDesktopHeader` |
| **Utils** | `utils/haptics` | Layout, cart, food |

**Rule:** Phase 6 OrderBhojan migration will replace founder-specific hooks with adapter-injected props. Infrastructure imports in wired components are documented technical debt.

---

## 4. Design-system internal dependency graph

```
tokens/ ─────────────────────────────────────────┐
primitives/ (SoftButton, GlassCard, …)           │
skeleton/ ───────────────────────────────────────┤
layout/                                          │
  ├── BottomSheet (leaf)                          │
  ├── ActiveOrderStripView (leaf)                 │
  ├── StorefrontInstallButtonView (leaf)          │
  ├── BottomNav → (slot only, no components/)    │
  ├── Header → (slot only)                        │
  └── StorefrontDesktopHeader → location/         │
cart/ → context, utils                            │
food/ → layout/BottomSheet, context               │
marketplace/ → lib types only                     │
orders/ → orders/DigitalInvoice (internal)        │
location/ → AutoLocationForm (internal)           │
                                                  ▼
                                          index.ts (barrel)
```

**Cycles:** None detected.

---

## 5. Founder Store consumers (public API)

| Consumer | Import style | Components |
|----------|--------------|------------|
| `App.tsx` | `from './design-system'` | Layout, cart, lazy `OrderTracking` |
| `pages/Home.tsx` | barrel | `MenuItemCard`, skeletons |
| `pages/Menu.tsx` | barrel | `MenuItemCard`, `Banner`, skeletons |
| `pages/Checkout.tsx` | barrel + lazy | `SoftButton`, `Skeleton`, `AutoLocationForm` |
| `pages/Login.tsx` | barrel | `SoftButton` |
| `pages/MyOrders.tsx` | barrel | `DigitalInvoice` |
| `pages/MarketplaceHome.tsx` | barrel | marketplace search + kitchen card |

**Deep imports in app code:** 0 (validated)

---

## 6. Compatibility re-exports (legacy)

36 stubs in `src/components/` still re-export design-system for marketing, owner, admin. Not used by Founder Store after Phase 4.

---

## 7. Not in design-system (by design)

| Component | Reason |
|-----------|--------|
| `MarketplaceHomeStates` | Page-level state UI — not extracted Phase 3 |
| `FlyToCartAnimation` | App shell animation |
| `AIAssistant`, `InstallPrompt` | App features |
| All `owner/*`, `admin/*`, `marketing/*` | Separate portals |

---

## Gate

**Internal component leaks:** ✅ ZERO  
**Ready for OrderBhojan adapter pattern:** ✅ YES
