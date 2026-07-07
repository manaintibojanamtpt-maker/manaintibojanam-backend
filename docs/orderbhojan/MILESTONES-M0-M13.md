# OrderBhojan — Milestones M0–M13

**Governance:** BhojanOS milestone discipline · ARB gate per milestone · no N+1 until N exits  
**Implementation blocked until M0 ARB approval**

Each milestone includes: Objectives · Architecture · Folder changes · Data flow · Acceptance criteria · Testing · Rollback · ARB approval

---

## Overview

| ID | Name | Depends | Primary deliverable |
|----|------|---------|---------------------|
| **M0** | Foundation | — | Repo, CI, design system, API client, mocks |
| M1 | Authentication | M0 | Google, Phone OTP, Guest |
| M2 | Location | M0 | GPS, geocode, addresses |
| M3 | Discovery | M1, M2 | Homepage rails |
| M4 | Search | M2, M3 | SearchProvider UI |
| M5 | Restaurant | M3 | Detail + contextToken |
| M6 | Menu | M5 | Browse, modifiers |
| M7 | Cart | M6 | Zustand cart + validate |
| M8 | Checkout | M7 | Server quote + place order |
| M9 | Payments | M8 | Razorpay, COD, UPI |
| M10 | Orders | M9 | History, profile |
| M11 | Tracking | M10 | Live status, guest track |
| M12 | Notifications | M11 | FCM |
| M13 | Production Readiness | M9–M12 | Certification, launch |

---

## M0 — Foundation

**Document:** [M0-ARB-REVIEW.md](./M0-ARB-REVIEW.md)

### Objectives

Repository, architecture, CI, theme, API client, routing, design system, auth shell, feature flags, ADRs.

### Architecture

Feature-first scaffold; Marketplace API client; MSW mocks; BhojanOS `marketplace-api/` router stub.

### Folder changes

Create full `orderbhojan/` tree; `marketplace-api/` in BhojanOS (additive).

### Data flow

App → MSW/mock → view models. No production BhojanOS Firestore.

### Acceptance criteria

`gate:ob0` PASS; Vercel preview; ADRs signed.

### Testing

Unit (client, flags); contract (OpenAPI); smoke Playwright.

### Rollback

Archive repo; `FF_MARKETPLACE_API_ENABLED=false`.

### ARB approval

**Required before any M1 work.**

---

## M1 — Authentication

### Objectives

Google, Phone OTP, Guest mode, session management, device registration stub.

### Architecture

`features/auth/`; Firebase orderbhojan; Bearer on API client; `customers/{uid}` upsert.

### Folder changes

`features/auth/ui`, `application`, `domain`; `api/middleware/auth`.

### Data flow

Firebase Auth → customer doc → API Bearer.

### Acceptance criteria

All auth modes work; guest can open app; token refresh handled.

### Testing

Auth state machine unit; E2E login smoke.

### Rollback

Disable providers in Firebase console.

### ARB approval

Verify no BhojanOS FS writes from client.

---

## M2 — Location

### Objectives

GPS, reverse geocode, manual locality, saved addresses, delivery engine inputs.

### Architecture

`features/location/`; LocationProvider port (Nominatim default); `addresses` subcollection.

### Data flow

GPS → canonical location → session → discover/search query params.

### Acceptance criteria

Permission denied fallback; address CRUD; distance utilities match server ±1%.

### Testing

Location session unit; E2E permission flows.

### Rollback

Manual location only flag.

---

## M3 — Discovery

### Objectives

Homepage rails: nearby, featured, popular, top rated, open now, new, offers, veg filters, cloud kitchen, quick delivery.

### Architecture

`features/discovery/` → `GET /discover`; server-driven rails; LIVE eligibility only.

### Data flow

Location → discover API → RestaurantPublic cards.

### Acceptance criteria

Active BhojanOS restaurants auto-appear; suspended hidden; skeleton/empty states.

### Testing

Contract tests; eligibility matrix.

### Rollback

`FF_OB_DISCOVERY=false`.

### BhojanOS

Implement discover handler; enable `FF_MARKETPLACE_API_ENABLED` staging.

---

## M4 — Search

### Objectives

Restaurant, cuisine, dish, area, pincode, locality, near me.

### Architecture

`features/search/`; backend SearchProviderPort (ADR-OB-003); no provider leakage in UI.

### Data flow

Query → search API → hits enriched with distance/open-now.

### Acceptance criteria

Debounce; empty states; recent searches saved locally.

### Testing

Search mapper unit; contract per query type.

### Rollback

`FF_OB_SEARCH=false`; discovery-only mode.

---

## M5 — Restaurant

### Objectives

Detail page; silent branch assignment; serviceability messaging; favorites toggle.

### Architecture

`features/restaurant/`; `contextToken` from detail API; no branchId in UI.

### Data flow

Slug → restaurant API → contextToken stored in session → menu/checkout use token.

### Acceptance criteria

One card per brand; unserviceable UX; deep links work.

### Testing

Branch assignment matrix (server-side tests).

### Rollback

Show closed message; disable order CTA.

---

## M6 — Menu

### Objectives

Categories, items, modifiers, veg/non-veg, unavailable handling.

### Architecture

`features/menu/` → menu API with contextToken.

### Data flow

restaurantId + contextToken → menu catalog → cart add.

### Acceptance criteria

No direct FS reads; modifier validation.

### Testing

Menu facade unit; contract tests.

### Rollback

View-only menu.

---

## M7 — Cart

### Objectives

Single-restaurant cart; persistence; `/cart/validate`.

### Architecture

Zustand cart; switch restaurant confirmation; no client totals.

### Data flow

Local cart → validate API → checkout handoff.

### Acceptance criteria

Cannot mix restaurants; survives refresh.

### Testing

Cart state machine unit.

### Rollback

Disable add-to-cart.

---

## M8 — Checkout

### Objectives

Server quote; address; slots; place order (auth + guest).

### Architecture

`features/checkout/`; quote/prepare/place; GA-3 SSOT billing rules.

### Data flow

Cart + address → quote → render BillQuote → place → orderId.

### Acceptance criteria

Zero client-side GST/delivery; guest path; parity with owner settings.

### Testing

Pricing regression suite (mirror GA-3 tests).

### Rollback

Redirect to legacy storefront checkout URL.

---

## M9 — Payments

### Objectives

COD, Razorpay, UPI via PaymentProviderPort.

### Architecture

Payment abstraction; lazy Razorpay load.

### Acceptance criteria

Sandbox payment E2E; tenant config respected.

### Testing

Payment failure/retry cases.

### Rollback

COD-only flag.

---

## M10 — Orders

### Objectives

Order history, profile, favorites list, reorder.

### Architecture

`features/orders/`, `profile/`, `favorites/`.

### Acceptance criteria

Authenticated history; reorder validates menu.

### Testing

Orders API contract; profile E2E.

### Rollback

Hide history UI.

---

## M11 — Tracking

### Objectives

Timeline, ETA, guest tracking, polling.

### Architecture

`features/tracking/`; public track route.

### Acceptance criteria

Status sync with BhojanOS; guest token security.

### Testing

Tracking E2E; polling backoff unit.

### Rollback

Static status page.

---

## M12 — Notifications

### Objectives

FCM registration; order status push; preferences.

### Architecture

`features/notifications/`; deviceTokens; optional Cloud Function.

### Acceptance criteria

Push on status change in staging.

### Testing

Token lifecycle unit.

### Rollback

Disable Cloud Function.

---

## M13 — Production Readiness

### Objectives

Security audit, soak, accessibility, runbooks, tag `orderbhojan-v1.0.0`.

### Architecture

`gate:ob13`; observability dashboards; production flag manifest.

### Acceptance criteria

All prior milestones exit; Lighthouse ≥90; rollback drill.

### Testing

Full regression + smoke + performance.

### Rollback

```
git revert <release>
FF_OB_* all OFF
FF_MARKETPLACE_API_ENABLED=false
Legacy /k/{slug} storefronts remain available
```

### ARB approval

Production launch sign-off.

---

## Quality gate template (every milestone)

```bash
npm run lint
npm run build
npm run test:unit
npm run test:contract
npm run gate:ob{N}
```

---

**Status:** ARCHIVED planning draft. M0–M6.5 implemented on `main` — see `orderbhojan/docs/` and [docs/PROGRAM-STATUS.md](../../PROGRAM-STATUS.md). M7+ frozen during Founder Beta.
