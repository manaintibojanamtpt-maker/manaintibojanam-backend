# ADR-012: Guest Order Access via Stateless JWT

**Status:** Accepted  
**Date:** 2026-06-26  
**Deciders:** Architecture Review Board, Founder  
**Milestone:** M0 — implemented PR-1 through PR-8

---

## Context

BhojanOS supports **guest checkout** (`orders.userId == null`). Guests place orders and track status without creating an account.

**AS-IS security gap (CB-1):** `GET /api/orders/:id` returns full order documents including name, phone, address, and payment details to any caller with the order ID. Order IDs are Firestore document IDs — enumerable with sufficient effort.

**AS-IS guest tracking:** Guests store order IDs in `localStorage` (`src/lib/guestOrders.ts`). Logged-in users use Firestore `onSnapshot` listeners protected by rules. Guests do **not** have Firestore read access (rules require auth).

**Requirement:** After M0, API order reads must be authenticated. Guests cannot use Firebase Auth tokens. We need a **guest-equivalent credential** that:

- Scopes access to a single `orderId`
- Expires automatically
- Requires proof of identity (phone on the order)
- Is revocable by expiry only (stateless — no DB token table for M0)
- Works with feature flag rollout (`FF_ORDER_AUTH_ENFORCE`)

---

## Decision

### 1. Stateless guest view JWT

Issue HMAC-signed JWTs via `backend-lib/guestOrderToken.ts`:

```json
{
  "orderId": "<firestore-order-id>",
  "iat": 1719400000,
  "exp": 1719486400
}
```

| Parameter | Value |
|-----------|-------|
| Algorithm | HS256 (or HMAC-SHA256 via `jsonwebtoken` / Node `crypto`) |
| Secret | `ORDER_GUEST_TOKEN_SECRET` (server-only, ≥32 bytes) |
| TTL | 24 hours (configurable constant) |
| Scope | Single order read via API only |

### 2. Issuance gate — phone verification

```
POST /api/orders/:id/guest-view-token
Body: { "phone": "9876543210" } | { "phoneLast4": "3210" }
```

- Normalize phone to digits only; compare to `orders/{id}.phone`
- Rate limit: 5/hour/IP
- Return 403 on mismatch (same response shape as 404 to prevent order existence leak — implementation detail in PR-3)
- No Firebase Auth required for issuance

### 3. API authentication modes for `GET /api/orders/:id`

| Credential | Header |
|------------|--------|
| Firebase user (customer, owner, admin) | `Authorization: Bearer <firebase-id-token>` |
| Guest | `Authorization: Guest <jwt>` |

Access decision uses unified `assertOrderReadAccess` (see `docs/specs/M0-security.md` §5).

### 4. Client storage

- JWT stored in `sessionStorage` under key `bhojan_guest_token_<orderId>`
- Cleared on tab close (session scope reduces XSS persistence vs localStorage)
- Issued automatically post-checkout when guest phone is available

### 5. Feature flag rollout

| Phase | `FF_ORDER_AUTH_ENFORCE` | Behavior |
|-------|-------------------------|----------|
| PR-2 deploy | `false` | Shadow log `would_block`; API still open |
| PR-3 deploy | `false` | Guest token endpoint live; clients can adopt early |
| Staging soak | `true` | Full enforce |
| PR-8 prod | `true` | CB-1 closed |

**Kill switch:** `FF_ORDER_AUTH_ENFORCE=false` restores prior GET behavior without code deploy.

### 6. Firestore rules unchanged for guests in M0

Guest Firestore reads remain denied. M0 secures the **Express API** surface. Guest tracking UX that depends on API reads must use the JWT path. Owner realtime dashboards continue via authenticated Firestore.

Future ADR required if guest Firestore reads are needed.

---

## Consequences

### Positive

- Closes order IDOR on API without requiring guest accounts
- Stateless tokens — no migration, no revocation table, simple rollback
- Phone proof binds token to person who placed order
- Compatible with zero-downtime flag rollout

### Negative

- Phone-last-4 reduces entropy — mitigated by rate limits and full-phone preferred on checkout
- Guests lose API access if token expires — must re-request with phone
- Dual auth header scheme (`Bearer` vs `Guest`) — document in `docs/api.md`

### Security notes

- Never log full JWT or `ORDER_GUEST_TOKEN_SECRET`
- Constant-time comparison for HMAC verify
- Do not include PII in JWT claims
- `PATCH /api/orders/:id` remains closed to guests; status changes require owner auth

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Magic link email/SMS | Adds vendor cost and async friction for M0 |
| Long-lived opaque token in Firestore | DB writes, revocation complexity, migration |
| Require guest signup to track | Product regression vs current COD flow |
| Security through obscurity (long order IDs only) | CB-1 explicitly requires auth |

---

## Implementation map

| PR | Deliverable |
|----|-------------|
| PR-0 | This ADR accepted |
| PR-1 | `guestOrderToken.ts`, `orderAccess.ts`, unit tests |
| PR-2 | Middleware on GET (flag off) |
| PR-3 | Issuance endpoint + client wiring |
| PR-8 | Production enforce |

---

## References

- `docs/specs/M0-security.md`
- BHOS-ERR-001 CB-1
- ADR-011 (SDK strangler — orthogonal)
- `src/lib/guestOrders.ts` — AS-IS guest order ID persistence
