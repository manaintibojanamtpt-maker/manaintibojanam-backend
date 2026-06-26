# BhojanOS Payment Architecture

> Multi-tenant restaurant SaaS · Tenant 0: **Mana Inti Bojanam** (`mana-inti`)  
> Last updated: 2026-06-26

## Principles

1. **Server-owned payment truth** — clients never set `paymentStatus: success` for manual flows.
2. **No dispatch without verified payment** — for online/UPI; COD follows separate rules.
3. **Separate rails** — Razorpay (gateway) and tenant UPI/QR (manual) are distinct flows.
4. **Audit everything** — every verification, rejection, and state change is logged.
5. **Multi-tenant by default** — payment credentials and methods are scoped per tenant.

---

## A. Payment Architecture

### A.1 Two payment rails

| Rail | Who uses it | Verification | Dispatch gate |
|------|-------------|--------------|---------------|
| **Razorpay (gateway)** | Tenant 0 (Mana Inti Bojanam) initially; later tenants with Razorpay Connect / sub-accounts | HMAC signature + webhook `payment.captured` | `paymentStatus: verified` set server-side only |
| **Tenant UPI/QR (manual)** | Verified tenants with approved payment methods | Owner/admin confirms UTR + optional screenshot | `paymentStatus: verified` after owner action via API |

### A.2 Recommended order + payment states

**Order lifecycle (`orders.status`)**

```
CREATED → PAYMENT_PENDING → [gateway: auto] → PLACED/ACCEPTED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
                        ↘ [manual UPI]
                          PAYMENT_VERIFICATION → (owner verifies) → ACCEPTED → ...
                        ↘ unpaid timeout → EXPIRED
                        ↘ fraud/reject → CANCELLED
```

**Payment lifecycle (`orders.paymentStatus`) — server-owned**

| State | Meaning | Who sets it |
|-------|---------|-------------|
| `pending` | Order created, no payment yet | Server on draft promotion (manual) or draft creation |
| `pending_verification` | Customer submitted UTR/proof | Server on `POST /api/payments/submit-proof` |
| `verified` / `success` | Payment confirmed | Server only (Razorpay verify, webhook, or owner verify API) |
| `failed` | Gateway failed or owner rejected | Server |
| `expired` | Unpaid past `expiresAt` | Cron / server job |

**Rule:** Treat `verified` and `success` as equivalent for dispatch gating (normalize in `api.ts`).

### A.3 Dispatch gating rules

| Condition | Can advance to PREPARING / dispatch? |
|-----------|--------------------------------------|
| `paymentMethod: razorpay` + `paymentStatus ∈ {verified, success}` | ✅ Yes |
| `paymentMethod: tenant_upi` + `paymentStatus: verified` + `paymentVerifiedBy` set | ✅ Yes |
| `paymentMethod: cod` + order accepted by owner | ✅ Yes (COD is fulfillment risk, not payment fraud) |
| Customer clicked “I have paid” only | ❌ No |
| Client-side `DirectUPIProvider.verifyPayment` returning success | ❌ No (must be removed/fixed) |
| `paymentStatus: pending_verification` | ❌ No — show owner “Verify payment” CTA only |

**Enforcement layers**

1. **UI** — `OrderCard` hides advance/dispatch when payment not verified (already partially implemented).
2. **API** — `PATCH /api/orders/:id/status` rejects transitions if payment gate fails.
3. **Firestore rules** — block client writes to `paymentStatus`, `paymentVerifiedBy`, `paymentVerifiedAt`.

### A.4 Fraud prevention controls

- **Duplicate UTR index** — `payment_submissions/{utrHash}` unique constraint via server transaction.
- **Amount match** — submission amount must equal `order.totalAmount` (±0 tolerance).
- **Tenant scoping** — UTR valid only for the tenant’s orders; cross-tenant reuse flagged.
- **Rate limits** — max N proof submissions per order; max M failed UTRs per customer/day.
- **Screenshot-only proofs** — always `pending_verification`; never auto-verify.
- **Razorpay idempotency** — `webhook_events/{eventId}` + draft `status: promoted` (already in `promoteDraftTransaction`).
- **Order expiry** — unpaid manual orders expire after 15–30 min (configurable per tenant).
- **Sandbox mode** — limit order count for unverified tenants (already in server).

### A.5 Admin verification audit trail

Every verification writes to:

1. `orders.timeline[]` — event `payment_verified` or `payment_failed`
2. `payment_verifications/{id}` — immutable record (see data model)
3. Optional: `audit_logs` collection for super-admin queries

Fields: `orderId`, `tenantId`, `submissionId`, `action`, `actorUid`, `actorRole`, `previousPaymentStatus`, `newPaymentStatus`, `utrHash`, `notes`, `fraudFlags`, `timestamp`.

---

## B. Owner Payment Onboarding

### B.1 Adding UPI/QR safely

**Owner portal flow:** Settings → Payments → Add payment method

1. Owner selects type: `upi_id` | `merchant_qr`
2. Enters UPI ID (validated format: `name@bank`) or uploads QR image
3. Enters legal name on UPI account (must fuzzy-match KYC business name)
4. Submits → status `pending_review`
5. Platform or automated checks → `verified` | `rejected`

**Never** expose another tenant’s UPI. **Never** enable manual collection until `verified`.

### B.2 KYC / verification fields (on `tenants` + `tenant_payment_methods`)

```typescript
// tenants.kyc (existing — extend usage)
verificationLevel: 0 | 1 | 2 | 3  // require >= 1 for UPI onboarding
documents.businessProof.status
documents.identityProof.status
legal.merchantDeclarationAcceptedAt

// tenant_payment_methods (new)
status: 'pending_review' | 'verified' | 'rejected' | 'disabled'
upiId?: string
qrImageUrl?: string
displayName: string
verifiedAt?, verifiedBy?, rejectionReason?
```

### B.3 Checks before enabling payment collection

| Check | Required for UPI | Required for Razorpay |
|-------|------------------|----------------------|
| Email verified | ✅ | ✅ |
| Merchant agreement accepted | ✅ | ✅ |
| Business address + geo | ✅ | ✅ |
| KYC level ≥ 1 | ✅ | ✅ |
| FSSAI submitted (India) | ✅ recommended | ✅ for Tenant 0 |
| Payment method approved | ✅ | N/A (platform keys) |
| `paymentConfig.providers.upi.enabled` | ✅ server-set | — |
| `paymentConfig.providers.razorpay.enabled` | — | ✅ platform admin |

### B.4 Payment method status machine

```
pending_review → verified (admin/platform approves)
               → rejected (with reason, owner can re-submit)
verified → disabled (owner pause or admin suspend)
```

Only `verified` methods appear at checkout for that tenant.

---

## C. Order Flows

### C.1 Manual UPI / QR flow

```
Customer                    Server                         Owner
   |                          |                              |
   |-- checkout (tenant_upi) ->|                              |
   |                          |-- create order_draft         |
   |                          |-- promote → order            |
   |                          |   status: PAYMENT_PENDING    |
   |                          |   paymentStatus: pending       |
   |<- show UPI/QR + amount --|                              |
   |-- pay on phone app ------>| (external)                   |
   |-- submit UTR + proof ---->|                              |
   |                          |-- payment_submissions doc    |
   |                          |-- paymentStatus:             |
   |                          |   pending_verification       |
   |                          |-- order.status:              |
   |                          |   PAYMENT_VERIFICATION       |
   |                          |-- notify owner -------------->|
   |                          |                              |-- review UTR
   |                          |<- POST verify-payment -------|
   |                          |-- validate UTR unique        |
   |                          |-- paymentStatus: verified    |
   |                          |-- order.status: ACCEPTED     |
   |<- confirmation ----------|                              |
   |                          |                              |-- can dispatch
```

**Customer must NOT** advance order state. “I have paid” only creates a submission.

### C.2 Razorpay flow (Mana Inti Bojanam / Tenant 0)

```
Customer → stage order_draft → POST /api/create-razorpay-order
        → Razorpay checkout → POST /api/verify-razorpay-payment
        → promoteDraftTransaction (signature verified)
        → order with paymentStatus: success, status: PLACED
        → owner can accept/prepare/dispatch

Parallel: webhook payment.captured → promoteDraftTransaction (idempotent)
```

**Tenant 0 config:** Platform `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in Render env.  
**Future tenants:** Razorpay Route / sub-merchant accounts; keys stored as `secretRef`, never in client bundle.

---

## D. Data Model (Firestore)

### D.1 `tenants/{slug}`

```typescript
{
  id: string;
  slug: string;
  isTenantZero?: boolean;  // true for mana-inti
  sandboxMode?: boolean;
  kyc: { verificationLevel, mobileNumber, ... };
  legal: { merchantDeclarationAcceptedAt, ... };
  paymentConfig: {
    defaultProvider: 'razorpay' | 'tenant_upi' | 'cod';
    collectionEnabled: boolean;  // server-only flip
    providers: {
      razorpay?: { enabled: boolean; keyId?: string; secretRef?: string };
      upi?: { enabled: boolean; primaryMethodId?: string };
      cod?: { enabled: boolean; maxOrderAmount?: number };
    };
  };
  subscription: { planId, status, ... };  // SaaS billing (Growth/Pro/Enterprise)
}
```

### D.2 `tenant_payment_methods/{tenantId}_{methodId}`

Subcollection under tenant OR top-level with `tenantId` index.

```typescript
{
  tenantId: string;
  type: 'upi_id' | 'merchant_qr';
  upiId?: string;
  qrImageUrl?: string;
  displayName: string;
  status: 'pending_review' | 'verified' | 'rejected' | 'disabled';
  submittedAt: Timestamp;
  verifiedAt?: Timestamp;
  verifiedBy?: string;
  rejectionReason?: string;
  metadata: { bankHint?: string; lastFour?: string };
}
```

### D.3 `order_drafts/{draftId}`

Existing — keep as staging before payment.

```typescript
{
  tenantId: string;
  orderPayload: OrderPayload;
  subscriptionPayload?: SubscriptionPayload;
  status: 'pending' | 'promoted' | 'expired';
  paymentRail: 'razorpay' | 'tenant_upi';
  razorpayOrderId?: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}
```

### D.4 `orders/{orderId}`

Extend existing `Order` type:

```typescript
{
  paymentMethod: 'razorpay' | 'tenant_upi' | 'cod';
  paymentStatus: PaymentStatus;
  paymentRail: 'gateway' | 'manual' | 'cod';
  paymentMethodId?: string;  // ref tenant_payment_methods
  expiresAt?: Timestamp;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentVerifiedBy?: string;
  paymentVerifiedAt?: Timestamp;
  activeSubmissionId?: string;
}
```

### D.5 `payment_submissions/{id}`

```typescript
{
  tenantId: string;
  orderId: string;
  method: 'utr' | 'screenshot';
  utr?: string;
  utrHash: string;  // SHA256 for dedup index
  screenshotUrl?: string;
  amountClaimed: number;
  status: 'pending_review' | 'verified' | 'rejected';
  submittedBy: string;  // customer uid
  submittedAt: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  rejectionReason?: string;
  fraudFlags?: string[];
}
```

**Index:** unique composite on `(tenantId, utrHash)` where status = verified.

### D.6 `payment_verifications/{id}`

Immutable audit log per verify/reject action.

```typescript
{
  tenantId: string;
  orderId: string;
  submissionId: string;
  action: 'verified' | 'rejected';
  actorUid: string;
  actorRole: 'owner' | 'admin' | 'system';
  source: 'owner_portal' | 'admin_panel' | 'razorpay_webhook' | 'razorpay_callback';
  previousPaymentStatus: string;
  newPaymentStatus: string;
  razorpayPaymentId?: string;
  notes?: string;
  createdAt: Timestamp;
}
```

### D.7 `subscription_settings/{tenantId}`

Tenant-level monthly meals feature (customer-facing, separate from SaaS `tenants.subscription`).

```typescript
{
  tenantId: string;
  enabled: boolean;  // owner toggle
  plans: Array<{
    id: string;  // '1_meal' | '2_meals' | 'premium'
    name: string;
    price: number;
    mealsPerDay: number;
    active: boolean;
  }>;
  paymentRail: 'razorpay' | 'tenant_upi';  // inherit tenant default
  updatedAt: Timestamp;
  updatedBy: string;
}
```

Customer subscriptions remain in `subscriptions/{id}` with `tenantId`, linked to verified Razorpay payment on purchase.

---

## E. Monthly Meals

### E.1 Tenant toggle

- Owner portal: **Storefront → Monthly meals** → ON/OFF
- Writes `subscription_settings/{tenantId}.enabled`
- When OFF: hide subscription items from menu/checkout

### E.2 Customer subscription payment flow

1. Customer adds meal plan to cart (`isSubscription: true`)
2. **Must use online payment** (no COD — already enforced in Checkout)
3. Stage draft with `subscriptionPayload`
4. Razorpay payment → `promoteDraftTransaction` creates `orders` + `subscriptions` docs
5. Recurring renewals (Phase 2+): Razorpay Subscriptions API with `tenantId` metadata

### E.3 Separation of concerns

| Concept | Collection | Purpose |
|---------|------------|---------|
| SaaS plan (Growth/Pro/Enterprise) | `tenants.subscription` | Owner pays BhojanOS |
| Monthly meals (customer) | `subscription_settings` + `subscriptions` | Customer pays restaurant |

---

## F. Security

### F.1 Prevent duplicate UTR

- Server computes `utrHash = sha256(normalize(utr))`
- Before verify: query `payment_submissions` where `utrHash` + `status == verified`
- Reject with `duplicate_utr` flag if found

### F.2 Prevent client-side fake confirmations

- Remove unsafe success from `DirectUPIProvider.verifyPayment`
- Firestore rules: deny client update of `paymentStatus`, `paymentVerifiedBy`, `status` on paid rails
- All verify endpoints require Firebase Auth + role check (`owner` or `admin` of tenant)

### F.3 Server-owned final states

Only these endpoints may set `paymentStatus: verified|success`:

- `POST /api/verify-razorpay-payment`
- `POST /api/webhooks/razorpay`
- `POST /api/payments/verify-manual` (owner/admin)
- `POST /api/cron/expire-unpaid-orders` (sets expired)

### F.4 Role-based access

| Action | Customer | Owner | Platform admin |
|--------|----------|-------|----------------|
| Submit UTR/proof | ✅ own order | ❌ | ❌ |
| Verify manual payment | ❌ | ✅ own tenant | ✅ |
| Configure Razorpay keys | ❌ | ❌ (Phase 3) | ✅ |
| Add UPI method | ❌ | ✅ submit | ✅ approve |
| Dispatch order | ❌ | ✅ if payment gate passes | ✅ |

### F.5 Order expiry

Cron every 5 min:

- Query `orders` where `paymentStatus == pending|pending_verification` and `expiresAt < now`
- Set `status: EXPIRED`, `paymentStatus: expired`
- Append timeline event

---

## G. Implementation Plan

### Current codebase (baseline)

| Component | Status |
|-----------|--------|
| `server.ts` → `promoteDraftTransaction`, Razorpay verify, webhook | ✅ Tenant 0 ready |
| `PaymentVerificationService.ts` | ⚠️ Partial — client-side Firestore writes |
| `PaymentVerificationPanel.tsx` | ⚠️ Admin-only, needs owner portal parity |
| `DirectUPIProvider.ts` | ❌ Unsafe auto-success — disable until Phase 2 |
| `OrderCard.tsx` dispatch gating | ⚠️ Partial — strengthen server-side |
| `tenants.paymentConfig.providers.upi` | ✅ Schema exists, UI incomplete |

### Phase 1 — Mana Inti Bojanam + Razorpay (1–2 weeks)

**Goal:** Production-safe gateway flow for Tenant 0.

| Build | Owner |
|-------|-------|
| Harden `promoteDraftTransaction` — set `paymentRail: gateway`, timeline event | Backend |
| Webhook-only recovery path tested + monitored | Backend |
| Remove mock verify in production (`verify-razorpay-payment`) | Backend |
| Order expiry cron for abandoned Razorpay drafts | Backend |
| Customer checkout — Razorpay only for `mana-inti` | Frontend |
| Admin/owner dispatch gate — block if not `success` | Frontend + API middleware |
| `payment_verifications` audit collection | Backend |

**APIs**

- `POST /api/create-razorpay-order` (existing)
- `POST /api/verify-razorpay-payment` (existing, harden)
- `POST /api/webhooks/razorpay` (existing)
- `POST /api/cron/expire-unpaid-orders` (new)

### Phase 2 — Verified tenant UPI/QR (2–3 weeks)

**Goal:** Manual rail with owner verification, no fake payments.

| Build | Owner |
|-------|-------|
| `tenant_payment_methods` CRUD + owner UI | Full-stack |
| `POST /api/payments/submit-proof` (customer) | Backend |
| `POST /api/payments/verify-manual` (owner) | Backend |
| UTR dedup + amount checks | Backend |
| Checkout — show tenant UPI/QR when verified | Frontend |
| Owner orders — “Verify payment” button | Frontend |
| Fix/remove `DirectUPIProvider` auto-verify | Frontend |
| Firestore security rules update | DevOps |

### Phase 3 — Advanced tenant payment onboarding (3–4 weeks)

**Goal:** Scale to many tenants safely.

| Build | Owner |
|-------|-------|
| Platform admin — approve/reject payment methods | Admin UI |
| Razorpay Route / sub-accounts per tenant | Backend + legal |
| Payment method health dashboard | Owner portal |
| `subscription_settings` toggle + meal plan admin | Full-stack |
| Reconciliation reports (gateway vs manual) | Backend |
| Trust score integration (`merchantTrustScore`) | Backend |

### Services / components to build

```
src/
  services/
    PaymentSubmissionService.ts      # customer proof submit
    PaymentVerificationService.ts    # refactor → server API calls only
    TenantPaymentMethodService.ts    # owner CRUD
  pages/owner/
    OwnerPayments.tsx                # UPI/QR onboarding + status
  components/owner/
    PaymentVerificationQueue.tsx     # pending UTR list
    VerifyPaymentModal.tsx           # UTR review + confirm/reject
  components/checkout/
    ManualPaymentPanel.tsx           # show QR + UTR form
server/
  payments/
    ManualPaymentController.ts
    RazorpayController.ts
    PaymentGateMiddleware.ts         # status transition guard
```

---

## Appendix: Tenant 0 defaults

```typescript
// tenants/mana-inti
{
  isTenantZero: true,
  paymentConfig: {
    defaultProvider: 'razorpay',
    collectionEnabled: true,
    providers: {
      razorpay: { enabled: true },
      cod: { enabled: true, maxOrderAmount: 1000 },
      upi: { enabled: false }  // platform Razorpay only in Phase 1
    }
  }
}
```
