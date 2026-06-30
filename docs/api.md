# Mana Inti Bojanam API & Firestore Contracts

> **M0 security (`v1.0.0-m0`):** Order API authentication and guest JWT are live. Production enforce is controlled by `FF_ORDER_AUTH_ENFORCE` on Render. See [`docs/specs/M0-security.md`](./specs/M0-security.md) and [`docs/release-notes/M0.md`](./release-notes/M0.md).

This repo runs as a single app:
- **SPA (React/Vite)** in `src/`
- **Express API** in `server.ts`
- **Firestore is the system of record** for orders, menu, users, settings.

## Source of truth: Firestore `orders/{orderId}`

The production SPA creates orders by writing directly to Firestore via:
- `src/services/api.ts#createOrder`

### Canonical order fields (current app contract)

**Identity**
- `id` (string) � equals document id
- `orderNumber` (number)
- `userId` (string|null)

**Customer**
- `customerName` (string|null)
- `userEmail` (string|null)
- `phone` (string)
- `address` (string)

**Items (immutable pricing snapshot)**
- `items[]`:
  - `menuItemId` (string)
  - `name` (string)
  - `unitPrice` (number)
  - `quantity` (number)
  - `lineSubtotal` (number)
  - `lineTax` (number)
  - `lineTotal` (number)
  - optional: `discount` (number), `discountApplied` (boolean)

**Pricing**
- `subtotal` (number)
- `discountAmount` (number)
- `appliedCoupon` (object|null)
- `gst` (number) � GST rate
- `gstAmount` (number)
- `packingFee` (number)
- `deliveryFee` (number)
- `totalAmount` (number)

**Fulfillment**
- `deliveryType` (string) � `'asap' | 'scheduled'`
- `orderType` (string) � `'instant' | 'scheduled'`
- `scheduledFor` (string|null) � ISO timestamp for scheduled orders
- `deliveryTimeSlot` (string) � `'ASAP'` or a label

**Lifecycle**
- `status` (string, UPPERCASE)
  - common: `PLACED`, `PAYMENT_VERIFICATION`, `ACCEPTED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `DELIVERED`
  - terminal: `CANCELLED`, `EXPIRED`, `FAILED_DELIVERY`
- `timeline[]` (array, append-only)
- `createdAt` (Firestore timestamp)
- `updatedAt` (Firestore timestamp)

**Payment**
- `paymentMethod` (string) � `'razorpay' | 'cod'`
- `paymentStatus` (string) � canonical values: `'pending' | 'success' | 'failed' | 'expired'`
- `expiresAt` (timestamp|null) � set for online orders; `null` for COD
- optional: `paymentSubmittedAt`, `paymentVerifiedAt`, `paymentVerifiedBy`, `paymentProofType`, `paymentProofValue`

**Delivery tracking (optional)**
- `deliveryPartner`, `trackingLink`, `riderName`, `riderPhone`

### Cancellation policy (must match UI + rules)
- Customer cancellation is allowed for **60 seconds** after `createdAt`, and only when status is newly placed (`PLACED` or `PENDING`).

## Express API endpoints (server.ts)

### Orders (M0 — planned changes)

| Endpoint | AS-IS | M0 TO-BE |
|----------|-------|----------|
| `GET /api/orders/:id` | Open | Auth: Firebase Bearer or `Authorization: Guest <jwt>` (or `?guestToken=`) when `FF_ORDER_AUTH_ENFORCE=true`. Shadow mode logs `order_access_would_block` when flag is `false`. |
| `PATCH /api/orders/:id` | Open | Deprecated (`Sunset` header). Owner/admin Bearer required when `FF_ORDER_AUTH_ENFORCE=true`. Use `PATCH /api/orders/:id/status`. |
| `GET /api/orders/user/:userId` | Open | **Enforced (PR-4):** Bearer required; `uid === userId` or admin |
| `POST /api/orders/:id/notify-status` | Open | **Enforced (PR-4):** Bearer required; tenant owner or admin |
| `POST /api/orders/:id/guest-view-token` | — | **New** — issues guest JWT after phone verification (5/hour/IP) |

See [`docs/specs/M0-security.md`](./specs/M0-security.md) and [ADR-012](./adr/ADR-012-guest-order-access.md).

### Guest view token (M0 PR-3)
`POST /api/orders/:id/guest-view-token`
- Rate limit: 5 requests / hour / IP (+ strict route limiter).
- Body: `{ "phone": "9876543210" }` or `{ "phoneLast4": "3210" }`
- Response: `{ "success": true, "token": "<jwt>", "expiresAt": "<iso>" }`
- Phone mismatch returns `404` (same shape as missing order).
- Requires server env `ORDER_GUEST_TOKEN_SECRET` (≥32 chars).

### Security tests (M0 PR-6)

```bash
npm run test:security   # unit + API matrix + rules
npm run test:rules      # Firestore rules (emulator if Java available)
npm run test:api-security
```

Optional live HTTP probes: `SECURITY_TEST_BASE_URL=http://localhost:8080 npm run test:api-security`

### Notifications (supported)
`POST /api/orders/:id/notify-status`
- Purpose: best-effort fan-out after an order status change (email / WhatsApp / push).
- Auth: Firebase `Bearer` token required; caller must be tenant owner or platform admin (M0 PR-4).
- Body: `{ "status": "PLACED|ACCEPTED|PREPARING|READY|OUT_FOR_DELIVERY|DELIVERED|CANCELLED|EXPIRED|..." }`
- Source of truth: server reads the order from Firestore and sends notifications.

### Reports (supported)
`POST /api/admin/send-report`
- Sends an XLSX business report via email.

### Razorpay helper endpoints (optional / not the primary checkout flow)
`POST /api/create-razorpay-order`
- Body: `{ "draftId": "<id>" }` or `{ "planId": "<meal-plan>" }`
- M0 PR-7: when `FF_RAZORPAY_DRAFT_BIND=true`, draft payments require the Firebase `Bearer` token uid to match `orderPayload.userId`; guest drafts (`userId == null`) remain unauthenticated. Default flag is `false` (shadow log only).
`POST /api/verify-razorpay-payment`

## Deprecated: `POST /api/orders`

The SPA does **not** use this endpoint for production order creation; it creates orders directly in Firestore.

This endpoint remains for backward compatibility only and will:
- return response headers:
  - `Deprecation: true`
  - `X-Deprecated-Endpoint: /api/orders`
- include `deprecated: true` in JSON response

If a legacy client uses it, the server will normalize the order into the canonical Firestore schema above.

