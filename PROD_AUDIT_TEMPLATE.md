# Production Audit Template

Use this document to audit the live app before making architectural cleanup changes.

Rule of thumb: record only what you can verify from production behavior, logs, Firestore documents, or a controlled test order.

## 1. Environment

- Date:
- Tester:
- App URL:
- Firebase project:
- Backend URL:
- Build/version:
- Browser/device:
- Notes:

## 2. Core Collections

Capture 2-3 recent real documents for each collection.

### `users`

- Fields observed:
- Example role values:
- Token field used: `deviceTokens` / `fcmTokens` / other
- Address field shape:
- Notes:

### `orders`

- Fields observed:
- Status values observed:
- Payment status values observed:
- Address field names:
- Phone field names:
- Pricing fields:
- Scheduling fields:
- Notes:

### `paymentProofs`

- Used in production: yes/no
- Fields observed:
- Status values observed:
- Notes:

### `adminSettings`

- Fields observed:
- Live fee config:
- Live store timing:
- Workflow settings:
- Notes:

### `coupons`

- Used in production: yes/no
- Fields observed:
- Notes:

### `supportTickets`

- Used in production: yes/no
- Fields observed:
- Notes:

### `banners`

- Used in production: yes/no
- Fields observed:
- Notes:

### `categories`

- Used in production: yes/no
- Fields observed:
- Notes:

### `reviews`

- Used in production: yes/no
- Fields observed:
- Notes:

### `razorpayWebhooks`

- Used in production: yes/no
- Fields observed:
- Notes:

## 3. Real Status Vocabulary

Compare what is actually stored in production.

- Order statuses seen in prod:
- Payment statuses seen in prod:
- Any lowercase statuses:
- Any enum-style uppercase statuses:
- Mixed old/new statuses present: yes/no
- Notes:

Reference files:

- [src/types.ts](f:\Manaintibojanam_final2\src\types.ts:1)
- [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:1)
- [src/services/OrderStateService.ts](f:\Manaintibojanam_final2\src\services\OrderStateService.ts:1)
- [src/lib/orderDisplay.ts](f:\Manaintibojanam_final2\src\lib\orderDisplay.ts:1)
- [firestore.rules](f:\Manaintibojanam_final2\firestore.rules:1)

## 4. End-to-End Order Trace

Run one controlled order and record everything.

- Test type: COD instant / online instant / scheduled
- Test order time:
- Customer account used:
- Items ordered:
- Total shown in UI:
- Total stored in Firestore:
- Order document ID:
- Order number:
- Frontend page used:
- Network requests triggered:
- Firestore writes triggered:
- Backend logs observed:
- Final stored status:
- Final stored payment status:
- Any mismatch:

## 5. Code Path Mapping

For each action, identify the actual live path.

### Login/profile creation

- Path used:
- Evidence:

### Add/update cart

- Path used:
- Evidence:

### Place order

- Path used:
- Evidence:

### Payment create

- Path used:
- Evidence:

### Payment verify

- Path used:
- Evidence:

### Admin order status update

- Path used:
- Evidence:

### Customer order tracking

- Path used:
- Evidence:

### Push notification registration

- Path used:
- Evidence:

### New order notification to admin

- Path used:
- Evidence:

## 6. Firestore Rules Compatibility

For each live action, record whether the current rules allow it.

- Customer profile create/update:
- Customer order create:
- Customer order cancel:
- Customer review submit:
- Admin order update:
- Admin menu update:
- Payment proof submit:
- Notification token write:
- Any permission errors seen:
- Notes:

Reference:

- [firestore.rules](f:\Manaintibojanam_final2\firestore.rules:1)

## 7. Payments Audit

- Razorpay keys confirmed in production: yes/no
- Mock responses possible in production: yes/no
- Online payments actually create Razorpay order: yes/no
- Online payments actually verify signature: yes/no
- `paymentProofs` used for real orders: yes/no
- Admin manually verifies payments: yes/no
- COD flow works: yes/no
- Notes:

Reference files:

- [server.ts](f:\Manaintibojanam_final2\server.ts:1)
- [src/services/PaymentVerificationService.ts](f:\Manaintibojanam_final2\src\services\PaymentVerificationService.ts:1)
- [src/components/admin/PaymentVerificationPanel.tsx](f:\Manaintibojanam_final2\src\components\admin\PaymentVerificationPanel.tsx:1)
- [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1)

## 8. Notifications Audit

- Service worker active: yes/no
- Notification permission prompt works: yes/no
- FCM token generated: yes/no
- Token saved to user doc: yes/no
- Admin receives new order notification: yes/no
- Customer receives status notification: yes/no
- Firebase Functions deployed and active: yes/no
- Notes:

Reference files:

- [src/main.tsx](f:\Manaintibojanam_final2\src\main.tsx:1)
- [src/services/NotificationService.ts](f:\Manaintibojanam_final2\src\services\NotificationService.ts:1)
- [src/hooks/useAdminNotifications.ts](f:\Manaintibojanam_final2\src\hooks\useAdminNotifications.ts:1)
- [src/hooks/useFCMInitialization.ts](f:\Manaintibojanam_final2\src\hooks\useFCMInitialization.ts:1)
- [functions/src/notifications.ts](f:\Manaintibojanam_final2\functions\src\notifications.ts:1)

## 9. Business Config Consistency

- Business city shown in UI:
- Serviceability city:
- Contact phone:
- Contact email:
- Admin settings fees:
- Store timings:
- Any Pune/Tirupati mismatch:
- Notes:

Reference files:

- [src/constants.ts](f:\Manaintibojanam_final2\src\constants.ts:1)
- [src/services/ServiceabilityService.ts](f:\Manaintibojanam_final2\src\services\ServiceabilityService.ts:1)
- [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:1)

## 10. Risk Register

List only evidence-backed risks.

### Risk 1

- Severity:
- Evidence:
- User impact:
- Safe fix approach:

### Risk 2

- Severity:
- Evidence:
- User impact:
- Safe fix approach:

### Risk 3

- Severity:
- Evidence:
- User impact:
- Safe fix approach:

## 11. Classification

Put each subsystem in one bucket.

- Definitely live:
- Possibly live:
- Likely unused/scaffold:
- Do not touch yet:
- Safe candidates for later cleanup:

## 12. Final Audit Summary

- Primary order authority:
- Primary payment authority:
- Primary notification authority:
- Canonical status format:
- Canonical user schema:
- Canonical order schema:
- Highest-risk inconsistency:
- Safest first cleanup after audit:

## 13. Suggested First Controlled Test

Recommended sequence:

1. Place one low-value COD instant order.
2. Record the exact network requests.
3. Snapshot the order document immediately after placement.
4. Advance the order through admin statuses one step at a time.
5. Check whether customer tracking and admin updates remain consistent.
6. Repeat with one online payment order only after the COD flow is fully mapped.

## 14. Repo References

These are the main files to keep open while filling this out:

- [src/App.tsx](f:\Manaintibojanam_final2\src\App.tsx:1)
- [src/context/AuthContext.tsx](f:\Manaintibojanam_final2\src\context\AuthContext.tsx:1)
- [src/context/CartContext.tsx](f:\Manaintibojanam_final2\src\context\CartContext.tsx:1)
- [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:1)
- [src/pages/AdminPanel.tsx](f:\Manaintibojanam_final2\src\pages\AdminPanel.tsx:1)
- [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:1)
- [src/types.ts](f:\Manaintibojanam_final2\src\types.ts:1)
- [src/firebase.ts](f:\Manaintibojanam_final2\src\firebase.ts:1)
- [server.ts](f:\Manaintibojanam_final2\server.ts:1)
- [firestore.rules](f:\Manaintibojanam_final2\firestore.rules:1)
- [firebase.json](f:\Manaintibojanam_final2\firebase.json:1)
- [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1)
- [functions/src/notifications.ts](f:\Manaintibojanam_final2\functions\src\notifications.ts:1)
