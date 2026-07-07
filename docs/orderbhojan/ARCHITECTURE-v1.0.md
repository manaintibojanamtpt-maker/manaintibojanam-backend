# OrderBhojan — Architecture v1.0

**Document type:** Production Architecture Review  
**Version:** 1.0.0-draft  
**Date:** 2026-07-03  
**Authors:** ARB / Principal Architecture  
**Status:** ⏸ **Awaiting ARB approval — M0 gate**  
**Governance:** BhojanOS milestone discipline · FEB-001 · ADR process

---

## Executive Summary

OrderBhojan is a **customer-facing marketplace application** that replaces the per-restaurant storefront link model with a unified discovery-first experience: open app → grant location → browse nearby restaurants → order → track.

**Critical boundary:** OrderBhojan is **presentation + orchestration only**. All restaurant catalog, pricing, checkout computation, order persistence, and tenant lifecycle remain in **BhojanOS**. OrderBhojan never duplicates restaurant/menu/order domain logic or writes to BhojanOS Firestore directly from the client for catalog or order mutations (except through authenticated BhojanOS APIs).

BhojanOS already ships frozen platforms (Location M2, Discovery M3, Search M4, Branch M5, Menu M7, Pricing M8, Orders M1) with projection infrastructure **dormant**. OrderBhojan consumes these capabilities through a **stable HTTP API surface** on the existing Render backend, not by re-implementing SDK internals in the customer app.

---

## 1. Overall Architecture

### 1.1 System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER DEVICES                                 │
│              (Web PWA · iOS · Android · Desktop)                        │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ORDERBHOJAN FRONTEND                                  │
│         React · TypeScript · Vite · Feature-first modules               │
│         Vercel CDN · PWA · Service Worker · Error Boundaries              │
└───────────────┬─────────────────────────────┬───────────────────────────┘
                │                             │
                │ Customer identity,          │ Restaurant discovery,
                │ addresses, favorites,       │ menu, cart, checkout,
                │ prefs, FCM tokens           │ orders, tracking
                ▼                             ▼
┌───────────────────────────┐   ┌─────────────────────────────────────────┐
│  FIREBASE (orderbhojan)   │   │  BHOJANOS BACKEND (Render)               │
│  · Auth (Google, Phone)   │   │  Legacy API + frozen SDK orchestration   │
│  · Customer Firestore     │   │  · Discovery / Search / Branch           │
│  · FCM (customer push)    │   │  · Menu / Pricing / Checkout / Orders    │
└───────────────────────────┘   └──────────────────┬──────────────────────┘
                                                   │
                                                   ▼
                                    ┌─────────────────────────────────────┐
                                    │  BHOJANOS FIRESTORE (bhojanos-prod)  │
                                    │  Source of Truth — NOT client-direct │
                                    │  · tenants · branches · menu        │
                                    │  · orders · pricing · analytics       │
                                    └─────────────────────────────────────┘
```

### 1.2 Layered Architecture (OrderBhojan App)

| Layer | Responsibility | May | Must NOT |
|-------|----------------|-----|----------|
| **Presentation** | UI, accessibility, skeletons, routing shells | Render, animate, collect input | Firestore tenant reads, pricing math |
| **Application** | Facades, use-cases, session orchestration | Compose API calls, map DTOs → view models | Duplicate BhojanOS business rules |
| **Domain (local)** | Customer view models, validation, UI state machines | Customer-side invariants | Restaurant catalog schema |
| **Infrastructure** | HTTP clients, Firebase customer repo, telemetry | Retry, cache, auth headers | Direct BhojanOS Firestore from browser |

### 1.3 Integration Principle

```
OrderBhojan Feature
        │
        ▼
Application Facade (e.g. DiscoveryFacade)
        │
        ▼
BhojanOS API Client (typed contracts)
        │
        ▼
BhojanOS Backend → Legacy SDKs → bhojanos-prod Firestore
```

**No shortcut:** UI components never import BhojanOS SDK packages or query `tenants` collection directly.

### 1.4 Multi-Tenant Discovery Rule

```
Restaurant registers (BhojanOS Owner)
        ↓
KYC complete
        ↓
Super Admin approves
        ↓
tenant.status = active AND storeStatus = live
        ↓
Discovery eligibility engine includes tenant (automatic)
        ↓
Visible in OrderBhojan — zero manual publish step
```

Eligibility is **derived from BhojanOS tenant state**, not an OrderBhojan publish flag.

### 1.5 Multi-Branch Rule

```
Customer sees:  ONE card per restaurant (brand)
Customer never sees: duplicate cards per branch

Behind the scenes:
  BranchAssignmentEngine.selectNearestServiceableBranch(
    customerPoint, tenantId, orderType
  ) → branchId

Menu, pricing, checkout, order creation all scoped to branchId
```

Aligns with BhojanOS M5 Branch Intelligence design: search/discovery find **brands**; branch selection is a separate assignment stage.

---

## 2. Folder Structure

Feature-first layout for `orderbhojan` repository:

```
orderbhojan/
├── docs/                          # Architecture, ADRs, milestone reports
├── public/                        # PWA manifest, icons, static assets
├── src/
│   ├── app/                       # Bootstrap, root providers, router shell
│   │   ├── App.tsx
│   │   ├── providers/             # Auth, Location, Cart, Telemetry, Flags
│   │   └── routes/                # Route definitions (lazy-loaded features)
│   │
│   ├── features/                  # Vertical feature modules
│   │   ├── auth/
│   │   │   ├── ui/
│   │   │   ├── application/       # AuthFacade, session orchestration
│   │   │   ├── domain/            # CustomerSession, AuthState
│   │   │   └── index.ts           # Public feature API
│   │   ├── location/
│   │   ├── discovery/
│   │   ├── search/
│   │   ├── restaurant/
│   │   ├── menu/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── orders/
│   │   ├── tracking/
│   │   ├── profile/
│   │   ├── favorites/
│   │   ├── notifications/
│   │   └── onboarding/            # First-run location + permissions
│   │
│   ├── shared/
│   │   ├── ui/                    # Design system, Skeleton, ErrorBoundary
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── types/
│   │   └── constants/
│   │
│   └── infrastructure/
│       ├── bhojanos-api/          # Typed HTTP client + contract mappers
│       │   ├── client.ts
│       │   ├── discovery/
│       │   ├── search/
│       │   ├── branch/
│       │   ├── menu/
│       │   ├── pricing/
│       │   ├── checkout/
│       │   ├── orders/
│       │   └── tracking/
│       ├── firebase/              # orderbhojan Firebase (customer only)
│       │   ├── auth/
│       │   ├── customer/
│       │   └── messaging/
│       ├── cache/                 # SWR/React Query adapters, offline queue
│       ├── telemetry/             # Events, RUM, error reporting
│       └── flags/                 # Feature flag reader
│
├── tests/
│   ├── unit/
│   ├── integration/               # API contract tests (mock server)
│   └── e2e/                       # Playwright — critical journeys
│
├── vite.config.ts
├── firebase.json                  # orderbhojan hosting + rules
└── package.json
```

**Module boundary rule:** Features import from `shared/` and `infrastructure/` only through defined ports. Features do not import sibling feature internals — use feature `index.ts` exports or shared orchestration in `app/providers`.

---

## 3. Feature Modules

| Feature | User-facing scope | BhojanOS API deps | Local Firebase |
|---------|-------------------|-------------------|----------------|
| **onboarding** | First launch, location permission, city picker | — | preferences |
| **auth** | Google, Phone OTP, guest mode | customer profile sync | Auth, customers |
| **location** | GPS, geocode, saved addresses, map preview | branch distance, serviceability | addresses |
| **discovery** | Nearby restaurants, filters, sort | Discovery API | recent location session |
| **search** | Text search, autocomplete, cuisine/tags | Search API + Discovery enrich | recentSearches |
| **restaurant** | Restaurant detail, hours, offers, branch resolve | tenant read, branch assign | favorites |
| **menu** | Categories, items, modifiers, veg filter | Menu API | — |
| **cart** | Multi-restaurant guard (single tenant), qty | — | cart session (local + optional sync) |
| **checkout** | Address, slot, payment, bill summary | Pricing + Checkout + Orders API | addresses |
| **orders** | History, reorder, invoices | Orders API | — |
| **tracking** | Live status, ETA, map (future driver) | Tracking API + realtime | — |
| **profile** | Name, phone, preferences, KYC N/A | customer update | customers |
| **favorites** | Saved restaurants | — | favorites |
| **notifications** | Push, in-app inbox | order events webhook → FCM | deviceTokens |

---

## 4. Domain Model

### 4.1 OrderBhojan-Owned (Customer Domain)

```
Customer
├── id: CustomerId (Firebase Auth UID)
├── phone?: E164
├── email?: string
├── displayName?: string
├── authProviders: ('google' | 'phone' | 'guest')[]
├── preferences: CustomerPreferences
├── createdAt, updatedAt

CustomerAddress
├── id, label, formattedAddress
├── geo: { lat, lng, geohash, accuracyM }
├── indiaStructured?: IndiaAddress (optional M2 parity)
├── isDefault: boolean

FavoriteRestaurant
├── tenantId, slug, addedAt

DiscoverySession
├── customerPoint, radiusKm, resolvedBranchByTenant: Map<TenantId, BranchId>
├── lastQuery, lastResultAt

Cart (session)
├── tenantId, branchId (required once restaurant selected)
├── lines: CartLine[]
├── couponCode?

LocationSession
├── canonicalLocation: CustomerCanonicalLocation
├── permissionState: granted | denied | prompt
├── source: gps | manual | saved_address
```

### 4.2 BhojanOS-Owned (Read Models — Never Persisted in orderbhojan Firestore)

```
RestaurantCard          ← DiscoveryResult / SearchHit mapped
RestaurantDetail        ← Tenant + branch summary
MenuCatalog             ← Menu SDK read model
BillQuote               ← Pricing/checkout computation
Order                   ← Order read model
OrderTrackingState      ← Status timeline + ETA
BranchAssignment        ← { tenantId, branchId, distanceKm, etaMins, serviceable }
```

### 4.3 Identity Mapping

| OrderBhojan | BhojanOS |
|-------------|----------|
| `CustomerId` (Firebase UID) | `userId` on orders when authenticated |
| Guest checkout | `guestOrderToken` + phone (existing GA-2 pattern) |
| `tenantId` + `branchId` | Passed on every catalog/checkout/order API call |

---

## 5. API Contracts

See [API-CONTRACTS-v1.0.md](./API-CONTRACTS-v1.0.md) for full request/response schemas.

### 5.1 API Groups

| Group | Base path (proposed) | Source platform |
|-------|---------------------|-----------------|
| Discovery | `GET /api/v1/marketplace/discover` | M3 Discovery |
| Search | `GET /api/v1/marketplace/search` | M4 Search |
| Branch | `POST /api/v1/branches/assign` | M5 Branch |
| Restaurant | `GET /api/v1/restaurants/:slug` | Tenant read |
| Menu | `GET /api/v1/menu` | M7 Menu |
| Pricing | `POST /api/v1/pricing/quote` | M8 Pricing |
| Checkout | `POST /api/v1/checkout/prepare` | Legacy checkout |
| Orders | `POST /api/v1/orders`, `GET /api/v1/orders/:id` | M1 Orders |
| Tracking | `GET /api/v1/orders/:id/tracking` | Orders + realtime |
| Customer | `PATCH /api/v1/customers/me` | Profile sync |

### 5.2 Contract Rules

1. All list endpoints accept `customerLat`, `customerLng`, `radiusKm`.
2. All tenant-scoped endpoints require `tenantId` + resolved `branchId`.
3. Pricing/checkout responses are **authoritative** — OrderBhojan never recomputes GST, delivery, or packaging client-side except for optimistic UI with server reconciliation.
4. Errors use BhojanOS SDK error catalogue shape: `{ ok: false, error: { code, message, layer } }`.
5. Version header: `X-BhojanOS-API-Version: 1.0`.

---

## 6. Firestore Collections

See [FIRESTORE-CUSTOMER-SCHEMA-v1.0.md](./FIRESTORE-CUSTOMER-SCHEMA-v1.0.md).

**OrderBhojan Firebase (`orderbhojan`) — customer data only:**

| Collection | Purpose |
|------------|---------|
| `customers/{uid}` | Profile, preferences |
| `customers/{uid}/addresses/{id}` | Saved delivery addresses |
| `customers/{uid}/favorites/{tenantId}` | Favorite restaurants |
| `customers/{uid}/recentSearches/{id}` | Search history (cap 20) |
| `customers/{uid}/deviceTokens/{id}` | FCM registration |
| `customers/{uid}/notificationInbox/{id}` | In-app notifications (optional) |

**Explicitly forbidden in orderbhojan Firestore:** `tenants`, `menu`, `orders` (master), `branches`, `pricing`.

---

## 7. Navigation Flow

```
/                           → Discovery Home (requires location or city fallback)
/search                     → Search results
/restaurant/:slug           → Restaurant detail → auto branch resolve
/restaurant/:slug/menu      → Menu browsing
/cart                       → Cart review
/checkout                   → Checkout flow
/orders                     → Order history (auth required)
/orders/:orderId            → Order detail + tracking
/orders/:orderId/track      → Full-screen tracking
/profile                    → Account
/profile/addresses          → Address book
/profile/favorites          → Saved restaurants
/auth/login                 → Auth modal/page
/onboarding/location        → First-run location
/help                       → Help center (static or CMS)
```

**Deep link preservation:** `/restaurant/:slug` works without prior discovery (shared links, SEO).

**Router:** React Router v7 with lazy route chunks per feature. Auth guards on `/orders`, `/profile`.

---

## 8. Authentication Flow

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ App Launch   │────▶│ Firebase Auth   │────▶│ Customer doc     │
│              │     │ session restore │     │ upsert (OB FS)   │
└──────────────┘     └────────┬────────┘     └──────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Google OAuth    Phone OTP        Guest mode
              │               │               │
              └───────────────┴───────────────┘
                              │
                              ▼
              BhojanOS API: Bearer token (Firebase ID token)
              Guest checkout: no Bearer; phone + guestOrderToken post-order
```

| Mode | Firebase Auth | BhojanOS API | Order history |
|------|---------------|--------------|---------------|
| Google | `signInWithPopup` | Bearer JWT | Full |
| Phone OTP | `signInWithPhoneNumber` | Bearer JWT | Full |
| Guest | Anonymous or none | Public checkout endpoints | Phone lookup / guest token |
| Apple (future) | OAuth provider | Bearer JWT | Full |

**Device registration:** After auth, register FCM token to `customers/{uid}/deviceTokens`.

---

## 9. Customer Journey

```
1. OPEN APP
   └─▶ Splash → check location permission → onboarding if first run

2. SET LOCATION
   └─▶ GPS detect OR search area OR pick saved address
   └─▶ Reverse geocode → display city/area label

3. DISCOVER
   └─▶ Nearby restaurants (cards: image, name, cuisine, rating, ETA, distance, open/closed)
   └─▶ Filters: veg, cuisine, offers, sort (distance, rating, delivery time)

4. SEARCH (optional)
   └─▶ Autocomplete → results enriched with discovery eligibility

5. SELECT RESTAURANT
   └─▶ BranchAssignment (silent) → show menu for nearest serviceable branch
   └─▶ If unserviceable: message + suggest pickup or different address

6. BROWSE MENU
   └─▶ Categories, item detail, modifiers, add to cart

7. CART
   └─▶ Single-restaurant cart enforced
   └─▶ Coupon apply via BhojanOS API

8. CHECKOUT
   └─▶ Confirm address → delivery fee calculated server-side
   └─▶ Payment: Razorpay / COD per tenant config
   └─▶ Place order

9. TRACK
   └─▶ Real-time status via polling or websocket (BhojanOS)
   └─▶ Push notification on status change

10. REORDER
    └─▶ From order history → pre-fill cart (menu availability revalidated)
```

---

## 10. Discovery Engine

### 10.1 Pipeline (consumes BhojanOS M3)

```
CustomerCanonicalLocation
        │
        ▼
DiscoveryFacade.discoverNearby(query)
        │
        ▼
BhojanOS GET /api/v1/marketplace/discover
        │
        ├── Repository: active tenants (status=active, approved)
        ├── Eligibility: delivery radius, store open, sandbox exclusion
        ├── Ranking: distance, rating, ETA, open-now boost
        └── Branch pre-filter: one candidate per tenant (nearest branch)
        │
        ▼
RestaurantCard[] → Presentation
```

### 10.2 Eligibility Gates (server-side)

| Gate | Source |
|------|--------|
| Tenant approved | `tenant.status === 'active'` |
| Store live | `storeStatus` / `storeOperations.isStoreOpen` |
| In delivery radius | `deliveryConfig.maxRadius` vs customer distance |
| Not suspended | Super admin flags |
| Geo index present | `location.lat/lng` or branch geo index |

### 10.3 Caching Strategy

| Data | TTL | Invalidation |
|------|-----|--------------|
| Discovery results | 60s in-memory | Location change > 200m |
| Restaurant detail | 5 min | Pull-to-refresh |
| Open/closed status | 60s | Timer + foreground refresh |

---

## 11. Branch Routing

### 11.1 Assignment Flow

```
Input:  tenantId, customerPoint, orderType (delivery | pickup)
        │
        ▼
POST /api/v1/branches/assign
        │
        ▼
BranchAssignmentEngine (BhojanOS M5)
  1. List branches for tenant
  2. Filter by serviceability (radius, store open)
  3. Score: distance ASC → prep time → load (future)
  4. Return winning branchId + distanceKm + etaMins
        │
        ▼
Store in DiscoverySession.resolvedBranchByTenant[tenantId]
        │
        ▼
All subsequent menu/pricing/checkout calls include branchId
```

### 11.2 Re-assignment Triggers

| Event | Action |
|-------|--------|
| Customer moves > 500m during session | Re-run assignment before checkout |
| Address changed at checkout | Re-run assignment + repricing |
| Selected branch closes | Fallback to next branch or block with message |
| Customer explicit branch override (future) | Owner-configurable; hidden by default |

### 11.3 UI Rule

**Never display branch name** in default UX. Optional "Delivering from [area]" subtitle only if product requires transparency.

---

## 12. State Management Strategy

| State type | Mechanism | Scope |
|------------|-----------|-------|
| Server data (menu, discovery) | TanStack Query (React Query) | Stale-while-revalidate, retry |
| Auth session | Firebase Auth + React Context | Global |
| Location session | Zustand or Context + sessionStorage | Global |
| Cart | Zustand + localStorage persist | Per-tab; single tenant |
| Branch resolution | Query cache keyed by `tenantId+location` | Session |
| UI ephemeral | Component state | Local |
| Feature flags | Context + remote config | Global |

**No Redux.** Feature modules expose hooks (`useDiscovery`, `useCart`) backed by Query + facades.

**Optimistic updates:** Cart quantity only. Pricing and order placement always await server confirmation.

---

## 13. Error Handling

### 13.1 Error Taxonomy

| Class | User message | Recovery |
|-------|--------------|----------|
| `NETWORK_OFFLINE` | "You're offline" | Queue actions, retry banner |
| `LOCATION_DENIED` | "Enable location or enter area" | Manual city search |
| `UNSERVICEABLE` | "Doesn't deliver to your address" | Change address / pickup |
| `RESTAURANT_CLOSED` | "Currently closed" | Show hours, notify me (future) |
| `MENU_STALE` | "Item unavailable" | Refresh menu, remove line |
| `PRICE_CHANGED` | "Price updated" | Show diff, confirm |
| `PAYMENT_FAILED` | "Payment failed" | Retry payment |
| `AUTH_REQUIRED` | "Sign in to continue" | Auth modal |
| `SERVER_ERROR` | "Something went wrong" | Retry + incident ID |

### 13.2 Implementation

- Feature-level `ErrorBoundary` per route segment
- Global `AppErrorBoundary` with fallback UI
- `BhojanOSApiError` mapper in infrastructure layer
- Toast for transient; inline for form validation; full-page for blocking

---

## 14. Loading Strategy

| Surface | Pattern |
|---------|---------|
| Discovery home | Skeleton cards (6 placeholders) |
| Restaurant hero | Image blur placeholder + skeleton text |
| Menu | Category tabs skeleton + item rows |
| Checkout bill | Suppress totals until pricing API returns |
| Order tracking | Timeline skeleton + polling indicator |

**Rules:**

- No layout shift: reserve card dimensions
- Progressive image loading: `loading="lazy"`, WebP, srcset
- Route-level `React.lazy` + `Suspense` with skeleton fallback
- Minimum skeleton display 300ms to avoid flash

---

## 15. Telemetry Strategy

### 15.1 Events (OrderBhojan Firebase Analytics + optional BhojanOS forward)

| Event | Properties |
|-------|------------|
| `app_open` | platform, version |
| `location_set` | source, accuracy_bucket |
| `discovery_view` | result_count, radius_km |
| `restaurant_click` | tenant_id, position, distance_km |
| `menu_view` | tenant_id, branch_id |
| `add_to_cart` | item_id, price |
| `checkout_start` | tenant_id, cart_value |
| `order_placed` | order_id, tenant_id, payment_method |
| `search_query` | query_length, result_count |

### 15.2 Observability

| Signal | Tool |
|--------|------|
| Frontend errors | Sentry (or equivalent) |
| API latency | Custom RUM spans on BhojanOS client |
| Core Web Vitals | Vercel Analytics |
| API health | BhojanOS `/api/health` (existing) |

**Correlation:** Generate `correlationId` per user session; pass to all BhojanOS API calls via `X-Correlation-Id`.

---

## 16. Feature Flag Strategy

OrderBhojan flags are **independent** from BhojanOS projection flags. Stored in remote config (Firebase Remote Config or env manifest).

| Flag | Default | Purpose |
|------|---------|---------|
| `FF_OB_DISCOVERY_ENABLED` | OFF | Marketplace home |
| `FF_OB_SEARCH_ENABLED` | OFF | Search feature |
| `FF_OB_BRANCH_AUTO_ASSIGN` | OFF | M5 branch routing |
| `FF_OB_GOOGLE_MAPS` | OFF | Google Maps provider (future) |
| `FF_OB_APPLE_AUTH` | OFF | Sign in with Apple |
| `FF_OB_OFFLINE_CART` | OFF | Persist cart offline |
| `FF_OB_DRIVER_MAP` | OFF | Live driver tracking map |

**Rule:** BhojanOS backend flags gate server capabilities; OrderBhojan flags gate UI exposure. Both must be ON for feature to work.

---

## 17. Testing Strategy

| Layer | Tool | Coverage target |
|-------|------|-----------------|
| Unit | Node test runner | Facades, mappers, validators |
| Component | Testing Library | Critical UI states |
| Contract | MSW + OpenAPI fixtures | BhojanOS API shapes |
| Integration | Playwright | Auth, discovery, checkout happy path |
| Accessibility | axe-core in CI | WCAG 2.1 AA critical paths |
| Performance | Lighthouse CI | LCP < 2.5s on 4G |

**Mandatory regression suites per milestone** (mirrors BhojanOS gate pattern):

- Discovery eligibility matrix
- Branch assignment scenarios
- Pricing parity (server quote vs UI display)
- Guest vs authenticated checkout
- Location denied fallback

---

## 18. Security Model

| Concern | Control |
|---------|---------|
| Auth | Firebase Auth; ID token on BhojanOS API |
| Guest orders | Existing guest token pattern (GA-2) |
| Firestore rules | Customer can read/write **own** `customers/{uid}` only |
| API authorization | BhojanOS validates token + tenant access |
| No catalog writes | OrderBhojan client has no write path to tenant data |
| Secrets | Env vars on Vercel; no keys in client except public Firebase config |
| CSP | Strict script-src; no inline |
| PII | Phone masked in logs; telemetry excludes raw address |

**Threat model focus:** Token theft, guest order enumeration, cross-tenant data leak via branchId manipulation → all mitigated server-side in BhojanOS.

---

## 19. Deployment Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  GitHub         │────▶│  Vercel         │────▶│  orderbhojan.com│
│  orderbhojan    │     │  Preview + Prod │     │  PWA + CDN      │
└─────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  Firebase       │     │  BhojanOS       │
│  orderbhojan    │     │  Render API     │
│  Auth + FS      │     │  (unchanged)    │
└─────────────────┘     └─────────────────┘

Environments:
  dev       → localhost + BhojanOS staging API (future)
  preview   → Vercel preview + bhojanos staging
  production→ orderbhojan.com + bhojanos-prod API
```

| Artifact | Host |
|----------|------|
| Frontend | Vercel |
| Customer Firestore + Auth | Firebase `orderbhojan` |
| Restaurant data + orders | BhojanOS (unchanged) |
| DNS | `orderbhojan.com`, `www.orderbhojan.com` |

**CI gates (per milestone):** lint → build → unit → contract → e2e smoke → ARB gate script.

---

## 20. Milestone Plan

See [MILESTONES-M0-M12.md](./MILESTONES-M0-M12.md) for full objectives, acceptance criteria, exit criteria, ARB gates, and rollback strategies.

### Summary

| Milestone | Focus |
|-----------|-------|
| **M0** | Foundation — repo, CI, API client shell, design system, flags |
| **M1** | Authentication — Google, Phone, Guest |
| **M2** | Location Platform — GPS, geocode, session |
| **M3** | Discovery Engine — nearby restaurants |
| **M4** | Restaurant Experience — detail, branch resolve |
| **M5** | Menu Platform — browse, modifiers, filters |
| **M6** | Cart Platform — session, single-tenant guard |
| **M7** | Checkout Platform — server-authoritative billing |
| **M8** | Payments — Razorpay, COD |
| **M9** | Order Tracking — status, guest track |
| **M10** | Customer Experience — favorites, history, profile |
| **M11** | Notifications — FCM, inbox |
| **M12** | Production Readiness — soak, certification, launch |

---

## ARB Decision Request (M0)

| Criterion | Status |
|-----------|--------|
| BhojanOS boundary respected | ✅ |
| No restaurant data duplication | ✅ |
| Feature-first modularity | ✅ |
| Branch routing designed | ✅ |
| Auto-discovery on approval | ✅ |
| Milestone governance defined | ✅ |
| Implementation blocked | ✅ |

**Requested action:** Approve M0 architecture to begin implementation.

---

## Related BhojanOS References

- `docs/m2/BRANCH-DISCOVERY-FLOW.md`
- `docs/m3/DISCOVERY-PIPELINE-CONTRACT.md`
- `docs/m4/v1.0/SEARCH-PIPELINE-CONTRACT-v1.md`
- `docs/m5/MULTI-BRANCH-INTELLIGENCE-PLATFORM.md`
- `docs/ga-3/billing-hotfix-report.md` (checkout SSOT pattern)

---

**Document status:** Draft for ARB v1.0 review · No implementation authorized
