# Production Audit Working Draft

Source-audit update created on 2026-05-18.

Important: this is not a production-verified audit yet. It captures what the current codebase is wired to do, highlights schema and flow drift, and marks anything that still requires live Firebase data, backend logs, or a controlled test order.

Use this as the working sheet before cleanup.

## 0. Current Readout

- Overall status: ready for working sign-off with accepted verification gaps
- Strongest runtime authorities from current evidence:
  - order creation via frontend Firestore writes in [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:138)
  - online payment via backend Razorpay HTTP routes in [server.ts](f:\Manaintibojanam_final2\server.ts:1134)
  - notification candidate via backend fanout route in [server.ts](f:\Manaintibojanam_final2\server.ts:1677)
  - settings authority via `adminSettings/global` centered on `isStoreOpen` and `storeTiming`
- Highest-risk open drift:
  - token fields split across `deviceTokens`, `fcmTokens`, and `fcmToken`
  - order status vocabulary split across uppercase order states, lowercase notification mappings, and rules constraints
  - webhook persistence for `razorpayWebhooks` still unproven
  - some admin updates bypass shared order helpers
- Safe planning position:
  - safe to sequence low-risk cleanup and documentation work
  - not safe to aggressively delete duplicate payment, notification, or webhook paths yet

## 1. Environment

- Date: 2026-05-18
- Tester: Codex
- Audit mode: mixed; source-code audit plus limited live backend verification
- App URL: backend verified at `https://manaintibojanam-backend.onrender.com`
- Firebase project: live backend reports `mana-inti-bojanam-pune-492610`
- Backend URL: `https://manaintibojanam-backend.onrender.com`
- Build/version: not verified
- Browser/device: not applicable
- Notes:
  - current repo has large in-progress local changes
  - live backend `/api/health` returned `status: ok` on 2026-05-17
  - live backend reported named Firestore database `ai-studio-3efd2980-c2f3-4286-8dff-afeca044d855`
  - live backend read routes `/api/menu`, `/api/admin/settings`, and `/api/firestore-status` returned HTTP `502` during this audit pass
  - on 2026-05-18 Render backend was fixed by supplying `FIREBASE_SERVICE_ACCOUNT`
  - live backend now reads Firestore successfully for `/api/admin/settings` and `/api/menu`
  - local repo includes read-only script [read_prod_audit.mjs](f:\Manaintibojanam_final2\read_prod_audit.mjs:1) for sampling production Firestore without writes
  - current shell on 2026-05-18 does not expose `FIREBASE_SERVICE_ACCOUNT` or `GOOGLE_APPLICATION_CREDENTIALS`, but a completed read-only sample output is available at [prod-audit-sample.json](f:\Manaintibojanam_final2\prod-audit-sample.json:1)

## 2. Core Collections

Capture 2-3 recent real documents for each collection in the live audit pass. The notes below combine current source expectations with the completed read-only sample.

### `users`

- Fields observed from live sample: `userId`, `uid`, `name`, `displayName`, `phone`, `phoneNumber`, `email`, `address`, `role`, `referralCode`, `savedAddresses`, `preferences`, `createdAt`, `updatedAt`
- Token field used: mixed; `src/types.ts` defines `fcmTokens`, while `src/services/NotificationService.ts` writes `deviceTokens`, and `server.ts` reads both
- Additional token drift from client bootstrap: [src/firebase.ts](f:\Manaintibojanam_final2\src\firebase.ts:279) writes singular `fcmToken`
- Address field shape confirmed live: root-level `address` string plus `savedAddresses[]` objects; richer samples include `addressText`, `fullAddress`, `lat`, `lng`, `distanceKm`, `deliveryFee`, `isDefault`
- Example role values confirmed live: `user`, `admin`
- Live sample note: sampled docs showed no `deviceTokens` and no `fcmTokens`
- Notes: token-field drift is real and should be treated as an audit item before notification cleanup

### `orders`

- Fields observed from live sample: `orderNumber`, `userId`, `customerName`, `userEmail`, `phone`, `address`, `items`, `subtotal`, `discountAmount`, `appliedCoupon`, `gst`, `packingFee`, `deliveryFee`, `totalAmount`, `status`, `paymentMethod`, `paymentStatus`, `feedbackStatus`, `deliveryType`, `deliveryMethod`, `orderType`, `deliveryTimeSlot`, `scheduledFor`, `scheduledDate`, `scheduledTime`, `scheduledTimeLabel`, `isCOD`, `isScheduled`, `timeline`, `expiresAt`, `prepAlertSent`, `specialInstructions`
- Additional fields confirmed live in some docs: `deliveryPartner`, `deliveryPartnerCost`, `deliveryFeeCharged`, `profitMargin`, `isFreeDelivery`, `absorbedCost`, `remainingCycles`, `expiryDisabled`, `instructions`
- Status values referenced in code: `CREATED`, `CONFIRMED`, `SCHEDULED`, `PREPARING`, `READY`, `DISPATCHED`, `DELIVERED`, `FAILED_DELIVERY`, `CANCELLED`, `EXPIRED`, `PLACED`, `ACCEPTED`, `COURIER_BOOKED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `PENDING`, `PAYMENT_PENDING`, `PAYMENT_VERIFICATION`
- Payment status values referenced in code: `pending`, `success`, `failed`, `expired`, `pending_verification`, `verified`, `paid`, `unpaid`
- Live sampled order statuses: `CANCELLED`, `EXPIRED`
- Live sampled payment statuses: `expired`, `failed`, `pending`
- Targeted live order `#916559` status/payment: `ACCEPTED`, `pending`
- Address field names: checkout writes `address`; user profile also uses `address`; saved addresses use nested `savedAddresses[].address`
- Phone field names: checkout writes `phone`; some older code references `phoneNumber`
- Pricing fields: `subtotal`, `gst`, `packingFee`, `deliveryFee`, `totalAmount`, optional `discountAmount`, plus per-line pricing snapshot fields in `OrderItem`
- Scheduling fields: `deliveryType`, `orderType`, `isScheduled`, `scheduledDate`, `scheduledTime`, `scheduledFor`, `deliveryTimeSlot`
- Live sample notes:
  - sampled online orders showed timeline events with `newStatus: PLACED` even when top-level `status` was later `EXPIRED`
  - one sampled COD order had top-level `status: CANCELLED` with only an initial `PLACED` timeline event in the sample
  - live sample confirms `instructions` is still present on some orders alongside newer `specialInstructions`
- Notes: there is clear field drift between current checkout writes, shared `Order` typing, backend order route, and Cloud Functions assumptions

### `paymentProofs`

- Used in production: unknown
- Fields observed from rules/UI: `orderId`, `submittedBy`, `proofType`, `proofValue`, `status`, `submittedAt`, optional `verifiedBy`, `verifiedAt`, `fraudFlags`
- Status values observed in code: `pending_review`, `verified`, `rejected`
- Live sample note: collection was empty in the read-only production sample
- Notes: manual-review workflow exists in admin UI, but the main checkout online flow uses Razorpay verification and writes orders directly after backend verification

### `adminSettings`

- Fields observed from active code: `gst`, `packingFee`, `deliveryFee`, `isStoreOpen`, `storeTiming.openTime`, `storeTiming.closeTime`, `storeTiming.isManualOverride`; some older notes/reference paths still mention `storeOpen` or `acceptingOrders`
- Default fee config in code: GST `5`, packing fee `10`, delivery fee `30`
- Live store timing defaults in code: `10:00` to `22:00`
- Workflow settings observed: `storeOpen`, `acceptingOrders`, timing overrides via admin panel
- Notes:
  - 2026-05-17 backend settings read path was unhealthy and returning `502`
  - 2026-05-18 backend settings read path recovered after Render service-account credential fix
  - verified live values from `/api/admin/settings` on 2026-05-18:
    - `gst: 0`
    - `deliveryFee: 40`
    - `packingFee: 10`
    - `isStoreOpen: true`
    - `storeTiming.openTime: 09:00`
    - `storeTiming.closeTime: 22:00`
  - source audit suggests `isStoreOpen` is the active canonical boolean field; `storeOpen` and `acceptingOrders` do not appear to be active drivers in current frontend/backend paths

### `coupons`

- Used in code: yes
- Fields observed from admin create + validation paths: `code`, `discountType`, `discountValue`, `minOrder`, `expiryDate`, `isActive`, `createdAt`
- Validation behavior observed: backend `POST /api/coupons/validate` checks uppercase `code`, `isActive`, optional `expiryDate`, and `minOrder`
- Live sample confirmed fields: `code`, `discountType`, `discountValue`, `minOrder`, `expiryDate`, `isActive`, `createdAt`

### `supportTickets`

- Used in code: yes
- Fields observed from types/rules/admin UI: `orderId`, `userId`, `userName`, `phone`, `issueType`, `message`, `status`, `createdAt`, optional `adminReply`, `updatedAt`
- Status values observed in code: `open`, `resolved`
- Issue types observed in code: `order`, `payment`, `invoice`
- Live sample note: collection was empty in the read-only production sample

### `banners`

- Used in code: yes by rules and likely home/admin flows, but not traced deeply in this pass
- Fields observed from admin create + home render paths: `title`, optional `subtitle`, `image`, optional `link`, `priority`, `isActive`, `createdAt`
- Read behavior observed: homepage banner component reads only active banners and orders by `priority`
- Live sample note: collection was empty in the read-only production sample

### `categories`

- Used in code/rules: yes
- Fields observed from admin create + menu/home read paths: `name`, `image`, `priority`, `isActive`, `showOnHome`, `createdAt`
- Read behavior observed: menu page listens to active categories ordered by `priority`; home page also derives fallback categories from menu items if category docs are absent or incomplete
- Live sample confirmed fields: `name`, `image`, `priority`, `isActive`, `showOnHome`, `createdAt`; some docs also persist a root `id`

### `reviews`

- Used in code/rules: yes
- Fields observed from live sample: `orderId`, `userId`, `userName`, `rating`, `feedback`, `items`, `createdAt`
- Fields observed from menu review flow + delivery feedback + admin UI: `menuItemId` or `orderId`, `userId`, `userEmail`, `rating`, `feedback`, `createdAt`, optional `reply`, `repliedAt`
- Notes: live sampled docs looked like post-delivery order feedback records; review authority is split because menu item reviews and order feedback both target `reviews`, while feedback is also stored directly on `orders`

### `razorpayWebhooks`

- Used in production: unknown
- Fields observed from payment-verification assumptions/docs: likely `event`, `payload`, `receivedAt`, optional processing flags like `processed`
- Notes:
  - collection is referenced by [src/services/PaymentVerificationService.ts](f:\Manaintibojanam_final2\src\services\PaymentVerificationService.ts:175) and allowed by [firestore.rules](f:\Manaintibojanam_final2\firestore.rules:143)
  - current executable backend/functions code traced in this audit does not show an active Razorpay webhook handler that persists into `razorpayWebhooks`
  - [INTEGRATION_GUIDE.md](f:\Manaintibojanam_final2\INTEGRATION_GUIDE.md:185) contains a proposed Cloud Function example for logging webhook events, which looks like implementation guidance rather than confirmed deployed code
  - live sample note: collection was empty in the read-only production sample

## 3. Real Status Vocabulary

This section is partially verified from production data. Current code evidence plus live order evidence shows the following mixed vocabulary:

- Order statuses defined in code: `CREATED`, `CONFIRMED`, `SCHEDULED`, `PREPARING`, `READY`, `DISPATCHED`, `DELIVERED`, `FAILED_DELIVERY`, `CANCELLED`, `EXPIRED`, `PLACED`, `ACCEPTED`, `COURIER_BOOKED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `PENDING`, `PAYMENT_PENDING`, `PAYMENT_VERIFICATION`
- Payment statuses defined in code: `pending`, `success`, `failed`, `expired`, `pending_verification`, `verified`, `paid`, `unpaid`
- Lowercase statuses present in code: all payment statuses
- Enum-style uppercase statuses present in code: all order statuses
- Mixed old/new statuses present in code: yes
- Live statuses confirmed from production order trace: `PLACED`, `ACCEPTED`
- Rules-specific note: customer cancel is only allowed from `PLACED` or `PENDING`, while other code paths normalize many more states
- Functions-specific note: `functions/src/notifications.ts` uses lowercase cases like `placed`, `accepted`, `preparing`, which may not match uppercase Firestore writes

Reference files:

- [src/types.ts](f:\Manaintibojanam_final2\src\types.ts:1)
- [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:1)
- [src/services/OrderStateService.ts](f:\Manaintibojanam_final2\src\services\OrderStateService.ts:1)
- [src/lib/orderDisplay.ts](f:\Manaintibojanam_final2\src\lib\orderDisplay.ts:1)
- [firestore.rules](f:\Manaintibojanam_final2\firestore.rules:1)

## 4. End-to-End Order Trace

Partially executed in production with one controlled scheduled COD order.

- Test type: COD scheduled
- Test order time: created at 2026-05-18 00:54:46 IST; accepted around 2026-05-18 01:02:18 IST from live Firestore timestamps
- Customer account used: `Vishwa29`
- Items ordered:
  - `Andhra Veg Thali (Full)` `Rs. 199`
  - `Masala Dosa` `Rs. 79`
- Total shown in UI: `Rs. 343`
- Total stored in Firestore: `343`
- Order document ID: `rv8ly4KDbjCPd6tyte2L`
- Order number: `#916559`
- Frontend page used: expected path is [Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:1)
- Network requests triggered by the tested COD flow: no Razorpay backend calls; the source path writes the order directly and then navigates to `/order-success`
- Source-only note for the separate online flow: [Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:375) calls `POST /api/create-razorpay-order` and [Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:423) calls `POST /api/verify-razorpay-payment`
- Firestore writes triggered by the tested COD checkout flow: direct `orders` write through `createOrder()` in [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:138)
- Backend logs observed: not available
- Final stored status expected from checkout: `PLACED`
- Live status evidence observed after admin action: timeline showed `Order moved from PLACED to ACCEPTED`
- Final stored payment status confirmed for COD checkout: `pending`
- Final stored payment status expected from successful online checkout: `success`
- Any mismatch: likely; shared type/rules/functions/admin logic are not fully aligned
- Live UI observations from COD order:
  - schedule rendered as `Scheduled for 18 May 2026 at 10:00 am`
  - courier partner shown as `rapido`
  - admin panel showed `COD - PENDING`
  - before the hosting deploy, the customer order screen showed `Total Paid Rs. 343` for a COD order
  - Firestore stored values for `#916559`: `paymentMethod: cod`, `isCOD: true`, `orderType: scheduled`, `deliveryType: scheduled`, `status: ACCEPTED`, `deliveryTimeSlot: Today, 10:00 AM - 11:00 AM`, `scheduledFor: 2026-05-18T04:30:00.000Z`
  - after the hosting deploy on 2026-05-18, live order tracking was rechecked and now correctly shows `Total Amount` for COD orders

## 5. Code Path Mapping

For the live audit, confirm each path with browser network traces plus Firestore writes. Current code mapping:

### Login/profile creation

- Path used: Firebase auth plus `saveUserIfNotExists()` in [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:55)
- Evidence: writes `users/{uid}` and `referrals/{uid}` if missing

### Add/update cart

- Path used: local frontend state via checkout hooks/context; no authoritative server write identified in this pass
- Evidence: checkout page consumes `useCheckoutState()`

### Place order

- Path used by checkout page: direct Firestore write through `createOrder()` in [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:138)
- Secondary path also present: deprecated backend `/api/orders` creator in [server.ts](f:\Manaintibojanam_final2\server.ts:1215)
- Evidence: `Checkout.tsx` imports `createOrder` directly and calls it for both COD and successful online flow
- Checkout-shape audit:
  - [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:266) assembles the order payload locally instead of relying on one shared builder
  - [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:299) still writes `status: ('active' as OrderStatus)` for subscription-backed orders
  - [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:305) writes `orderType: subscription_master`
  - implication: checkout still embeds non-canonical order semantics before the shared `createOrder()` layer writes Firestore

### Payment create

- Path used by checkout page: backend `POST /api/create-razorpay-order`
- Secondary payment create path also present: callable `functions/index.js` `createRazorpayOrder`
- Evidence: [Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:375) hits backend route, not callable function

### Payment verify

- Path used by checkout page: backend `POST /api/verify-razorpay-payment`
- Secondary payment verify path also present: callable `functions/index.js` `verifyRazorpayPayment`
- Evidence: [Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:423) hits backend route, not callable function

### Admin order status update

- Path used: frontend Firestore update helpers in `src/services/api.ts` plus admin pages/components
- Evidence: admin UI imports `updateOrderStatus` and related helpers; those helpers write Firestore directly and then call backend `POST /api/orders/:id/notify-status` as best-effort fanout
- Admin chunk audit:
  - standard order-card advancement flows through the shared helper path in [src/pages/AdminPanel.tsx](f:\Manaintibojanam_final2\src\pages\AdminPanel.tsx:452) and [src/components/admin/OrderCard.tsx](f:\Manaintibojanam_final2\src\components\admin\OrderCard.tsx:153)
  - scheduled prep alert still writes Firestore directly in [src/pages/AdminPanel.tsx](f:\Manaintibojanam_final2\src\pages\AdminPanel.tsx:187)
  - courier booking writes courier fields plus `status: 'COURIER_BOOKED'` directly in [src/components/admin/CourierBookingModal.tsx](f:\Manaintibojanam_final2\src\components\admin\CourierBookingModal.tsx:58)
  - payment verification splits success handling into `updateOrderStatus(...)` and `updatePaymentStatus(...)` in [src/components/admin/PaymentVerificationPanel.tsx](f:\Manaintibojanam_final2\src\components\admin\PaymentVerificationPanel.tsx:80)
  - implication: checkout-adjacent admin paths are still split across helper-driven and raw-write flows

### Customer order tracking

- Path used: Firestore-driven frontend tracking UI plus status normalization helpers
- Evidence: [src/components/OrderTracking.tsx](f:\Manaintibojanam_final2\src\components\OrderTracking.tsx:1), [src/lib/orderDisplay.ts](f:\Manaintibojanam_final2\src\lib\orderDisplay.ts:1)

### Production backend health snapshot

- `/api/health`: healthy on 2026-05-17; backend reports production env and initialized Firebase admin connection
- `/api/firestore-debug`: healthy on 2026-05-17; reports project `mana-inti-bojanam-pune-492610` and database `ai-studio-3efd2980-c2f3-4286-8dff-afeca044d855`
- `/api/menu`: returned HTTP `502` on 2026-05-17
- `/api/admin/settings`: returned HTTP `502` on 2026-05-17
- `/api/firestore-status`: returned HTTP `502` on 2026-05-17
- `/api/admin/verify-connection`: connection closed unexpectedly on 2026-05-17
- Recovery on 2026-05-18:
  - Render backend now starts with `Initialized with Service Account`
  - `/api/admin/settings` returned live Firestore data successfully
  - `/api/menu` returned real production menu data successfully

### Push notification registration

- Path used: `notificationService.registerDeviceToken()` writing `users/{uid}.deviceTokens`
- Evidence: [src/services/NotificationService.ts](f:\Manaintibojanam_final2\src\services\NotificationService.ts:143), [src/hooks/useFCMInitialization.ts](f:\Manaintibojanam_final2\src\hooks\useFCMInitialization.ts:1)

### New order notification to admin

- Possible path 1: Firestore trigger in [functions/src/notifications.ts](f:\Manaintibojanam_final2\functions\src\notifications.ts:1)
- Possible path 2: backend notification fanout in [server.ts](f:\Manaintibojanam_final2\server.ts:1585)
- Evidence: both implementations exist; deployed authority is unverified

## 6. Firestore Rules Compatibility

Current rules appear compatible with several live paths, but there are important sharp edges:

- Customer profile create/update: allowed if authenticated user owns the doc
- Customer order create: allowed if authenticated and `request.resource.data.userId == request.auth.uid`
- Customer order cancel: allowed only within 60 seconds and only when stored status is `PLACED` or `PENDING`
- Customer review submit: direct `reviews` create allowed; order feedback field updates also allowed on `orders`
- Admin order update: allowed
- Admin menu update: allowed
- Payment proof submit: allowed for `paymentProofs` with strict proof types `upi_screenshot`, `bank_transfer`, `card_transaction` and status `pending_review`
- Notification token write: allowed indirectly through user doc update because `users/{uid}` update is permitted to owner
- Any permission errors seen: not tested live
- Notes: `paymentProofs` rules and `Order.paymentProofType` values do not use the same vocabulary; this needs live verification before cleanup

Reference:

- [firestore.rules](f:\Manaintibojanam_final2\firestore.rules:1)

## 7. Payments Audit

- Razorpay keys confirmed in production: not verified
- Mock responses possible in production: possible from code path if backend returns `isMock`; production status needs confirmation
- Online payments actually create Razorpay order: code intends yes through backend route
- Online payments actually verify signature: code intends yes through backend route
- `paymentProofs` used for real orders: unknown
- Admin manually verifies payments: supported by UI/workflow, but not proven authoritative
- COD flow works: yes, verified with one scheduled COD order in production
- Online payment live outcome: traced successful online payment found for order `#463577` with `razorpayPaymentId: pay_SoWJYCCLKonwN0`
- Notes: there are at least three payment authorities in the repo now: backend Razorpay routes, callable functions, and manual proof review UI
  - saved production sample confirms real `paymentMethod: razorpay` orders exist in Firestore, so online orders are not just theoretical code paths
  - sampled razorpay orders in [prod-audit-sample.json](f:\Manaintibojanam_final2\prod-audit-sample.json:1) were not successful examples; sampled outcomes included `paymentStatus: failed` with `status: EXPIRED` and `paymentStatus: expired` with `status: EXPIRED`
  - sampled razorpay order timelines showed mixed admin/system intervention such as `Payment status updated to pending_verification`, `Payment status updated to pending`, and later expiry
  - the saved sample did not surface `razorpayOrderId` or `razorpayPaymentId`, so it is still insufficient to fully trace a successful online payment authority path
  - targeted live backend read on 2026-05-18 via `GET /api/orders/user/ZWSPTDWQYJOSsROnimjoFT94oIX2` returned the successful online order as document `w82jeDCHJt8fFRdEjnyN`
  - traced successful online order fields:
    - `orderNumber: 463577`
    - `userEmail: viswakalyan29@gmail.com`
    - `phone: 8885668863`
    - `paymentMethod: razorpay`
    - `paymentStatus: success`
    - `razorpayOrderId: order_SoWIyJUnPrb0kI`
    - `razorpayPaymentId: pay_SoWJYCCLKonwN0`
    - `createdAt: 2026-05-12 22:05:36 IST`
    - `scheduledFor: 2026-05-13T04:30:00.000Z`
    - `status` later advanced through `PLACED` -> `ACCEPTED` -> `PREPARING` -> `READY`
  - this traced example strongly supports the current production authority chain: backend Razorpay create/verify first, then frontend direct Firestore order creation with persisted Razorpay IDs and `paymentStatus: success`
  - earlier production mismatch was confirmed and then resolved on 2026-05-18: customer order tracking had said `Total Paid` for COD while admin panel said `COD - PENDING`
  - callable Functions Razorpay path in [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1) is not the checkout authority and appears unsafe to trust without repair because it references `functions.https.HttpsError` without importing `functions`
  - no active webhook persistence path was found in traced executable backend/functions code during this source audit; `razorpayWebhooks` currently looks like planned infrastructure plus rules/service assumptions
  - backend logs for this payment were not available in this environment, so the create/verify HTTP calls are still inferred from source plus stored fields rather than directly log-correlated

Reference files:

- [server.ts](f:\Manaintibojanam_final2\server.ts:1)
- [src/services/PaymentVerificationService.ts](f:\Manaintibojanam_final2\src\services\PaymentVerificationService.ts:1)
- [src/components/admin/PaymentVerificationPanel.tsx](f:\Manaintibojanam_final2\src\components\admin\PaymentVerificationPanel.tsx:1)
- [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1)

## 8. Notifications Audit

- Service worker active: code intends yes; live registration not verified
- Notification permission prompt works: code intends yes
- FCM token generated: code intends yes
- Token saved to user doc: code writes `deviceTokens`; server reads both `deviceTokens` and `fcmTokens`; functions read `deviceTokens`
- Legacy/sideload token path also exists: [src/firebase.ts](f:\Manaintibojanam_final2\src\firebase.ts:258) can write singular `fcmToken`
- Admin receives new order notification: unverified
- Customer receives status notification: partially verified; live test on order `#936271` showed in-app toast only
- Firebase Functions deployed and active: unverified
- Notes: token schema drift is likely the first thing to verify in live Firebase before removing any notification path
  - repo is configured for Firebase Functions deployment via [firebase.json](f:\Manaintibojanam_final2\firebase.json:1) with source `functions` and runtime `nodejs24`
  - source authorities are split: frontend registers tokens in [src/services/NotificationService.ts](f:\Manaintibojanam_final2\src\services\NotificationService.ts:193), backend status fanout exists at [server.ts](f:\Manaintibojanam_final2\server.ts:1677), and Firestore-triggered push flows exist in [functions/src/notifications.ts](f:\Manaintibojanam_final2\functions\src\notifications.ts:69)
  - the active customer registration path is not the unused `useCustomerNotifications()` hook; [src/App.tsx](f:\Manaintibojanam_final2\src\App.tsx:67) mounts [src/hooks/useFCMInitialization.ts](f:\Manaintibojanam_final2\src\hooks\useFCMInitialization.ts:9) globally for authenticated users, and [src/components/OrderTracking.tsx](f:\Manaintibojanam_final2\src\components\OrderTracking.tsx:220) explicitly prompts customers to grant notification permission
  - implication: token registration is reachable in the live app for signed-in users, but direct proof of stored prod tokens still requires a live user-doc read or a controlled delivery test
  - callable payment Functions in [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1) should not be assumed healthy fallback infrastructure during cleanup
  - notification trigger source also drifts from current order schema: it expects `phoneNumber` and lowercase status keys like `placed` or `accepted`, while checkout writes `phone` and order flows center uppercase statuses like `PLACED` and `ACCEPTED`
  - server-side notification helper looks more aligned with current production writes than the Firestore trigger: it reads both `deviceTokens` and `fcmTokens`, uses uppercase statuses, and sends WhatsApp to `order.phone`
  - traced successful production order `#463577` reinforces that alignment: stored fields use `phone`, `userEmail`, `userId`, and uppercase timeline statuses like `PLACED`, `ACCEPTED`, `PREPARING`, and `READY`, which fit [server.ts](f:\Manaintibojanam_final2\server.ts:807) materially better than [functions/src/notifications.ts](f:\Manaintibojanam_final2\functions\src\notifications.ts:45)
  - live status-change test on 2026-05-18 for order `#936271` produced only the in-app toast observed on the customer side; this does not yet prove push, WhatsApp, or email fanout
  - a separate targeted live scan on 2026-05-18 reportedly found no `deviceTokens`, no `fcmTokens`, and no singular `fcmToken`; that larger scan is referenced here but is not reproduced by [read_prod_audit.mjs](f:\Manaintibojanam_final2\read_prod_audit.mjs:1)
  - current backend runtime exposes order reads like [server.ts](f:\Manaintibojanam_final2\server.ts:1699) but no `/api/users/:id` or notification-debug read route, so token presence remains unverified from backend APIs even though schema alignment now favors the backend notifier path

Reference files:

- [src/main.tsx](f:\Manaintibojanam_final2\src\main.tsx:1)
- [src/services/NotificationService.ts](f:\Manaintibojanam_final2\src\services\NotificationService.ts:1)
- [src/hooks/useAdminNotifications.ts](f:\Manaintibojanam_final2\src\hooks\useAdminNotifications.ts:1)
- [src/hooks/useFCMInitialization.ts](f:\Manaintibojanam_final2\src\hooks\useFCMInitialization.ts:1)
- [functions/src/notifications.ts](f:\Manaintibojanam_final2\functions\src\notifications.ts:1)

## 9. Business Config Consistency

- Business city shown in UI: mixed
- Serviceability city in code: Pune
- Contact phone in code: `+91 7666258454` in `src/constants.ts`; refund page also references `+91 97038 12827`
- Contact email in code: `manaintibojanam@gmail.com`
- Admin settings fees in code defaults: GST `5`, packing `10`, delivery `30`
- Admin settings fees verified in production on 2026-05-18: GST `0`, packing `10`, delivery `40`
- Store timings defaults in code: `10:00` to `22:00`
- Store timings verified in production on 2026-05-18: `09:00` to `22:00`
- Pune/Tirupati mismatch: yes
- Notes:
  - `src/constants.ts` still says `Tirupati, Andhra Pradesh`
  - `ServiceabilityService`, `LocationPicker`, navbar, footer, and checkout content are Pune-specific
  - backend default project id also includes `pune`
  - store-open behavior is not interpreted uniformly across UI: navbar/menu use time-aware logic, while home page mainly mirrors `settings.isStoreOpen`

Reference files:

- [src/constants.ts](f:\Manaintibojanam_final2\src\constants.ts:1)
- [src/services/ServiceabilityService.ts](f:\Manaintibojanam_final2\src\services\ServiceabilityService.ts:1)

## 10. Source-Backed Drift Findings

- Payment proof vocabulary drift:
  - `Order.paymentProofType` in [src/types.ts](f:\Manaintibojanam_final2\src\types.ts:212) uses `gateway_webhook`, `utr`, `screenshot`, `admin_marked`, `cod`
  - `paymentProofs.proofType` in [src/services/PaymentVerificationService.ts](f:\Manaintibojanam_final2\src\services\PaymentVerificationService.ts:12) and [firestore.rules](f:\Manaintibojanam_final2\firestore.rules:135) uses `upi_screenshot`, `bank_transfer`, `card_transaction`
  - implication: order-level payment metadata and proof-review collection are not using a canonical shared vocabulary

- Status normalization drift:
  - shared types still carry legacy and current order states in [src/types.ts](f:\Manaintibojanam_final2\src\types.ts:89)
  - customer/admin display logic collapses many values into fewer phases in [src/lib/orderDisplay.ts](f:\Manaintibojanam_final2\src\lib\orderDisplay.ts:29)
  - Firestore rules still special-case customer cancellation to only `PLACED` and `PENDING` in [firestore.rules](f:\Manaintibojanam_final2\firestore.rules:48)
  - implication: UI may look consistent while raw Firestore status vocabulary remains fragmented

- Subscription order status contamination:
  - checkout writes `status: ('active' as OrderStatus)` for subscription-backed orders in [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:299)
  - `active` belongs to `SubscriptionStatus`, not the main `OrderStatus` enum in [src/types.ts](f:\Manaintibojanam_final2\src\types.ts:98) and [src/types.ts](f:\Manaintibojanam_final2\src\types.ts:302)
  - order display and transition helpers center recognized order states like `PLACED`, `PENDING`, and `ACCEPTED` in [src/lib/orderDisplay.ts](f:\Manaintibojanam_final2\src\lib\orderDisplay.ts:69) and [src/services/OrderStateService.ts](f:\Manaintibojanam_final2\src\services\OrderStateService.ts:31)
  - implication: subscription-origin orders can bypass normal order-state assumptions and may render or transition unpredictably

- Checkout builder drift:
  - order payload assembly remains local to [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:266) instead of being fully centralized in [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:138)
  - checkout writes `createdAt: Date.now()` into the payload even though `createOrder()` later overwrites `createdAt` with `serverTimestamp()`
  - checkout also computes fulfillment and margin fields inline, including `deliveryPartner`, `deliveryPartnerCost`, `profitMargin`, `absorbedCost`, and `deliveryMethod`
  - implication: order-shape authority is still split between checkout-page assembly and API-layer normalization

- Payment authority split:
  - checkout uses backend routes `POST /api/create-razorpay-order` and `POST /api/verify-razorpay-payment` from [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:375)
  - order creation still happens directly from frontend Firestore writes in [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:138)
  - manual proof review writes `paymentProofs` separately in [src/services/PaymentVerificationService.ts](f:\Manaintibojanam_final2\src\services\PaymentVerificationService.ts:40)
  - alternate backend implementation also exists in [server/server.js](f:\Manaintibojanam_final2\server\server.js:261) with `/create-order` and `/verify-payment` route shapes
  - implication: successful Razorpay verification and proof-review workflow are adjacent systems, not one canonical pipeline

- Razorpay webhook infrastructure gap:
  - [src/services/PaymentVerificationService.ts](f:\Manaintibojanam_final2\src\services\PaymentVerificationService.ts:165) assumes webhook events are logged in `razorpayWebhooks`
  - no active webhook endpoint or persistence path was found in traced executable code in [server.ts](f:\Manaintibojanam_final2\server.ts:1) or [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1)
  - [INTEGRATION_GUIDE.md](f:\Manaintibojanam_final2\INTEGRATION_GUIDE.md:185) includes a sample `razorpayWebhook` Cloud Function that would log events, but this appears to be guide text rather than current runtime authority
  - implication: any payment-proof logic that depends on matching persisted Razorpay webhook logs should be treated as unverified or inactive until live evidence proves otherwise

- Admin update authority split:
  - normal admin status changes use direct Firestore writes in [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:300) and then call backend `POST /api/orders/:id/notify-status`
  - admin dashboard scheduled-prep alert path in [src/pages/AdminPanel.tsx](f:\Manaintibojanam_final2\src\pages\AdminPanel.tsx:156) writes `status: PREPARING` with raw `updateDoc(...)` instead of the shared helper
  - payment verification UI in [src/components/admin/PaymentVerificationPanel.tsx](f:\Manaintibojanam_final2\src\components\admin\PaymentVerificationPanel.tsx:80) advances the order with `updateOrderStatus(...)`, but payment success is written separately via `updatePaymentStatus(...)`
  - courier booking UI in [src/components/admin/CourierBookingModal.tsx](f:\Manaintibojanam_final2\src\components\admin\CourierBookingModal.tsx:58) writes `status: 'COURIER_BOOKED'` and courier metadata directly instead of using the shared transition helper
  - implication: not every admin-driven state change is guaranteed to pass through one transition validator or one notification fanout path

- Admin settings field drift:
  - backend defaults and settings reads in [server.ts](f:\Manaintibojanam_final2\server.ts:483) center `isStoreOpen` and `storeTiming.isManualOverride`
  - checkout state, navbar, and menu logic also center `isStoreOpen` in [src/hooks/useCheckoutState.ts](f:\Manaintibojanam_final2\src\hooks\useCheckoutState.ts:14), [src/lib/storeUtils.ts](f:\Manaintibojanam_final2\src\lib\storeUtils.ts:1), and [src/pages/Menu.tsx](f:\Manaintibojanam_final2\src\pages\Menu.tsx:449)
  - home page settings fetch in [src/pages/Home.tsx](f:\Manaintibojanam_final2\src\pages\Home.tsx:261) mainly mirrors `settings.isStoreOpen` and open time instead of reusing shared time-window logic
  - implication: `isStoreOpen` is the practical canonical field, but store-open UX may differ between screens when timing windows and manual override are involved

- Callable Functions trust level:
  - [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1) exports callable Razorpay helpers, but current implementation references `functions.https.HttpsError` without importing `functions`
  - local validation on 2026-05-18 found `npm.cmd run lint` fails in `functions/` with `Parsing error: Unexpected token .` at the optional-chaining expression `error.error?.description`
  - local validation on 2026-05-18 also found `node -e "require('./index.js')"` fails immediately when Razorpay env keys are absent because the module constructs `new Razorpay(...)` at import time
  - implication: treat callable Functions as duplicate scaffolding until they are syntax-checked, deployed, and proven in logs

- Multi-backend drift:
  - primary traced backend for current app behavior is [server.ts](f:\Manaintibojanam_final2\server.ts:1)
  - separate legacy/alternate backend exists at [server/server.js](f:\Manaintibojanam_final2\server\server.js:1) with passkey endpoints plus `/create-order` and `/verify-payment`
  - implication: backend route shape and operational assumptions may differ depending on which server artifact is actually deployed

- Notification schema/status drift:
  - order creation path in [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:289) writes `phone`, not `phoneNumber`
  - Firestore notification trigger type in [functions/src/notifications.ts](f:\Manaintibojanam_final2\functions\src\notifications.ts:45) expects `phoneNumber`
  - customer notification message map in [functions/src/notifications.ts](f:\Manaintibojanam_final2\functions\src\notifications.ts:232) keys on lowercase statuses like `placed`, `accepted`, `preparing`
  - main order writes and shared enums use uppercase statuses like `PLACED`, `ACCEPTED`, `PREPARING`
  - implication: deployed notification triggers may send generic status text and omit expected phone data even when they execute

- Server notification path alignment:
  - best-effort backend notification endpoint is [server.ts](f:\Manaintibojanam_final2\server.ts:1677)
  - server push helper reads both `deviceTokens` and `fcmTokens` in [server.ts](f:\Manaintibojanam_final2\server.ts:758)
  - server customer notifier uses uppercase status keys like `PENDING`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` in [server.ts](f:\Manaintibojanam_final2\server.ts:807)
  - server customer notifier sends WhatsApp to `order.phone` and email to `order.userEmail` or `order.email`
  - frontend status-change helpers call backend `POST /api/orders/:id/notify-status` after direct Firestore writes in [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:274)
  - authenticated users can realistically register `deviceTokens` because [src/App.tsx](f:\Manaintibojanam_final2\src\App.tsx:67) mounts FCM initialization globally and [src/components/OrderTracking.tsx](f:\Manaintibojanam_final2\src\components\OrderTracking.tsx:220) prompts for permission on the customer tracking screen
  - implication: if production notifications are working today, the backend fanout path is a stronger candidate than the Firestore-triggered Functions path

## 11. Live Findings Captured

- Verified live backend health endpoint:
  - Date/time observed: 2026-05-17 17:42:59 UTC from `/api/health`
  - Reported env: `production`
  - Reported Firebase project: `mana-inti-bojanam-pune-492610`
  - Reported Firestore database: `ai-studio-3efd2980-c2f3-4286-8dff-afeca044d855`
- Verified live backend debug endpoint:
  - `/api/firestore-debug` confirmed the backend is using the same project and named database
- Production issues observed:
  - `/api/menu` returned HTTP `502`
  - `/api/admin/settings` returned HTTP `502`
  - `/api/firestore-status` returned HTTP `502`
  - `/api/admin/verify-connection` closed the connection unexpectedly
- Interpretation:
  - the backend is up, but several Firestore-backed read endpoints appear unhealthy in production
  - this should be treated as a current prod issue before running customer-impacting operational tests
- Recovery findings on 2026-05-18:
  - root cause was missing Google runtime credentials on Render
  - adding `FIREBASE_SERVICE_ACCOUNT` fixed backend Firestore access
  - `/api/admin/settings` and `/api/menu` now work against production Firestore
  - one scheduled COD order was placed successfully in production
  - user also reported a successful online payment on 2026-05-12 and said the funds were credited successfully
  - live admin status/payment wording confirms `COD - PENDING`
  - after the hosting deploy on 2026-05-18, live customer order tracking was verified to show `Total Amount` for COD
  - this closes the previously observed COD wording mismatch in live order tracking
- Lighthouse mobile snapshot on 2026-05-18 for `https://mana-inti-bojanam-pune-492610.web.app/`:
  - run warnings: stored `IndexedDB` may have affected the result, and Lighthouse reported that the page loaded too slowly to finish fully within the time limit
  - headline metrics: Performance `44`, Accessibility `100`, Best Practices `100`, SEO `100`
  - key vitals: `FCP 2.1s`, `LCP 10.6s`, `TTI 10.6s`, `TBT 808ms`, `CLS 0.196`
  - server response is not the problem; root document TTFB was about `20ms`
  - dominant bottleneck is client-side work, not backend latency
- Lighthouse performance interpretation:
  - main-thread work is high at `7.5s`, with `2.7s` in JavaScript execution alone
  - the heaviest script costs came from `assets/index-BjDldVjN.js`, `assets/vendor-motion-CHRa4GMY.js`, `assets/vendor-firebase-B2SxWerL.js`, `assets/checkout-CDlhaL6z.js`, `assets/admin-panel-Cdkuqs3T.js`, and early `__/auth/iframe.js`
  - transfer weight is about `1.67 MB`, with images dominating at roughly `1.09 MB`
  - third-party and external dependency weight is still large enough to matter, especially Google auth/bootstrap traffic and remote image delivery
- Lighthouse content and layout findings:
  - LCP was the homepage `h2` text `Evening Cravings`, with most of the delay attributed to render delay rather than network wait
  - CLS was `0.196`, with the main shift tied to homepage content inside `main#main-scroll-container`, around the `Evening Cravings` / `Trending Now` section family
  - image-delivery insight estimated about `716 KiB` of savings, largely from oversized homepage and Pinterest-hosted images, plus `splash-premium.png`
  - render-blocking CSS still exists in `assets/index-DY1-uje2.css` and `assets/checkout-CIGW-MKW.css`
- Lighthouse cleanup implications:
  - homepage image strategy needs attention before bundle micro-optimization alone will move LCP materially
  - admin and checkout code still show up strongly in the shipped JavaScript profile, which supports keeping bundle-splitting and route-isolation work in scope
  - Firebase/Auth initialization cost is visible very early in load, so auth bootstrap should be treated as part of the landing-page performance budget
  - this snapshot does not block the production audit conclusion, but it does add a separate production readiness concern around storefront performance

## 12. Immediate Live-Audit Checklist

Run these before any runtime cleanup:

1. Capture the Firestore document for order `#916559`, including exact `paymentStatus`, `paymentMethod`, `isCOD`, `orderType`, `deliveryType`, and document ID.
   Status: completed on 2026-05-18. Document `rv8ly4KDbjCPd6tyte2L` has `paymentStatus: pending`, `paymentMethod: cod`, `isCOD: true`, `orderType: scheduled`, `deliveryType: scheduled`, `status: ACCEPTED`.
2. COD wording fix in [src/components/OrderTracking.tsx](f:\Manaintibojanam_final2\src\components\OrderTracking.tsx:759) was deployed on 2026-05-18 and verified live; no further action is needed for this specific wording issue.
3. Read-only Firestore sample completed on 2026-05-18 via [prod-audit-sample.json](f:\Manaintibojanam_final2\prod-audit-sample.json:1); use it to refine the remaining live checks instead of rerunning immediately.
4. Expand live doc inspection beyond the current sample if needed, especially for a recent active order and any user doc that should contain push tokens.
5. Online payment success has been reported by the user for 2026-05-12; next step is to confirm the exact authority path from the stored order/payment fields or backend logs rather than re-proving only that money can be collected.
   Status: substantially completed on 2026-05-18. Live backend read traced successful order `#463577` as document `w82jeDCHJt8fFRdEjnyN` with `paymentMethod: razorpay`, `paymentStatus: success`, `razorpayOrderId: order_SoWIyJUnPrb0kI`, and `razorpayPaymentId: pay_SoWJYCCLKonwN0`. Remaining gap is direct backend log correlation, not order discovery.
6. Check whether live user docs store tokens in `deviceTokens`, `fcmTokens`, `fcmToken`, or some combination; the current read-only sample found none in its sampled user docs, and a separate targeted scan reportedly found none in a larger set, so verify on a user/device that has explicitly granted notifications.
   Status: narrowed on 2026-05-18. Source confirms token registration is reachable for authenticated users through [src/App.tsx](f:\Manaintibojanam_final2\src\App.tsx:67), [src/hooks/useFCMInitialization.ts](f:\Manaintibojanam_final2\src\hooks\useFCMInitialization.ts:9), and the permission prompt in [src/components/OrderTracking.tsx](f:\Manaintibojanam_final2\src\components\OrderTracking.tsx:220), but backend APIs still do not expose user-doc reads to prove stored tokens directly.
7. Confirm whether deployed Firebase Functions are active, especially new-order admin push and customer status push.
8. Before trusting callable Functions as fallback payment infrastructure, lint or otherwise validate [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1) and confirm its deployed revision.
   Status: local validation completed on 2026-05-18. Current file failed `functions` lint due to parser config versus optional chaining, and direct module load failed without Razorpay env keys because initialization happens at import time.
9. When verifying live notifications, explicitly compare raw order fields and statuses against [functions/src/notifications.ts](f:\Manaintibojanam_final2\functions\src\notifications.ts:1) because its expected schema does not currently match checkout writes.
10. During live notification verification, compare the Firestore-triggered Functions path with the backend `POST /api/orders/:id/notify-status` path in [server.ts](f:\Manaintibojanam_final2\server.ts:1677); the backend path currently matches source schema better.
   Status: strengthened on 2026-05-18. Traced production order `#463577` uses `phone`, `userEmail`, `userId`, and uppercase status transitions, which fit the backend notifier materially better than the Functions trigger path that expects `phoneNumber` and lowercase status keys. Reachability is also stronger on the backend side because frontend helpers already call `POST /api/orders/:id/notify-status` after Firestore status writes. A live status-change test for order `#936271` yielded only the in-app toast on the customer side, so push/WhatsApp/email fanout remain unproven.
11. During admin-flow verification, test at least one status change from the dashboard and one scheduled prep alert path to confirm both produce the same timeline and customer notification behavior.
   Status: partially completed on 2026-05-18. One live status-change test for order `#936271` resulted in customer-visible in-app toast only; scheduled prep path remains unverified, and non-toast channels are still unproven.
12. During settings verification, confirm the live `adminSettings/global` document uses `isStoreOpen` as the real boolean authority and check whether home, navbar, menu, and checkout all show the same open/closed state near opening and closing time.
13. During online-payment verification, check whether `razorpayWebhooks` receives any live documents at all; the current read-only sample found the collection empty.
14. Use the 2026-05-18 Lighthouse snapshot as the baseline for storefront performance work, especially homepage image delivery, early auth/Firebase work, and route bundle isolation.

## 13. Current Audit Conclusion

- Audit completion state: source-backed audit completed; production verification still partial
- What is verified enough to act on now:
  - checkout creates orders by direct Firestore write and uses backend Razorpay HTTP routes for online payment creation and verification
  - backend Firestore access was broken on 2026-05-17 and recovered on 2026-05-18 after `FIREBASE_SERVICE_ACCOUNT` was supplied to Render
  - one scheduled COD order succeeded in production and exposed a customer/admin wording mismatch for COD, which was then fixed and verified live on 2026-05-18
  - user-reported production evidence for 2026-05-12 is now backed by a traced production order: `#463577` / document `w82jeDCHJt8fFRdEjnyN` with `paymentMethod: razorpay`, `paymentStatus: success`, `razorpayOrderId: order_SoWIyJUnPrb0kI`, and `razorpayPaymentId: pay_SoWJYCCLKonwN0`
  - saved production sample confirms live `razorpay` orders and expiry/payment-status transitions in Firestore, while the live backend user-order read now adds one successful traced online order with enough fields to support the main authority chain
  - read-only production Firestore sampling succeeded on 2026-05-18 and confirmed live schemas for `users`, `orders`, `coupons`, `categories`, `reviews`, and `adminSettings/global`
  - targeted Firestore read confirmed production order `#916559` as document `rv8ly4KDbjCPd6tyte2L` with `status: ACCEPTED` and `paymentStatus: pending`
  - notification, payment-proof, callable Functions, and webhook paths show real authority drift in source and should not be simplified blindly
  - callable Razorpay Functions are now locally validated as non-production-ready in their current form: they fail local lint under the current `functions/.eslintrc.js`, reference `functions.https.HttpsError` without importing `functions`, and require Razorpay keys at module import time
  - notification authority is still not fully proven live end-to-end, but schema comparison plus traced-order evidence now favor the backend fanout path over the Firestore-triggered Functions path
  - a Lighthouse mobile snapshot on 2026-05-18 shows a separate production-readiness problem on the storefront: `LCP 10.6s`, `TTI 10.6s`, `TBT 808ms`, and `CLS 0.196`, driven mainly by heavy client execution and oversized image delivery rather than backend TTFB
- Highest-confidence runtime authorities from current evidence:
  - order creation authority: frontend direct Firestore write via [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:138)
  - online payment authority: backend `POST /api/create-razorpay-order` and `POST /api/verify-razorpay-payment` via [server.ts](f:\Manaintibojanam_final2\server.ts:1134)
  - customer notification candidate: backend `POST /api/orders/:id/notify-status` fanout via [server.ts](f:\Manaintibojanam_final2\server.ts:1677)
  - settings authority candidate: `adminSettings/global` centered on `isStoreOpen` and `storeTiming`
- Highest-risk inconsistencies still open:
  - token storage drift across `fcmToken`, `fcmTokens`, and `deviceTokens`
  - status vocabulary drift across uppercase order states, lowercase notification mappings, and rules
  - payment proof vocabulary drift between order fields, `paymentProofs`, and rules
  - likely inactive or unused webhook infrastructure for `razorpayWebhooks`
  - admin flows that bypass shared update helpers
  - multiple backend implementations with different route shapes and feature surfaces
  - live notification behavior is still incomplete: order `#936271` confirmed in-app toast, but did not yet prove push, WhatsApp, or email delivery
  - storefront performance is materially below a safe production target because homepage images, early auth/bootstrap work, and large JS bundles are delaying render and interactivity

## 14. Remaining Blockers

- Read-only Firebase admin access is now available and the sample run completed, but the following remain unclosed:
  - exact production token fields in a user document that should already have push registration; the saved sample found none in its sampled docs, and the larger targeted scan referenced above is not reproducible from the current local script alone
  - whether deployed Firebase Functions are active and authoritative
  - whether `razorpayWebhooks` is populated by any real webhook handler after an online payment event
- Even with user-reported successful online payment, Razorpay authority and proof-review interactions remain partially inferred until the corresponding stored order/payment evidence or backend logs are traced

## 15. Accepted Verification Gaps

These items remain unverified in the current environment, but they are now narrow enough to treat as accepted audit gaps rather than blockers for every cleanup decision:

- direct proof of stored push tokens in a real production user document after explicit notification opt-in
- direct proof that customer status fanout delivered browser push, WhatsApp, or email in production; current live evidence for order `#936271` confirms only the in-app toast path
- direct proof that deployed Firebase Functions notification triggers are active and authoritative in production
- direct proof that `razorpayWebhooks` is populated by a real webhook handler after a live online payment event

Operational note:

- these gaps matter before deleting notification or webhook paths
- they do not block documenting current runtime candidates, de-scoping non-production-ready callable Functions, or sequencing lower-risk cleanup work

## 16. Safe Finish Line

This audit is finished for the current environment.

To convert it into a production-verified final audit, the minimum next inputs are:

1. One targeted Firestore read for a user doc that should contain push tokens after explicit notification opt-in.
2. One traced online-payment example: matching order document, payment fields, and if possible backend logs for the successful payment reported on 2026-05-12.
   Status: traced order and payment fields completed for `#463577`; backend log correlation remains optional but still useful.
3. One notification verification pass comparing backend fanout versus Firestore-triggered Functions behavior.
   Status: partially completed on 2026-05-18. Order `#936271` produced only the in-app toast on customer status change; backend push/WhatsApp/email delivery and Functions-triggered fanout remain unproven.

If resuming later, start with item 1 or item 3 above. Those are the two remaining checks most likely to change cleanup decisions.

## 17. Sign-Off Draft

- Sign-off state: ready for working sign-off with accepted verification gaps
- Safe conclusions to carry forward:
  - treat frontend Firestore order creation and backend Razorpay HTTP routes as the strongest current payment authority chain
  - treat backend `POST /api/orders/:id/notify-status` fanout as the strongest current notification candidate
  - treat [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1) as non-production-ready duplicate scaffolding unless separately repaired and proven
  - do not delete notification or webhook paths solely from source similarity, because production delivery and webhook persistence are still not fully proven
- Recommended sign-off wording:
  - this audit is sufficient for sequencing and low-risk cleanup planning
  - this audit is not sufficient for aggressive removal of duplicate notification or webhook paths without one additional production verification pass
