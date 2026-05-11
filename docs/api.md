# Mana Inti Bojanam API & Firestore Contracts

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

### Notifications (supported)
`POST /api/orders/:id/notify-status`
- Purpose: best-effort fan-out after an order status change (email / WhatsApp / push).
- Body: `{ "status": "PLACED|ACCEPTED|PREPARING|READY|OUT_FOR_DELIVERY|DELIVERED|CANCELLED|EXPIRED|..." }`
- Source of truth: server reads the order from Firestore and sends notifications.

### Reports (supported)
`POST /api/admin/send-report`
- Sends an XLSX business report via email.

### Razorpay helper endpoints (optional / not the primary checkout flow)
`POST /api/create-razorpay-order`
`POST /api/verify-razorpay-payment`

## Deprecated: `POST /api/orders`

The SPA does **not** use this endpoint for production order creation; it creates orders directly in Firestore.

This endpoint remains for backward compatibility only and will:
- return response headers:
  - `Deprecation: true`
  - `X-Deprecated-Endpoint: /api/orders`
- include `deprecated: true` in JSON response

If a legacy client uses it, the server will normalize the order into the canonical Firestore schema above.

