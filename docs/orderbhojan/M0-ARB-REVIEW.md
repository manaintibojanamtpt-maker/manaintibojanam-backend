# OrderBhojan — M0 Architecture Review (ARB)

> **ARCHIVED DRAFT — superseded.** This document was the pre-implementation M0 gate (2026-07-03).  
> **Implementation occurred:** see `orderbhojan/docs/M0-FOUNDATION-REPORT.md` and `orderbhojan/docs/M0-ARB-EXIT-REVIEW.md`.  
> **Current program status:** [docs/PROGRAM-STATUS.md](../../PROGRAM-STATUS.md)

**Document type:** Milestone 0 — Architecture Review Board Gate  
**Version:** 1.1.0-draft  
**Date:** 2026-07-03  
**Status:** ARCHIVED — superseded by implementation exit review

---

## 1. Purpose

This document is the **formal M0 gate** for OrderBhojan. It critically reviews architectural decisions, identifies flaws in prior drafts, records ADR decisions, and defines exactly what M0 implementation may begin **only after unanimous ARB sign-off**.

Implementation quality bar: same discipline as BhojanOS GA-1, GA-2, GA-3.

---

## 2. Executive Summary

OrderBhojan is a **production marketplace customer application** that consumes a **new Marketplace API layer** (`/api/marketplace/*`) on the existing BhojanOS Render backend. BhojanOS remains the sole owner of restaurant commerce data. Firebase project `orderbhojan` holds customer identity and preferences only.

**M0 delivers:** repository foundation, CI, design system, routing shell, API client, feature flags, telemetry baseline, Marketplace API **contract + mock** — not full commerce flows.

---

## 3. System Architecture (Approved Target)

```
Customer Device
      │
      ▼
OrderBhojan App (React · Vite · PWA · Vercel)
      │
      ├── Firebase orderbhojan (Auth + customer Firestore)
      │
      └── HTTPS only ──────────────────────────────┐
                                                   ▼
                              Marketplace API Layer (/api/marketplace/*)
                              · Identity sanitization (ADR-OB-002)
                              · Branch assignment (server-only)
                              · Server-authoritative quote
                                                   │
                                                   ▼
                              BhojanOS Legacy SDK Layer (frozen)
                              Discovery · Search · Branch · Menu · Pricing · Orders
                                                   │
                                                   ▼
                              Firestore bhojanos-prod (SSOT)
```

**Hard rule:** OrderBhojan frontend has **zero** read/write paths to BhojanOS Firestore collections for restaurant commerce.

---

## 4. Critical Review — Prior Draft Issues & Resolutions

| # | Issue in v1.0 draft | Severity | Resolution |
|---|----------------------|----------|------------|
| 1 | API responses exposed `tenantId`, `branchId` | **P0 Security** | ADR-OB-002: opaque `restaurantId` + server session binding |
| 2 | API path `/api/v1/marketplace/*` inconsistent with spec | P2 | Standardize on `/api/marketplace/*` (no version in path; use header) |
| 3 | Client-side cart listed as server SSOT | P1 | Cart is **client state** (Zustand) until checkout; server validates via `/quote` only |
| 4 | `/api/marketplace/cart` as persistent server cart | P1 | **Deferred:** M7 adds `POST /cart/validate` not session cart; avoids BhojanOS state ownership |
| 5 | Favorites duplicated (FS + API) | P2 | **SSOT:** OrderBhojan Firestore; `/favorites` API validates `restaurantId` still LIVE |
| 6 | Search coupled to Firestore in UI | P1 | ADR-OB-003: SearchProvider port on **backend** |
| 7 | Organization model unspecified | P2 | `restaurantId` maps to **Brand**; 1:1 with tenant until org schema ships |
| 8 | Restaurant lifecycle not formalized | P1 | See §8 — only `LIVE` in discovery |
| 9 | Marketplace API mixed with legacy route exposure | P0 | Dedicated router module; OrderBhojan never calls legacy `/api/coupons` etc. directly |
| 10 | Milestone M4 was "Restaurant" before Search in v1.0 draft | P3 | **Canonical order (MILESTONES-M0-M12.md):** M3 Discovery → **M4 Restaurant** → M5 Menu → M6 Cart → M7 Checkout → M8 Payments → M9 Tracking → M10 Customer → M11 Notifications → M12 Production |

---

## 5. Absolute Ownership Boundary

### BhojanOS owns (never in orderbhojan Firestore)

Restaurant · Branch · Menu · Pricing · Taxes · Delivery logic · Orders · Inventory · Payments · Restaurant configuration

### OrderBhojan owns (orderbhojan Firestore only)

| Collection | Notes |
|------------|-------|
| `customers` | Profile root |
| `addresses` | Subcollection under customer |
| `favorites` | Keyed by `restaurantId` (ADR-OB-002) |
| `deviceTokens` | FCM |
| `preferences` | Veg default, language, etc. |
| `notificationSettings` | Opt-in channels |
| `recentSearches` | Cap 20, FIFO |
| `analytics` | Optional batched events |

### Forbidden in orderbhojan Firestore

`restaurants`, `menus`, `pricing`, `orders`, `branches`

---

## 6. Marketplace API Layer

Full contract: [MARKETPLACE-API-v1.0.md](./MARKETPLACE-API-v1.0.md)

### Endpoint inventory

| Method | Path | Purpose | M0 |
|--------|------|---------|-----|
| GET | `/api/marketplace/discover` | Nearby + curated lists | Mock |
| GET | `/api/marketplace/search` | Unified search | Mock |
| GET | `/api/marketplace/restaurants/:restaurantSlug` | Detail | Mock |
| GET | `/api/marketplace/menu` | Menu for resolved branch | Mock |
| POST | `/api/marketplace/quote` | Server bill quote | Mock |
| POST | `/api/marketplace/cart/validate` | Validate lines + availability | M7 |
| POST | `/api/marketplace/checkout/prepare` | Payment methods + final quote | M8 |
| POST | `/api/marketplace/checkout/place` | Create order | M8 |
| GET | `/api/marketplace/orders` | Customer order list | M10 |
| GET | `/api/marketplace/orders/:orderId` | Order detail | M10 |
| GET | `/api/marketplace/orders/:orderId/tracking` | Tracking timeline | M11 |
| GET/PATCH | `/api/marketplace/profile` | Sync minimal profile to BhojanOS user | M1 |
| GET/POST/DELETE | `/api/marketplace/favorites` | Validate + optional sync | M10 |
| POST | `/api/marketplace/notifications/register` | Device token handoff | M12 |

**Note on `/api/marketplace/cart`:** ARB **rejects** persistent server-side cart in v1. Use client cart + `/quote`. Rename to `/cart/validate` at M7.

### Server implementation location (BhojanOS repo — additive only)

```
marketplace-api/           # NEW — isolated module
  router.ts
  middleware/
    correlationId.ts
    firebaseAuth.ts
    restaurantContext.ts   # resolves restaurantId → tenant/branch
  handlers/
  services/
    identity/
    branch/
    quote/
  providers/
    search/                  # ADR-OB-003
  dto/                       # Public DTOs only — NOT SDK DTOs re-exported
  __tests__/
```

Mount in `server.ts`: `app.use('/api/marketplace', marketplaceRouter)`

**Constraint:** No edits to frozen SDK source files. Marketplace handlers **import** SDK orchestrators as black boxes.

---

## 7. Tenant Security Model

Customer-visible payload **never includes:**

- `tenantId`, `tenantSlug`, `branchId`
- Firestore paths, internal document IDs

Customer-visible payload **includes:**

- `restaurantId`, `restaurantSlug`, `displayName`, `logo`, `rating`, `eta`, `deliveryFee`, `isOpen`

Branch assignment, kitchen capacity, and serviceability are **server-only** (ADR-OB-002).

### Threat: IDOR via restaurantId manipulation

**Mitigation:** Signed `contextToken` binds `{ restaurantId, branchId, customerPoint, expiry }` server-side; quote/checkout reject token mismatch.

---

## 8. Restaurant Lifecycle (Discovery Eligibility)

Only **`LIVE`** restaurants appear in OrderBhojan discovery/search.

| Status | Visible | Notes |
|--------|---------|-------|
| `PENDING` | No | Registration incomplete |
| `KYC_PENDING` | No | Awaiting documents |
| `UNDER_REVIEW` | No | Admin queue |
| `APPROVED` | No | Approved but not live |
| **`LIVE`** | **Yes** | Auto-discoverable |
| `HOLIDAY` | No | Scheduled closure |
| `TEMPORARILY_CLOSED` | Optional card | Show closed, not orderable |
| `OUT_OF_SERVICE` | No | Technical/ops |
| `SUSPENDED` | No | Policy |

**Mapping today:** BhojanOS `tenant.status=active` + `storeStatus=live` + approval flags → Marketplace maps to `LIVE`. Full enum is **Marketplace API view model** — no Firestore schema change in M0.

**Auto-publish rule:** KYC → Admin approval → Quality review → LIVE → **automatic** discovery inclusion. No manual publish button.

---

## 9. Discovery Engine (Homepage)

### Curated rails (server-composed)

| Rail | Source |
|------|--------|
| Nearby Restaurants | Geo + eligibility |
| Featured | Platform curation flag (BhojanOS admin) |
| Popular | Order volume signal (read-only analytics) |
| Top Rated | Rating ranking |
| Open Now | `storeOperations` |
| New on OrderBhojan | `createdAt` window |
| Offers | Promotion engine (flag `FF_OB_PROMOTIONS`) |
| Veg / Non Veg / Pure Veg | Menu tags + tenant config |
| Cloud Kitchens | `businessType` |
| Restaurants | Dine-in capable (future) |
| Quick Delivery | ETA < threshold |

Single API: `GET /api/marketplace/discover?lat=&lng=&rails=nearby,featured,...`

**ARB note:** Rails are **server-driven** so homepage layout can change without app release.

---

## 10. Multi-Branch Routing (Server-Only)

```
Customer selects restaurant (restaurantId)
        │
        ▼
Server: BranchAssignmentService
  · List branches for brand/tenant
  · Filter by serviceability (radius, pincode, locality — future polygon)
  · Score: distance → ETA → kitchen capacity → load
  · Bind branchId to contextToken
        │
        ▼
Menu / Quote / Checkout use bound branch — client never sees branchId
```

Customer sees **ONE** restaurant card per brand in discovery/search.

---

## 11. Organization Model (Future-Ready)

```
Organization → Brand → Branch
```

- Public `restaurantId` = **Brand** identity
- Owner may operate multiple brands under one organization
- M0–M5: Brand 1:1 with BhojanOS `tenant` (no migration)
- ADR required before org Firestore schema (out of M0 scope)

---

## 12. Checkout & Payments

### Checkout (server authoritative)

Frontend **NEVER** calculates: GST, packaging, delivery, discount, coupon, total.

Flow:

```
Client cart (Zustand)
        │
        ▼
POST /api/marketplace/quote { restaurantId, contextToken, lines, address }
        │
        ▼
Server returns BillQuoteDTO — UI renders verbatim
        │
        ▼
POST /api/marketplace/checkout/prepare → POST .../place
```

Aligns with GA-3 SSOT pattern already in production for storefront checkout.

### Payment abstraction (backend port)

| Provider | v1 | Future |
|----------|-----|--------|
| Cash (COD) | Yes | — |
| UPI | Via Razorpay | Native UPI intent |
| Razorpay | Yes | — |
| Stripe | — | Flag-gated |
| Wallet | — | Flag-gated |

`PaymentProviderPort` in Marketplace API — UI sees `paymentMethods: { type, label, enabled }[]` only.

---

## 13. State Management

| Concern | Tool |
|---------|------|
| Server state (discover, menu, quote, orders) | TanStack Query |
| Cart, location session, UI ephemeral | Zustand |
| Auth session | Firebase Auth + React context |

**Redux: prohibited.**

---

## 14. Folder Structure (M0 scaffold)

```
orderbhojan/
├── src/
│   ├── app/                    # Bootstrap, providers, routes
│   ├── features/
│   │   ├── auth/               # Shell only in M0
│   │   ├── discovery/
│   │   ├── search/
│   │   ├── restaurant/
│   │   ├── menu/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── orders/
│   │   ├── tracking/
│   │   ├── favorites/
│   │   ├── notifications/
│   │   └── profile/
│   ├── shared/
│   │   ├── ui/                 # Design system
│   │   ├── hooks/
│   │   └── utils/
│   ├── api/                    # Marketplace client ONLY
│   │   ├── client.ts
│   │   ├── contracts/          # Generated from OpenAPI
│   │   └── mappers/            # DTO → view model
│   ├── config/
│   │   ├── environment.ts
│   │   └── flags.ts
│   └── telemetry/
├── docs/
├── tests/
│   ├── unit/
│   ├── contract/               # MSW + OpenAPI
│   └── e2e/
└── scripts/
    └── gate-ob0.mjs
```

**M0 creates:** `app/`, `shared/ui/`, `api/`, `config/`, `telemetry/`, empty feature stubs with `index.ts` barrel exports only.

---

## 15. Feature Flags (default OFF)

| Flag | Milestone |
|------|-----------|
| `FF_OB_DISCOVERY` | M3 |
| `FF_OB_SEARCH` | M4 |
| `FF_OB_TRACKING` | M11 |
| `FF_OB_NOTIFICATIONS` | M12 |
| `FF_OB_PAYMENTS` | M9 |
| `FF_OB_PROMOTIONS` | Post-M12 |

Remote config: Firebase Remote Config or env manifest per environment.

---

## 16. Observability

| Signal | Implementation |
|--------|----------------|
| Correlation ID | `X-Correlation-Id` on every API call; generated at app boot |
| Structured logs | Marketplace API JSON logs (Render) |
| Error tracking | Sentry (frontend) |
| Performance | Web Vitals + API latency spans |
| Health | Existing `/api/health` + future `/api/marketplace/health` |

---

## 17. Testing Strategy (M0 baseline)

| Layer | M0 deliverable |
|-------|----------------|
| Unit | API client, mappers, flag reader |
| Contract | MSW handlers from OpenAPI mock |
| Integration | Deferred to M3+ |
| Playwright | Smoke: app loads, health page |
| Accessibility | axe on shell |
| Performance | Lighthouse CI baseline |
| Regression | Gate script `gate:ob0` |

---

## 18. Deployment Architecture

| Component | Host |
|-----------|------|
| OrderBhojan frontend | Vercel (`orderbhojan.com`) |
| Customer Auth + FS | Firebase `orderbhojan` |
| Marketplace API + commerce | BhojanOS Render (additive routes) |
| Restaurant SSOT | Firestore `bhojanos-prod` |

Environments: `development` · `preview` · `production`

---

## 19. M0 Scope — Explicit In / Out

### In scope (after ARB approval)

- [ ] Initialize `orderbhojan` repository
- [ ] Feature-first folder scaffold
- [ ] Vite + React + TS + ESLint + PWA shell
- [ ] Design system tokens + 5 primitives (Button, Card, Skeleton, Text, IconContainer)
- [ ] React Router shell + lazy route placeholders
- [ ] Firebase `orderbhojan` project wiring (Auth config only)
- [ ] Marketplace API TypeScript client + OpenAPI spec
- [ ] MSW mock server for local dev
- [ ] Feature flag reader
- [ ] Telemetry + ErrorBoundary + correlation ID
- [ ] CI: lint, build, test:unit, gate:ob0
- [ ] ADRs OB-001, OB-002, OB-003 merged
- [ ] `marketplace-api/` module stub in BhojanOS repo (router mount + health handler only)

### Out of scope (M0)

- Discovery UI, search, menu, cart, checkout
- Production Marketplace API handlers (mocks only)
- BhojanOS SDK modifications
- Firestore schema changes
- Payment integration
- App Store / Play Store builds

---

## 20. M0 Acceptance Criteria

- [ ] `npm run gate:ob0` passes on `main`
- [ ] Vercel preview deploy succeeds
- [ ] App loads PWA shell with design system
- [ ] API client fetches mock `/api/marketplace/discover`
- [ ] No imports from `firebase/firestore` except customer infra module
- [ ] Architecture test: no `@/` imports from features into `bhojanos` paths
- [ ] OpenAPI spec validates
- [ ] ADRs reviewed and signed

---

## 21. M0 Exit Criteria (ARB Gate)

| Gate | Owner | Status |
|------|-------|--------|
| Architecture review complete | ARB Chair | ☐ |
| Security review (ID exposure) | Security | ☐ |
| Firebase rules sketch approved | Firebase Architect | ☐ |
| UX design system direction | UX Lead | ☐ |
| Marketplace API contract approved | Backend Lead | ☐ |
| BhojanOS non-regression ack | BhojanOS Release Eng | ☐ |

**Unanimous sign-off required to begin M1.**

---

## 22. M0 Rollback Strategy

M0 is greenfield — rollback = archive repository. No production impact.

BhojanOS stub router: feature flag `FF_MARKETPLACE_API_ENABLED=false` (default OFF) removes mount.

---

## 23. Milestone Roadmap (M0–M12)

**Canonical plan:** [MILESTONES-M0-M12.md](./MILESTONES-M0-M12.md)

| Phase | Focus |
|-------|-------|
| M0 | Foundation ← **THIS REVIEW** |
| M1 | Authentication |
| M2 | Location |
| M3 | Discovery |
| M4 | Restaurant Experience |
| M5 | Menu Platform |
| M6 | Cart Platform |
| M7 | Checkout Platform |
| M8 | Payments |
| M9 | Order Tracking |
| M10 | Customer Experience |
| M11 | Notifications |
| M12 | Production Readiness |

> **Note:** An alternate M0–M13 draft ([MILESTONES-M0-M13.md](./MILESTONES-M0-M13.md)) placed Search at M4; that sequencing was **not adopted**. Use MILESTONES-M0-M12.md for implementation order.

---

## 24. ARB Recommendations (Must Accept or Defer with ADR)

1. **Accept ADR-OB-002** — opaque restaurant IDs are non-negotiable for marketplace security.
2. **Reject server-side cart SSOT** — use client cart + `/quote`; document in API spec.
3. **Add `FF_MARKETPLACE_API_ENABLED`** on BhojanOS — default OFF until M3 staging soak.
4. **Do not fork SearchSDK** — wrap via SearchProvider port in Marketplace API.
5. **Defer Organization schema** — design for Brand ID; implement 1:1 tenant mapping in M3–M5.
6. **Require contract tests** before each milestone merge — same as BhojanOS SDK gates.

---

## 25. Architecture Compliance Checklist

- [x] BhojanOS SSOT preserved
- [x] No modification to frozen SDKs/DTOs/repos (M0 stub router only)
- [x] No projection/event platform activation
- [x] GA-1/GA-2/GA-3 production paths untouched
- [x] Server-authoritative checkout designed
- [x] Feature-first modular structure
- [x] Enterprise testing + observability planned
- [ ] **Implementation authorized** — pending ARB sign-off

---

## Related Documents

- [ADR-OB-001](./adr/ADR-OB-001-marketplace-boundary.md)
- [ADR-OB-002](./adr/ADR-OB-002-public-restaurant-identity.md)
- [ADR-OB-003](./adr/ADR-OB-003-search-provider-abstraction.md)
- [MARKETPLACE-API-v1.0.md](./MARKETPLACE-API-v1.0.md)
- [MILESTONES-M0-M12.md](./MILESTONES-M0-M12.md) — **canonical milestone sequence**
- [MILESTONES-M0-M13.md](./MILESTONES-M0-M13.md) — alternate draft (superseded for ordering)
- [FIRESTORE-CUSTOMER-SCHEMA-v1.0.md](./FIRESTORE-CUSTOMER-SCHEMA-v1.0.md)

---

**Submitted by:** Architecture Review Board  
**Next action:** ARB review meeting → sign M0 → authorize implementation
