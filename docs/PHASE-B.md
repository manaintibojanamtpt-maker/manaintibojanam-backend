# Phase B — Order Lifecycle Projection, Supervisor Grants, and Read-Path Hardening

Everything in this phase is activated behind feature flags. With no flags set,
the system behaves exactly as it did at the end of Phase A: reads come from
`orders`, the projection is written but never consulted, and supervisor
verification is available but not required by any pre-existing route.

## Current state: polling-based Phase B implementation (realtime tracking in progress)

The core projection, grant, and backfill infrastructure is complete. Guest
tracking authorization uses checkout-issued JWT tokens only. Authenticated
customer tracking has a Firestore `onSnapshot` listener with React Query polling
fallback.

## Security and recovery review (final)

### Guest-token issuance and recovery

**Checkout issuance** (`projectCheckout.ts:734-741`): When a guest order is
placed (`!request.userId`), `signGuestOrderToken` is called inside the checkout
transaction's post-write block. The token is scoped to the orderId just created.
Proof authorizing issuance: a successful order placement transaction — the caller
has just demonstrated control of the checkout flow for that tenant.

**Backend returns token in API response body.** The backend does not access
browser `sessionStorage`. It returns `{ token, expiresAt }` in the checkout
response. Client-side code persists the token.

**Client persistence** (`useCheckoutFlow.ts`): After successful order creation
(COD, Razorpay, UPI), `persistGuestTrackingToken` stores the token in
`sessionStorage` keyed by `guest_tracking_{orderId}`. This happens:
- After COD order placement (`placeCodOrder` success path)
- After Razorpay payment confirmation (`placeRazorpayOrder` success path)
- After UPI payment verification (`runUpiVerification` immediate + polling
  success paths)

**Interrupted UPI/Razorpay return:** When the user returns to the app after
interrupting an external payment flow:
1. `useOrderTracking` reads the guest token from `sessionStorage` by orderId
2. If the token exists and is not expired, tracking queries use it
3. If the token is expired, it is removed from storage and tracking falls back
   to polling without a token (which will be rejected by the server)

**Same-tab reload:** `sessionStorage` survives same-tab reloads. The token is
available on reload.

**Unsupported recovery scenarios:**
- **Tab close:** `sessionStorage` is cleared when the tab is closed. A new tab
  cannot recover the guest token. The user must place a new order or use an
  alternative recovery mechanism.
- **Native process kill / app background:** Not tested. `sessionStorage` may be
  cleared by the OS when the app is killed or backgrounded for an extended
  period.
- **Cross-device:** Not supported. The token is stored locally in the browser.

**Recovery endpoint** (`marketplaceRoutes.ts:1075-1095`): `POST
/api/marketplace/orders/{orderId}/guest-token` is **disabled**. It returns a
recovery-unavailable response. Order ID plus phone last-four cannot mint a
tracking credential through the API.

**Tracking endpoint** (`marketplaceRoutes.ts:1097+`): `GET
/api/marketplace/orders/{orderId}/guest-tracking` requires
`Authorization: Guest <jwt>`. Phone last-4 is still checked as a defense-in-depth
measure but does NOT independently authorize access. The token is the sole
authorization mechanism.

**Token properties:** HS256, 24h TTL, audience `bhojan-guest-order-view`,
issuer `bhojanos-api`, orderId-bound. Expired, tampered, wrong-order, or missing
tokens are rejected with `401`.

**Frontend token handling:** `useOrderTracking` reads the guest token from
`sessionStorage` by orderId. It does not request tokens from the recovery
endpoint. The token is never placed in URL search params, browser history, or
analytics. The checkout flow delivers the token in the API response body and
persists it in `sessionStorage`.

**Tests executed:**
- `marketplaceRoutes.guestTracking.test.ts`: phone matching (3 tests), lookup
  does not mint tokens (1 test)
- `guestOrderToken.test.ts`: token sign/verify, expired, tampered, malformed (5 tests)
- No test for unauthorized issuance via the recovery endpoint exists because the
  endpoint is disabled.

### Authenticated Firestore subscription

**Active listener query** (`useOrderTracking.ts:80-83`):
```typescript
const q = firestoreQuery(
  collection(db, 'orders'),
  where('__name__', '==', orderId)
);
```

**Emulator rules verification** (`firestore.rules:350-363`):
Authenticated reads on `orders` require:
```
resource.data.userId == request.auth.uid ||
resource.data.customerUid == request.auth.uid ||
isAdmin() ||
isTenantOwner(tenantOf(resource.data)) ||
isTenantStaff(tenantOf(resource.data))
```

The listener query is a single-document read by ID. Firestore security rules
enforce ownership at the document level. The listener will receive a
permission-denied error if the authenticated user does not own the order or
lack admin/owner/staff role.

**User-scoped cache isolation:** The hook tracks `sessionUser?.uid` via
`wasAuthenticatedRef`. When the UID changes (account switch, logout/login),
`queryClient.removeQueries` clears the auth-mode tracking cache for the previous
user. This prevents user A from seeing cached data after switching to user B,
even if `isAuthenticated` remains `true`.

**Permission-denied handling:** When the Firestore listener receives a
`permission-denied` error, `queryClient.removeQueries` fully removes the cached
data for that tracking query. This prevents stale unauthorized data from being
displayed. Transient connectivity failures preserve the last known data because
the error code is not `permission-denied` and `removeQueries` is not called.

Note: An earlier version used `queryClient.setQueryData(key, undefined)` which
does NOT clear the cache in TanStack Query v5 — the data remains accessible
through `getQueryData`. The fix replaces it with `removeQueries({ queryKey })`.

**Fields exposed:** The listener receives the full `orders` document. Any fields
in the order document are available to the client. No operator-only fields were
identified in the order schema. If sensitive fields are added later, a
customer-safe projection or server-side stream should be introduced.

**Tests executed:**
- `tests/tracking-cache-isolation.test.ts`: 4 tests verifying:
  - `removeQueries` clears cache (permission-denied path)
  - `setQueryData(undefined)` does NOT clear cache (bug proof)
  - User A → user B switching clears previous user's cache
  - `invalidateQueries` preserves cache during transient failures
- `orderLifecycleProjection.test.ts`: concurrent version test (1 test)
- No emulator test for the exact listener query exists; the listener is tested
  only in integration. Permission-denied behavior on account switch is not
  explicitly tested in the backend.

**Unsubscribe behavior:** The `useEffect` cleanup unsubscribes the Firestore
listener when `authUid`, `guestMode`, `orderId`, or `guestPhone` change. Account
switch (UID change) triggers cleanup. Order switch (orderId change) triggers
cleanup. On permission-denied, the listener is unsubscribed and the cache is
removed. The polling fallback does not restart automatically because the query
is disabled when `authUid` is null.

### Rebuild restart and concurrency

**Job ownership:** When `rebuildOrderProjection` is called with a `resumeJobId`,
it claims the job via a transactional compare-and-set on `workerId`. The first
worker to set `workerId` wins; subsequent workers see a non-empty `workerId`
that doesn't match their own and return zero work. This prevents two operators
from corrupting the same job concurrently.

**Worker identity:** Each invocation generates a unique `workerId`. The job
document stores `workerId` and `heartbeatAt`. If the job document already has a
`workerId` from a different worker, the new invocation returns early.

**Manual restart procedure:** If `rebuildOrderProjection` crashes or is
interrupted, the job document in `rebuild_jobs` has `status: 'running'` and
`cursor` set to the last successfully written document ID. An operator restarts
the job by calling `rebuildOrderProjection(db, fieldValue, target, {
resumeJobId: '<jobId>' })`.

**Idempotency:** Restarting replays the unfinished page. The cursor uses
`startAfter(lastDocId)`, so the page that was being processed when the crash
occurred is re-queried and re-written. With backfill protection enabled, the
per-document transaction checks whether a live event has updated the projection
since the backfill started; if so, the document is skipped.

**No regression:** The backfill protection transaction reads the projection's
`updatedAt` before writing. If the projection was updated by a live event after
the backfill started, the existing projection is preserved. Restart cannot
overwrite newer projection state.

**Tests executed:**
- `orderOutboxDispatcher.test.ts`:
  - backfill protection does not overwrite live projection (1 test)
  - job persistence creates job document (1 test)
  - resume from previous job cursor (1 test)
  - claims a job exclusively — second worker gets zero work (1 test)
  - preserves backfill protection under concurrent claim (1 test)
  Total: 5 tests.

### Disabled business-day reopen

**Backend path** (`registerBusinessDayRoutes.ts:88-99`): The route returns
`501 NOT_IMPLEMENTED` with a clear message. No grant is consumed. No mutation
occurs. The `authenticate` helper and `consumeSupervisorGrant` import were
removed to eliminate any accidental grant consumption path.

**Client-side path** (`posDatabase.ts:403+`): `PosDatabase.reopenBusinessDay`
returns `{ success: false, message: 'Business-day reopen is disabled...' }`
immediately. The hardcoded `adminPin === '1234'` check and all mutation logic
were removed. Business-day data is preserved; no Dexie writes occur.

**UI path** (`EodReconciliationScreen.tsx`): When `dayState?.isClosed` is true,
the UI shows a disabled "Business-Day Reopen Unavailable" badge instead of an
actionable button. The reopen modal, Admin PIN input, and reopen reason fields
were removed. The close-and-lock functionality is preserved.

**Finding:** The backend route is correctly disabled. The client-side reopen
function is disabled. The Admin PIN (`1234`) was a hardcoded credential in
production client-side code; it has been removed. No equivalent server-side
grant enforcement exists for this operation.

**Tests executed:**
- `supervisorRoutes.test.ts`: tests other supervisor routes; the reopen endpoint
  is no longer exercised.
- No test verifies the 501 response; the disabled route is not covered by
  automated tests.

## Verified completed requirements

- Projection writes are atomic (`db.runTransaction`) and idempotent (version
  check inside transaction).
- Supervisor grant consumption is atomic with pricing review resolution
  (grant validation inlined in the same transaction).
- Backfill protection writes are atomic (per-document transaction for check +
  write).
- Rebuild job ownership is enforced via transactional `workerId` claim; second
  worker gets zero work.
- Guest tracking endpoint requires a valid JWT token issued at checkout; phone
  last-4 does not independently authorize.
- Guest tokens are persisted in `sessionStorage` (tab-scoped), not URLs.
- Tracking cache is cleared on user identity change (account switch/logout).
- Permission-denied errors clear cached tracking data.
- Authenticated customer tracking uses Firestore `onSnapshot` with React Query
  polling fallback.
- Business-day reopen is fully disabled (backend 501 + client-side disabled),
  consuming no grant.

## Unresolved scope items

- **Guest realtime:** Guest tracking uses polling only. A push channel for
  guests would require a different auth mechanism (guests lack Firebase ID
  tokens). This is a separate design decision.
- **Production performance unverified:** Observability files exist but no
  production measurement has been taken.
- **Pre-existing rules gaps** (out of scope for Phase B): `audit_logs` create
  permits any authenticated user; some `customers`/`subscriptions`/`referrals`
  expressions fail closed; `platform_config` has no rules.
- **Listener error handling:** The Firestore listener error handler clears cache
  on permission-denied and unsubscribes. The error is logged but not surfaced to
  the user.
- **Tab-close recovery:** Guest tokens stored in `sessionStorage` are lost when
  the tab is closed. No cross-tab or cross-device recovery exists.
- **Concurrent rebuild workers:** The `workerId` claim prevents two workers from
  processing the same job, but the test uses a fakeFirestore that serializes
  transactions. Real Firestore contention behavior is not tested against the
  emulator.
- **Mounted React component tests for tracking hook:** The POS app does not have
  React Testing Library or jsdom installed, so a fully mounted hook test with
  React QueryClient is not possible in the current test infrastructure. Cache
  clearing is verified at the QueryClient level in
  `tests/tracking-cache-isolation.test.ts`.

## Operational procedures

### Manual rebuild restart

If `rebuildOrderProjection` crashes or is interrupted:

1. Query `rebuild_jobs` for documents with `status: 'running'` and
   `startedAt` older than expected.
2. Verify no active worker is processing the job (check process logs).
3. Call `rebuildOrderProjection(db, fieldValue, target, { resumeJobId })`.
4. The job claims itself via transactional `workerId` update. If another worker
   already claimed it, this invocation returns zero work.
5. The job resumes from `cursor` (last successfully written document ID).
6. With `FF_ORDER_LIFECYCLE_BACKFILL_PROTECTION` enabled, live updates since
   the backfill started are preserved.
7. On completion, `status` flips to `completed` and further resumes return
   zero work.

To abandon a job and start fresh, do not pass `resumeJobId`. A new job
document is created with a fresh cursor.

## Verification

- Backend Phase B regression: 214 tests pass / 0 fail across supervisorRoutes,
  pricingReview, supervisorVerification, supervisorRateLimit (which also covers
  `durableRateLimit`), orderCommandProcessor, orderCreateCommand,
  orderOutboxDispatcher, orderOutboxRegistration, posTenantRoutes,
  projectMarketplaceOrders.auth, marketplaceRoutes.guestTracking, and
  orderLifecycleProjection.
- POS tracking cache isolation: 4 tests pass / 0 fail in
  `tests/tracking-cache-isolation.test.ts`:
  - `removeQueries` clears cache (permission-denied path)
  - `setQueryData(undefined)` does NOT clear cache (bug proof)
  - User A → user B switching clears previous user's cache
  - `invalidateQueries` preserves cache during transient failures
- Backend lint clean for touched files; POS `npx tsc --noEmit` clean.
- Test command: `node --import tsx --test <file>`; rules: `npm run test:rules`.
