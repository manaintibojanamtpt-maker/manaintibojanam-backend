# OrderBhojan — Milestone Plan M0–M12

**Governance:** Mirrors BhojanOS milestone discipline  
**Policy:** No milestone N+1 starts until milestone N exit criteria met and ARB signed  
**BhojanOS:** Consumed via API only — no modifications unless explicit backend exposure PR approved separately

---

## Milestone Overview

| ID | Name | Depends on | Produces |
|----|------|------------|----------|
| M0 | Marketplace Foundation | — | Repo, CI, API shell, design system |
| M1 | Authentication | M0 | Google, Phone, Guest |
| M2 | Location Platform | M0 | GPS, geocode, session |
| M3 | Discovery Engine | M1, M2 | Nearby restaurants |
| M4 | Restaurant Experience | M3 | Detail, branch resolve |
| M5 | Menu Platform | M4 | Browse, modifiers |
| M6 | Cart Platform | M5 | Cart session |
| M7 | Checkout Platform | M6 | Server billing |
| M8 | Payments | M7 | Razorpay, COD |
| M9 | Order Tracking | M8 | Status, guest track |
| M10 | Customer Experience | M1 | Favorites, history, profile |
| M11 | Notifications | M9 | FCM push |
| M12 | Production Readiness | M9–M11 | Launch certification |

---

## M0 — Marketplace Foundation

### Objectives

- Greenfield `orderbhojan` repository with feature-first structure
- CI/CD pipeline (Vercel preview + production)
- Firebase project `orderbhojan` provisioned (Auth + Firestore rules skeleton)
- BhojanOS API client infrastructure with typed contracts (mock-first)
- Design system v1 (tokens, typography, components, skeletons)
- Feature flag framework
- Telemetry + error boundary baseline
- OpenAPI mock server for parallel frontend development

### Architecture

- Implement folder structure per ARCHITECTURE-v1.0.md §2
- `infrastructure/bhojanos-api/` with interceptors, retry, correlation ID
- No feature UI beyond shell + health check page
- Document ADR-OB-001: OrderBhojan boundary (presentation + orchestration)

### Acceptance Criteria

- [ ] Repo builds on Vercel with zero errors
- [ ] `npm run gate:ob0` passes (lint, build, unit smoke)
- [ ] Firebase Auth + Firestore connected (dev project)
- [ ] Mock API serves Discovery/Menu/Quote fixtures
- [ ] Error boundary renders fallback on forced error
- [ ] PWA manifest + service worker registered (empty precache OK)

### Exit Criteria

- ARB signs M0 architecture document
- CI green on `main`
- BhojanOS backend team acknowledges API contract draft

### ARB Approval Gate

| Reviewer | Sign-off |
|----------|----------|
| Principal Architect | ☐ |
| Firebase Architect | ☐ |
| UX Lead | ☐ |
| Security | ☐ |

### Rollback Strategy

- Revert repo creation; no production impact (greenfield)
- Delete Firebase project if abandoned

---

## M1 — Authentication

### Objectives

- Google Sign-In
- Phone OTP (Firebase)
- Guest mode (browse + checkout path prepared)
- Customer document upsert on auth
- Bearer token injection on BhojanOS API client

### Architecture

- `features/auth/` module
- Firebase Auth providers; no custom auth server
- `customers/{uid}` created on first sign-in
- Auth guard HOC for protected routes

### Acceptance Criteria

- [ ] Google login completes; customer doc created
- [ ] Phone OTP login completes
- [ ] Guest can browse discovery without auth
- [ ] ID token attached to API client
- [ ] Sign-out clears session + cart (configurable)
- [ ] Unit tests: auth state machine, token refresh

### Exit Criteria

- Auth flows pass manual QA matrix
- Firestore rules deployed for `customers/{uid}`
- No BhojanOS changes required for M1

### ARB Gate

Verify: no restaurant data in orderbhojan Firestore

### Rollback

- Disable auth providers in Firebase console
- Flag `FF_OB_AUTH_ENABLED=false`

---

## M2 — Location Platform

### Objectives

- Browser GPS detection with permission UX
- Reverse geocoding (Nominatim initially — BhojanOS M2 parity)
- Manual area search (city/locality)
- Location session persistence
- Saved address CRUD (OrderBhojan Firestore)
- Distance display utilities

### Architecture

- `features/location/` + `features/onboarding/`
- Provider abstraction: `LocationProvider` port (Nominatim default; Google Maps behind `FF_OB_GOOGLE_MAPS`)
- `CustomerCanonicalLocation` aligned with BhojanOS M2 types (mapping layer)
- No direct Firestore geo index reads

### Acceptance Criteria

- [ ] GPS → formatted address label
- [ ] Permission denied → manual city picker fallback
- [ ] Location persists across refresh (sessionStorage + FS lastKnown)
- [ ] Address saved to `customers/{uid}/addresses`
- [ ] Haversine distance matches BhojanOS ±1%

### Exit Criteria

- Location E2E passes on mobile + desktop
- Accessibility: location prompts have text alternatives

### Rollback

- Flag `FF_OB_LOCATION_GPS=false`; manual-only mode

---

## M3 — Discovery Engine

### Objectives

- Marketplace home with nearby restaurants
- Filters: veg, cuisine, open now, offers
- Sort: distance, rating, ETA
- Skeleton loading + empty states
- Pull-to-refresh

### Architecture

- `features/discovery/` facade → `GET /api/v1/marketplace/discover`
- Requires M2 location OR manual coordinates
- Cards map `RestaurantCard` → presentation view model
- Session cache via React Query

### Acceptance Criteria

- [ ] Active BhojanOS tenants appear automatically (no publish step)
- [ ] Suspended tenants excluded
- [ ] Filters reduce result set correctly
- [ ] Empty state when no restaurants in radius
- [ ] Offline shows cached results + banner

### Exit Criteria

- Discovery contract tests pass against mock + staging API
- Performance: LCP < 2.5s on 4G with skeleton

### Rollback

- `FF_OB_DISCOVERY_ENABLED=false` → static "Coming soon"

### BhojanOS Dependency

**Requires:** Marketplace discover endpoint on Render (M0 backend PR)

---

## M4 — Restaurant Experience

### Objectives

- Restaurant detail page
- Silent branch assignment on entry
- Open/closed, hours, offers display
- Unserviceable messaging
- Favorite toggle

### Architecture

- `features/restaurant/` + branch assign API
- `POST /api/v1/branches/assign` on detail load
- Store `branchId` in session for menu/checkout
- One card per tenant enforced at discovery; detail confirms branch

### Acceptance Criteria

- [ ] Multi-branch tenant shows single discovery card
- [ ] Nearest serviceable branch selected
- [ ] Out-of-radius shows clear message + pickup option if enabled
- [ ] Favorite persists in OrderBhojan Firestore
- [ ] Deep link `/restaurant/:slug` works without discovery home

### Exit Criteria

- Branch assignment test matrix (5+ scenarios) passes
- UX review: no branch name in default UI

### Rollback

- Fallback to tenant-level location (branchId = tenantId) behind flag

### BhojanOS Dependency

**Requires:** Branch assign endpoint (M5 adapter exposure)

---

## M5 — Menu Platform

### Objectives

- Category navigation
- Item list with veg/non-veg indicators
- Item detail + modifiers
- Search within menu (optional)
- Unavailable item handling

### Architecture

- `features/menu/` → `GET /api/v1/menu?tenantId&branchId`
- Modifier validation client-side for UX; server validates on quote
- Image lazy loading + placeholders

### Acceptance Criteria

- [ ] Menu loads for assigned branchId only
- [ ] Modifier rules enforced before add-to-cart
- [ ] Stale menu refresh on 409/conflict
- [ ] Veg filter toggles item visibility

### Exit Criteria

- Menu facade unit tests + contract tests pass
- No direct Firestore menu reads in network tab

### Rollback

- Hide menu; link out to legacy `/k/{slug}` storefront (interim)

---

## M6 — Cart Platform

### Objectives

- Add/remove/update line items
- Single-restaurant cart enforcement
- Modifier + special instructions per line
- Cart persistence (localStorage)
- Coupon code field (validation deferred to checkout)

### Architecture

- `features/cart/` with Zustand store
- Switching restaurant clears cart with confirmation modal
- Cart does not compute totals — display "Calculated at checkout"

### Acceptance Criteria

- [ ] Cannot mix items from two tenants
- [ ] Cart survives refresh
- [ ] Quantity bounds enforced
- [ ] Empty cart state

### Exit Criteria

- Cart state machine tests pass

### Rollback

- Disable add-to-cart; view-only menu

---

## M7 — Checkout Platform

### Objectives

- Address selection / new address
- Delivery vs pickup
- **Server-authoritative pricing** (GA-3 SSOT pattern)
- Time slot selection
- Order placement (authenticated + guest)
- Bill summary with dynamic labels

### Architecture

- `features/checkout/` → quote + prepare + place APIs
- Never compute GST/delivery/packaging client-side
- Delivery fee pending until coordinates valid
- `branchId` on all checkout calls

### Acceptance Criteria

- [ ] Quote matches owner storefront config
- [ ] No delivery charge without address
- [ ] Guest checkout with phone
- [ ] Order created in BhojanOS Firestore
- [ ] Pricing regression suite passes

### Exit Criteria

- Parity tests vs BhojanOS owner settings (5 scenarios)
- Security review on guest order path

### Rollback

- Redirect checkout to legacy `/k/{slug}/checkout`

### BhojanOS Dependency

**Requires:** `POST /api/v1/pricing/quote` endpoint

---

## M8 — Payments

### Objectives

- Razorpay online payment
- COD when tenant enables
- Payment failure recovery
- Order confirmation screen

### Architecture

- Reuse BhojanOS PaymentFactory patterns via API
- Razorpay script lazy load
- Draft order → payment → confirm pipeline

### Acceptance Criteria

- [ ] Razorpay success path completes
- [ ] COD order placed without payment gateway
- [ ] Payment failure shows retry
- [ ] Tenant payment config respected

### Exit Criteria

- Payment sandbox E2E passes
- No PCI data touches OrderBhojan Firestore

### Rollback

- COD-only mode flag

---

## M9 — Order Tracking

### Objectives

- Order confirmation page
- Live status timeline
- Guest tracking via phone/token (GA-2 parity)
- ETA display
- Reorder shortcut

### Architecture

- `features/tracking/` → polling + future SSE
- Public `/orders/:orderId/track` route
- Map view behind `FF_OB_DRIVER_MAP` (future)

### Acceptance Criteria

- [ ] Status updates reflect BhojanOS order state
- [ ] Guest can track without login
- [ ] Timeline ordered correctly
- [ ] Polling backoff implemented

### Exit Criteria

- Tracking E2E with test order
- Guest token security validated

### Rollback

- Static status only (no polling)

---

## M10 — Customer Experience

### Objectives

- Order history list
- Profile edit
- Address book management
- Favorites list
- Recent orders carousel on home

### Architecture

- `features/profile/`, `features/favorites/`, `features/orders/`
- Orders from BhojanOS API only
- Favorites from OrderBhojan Firestore

### Acceptance Criteria

- [ ] Order history for authenticated user
- [ ] Profile updates sync
- [ ] Reorder validates menu availability
- [ ] Favorites add/remove

### Exit Criteria

- Profile E2E passes
- GDPR: account deletion path documented

### Rollback

- Hide profile; orders via SMS links only

---

## M11 — Notifications

### Objectives

- FCM web push registration
- Order status push notifications
- In-app notification inbox (optional)
- Permission UX

### Architecture

- Cloud Function (orderbhojan): BhojanOS webhook → FCM fanout
- `deviceTokens` collection
- Notification deep links to tracking

### Acceptance Criteria

- [ ] Push received on status change (test env)
- [ ] Token refresh handled
- [ ] Opt-out respected

### Exit Criteria

- Push delivery rate > 95% in staging soak

### Rollback

- Disable Cloud Function; in-app polling only

### BhojanOS Dependency

**Requires:** Order status webhook or callable trigger (minimal backend addition)

---

## M12 — Production Readiness

### Objectives

- Production Firebase + Vercel config
- Security audit + penetration test checklist
- Performance soak (100 concurrent discovery)
- Accessibility audit WCAG 2.1 AA
- Runbooks + rollback scripts
- Launch certification document
- Tag `orderbhojan-v1.0.0`

### Architecture

- `gate:ob12` script mirroring `gate:ga2`
- Observability dashboards
- Feature flag production manifest (all OFF except core)
- DNS: orderbhojan.com

### Acceptance Criteria

- [ ] All M0–M11 exit criteria met
- [ ] `gate:ob12` PASS
- [ ] Lighthouse performance ≥ 90
- [ ] Zero P0 security findings
- [ ] Rollback tested on staging
- [ ] On-call runbook published

### Exit Criteria

- ARB production launch sign-off
- First restaurant visible in discovery on prod

### ARB Gate

Full platform review — same rigor as BhojanOS GA-1

### Rollback Strategy

```
git revert <release-commit>
git push origin main
→ Vercel redeploy previous
→ Firebase rules revert if changed
→ Feature flags all OFF
→ Fallback: customers use /k/{slug} legacy storefronts
```

No database rollback — OrderBhojan FS is customer-only; BhojanOS unaffected.

---

## Cross-Milestone Quality Gates

Every milestone PR must pass:

```
npm run lint
npm run build
npm run test:unit
npm run test:contract   (from M0)
npm run gate:ob{N}       (milestone-specific)
```

---

## Location Engine — Cross-Cutting Design (M2 + M3 + M4)

| Capability | Provider (default) | Future | Owner |
|------------|-------------------|--------|-------|
| GPS | Browser Geolocation API | Capacitor native | M2 |
| Forward geocode | Nominatim | Google Maps (`FF_OB_GOOGLE_MAPS`) | M2 |
| Reverse geocode | Nominatim | Google Maps | M2 |
| Distance | Haversine × 1.2 road factor | OSRM routing | M2/M4 |
| Delivery radius | BhojanOS API | — | M4 |
| Nearest branch | BhojanOS Branch API | — | M4 |
| ETA | prepTime + distance heuristic | ML / traffic | M4/M9 |
| Search radius | Query param 5–25 km | Dynamic | M3 |
| Driver tracking | — | Map + websocket | M9/M11 |

---

## Freeze Policy

After M12 certification:

- OrderBhojan v1.0 API client contracts frozen
- Breaking UI changes require ADR
- BhojanOS SDK/projection platforms remain frozen and OFF

---

**Status:** ARCHIVED planning draft. M0 was implemented — see `orderbhojan/docs/` and [docs/PROGRAM-STATUS.md](../../PROGRAM-STATUS.md). New OrderBhojan milestones frozen during Founder Beta ([.agents/AGENTS.md](../../.agents/AGENTS.md)).
