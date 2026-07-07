# BhojanOS Production Stability & Architecture Audit Report

**Phase 0 — Repository Audit (read-only)**  
**Date:** 2026-07-07  
**Repository:** `manaintibojanamtpt-maker/manaintibojanam-backend`  
**Production topology**

| Layer | Host | Notes |
|-------|------|-------|
| Frontend | Vercel → `www.bhojanos.com` | Vite + React PWA |
| API | Render → `manaintibojanam-backend.onrender.com` | Express (`server.ts` → `dist/server.cjs`) |
| Database | Firebase Firestore `bhojanos-prod` | Rules in `firestore.rules` |
| Last known API build | `c297901` | Per `/api/health` after Render build fix |

**Audit rule:** Every claim below was verified against the current codebase. Findings are categorized as:

- ✅ **Confirmed** — verified in code; action warranted
- ⚠️ **Partially Confirmed** — real issue, but overstated or already partially mitigated
- ❌ **Not Applicable** — audit claim does not match codebase reality
- 💡 **Better Architectural Alternative** — different or incremental approach recommended

**No code was changed to produce this report.**

---

## Executive Summary

BhojanOS is a mature monorepo with a large SDK surface (`src/sdk/**`, ~750 files), a production Express API (`server.ts`, ~5.6k lines), and a dual-path data layer: owner flows are largely API-first, while customer/admin flows still hit Firestore directly from UI/services.

The production instability symptoms reported in console (`[SW] v42-mobile-pwa-auto-update`, DevTools metrics injection) are **mostly benign or external**. The deeper production risk is **fragmented observability** and **duplicated owner polling**, which inflate API/Firestore load and leave AutoPilot blind to real incidents.

### Top 5 verified risks (priority order)

1. **AutoPilot reads collections that are never written** — incidents land in `system_incidents`; AutoPilot counts `system_errors`, `api_errors`, etc. as separate top-level collections (always ~0).
2. **Owner order polling is triplicated** — `OrderAlertContext`, `OwnerDashboard`, and `OwnerOrders` each poll `/api/owner/orders` every 5s when mounted together.
3. **Menu/inventory polling is duplicated** — `useOwnerMenuCount` (8s) runs in both `OwnerLayout` and `OwnerDashboard`; dashboard also polls menu for low-stock alerts (8s).
4. **System Health dashboard is mostly mock data** — `useMockSystemHealth()` drives KPI cards; only `client_errors` is read live.
5. **PWA auto-reload on mobile** — installed/mobile PWAs auto-apply SW updates after 1.2s, risking mid-checkout/form data loss.

### What is working well

- Owner pages (`src/pages/owner/**`) do **not** import `firebase/firestore` directly — API migration is real.
- Server-side **tenant domain event bus** exists (`backend-lib/marketplace/tenantDomainEventBus.ts`).
- **Recipe Intelligence** backend + owner UI are implemented (ingredients, recipes, cost, forecast APIs).
- Server has **rate limiting**, **Firestore quota backoff**, and **cron workers** (outbox, expire payments, founder alerts).
- Test coverage is substantial (~179 test files) though monitoring/load paths are under-tested.

---

## Audit Methodology

1. Static search across `src/`, `backend-lib/`, `server.ts`, `public/`, `orderbhojan/`
2. Traced write paths vs read paths for monitoring collections
3. Mapped all `setInterval` / polling sources in owner and customer surfaces
4. Grepped Firestore imports in pages vs hooks vs SDK vs services
5. Reviewed service worker registration (`src/sw.ts`, `PwaUpdatePrompt.tsx`, `public/firebase-messaging-sw.js`)
6. Cross-checked prior conversation claims against current files (not assumed correct)

---

## Repository Landscape

```
BhojanOS (root)
├── src/                    # Main Vite React app (customer + owner + admin)
│   ├── pages/              # Route-level UI
│   ├── components/         # Shared + owner + marketing
│   ├── context/            # Auth, Tenant, Cart, OrderAlert, FeatureFlags
│   ├── hooks/              # Presentation hooks
│   ├── lib/                # API clients, facades, monitoring
│   ├── sdk/                # Large SDK layer (orders, menu, pricing, events…)
│   ├── services/           # Legacy services (some direct Firestore)
│   └── modules/            # notifications module
├── backend-lib/            # Server-shared marketplace logic
├── server.ts               # Production API monolith
├── orderbhojan/            # Separate marketplace experiment + e2e harness
└── packages/marketplace-contracts/
```

**Deployment:** `render.yaml` builds `npm run build` (web + legacy esbuild server path in package.json; production uses `build:server` via `scripts/build-server.mjs` after `c297901` fix).

---

## Findings Matrix

| # | Finding | Category | Severity | Primary files |
|---|---------|----------|----------|---------------|
| 1 | AutoPilot queries wrong Firestore collections | ✅ Confirmed | **Critical** | `server.ts:5091–5095`, `writeSystemIncident:115–128` |
| 2 | `/api/client-errors` is log-only (Winston) | ✅ Confirmed | High | `server.ts:1322–1326` |
| 3 | Parallel incident stores (`system_incidents`, `client_errors`, Winston, Render logs) | ✅ Confirmed | High | `server.ts`, `TelemetryService.ts`, `monitoring.ts` |
| 4 | SystemHealth uses mock KPIs | ✅ Confirmed | High | `src/pages/SystemHealth.tsx:87–215` |
| 5 | Triplicate owner orders polling (5s) | ✅ Confirmed | High | `OrderAlertContext`, `OwnerDashboard`, `OwnerOrders` |
| 6 | Duplicate menu count polling (8s) | ✅ Confirmed | Medium | `useOwnerMenuCount` in `OwnerLayout` + `OwnerDashboard` |
| 7 | Duplicate menu fetch for inventory alerts (8s) | ✅ Confirmed | Medium | `OwnerDashboard.tsx:223–254` |
| 8 | TenantContext fabricates tenant on Firestore error | ✅ Confirmed | High | `TenantContext.tsx:257–269` |
| 9 | PWA auto-reload on mobile/installed | ✅ Confirmed | High | `PwaUpdatePrompt.tsx:92–104`, `pwaUpdateUtils.ts:11–14` |
| 10 | Triple global error handlers | ⚠️ Partially Confirmed | Medium | `appBootstrap.tsx:19–25`, `monitoring.ts:131–147`, `App.tsx:338+` |
| 11 | Free-tier telemetry default in prod | ✅ Confirmed | Medium | `platformTier.ts:12–13` |
| 12 | `subscribeToGuestOrders` missing `onError` | ✅ Confirmed | Medium | `services/api.ts:677–694` |
| 13 | Dual service worker files | ⚠️ Partially Confirmed | Low | `src/sw.ts`, `public/firebase-messaging-sw.js` |
| 14 | UI → Firestore violations (customer/admin) | ✅ Confirmed | Medium | `AdminPanel.tsx`, `Checkout.tsx`, `Menu.tsx`, etc. |
| 15 | Owner portal API-first architecture | ✅ Confirmed (positive) | — | No Firestore in `src/pages/owner/**` |
| 16 | SDK exists but owner uses `lib/*` APIs | ⚠️ Partially Confirmed | Medium | `ownerOrdersApi.ts`, `ownerRecipesApi.ts` vs `src/sdk/` |
| 17 | Server tenant domain event bus exists | ✅ Confirmed (positive) | — | `tenantDomainEventBus.ts` |
| 18 | No unified `Incident` / `HealthSnapshot` schema | ✅ Confirmed | High | Phase 1 gap |
| 19 | `__chromium_devtools_metrics_reporter` console error | ❌ Not Applicable | None | Chrome DevTools injection |
| 20 | `[SW] v42-mobile-pwa-auto-update` log | ❌ Not Applicable | None | Expected `src/sw.ts:9` |
| 21 | Recipe Intelligence empty/placeholder | ⚠️ Partially Confirmed | Low | Implemented; `ForecastPanel` PO is `window.alert` stub |
| 22 | Owner infinite spinner | ⚠️ Partially Confirmed | Medium | Mitigated via timeouts; tenant/auth failures remain |
| 23 | Incident system "misses everything" | ⚠️ Partially Confirmed | High | Writes work; reads/autopilot/dashboard wrong |
| 24 | No Sentry/Datadog | ✅ Confirmed | Info | No matches in repo |
| 25 | Background jobs | ⚠️ Partially Confirmed | Medium | Crons exist; heavy forecast/cost still inline in API |
| 26 | Firestore quota protection | ⚠️ Partially Confirmed | Medium | Server backoff exists; no client circuit breaker |
| 27 | API gateway middleware | ⚠️ Partially Confirmed | Medium | Rate limit + auth exist; not unified pipeline |
| 28 | `orderbhojan/` duplicate app | 💡 Better Alternative | Info | Keep as harness; don't merge monitoring |

---

## Detailed Findings by Domain

### 1. Monitoring & Observability

#### ✅ AutoPilot collection mismatch (Critical)

**Write path:** Client `logIncident()` → `POST /api/monitoring/log` → `writeSystemIncident()` → **`system_incidents`** with `type` field (e.g. `system_errors`, `api_errors`).

```115:128:server.ts
const writeSystemIncident = async (type: string, status: string, payload: any, correlationId?: string) => {
  // ...
  await _db.collection("system_incidents").doc(randomUUID()).set({
    type,
    status,
    payload,
    // ...
  });
};
```

**Read path (AutoPilot):** Counts **top-level collections** named `system_errors`, `api_errors`, `firestore_errors`, etc.

```5091:5095:server.ts
const crashes = await firestoreCountSince("system_errors", "serverTimestamp", oneHourAgo);
const firestore = await firestoreCountSince("firestore_errors", "serverTimestamp", oneHourAgo);
const apiErrs = await firestoreCountSince("api_errors", "serverTimestamp", oneHourAgo);
```

**Grep result:** No `.collection("system_errors")` writes exist anywhere. AutoPilot health score is computed from empty collections.

**Impact:** Founder alerts under-report crashes/API errors; health score stays artificially high; audit claim "incidents not caught" is **partially** explained by this bug.

#### ✅ `/api/client-errors` not persisted

```1322:1326:server.ts
app.post("/api/client-errors", (req: any, res) => {
  const { error, info } = req.body;
  logger.error({ message: "Client React Error", error, info, correlationId: req.correlationId });
  res.json({ status: "logged" });
});
```

Errors only reach Render logs. `orderbhojan` also posts here via `clientErrorSink.ts`. No deduplication, rate limit, or Firestore write.

#### ✅ Fragmented client telemetry

| Sink | Collection / target | When active |
|------|---------------------|-------------|
| `monitoring.ts` → `/api/monitoring/log` | `system_incidents` (+ mirror to `client_errors` for some types) | Always (basic errors) |
| `TelemetryService.logCritical` | `client_errors` direct Firestore write | `VITE_PLATFORM_TIER=standard` only |
| `appBootstrap.tsx` window handlers | `TelemetryService.logError` (console + buffer) | Always |
| `App.tsx` | `TelemetryService.initializeGlobalHandlers` + toast UX | Always |
| `/api/client-errors` | Winston / Render logs | When called |

**⚠️ Triple error handlers:** `appBootstrap.tsx`, `monitoring.ts`, and `TelemetryService.initializeGlobalHandlers()` in `App.tsx` all register `error` / `unhandledrejection` listeners. Not all duplicate Firestore writes (free tier gates some), but causes duplicate network attempts and noisy logs.

#### ✅ SystemHealth mock KPIs

`useMockSystemHealth()` returns hardcoded incidents, reconciliations, outbox, and summary metrics. Live data is fetched only for `client_errors` (lines 224–248). Dashboard cannot reflect production state.

#### 💡 Unified incident platform (Phase 1 target)

Proposed collections (`HealthSnapshot`, `Incident`, `IncidentEvent`, `Alert`, `Deployment`, `Heartbeat`, `Metric`) **do not exist today**. Closest existing artifacts:

- `system_incidents` — unstructured incidents
- `client_errors` — client-side errors
- `platform_health_reports` — AutoPilot output
- `cron_health` — cron run records
- `alert_delivery_logs` — email alert delivery
- `tenant_domain_events` — domain events (not incidents)

**Recommendation:** Evolve `system_incidents` → unified `Incident` schema with zero-downtime dual-write migration rather than creating wholly parallel collections.

---

### 2. Owner Portal — Polling & Realtime

#### Owner polling inventory (verified)

| Source | Interval | Endpoint / data | Mounted when |
|--------|----------|-----------------|--------------|
| `OrderAlertContext` | 5s | `GET /api/owner/orders` (limit 100) | All owner routes (`OwnerLayout`) |
| `OwnerDashboard` `subscribeOwnerOrders` | 5s | Same API (limit 200) | Dashboard only |
| `OwnerOrders` page | 5s | Same via `subscribeOwnerOrders` | Orders page |
| `OwnerCustomers` | 5s | Same via `subscribeOwnerOrders` | Customers page |
| `useTenantStoreStatus` (owner) | 5s | `GET /api/owner/storefront` | Store status widgets |
| `useOwnerMenuCount` | 8s | `GET /api/owner/menu/items` | `OwnerLayout` **and** `OwnerDashboard` |
| `OwnerDashboard` inventory | 8s | Same menu API | Dashboard only |
| `useNotifications` | 12s | Firestore via `NotificationRepository` | Notification bell |

**Worst case on Owner Dashboard:** 3 concurrent 5s order polls + 2 concurrent 8s menu polls + 12s notifications ≈ **~0.6 order req/s + ~0.25 menu req/s** per active owner session, before analytics/segments/release note fetches.

#### ✅ `subscribeOwnerOrders` is polling, not Firestore

Despite the name, `src/lib/ownerOrdersReads.ts` uses `setInterval` + `fetchOwnerOrdersFromApi` — no Firestore listener. Duplication is **API polling**, not duplicate `onSnapshot`.

#### 💡 `DashboardRealtimeProvider` (Phase 4)

Single shared timer feeding: orders, pending alert count, menu count, low-stock alerts, store status, notification unread count. **Do not** add another abstraction layer in `sdk/` until provider exists — consolidate at hook/context level first.

---

### 3. Customer Portal

#### ✅ Direct Firestore from UI/services (architecture violations)

Customer-facing pages/components with direct Firestore imports include:

- `Checkout.tsx`, `Menu.tsx`, `MyOrders.tsx`, `Home.tsx`
- `OrderTracking.tsx`, `OrderSuccess.tsx`, `SubscriptionPage.tsx`
- `AdminPanel.tsx` (heavy `onSnapshot` usage — 6+ listeners)
- `services/api.ts`, `PaymentVerificationService.ts`, `ForecastingService.ts`

Owner portal migration pattern (`lib/owner*Api.ts` → Render API) is the template for customer strangler migration.

#### ✅ `subscribeToGuestOrders` without error handler

```677:694:src/services/api.ts
return onSnapshot(q, (snapshot) => {
  // ...
  callback(orders);
});
```

No `onError` callback — quota/auth failures fail silently from caller's perspective.

#### Customer order polling

- `myOrdersReads.ts` — 30s SDK/API poll when `FF_SDK_MYORDERS_ENABLED`
- `OrderTracking.tsx` — additional poll timer
- `ActiveOrderStrip.tsx` — 30s poll
- `MyOrders.tsx` — interval for status refresh

Less severe than owner triplication but still candidates for shared session provider.

---

### 4. Authentication & Tenant Loading

#### ✅ TenantContext fabricates tenant on error

On owner panel Firestore failure, a stub tenant is applied:

```257:269:src/context/TenantContext.tsx
} catch (error) {
  if (isOwnerPanel && ownerTenantId) {
    applyTenantState({
      id: ownerTenantId,
      slug: ownerTenantId,
      name: ownerTenantId,
      status: 'active',
    }, ...);
```

**Impact:** Downstream API calls proceed with synthetic `tenantInfo`; entitlement/feature gates may behave incorrectly; errors are masked.

#### ⚠️ Auth race conditions

`AuthContext` uses `onAuthStateChanged` + async profile hydration with 6s timeout and API fallback (`hydrateOwnerProfileViaApi`). `TenantContext` depends on `authLoading` and `ownerTenantId` from profile — ordering is mostly handled but:

- Profile fallback (`buildAuthFallbackProfile`) can proceed before tenant resolution completes
- Cached owner tenant IDs (`ownerRedirect.ts`) can desync from Firestore truth

**Not a full race catastrophe**, but contributes to intermittent wrong-tenant UX.

---

### 5. Service Worker & PWA

#### ✅ Auto-update on mobile (confirmed risk)

```92:104:src/components/PwaUpdatePrompt.tsx
if (!shouldAutoApplyPwaUpdate()) return;
autoUpdateStarted.current = true;
const timer = window.setTimeout(() => { void handleUpdateNow(); }, 1200);
```

`shouldAutoApplyPwaUpdate()` returns true for installed PWAs and mobile user agents.

#### ⚠️ Dual SW files (partial)

| File | Role |
|------|------|
| `src/sw.ts` | Primary Workbox PWA (precache, navigation, `SKIP_WAITING` on message) |
| `public/firebase-messaging-sw.js` | Legacy FCM push handler; comment says primary SW handles push |

Not two competing Workbox registrations, but Firebase SDK may still probe the legacy path. Consolidation is hygiene, not the top stability fix.

#### ❌ `[SW] v42-mobile-pwa-auto-update` is not an error

Expected log from `src/sw.ts:9`. Correlates with PWA update activity, not a crash.

---

### 6. Recipe Intelligence & Inventory

#### ⚠️ Recipe Intelligence (partially confirmed as "empty")

**Implemented (verified):**

- `ownerIngredientsRoutes.ts`, `ownerRecipesRoutes.ts`
- `OwnerRecipes.tsx` with tabs (Recipes | Raw Ingredients | Forecast)
- Cost engine, consumption, forecast services in `backend-lib/marketplace/`
- Firestore rules for `tenants/{tenantId}/ingredients/{ingredientId}`
- `predictiveSupply: true` for growth plan in `useEntitlements.ts`

**Remaining stub:**

- `ForecastPanel.tsx` — "Create PO" uses `window.alert()` placeholder, not purchase order API

#### Inventory

No dedicated `OwnerInventory.tsx` page. Inventory signals come from menu item `stockCount` / `lowStockThreshold` via menu API polling on dashboard. Backend test `ownerInventoryMigration.test.ts` confirms API migration intent.

---

### 7. SDK, Repositories & Capability Ownership

#### SDK layer status

- **~750 files** under `src/sdk/` covering orders, menu, pricing, events, search, discovery, branch, location
- Extensive unit tests (`npm run test:sdk`)
- Presentation flags (`sdkFeatureFlags.ts`) default **OFF** in production for order tracking, my orders, owner orders SDK paths

#### ⚠️ Owner portal bypasses SDK for operational reads

Owner production path:

```
OwnerDashboard → lib/ownerOrdersReads → lib/ownerOrdersApi → Render API
```

SDK order layer exists but is feature-flagged; operational owner code uses `lib/*` facades. **Not duplicate implementations of the same feature**, but **capability ownership is unclear** — both `src/sdk/orders/` and `src/lib/ownerOrdersApi.ts` own "owner orders."

#### Repository pattern

- **Server:** `backend-lib/marketplace/*` routes + services
- **Client notifications:** `NotificationRepository.ts` (Firestore)
- **SDK:** `*Repository.ts` adapters (many stub/in-memory for certification)

No single `CAPABILITY_REGISTRY.md` exists yet (Phase 6 deliverable).

#### 💡 Server-side event bus already exists

`tenantDomainEventBus.ts` publishes to `tenant_domain_events` and runs in-process handlers. Phase 7 client event bus should **extend** this model, not replace it. Subscribers today are server-side sync handlers, not inventory/forecast/analytics modules on the client.

---

### 8. Backend API & Background Jobs

#### ⚠️ Partial API gateway

Existing middleware in `server.ts`:

- `express-rate-limit` — global + strict limiters
- Firestore quota circuit breaker (`firestoreQuotaBackoffUntil`)
- Correlation IDs on requests
- Cron secret auth for `/api/cron/*`
- Tenant validation cache (10 min)

**Missing:** Unified ordered pipeline (rate limit → tenant resolver → auth → authorization → capability router) as declarative middleware chain.

#### ⚠️ Background jobs (partial)

| Job | Mechanism | Status |
|-----|-----------|--------|
| Outbox processing | `setInterval` + `/api/cron/process-outbox` | ✅ Exists |
| Payment expiry | `/api/cron/expire-unpaid-payments` | ✅ Exists |
| Founder alerts / AutoPilot | cron + `runAutoPilotHealthCheck` | ✅ Exists (broken reads) |
| Recipe forecast / cost | Inline in API request handlers | ❌ Not backgrounded |
| Analytics backfill | Triggered from dashboard `getTenantAnalytics` | ⚠️ Inline |

#### Firestore quota protection (server)

- `isFirestoreBackedOff()` skips non-critical writes
- Monitoring log returns 202 during backoff
- AutoPilot crons skipped during backoff

**Client-side:** No shared retry/backoff/circuit breaker library; `monitoring.ts` drops quota noise.

---

### 9. Firestore Rules & Security

Not fully re-audited in this pass (Phase 16). Known state:

- `ingredients` subcollection rules added for owner access
- `npm run test:rules` script exists
- `scripts/security/api-security.test.ts` for API auth patterns

**Recommendation:** Dedicated rules review in Phase 16 before expanding unified incident writes client-side.

---

### 10. Testing & CI

| Area | Coverage |
|------|----------|
| SDK / domain | Strong (~100+ tests) |
| Marketplace backend routes | Good migration tests |
| Recipe intelligence | `recipeCostEngine.test.ts`, `recipeIntelligenceModule.test.ts` |
| Monitoring / AutoPilot | **None found** |
| Polling consolidation | **None found** |
| Load / deployment smoke | `test:smoke`, `test:preprod` scripts exist |

---

### 11. Dead Code, Orphans & Placeholders

| Item | Status |
|------|--------|
| Marketing pages (`AboutPage`, `PlatformPage`, etc.) | ✅ Wired in `App.tsx` routes |
| `orderbhojan/` sub-app | Active e2e harness — not orphan |
| `GlobalErrorBoundary.tsx` | Exists but `App.tsx` uses `components/system/ErrorBoundary` |
| `useMockSystemHealth` | Active placeholder — not dead code |
| `ForecastingService.ts` (client Firestore) | Legacy overlap with server recipe forecast |
| Owner dashboard timeline | Hardcoded mock array (`OwnerDashboard.tsx:274–281`) |

---

### 12. Console Errors Reported in Production

| Message | Verdict |
|---------|---------|
| `__chromium_devtools_metrics_reporter` | ❌ Chrome DevTools — ignore |
| `[SW] v42-mobile-pwa-auto-update` | ❌ Informational SW init |
| `Failed to fetch` / chunk errors | ⚠️ Real — PWA update + deployment; `App.tsx` shows refresh toast |
| Firestore quota errors | ⚠️ Real — exacerbated by duplicate polling + telemetry |

---

## Architecture Gap Report

### Current state (simplified)

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
├─────────────────────────────────────────────────────────────┤
│  Owner UI ──► lib/*Api ──► Render API ──► backend-lib       │
│  Customer UI ──► services/api ──► Firestore (direct)        │
│  Telemetry ──► monitoring.ts / TelemetryService ──► mixed   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     FIRESTORE                                │
│  system_incidents │ client_errors │ orders │ tenants │ ...  │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ AutoPilot reads WRONG collections
┌─────────────────────────────────────────────────────────────┐
│  AutoPilot / Founder alerts (server cron)                    │
└─────────────────────────────────────────────────────────────┘
```

### Target state (Phases 1–18)

```
UI → Hooks → SDK → Repository → API/Firestore
         ↓
   Domain Events (server bus + client subscribers)
         ↓
   Unified Incident Platform (single write/read schema)
         ↓
   Founder Operations Dashboard (production data only)
```

### Gap summary

| Capability | Current | Target | Gap |
|------------|---------|--------|-----|
| Incident intake | 4+ paths | 1 write path | **Large** |
| Incident query | AutoPilot broken; SystemHealth mock | Single read API | **Large** |
| Owner realtime | 6+ independent timers | 1 provider | **Medium** |
| Client error persistence | Render logs only | Unified incidents + dedupe | **Medium** |
| Architecture layers | Mixed | Strict UI→SDK→Repo | **Large** (customer side) |
| Event bus | Server-only | + client subscribers | **Medium** |
| Background jobs | Partial crons | Heavy work off request path | **Medium** |
| Cache | Ad-hoc tenant cache | TTL repository cache | **Medium** |
| AI observability | None | Root-cause analysis | **Large** (new) |

---

## Confirmed vs Rejected Audit Claims

| Audit claim | Verdict | Evidence |
|-------------|---------|----------|
| "AutoPilot doesn't see incidents" | ⚠️ Partially Confirmed | Writes to `system_incidents`; reads empty legacy collection names |
| "client-errors not in Firestore" | ✅ Confirmed | `server.ts:1322–1326` |
| "SystemHealth is fake" | ✅ Confirmed (mostly) | `useMockSystemHealth()`; only `client_errors` live |
| "Duplicate polling on owner dashboard" | ✅ Confirmed | See polling table |
| "Duplicate Firestore listeners on owner" | ❌ Not Applicable for orders | Owner orders use API polling |
| "Owner UI talks to Firestore directly" | ❌ Not Applicable | No Firestore in owner pages |
| "Service worker causes production errors" | ❌ Not Applicable | Log line is informational; auto-reload is the real risk |
| "DevTools metrics reporter is app bug" | ❌ Not Applicable | Browser injection |
| "Recipe Intelligence is placeholder" | ⚠️ Partially Confirmed | Core module shipped; PO button still stub |
| "Need unified incident collections" | ✅ Confirmed | No `Incident` schema today |
| "Telemetry completely off in prod" | ⚠️ Partially Confirmed | `monitoring.ts` basic capture always on; Firestore critical writes gated by tier |
| "No event bus" | ❌ Not Applicable | Server `tenantDomainEventBus` exists |
| "No background workers" | ❌ Not Applicable | Cron + outbox workers exist |
| "No rate limiting" | ❌ Not Applicable | `express-rate-limit` in `server.ts` |

---

## Incremental Refactoring Plan

Work **one phase at a time**. Validate tests + smoke after each. Do not start Phase N+1 until Phase N is complete.

### Phase 1 — Observability unification

1. Define `Incident` document schema (extend `system_incidents` fields)
2. Add `IncidentRepository` on server — single `writeIncident()`
3. Migrate `/api/monitoring/log` to repository (no behavior change)
4. Fix AutoPilot to query `system_incidents` where `type == X` (quick win before full schema)
5. Add `GET /api/ops/incidents` read path for dashboard
6. Tests: write/read round-trip, AutoPilot count accuracy

### Phase 2 — Client error pipeline

1. Persist `/api/client-errors` via `writeIncident()` with tenant, route, build, stack, severity
2. Dedupe key: `hash(message + route + stack_frame_0)` with 5-minute window
3. Rate limit per IP + per tenant
4. Mirror into founder dashboard read API

### Phase 3 — System Health (real data)

1. Remove `useMockSystemHealth`
2. Cards wired to ops API: API health, Firestore quota, latency percentiles, order volume, deploy version, open incidents
3. Feature-flag mock fallback for dev only

### Phase 4 — `DashboardRealtimeProvider`

1. Create context with single `setInterval` (5s base tick)
2. Multiplex: orders, menu meta, store status, notifications
3. Remove timers from `OrderAlertContext`, `useOwnerMenuCount`, dashboard inventory effect
4. Expose selectors hooks: `useOwnerOrdersSnapshot()`, `useOwnerMenuSnapshot()`, etc.

### Phase 5 — Repository architecture enforcement

1. ESLint/guard script: no `firebase/firestore` in `pages/**` (extend `lint:presentation`)
2. Strangler priority: `Checkout.tsx`, `OrderTracking.tsx`, `MyOrders.tsx`
3. Route customer reads through SDK + repository adapters

### Phase 6 — `CAPABILITY_REGISTRY.md`

Document owner per capability: Orders, Menu, Inventory, Recipes, Notifications, Payments, Analytics, Forecast, Delivery, Customer, Tenant.

### Phase 7 — Event bus expansion

1. Document server event types in `EVENT_BUS.md`
2. Add publishers for `OrderPlaced`, `InventoryChanged`, `RecipeUpdated` if not already emitted
3. Client: lightweight event emitter for cross-widget updates (replace poll triggers)

### Phase 8 — Background jobs

1. Queue collection or Render cron worker for forecast, recipe cost recompute, analytics rollups
2. API returns job ID immediately

### Phase 9 — Tenant loading hardening

1. Remove fabricated tenant stub
2. Error UI with retry + offline cached tenant (read-through cache only if previously validated)
3. Tests for Firestore failure paths

### Phase 10 — Service worker lifecycle

1. Remove `shouldAutoApplyPwaUpdate` auto-reload
2. Block reload when `document.querySelector('[data-blocking-sw-update]')` or route matches checkout/orders/recipe/inventory forms
3. User-confirmed update only

### Phase 11 — Cache strategy

1. `RepositoryCache` with TTL + stale-while-revalidate
2. Apply to tenant doc, menu list, owner orders snapshot

### Phase 12 — API gateway middleware

1. Extract `createApiPipeline()` middleware chain
2. Standardize tenant resolution + capability routing

### Phase 13 — Firestore quota protection (client)

1. Shared `FirestoreRetryPolicy` with exponential backoff
2. Circuit breaker in `firebase-db.ts`
3. Request coalescing for duplicate in-flight reads

### Phase 14 — AI observability

1. Rule-based correlator first (latency → poll count → quota)
2. Confidence score + recommendation field on `Incident`

### Phase 15 — Founder operations dashboard

1. New route `/ops` or extend `BhojanOSSuperAdmin`
2. Wire all cards to ops read API (Phase 1–3 dependency)

### Phase 16 — Production hardening

1. Full firestore.rules review
2. Global unhandled rejection audit
3. Memory leak review (interval cleanup — several components correct; verify all)

### Phase 17 — Testing

1. Monitoring integration tests
2. Polling consolidation tests (assert single timer)
3. Load test script for owner dashboard session

### Phase 18 — Documentation

Generate: `ARCHITECTURE.md`, `PRODUCTION_OPERATIONS.md`, `INCIDENT_RESPONSE.md`, `CAPABILITY_REGISTRY.md`, `EVENT_BUS.md`, `CACHE_STRATEGY.md`, `DEPLOYMENT_GUIDE.md`

---

## Recommended PR Sequence

| PR | Scope | Risk | Depends on |
|----|-------|------|------------|
| PR-1 | Fix AutoPilot to read `system_incidents` by type | Low | — |
| PR-2 | Unified `writeIncident` + migrate monitoring log | Medium | PR-1 |
| PR-3 | Persist `/api/client-errors` with dedupe/rate limit | Medium | PR-2 |
| PR-4 | `DashboardRealtimeProvider` + remove duplicate polls | Medium | — |
| PR-5 | SystemHealth real data | Medium | PR-2, PR-3 |
| PR-6 | PWA manual update only | Low | — |
| PR-7 | TenantContext error hardening | Medium | — |
| PR-8 | CAPABILITY_REGISTRY + ARCHITECTURE docs | Low | — |
| PR-9+ | Customer Firestore strangler, event bus, cache, ops dashboard | High | Prior PRs |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Firestore quota exhaustion | High | Critical | PR-4 polling merge + PR-13 client backoff |
| Silent wrong tenant on owner | Medium | High | PR-7 tenant error states |
| Checkout data loss on PWA update | Medium | High | PR-6 SW lifecycle |
| False-negative founder alerts | High | Medium | PR-1 AutoPilot fix (immediate) |
| Migration breaks legacy admin | Medium | Medium | Feature flags + dual-write incidents |
| Over-engineering SDK before polls fixed | Medium | Low | Phase 4 before Phase 5 customer migration |

---

## Immediate Actions (recommended before Phase 1 implementation)

1. **Verify Vercel env:** Set `VITE_PLATFORM_TIER=standard` if client Firestore critical telemetry is desired (aware of quota cost).
2. **Quick AutoPilot fix** (PR-1) — highest ROI, lowest risk.
3. **Measure owner session API rate** in Render logs for one Pune kitchen session to quantify polling duplicate cost.
4. **Do not** add new monitoring collections until unified schema is agreed (Phase 1).

---

## Appendix A — Key file reference

| Concern | Path |
|---------|------|
| API monolith | `server.ts` |
| AutoPilot | `server.ts` ~5070–5144 |
| Monitoring client | `src/lib/monitoring.ts` |
| Telemetry service | `src/core/reliability/TelemetryService.ts` |
| System Health UI | `src/pages/SystemHealth.tsx` |
| Owner order polling | `src/lib/ownerOrdersReads.ts`, `src/context/OrderAlertContext.tsx` |
| Owner dashboard | `src/pages/owner/OwnerDashboard.tsx` |
| Menu count poll | `src/hooks/useOwnerMenuCount.ts` |
| Tenant loading | `src/context/TenantContext.tsx` |
| PWA updates | `src/components/PwaUpdatePrompt.tsx`, `src/sw.ts` |
| Platform tier | `src/config/platformTier.ts` |
| Domain events (server) | `backend-lib/marketplace/tenantDomainEventBus.ts` |
| Recipe intelligence | `backend-lib/marketplace/ownerRecipesRoutes.ts`, `src/pages/owner/OwnerRecipes.tsx` |
| Feature flags | `src/context/FeatureFlagContext.tsx`, `src/lib/sdkFeatureFlags.ts` |

## Appendix B — Polling frequency diagram (owner dashboard session)

```
Time →
0s   5s   10s  15s  20s  24s  32s  40s
│    │    │    │    │    │    │    │
├─ Orders poll (OrderAlertContext) ───┼───┼───┼───┼───┼───┼───┼───
├─ Orders poll (Dashboard) ──────────┼───┼───┼───┼───┼───┼───┼───
├─ Menu count (Layout) ──────────────┼───────┼───────┼───────┼───
├─ Menu count (Dashboard) ───────────┼───────┼───────┼───────┼───
├─ Inventory alerts (Dashboard) ───────┼───────┼───────┼───────┼───
└─ Notifications ────────────────────┼───────────┼───────────┼───
                                      12s         24s         36s
```

**Phase 4 target:** One tick at 5s with staggered refresh intervals derived from a shared scheduler.

---

*End of Phase 0 report. Proceed to Phase 1 only after review/approval of this document.*
