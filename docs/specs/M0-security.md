# M0 — Security Hardening Specification

**Milestone:** M0  
**Status:** Released (`v1.0.0-m0`)  
**Authority:** FEB-001 §4 Q1, BHOS-ERR-001 (Conditional Go), ADR-011, ADR-012  
**ERR blocker closed:** CB-1 (unauthenticated order API exposes PII)

---

## 1. Business goal

Close critical security exposure before any feature work so merchants and customers can trust BhojanOS with PII and payments. Unblocks enterprise conversations and satisfies ERR **CB-1**.

## 2. Technical objectives

| ID | Objective | PR |
|----|-----------|-----|
| T0.1 | Authenticate `GET/PATCH /api/orders/:id` (Firebase token **or** guest tracking JWT) | PR-2, PR-3, PR-8 |
| T0.2 | Authenticate `GET /api/orders/user/:userId` (self-only) | PR-4 |
| T0.3 | Authenticate `POST /api/orders/:id/notify-status` (owner/admin only) | PR-4 |
| T0.4 | Harden Razorpay `create-razorpay-order` draft binding | PR-7 |
| T0.5 | Remove open Firestore test collections; tighten `subscriptions`, `referrals`, `aiAnalytics` | PR-5 |
| T0.6 | Firestore rules emulator in CI | PR-6 |
| T0.7 | Integration tests for order API auth | PR-6 |

## 3. Out of scope

- M1+ (order FSM unification, SDK migration implementation, branch engine, geo)
- Architecture changes without ADR
- Playwright E2E (deferred to M3)
- Full Vitest suite (deferred to M1)

---

## 4. AS-IS security gaps (verified in repo)

### 4.1 Express API (`server.ts`)

| Endpoint | Line (approx.) | Issue |
|----------|----------------|-------|
| `GET /api/orders/:id` | ~3802 | No authentication — order IDOR reads full PII |
| `PATCH /api/orders/:id` | ~3817 | No authentication — status/tracking tampering |
| `POST /api/orders/:id/notify-status` | ~3908 | No authentication — notification spam |
| `GET /api/orders/user/:userId` | ~3930 | No authentication — cross-user enumeration |
| `POST /api/create-razorpay-order` | ~3253 | No draft ownership binding |

**Correct pattern (reuse):** `PATCH /api/orders/:id/status` (~4452) uses `verifyFirebaseToken` + `assertOrderStatusAccess`.

### 4.2 Firestore rules (`firestore.rules`)

| Collection | Issue |
|------------|-------|
| `_connection_test_` | `allow read, write: if true` |
| `_admin_test_` | `allow read, write: if true` |
| `subscriptions` | Any authenticated user can read/update any doc |
| `referrals` | Any authenticated user can read/create/update |
| `aiAnalytics` | `create: if true` (unauthenticated spam) |

**Note:** `orders` collection rules already restrict reads to `userId`, tenant owner, or admin. Primary SPA tracking uses Firestore listeners, not the open GET API.

### 4.3 Client

| Area | Behavior |
|------|----------|
| Logged-in tracking | `subscribeToOrder` via Firestore (rules-protected) |
| Guest tracking | `src/lib/guestOrders.ts` — localStorage order IDs only |
| Order creation | Direct Firestore write via `src/services/api.ts#createOrder` |

---

## 5. Order read access policy (domain)

Implemented in `backend-lib/orderAccess.ts` (PR-1). Enforced on API when `FF_ORDER_AUTH_ENFORCE=true` (PR-2+).

| Actor | Read order via API |
|-------|-------------------|
| `order.userId === auth.uid` | Allow |
| Tenant owner (`ownedTenantIds` includes `order.tenantId`) | Allow |
| Platform admin / superadmin | Allow |
| Guest with valid JWT scoped to `orderId` | Allow |
| Unauthenticated / wrong actor | 401 or 403 |

**PATCH policy:** Unauthenticated `PATCH /api/orders/:id` is deprecated. Clients must use `PATCH /api/orders/:id/status` (authenticated owner/admin). When `FF_ORDER_AUTH_ENFORCE=true`, unauthenticated PATCH returns 403.

---

## 6. Guest order access (ADR-012)

### 6.1 Token design

- **Type:** Stateless HMAC-signed JWT (library: `backend-lib/guestOrderToken.ts`)
- **Claims:** `orderId`, `iat`, `exp` (default TTL: 24 hours)
- **Secret:** `ORDER_GUEST_TOKEN_SECRET` (Render env, 32+ random bytes)
- **Transport:** `Authorization: Guest <jwt>` or query `?guestToken=<jwt>` (prefer header)

### 6.2 Issuance endpoint (PR-3)

```
POST /api/orders/:id/guest-view-token
```

| Field | Detail |
|-------|--------|
| Rate limit | 5 requests / hour / IP (strictLimiter + dedicated cap) |
| Body | `{ "phone": "<normalized>" }` or `{ "phoneLast4": "1234" }` |
| Validation | Phone must match `orders/{id}.phone` (normalized digits) |
| Response | `{ "success": true, "token": "<jwt>", "expiresAt": "<iso>" }` |
| Errors | 404 order not found, 403 phone mismatch, 429 rate limited |

### 6.3 Client storage (PR-3)

- Store JWT in `sessionStorage` keyed by `orderId` (not localStorage — session-scoped)
- Issue token on `OrderSuccess` / `PaymentSuccess` when guest phone is known
- Attach token on any API order fetch for guests

**Firestore guest reads:** Rules do not allow guest Firestore reads. Guest tracking continues via owner-shared links or future rules change is **out of M0 scope**. M0 secures the **API** surface; Firestore order rules are unchanged for guests in M0.

---

## 7. API changes by PR

### PR-2 — Order read middleware (flag OFF default)

| Endpoint | Change |
|----------|--------|
| `GET /api/orders/:id` | Middleware calls `assertOrderReadAccess`. If `FF_ORDER_AUTH_ENFORCE=false`, log `would_block` and allow (shadow mode). If `true`, enforce 401/403. |

**Env:** `FF_ORDER_AUTH_ENFORCE` — default `false`.

### PR-3 — Guest token + client

| Endpoint | Change |
|----------|--------|
| `POST /api/orders/:id/guest-view-token` | New (see §6.2) |

### PR-4 — User orders + notify (always on when merged)

| Endpoint | Change |
|----------|--------|
| `GET /api/orders/user/:userId` | `verifyFirebaseToken`; `req.user.uid === userId` or admin |
| `POST /api/orders/:id/notify-status` | `verifyFirebaseToken` + `assertOrderStatusAccess` |

### PR-7 — Razorpay draft binding (implemented, flag OFF default)

| Endpoint | Change |
|----------|--------|
| `POST /api/create-razorpay-order` | When `FF_RAZORPAY_DRAFT_BIND=true`, verify draft `userId` (from `orderPayload.userId` or top-level) matches auth uid; guest drafts require `userId == null`. Shadow mode logs `razorpay_draft_bind_would_block` when flag is off. |

**Env:** `FF_RAZORPAY_DRAFT_BIND` — default `false`, enable after PR-7 validation.

### Release PR — Production rollout

| Step | Change |
|------|--------|
| Deploy | API (Render), frontend (Vercel), Firestore rules |
| Configure | `ORDER_GUEST_TOKEN_SECRET` on Render |
| Staging soak | `FF_ORDER_AUTH_ENFORCE=true` → 48h QA (or shadow prod QA if no staging) |
| Production | `FF_ORDER_AUTH_ENFORCE=true` after soak |
| Optional | `FF_RAZORPAY_DRAFT_BIND=true` after Razorpay QA |

See [`docs/release-notes/M0-DEPLOYMENT.md`](../release-notes/M0-DEPLOYMENT.md).

---

## 8. Firestore rules changes (PR-5) — implemented

| Collection | Rule |
|------------|------|
| `_connection_test_`, `_admin_test_` | Deny all (`if false`) |
| `subscriptions` | Create/read/update: `userId == auth.uid` or admin |
| `referrals` | Create: `refId == auth.uid`; read: authenticated (referral code lookup); update: owner, admin, or `isReferralRedemptionUpdate()` |
| `aiAnalytics` | Create: authenticated + `userId == auth.uid`; read/update/delete: admin |

**Deploy:** `firebase deploy --only firestore:rules` off-peak. Monitor `permission-denied` for 24h.

**PR-6 tests:** `npm run test:security` (unit + API matrix + rules). Full rules emulator tests require **JDK 11+**; without Java, `test:rules` falls back to `firebase deploy --only firestore:rules --dry-run`.

**Known limitation:** Cross-user `subscriptions.pendingDiscount` updates (referrer reward) remain client-side and will fail rules until moved to a server API.

---

## 9. Feature flags

| Flag | Scope | Default | Kill switch |
|------|-------|---------|-------------|
| `FF_ORDER_AUTH_ENFORCE` | Server (Render) | `false` | Set `false` — restores open GET in < 1 min |
| `FF_RAZORPAY_DRAFT_BIND` | Server (Render) | `false` | Set `false` |

| Secret | Scope | Required when |
|--------|-------|---------------|
| `ORDER_GUEST_TOKEN_SECRET` | Server | PR-3 deployed |

---

## 10. PR sequence

```
PR-0 Docs → PR-1 Token lib → PR-2 Middleware (flag off) → PR-3 Guest token + client
→ PR-4 User orders + notify → PR-5 Rules → PR-6 CI tests → PR-7 Razorpay bind → **Release PR** (deploy + flags + docs)
```

Each PR: one objective, compiles, deployable, reversible.

---

## 11. Testing strategy

| Layer | Scope | PR |
|-------|-------|-----|
| Unit | JWT sign/verify, expiry, tamper, access matrix | PR-1 (`npm run test:unit`) |
| Rules emulator | orders, subscriptions, referrals, aiAnalytics, test collections | PR-6 (`npm run test:rules`) |
| API security matrix | Order access policy integration | PR-6 (`npm run test:api-security`) |
| All security gates | Unit + API + rules | PR-6 (`npm run test:security`) |
| Integration | Order GET auth, guest token, user orders, notify | PR-2–4 |
| Smoke | `npm run test:smoke` | All |
| Manual | Guest COD track; owner accept → notify; Razorpay | PR-3, 4, 7, 8 |

**New scripts (PR-6):**

- `npm run test:security` — rules emulator + API auth matrix
- Added to `test:preprod` or CI gate

---

## 12. Rollback

| PR | Rollback |
|----|----------|
| PR-1–2 | No production behavior change |
| PR-3 | Remove endpoint usage; flag off |
| PR-4 | Revert middleware |
| PR-5 | Redeploy previous `firestore.rules` |
| PR-6 | CI only |
| PR-7 | `FF_RAZORPAY_DRAFT_BIND=false` |
| Release PR | **`FF_ORDER_AUTH_ENFORCE=false`** (instant rollback) |

Never delete orders or revoke DB tokens for rollback (tokens are stateless).

---

## 13. Deployment order

1. Merge PR-0 through PR-7 with `FF_ORDER_AUTH_ENFORCE=false`
2. Set `ORDER_GUEST_TOKEN_SECRET` on Render
3. Deploy `firestore.rules` (PR-5)
4. Staging: `FF_ORDER_AUTH_ENFORCE=true` → 48h QA
5. Production: `FF_ORDER_AUTH_ENFORCE=true`
6. Monitor 30 min; schedule **BHOS-ERR-002** before M1

**Critical:** Do not enable `FF_ORDER_AUTH_ENFORCE` in production until PR-3 is merged and guest token flow is validated.

---

## 14. Acceptance criteria (milestone complete)

- [ ] Open `GET /api/orders/:id` without credentials returns 401 in production
- [ ] Guest with valid JWT returns 200 for their order only
- [ ] `GET /api/orders/user/:otherUid` returns 403 for non-admin
- [ ] `POST /api/orders/:id/notify-status` without owner token returns 401/403
- [ ] Firestore test collections deny public writes
- [ ] `npm run test:security` green in CI
- [ ] No regression: logged-in Firestore tracking, owner status updates, Razorpay checkout
- [ ] BHOS-ERR-002 scheduled

---

## 15. Files touched (full milestone)

| Area | Files |
|------|-------|
| API | `server.ts`, `backend-lib/guestOrderToken.ts`, `backend-lib/orderAccess.ts` |
| Client | `src/services/api.ts`, `src/lib/guestOrders.ts`, `src/components/OrderTracking.tsx`, `src/pages/OrderSuccess.tsx`, `src/pages/PaymentSuccess.tsx` |
| Rules | `firestore.rules` |
| CI | `package.json`, `scripts/` or `tests/security/` |
| Docs | This file, `docs/adr/ADR-011-*.md`, `docs/adr/ADR-012-*.md`, `docs/api.md`, `docs/release-notes/M0.md` |

---

## 16. References

- ADR-011 — SDK strangler (no M0 implementation)
- ADR-012 — Guest order access via JWT
- `docs/PAYMENT_ARCHITECTURE.md` — payment truth (unchanged in M0)
- BHOS-ERR-001 — Conditional Go for M0 only
