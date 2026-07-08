# PX6.1 — Owner Storefront Synchronization

**Version:** 0.9.x-px61  
**Status:** Audit complete — implementation deferred  
**Rule:** No code modified during audit phase

---

## Deliverables

| # | Document |
|---|---|
| 1 | [Current Architecture Audit](./01-CURRENT-ARCHITECTURE-AUDIT.md) |
| 2 | [Hardcoded Value Inventory](./02-HARDCODED-VALUE-INVENTORY.md) |
| 3 | [Firestore Mapping](./03-FIRESTORE-MAPPING.md) |
| 4 | [Marketplace DTO Mapping](./04-MARKETPLACE-DTO-MAPPING.md) |
| 5 | [Migration Plan](./05-MIGRATION-PLAN.md) |
| 6 | Implementation — **deferred** (see Migration Plan) |
| 7 | [Backward Compatibility Report](./07-BACKWARD-COMPATIBILITY-REPORT.md) |
| 8 | [Performance Report (baseline)](./08-PERFORMANCE-REPORT.md) |
| 9 | [Verification Report](./09-VERIFICATION-REPORT.md) |
| 10 | [Synchronization Matrix](./10-SYNCHRONIZATION-MATRIX.md) |

---

## Executive summary

**Today:** OrderBhojan renders mock data. BhojanOS Owner writes to Firestore. There is no live bridge.

**Rule Zero status:** FAIL — offers, badges, delivery, ETA, gallery, hours, variants, addons, and merchandising are invented in `orderbhojan/src/marketplace-api/mocks/` and UI formatters.

**Synchronization readiness:** ~14% (12 of ~85 business fields connected end-to-end).

**Critical blockers:**
1. No Firestore → Marketplace API projection
2. Owner menu API strips rich fields (`normalizeMenuItemPayload`)
3. Categories collection is admin-only — owners cannot manage
4. `formatOfferLabel()` computes `% OFF` instead of rendering owner `offer.text`
5. Dual mock restaurant pools with conflicting values (e.g. Mana Inti priceForTwo 449 vs 499)

**Next step:** Approve Phase 1 (BhojanOS Owner schema + UI) per [Migration Plan](./05-MIGRATION-PLAN.md).

---

## Architecture target

```
Owner Dashboard → Firestore → Marketplace API → DTOs → OrderBhojan Renderer
```

OrderBhojan never invents business data.

```pseudo
if (food.offer.enabled)
  renderOffer(food.offer.text)
else
  renderNothing()
```

---

## Out of scope (per program)

Checkout, payments, orders, tracking, notifications, coupons, loyalty, AI, recommendations.
