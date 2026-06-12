# Production Audit Decision Memo

Last updated: 2026-05-19

This memo summarizes the current production audit in decision-ready form.

Primary evidence source: [PROD_AUDIT_TEMPLATE.md](f:\Manaintibojanam_final2\PROD_AUDIT_TEMPLATE.md:1)

## What We Know

- Production backend Firestore access was broken on 2026-05-17 and recovered on 2026-05-18 after `FIREBASE_SERVICE_ACCOUNT` was supplied to Render.
- A read-only Firestore sample exists at [prod-audit-sample.json](f:\Manaintibojanam_final2\prod-audit-sample.json:1) and confirms live schema for `users`, `orders`, `coupons`, `categories`, `reviews`, and `adminSettings/global`.
- One scheduled COD order was successfully placed in production on 2026-05-18.
- The tested COD order is document `rv8ly4KDbjCPd6tyte2L`, order `#916559`, with `status: ACCEPTED` and `paymentStatus: pending`.
- The current checkout authority writes orders directly from the frontend via [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:138).
- The current online payment authority appears to be backend HTTP routes in [server.ts](f:\Manaintibojanam_final2\server.ts:1134), not callable Firebase Functions.
- The saved production sample confirms real Firestore orders with `paymentMethod: razorpay`, but the sampled online cases were expired/failed rather than successful traced payments.
- A live backend read on 2026-05-18 traced the successful online order `#463577` as document `w82jeDCHJt8fFRdEjnyN` with `paymentMethod: razorpay`, `paymentStatus: success`, `razorpayOrderId: order_SoWIyJUnPrb0kI`, and `razorpayPaymentId: pay_SoWJYCCLKonwN0`.

## Current Runtime Candidates

- Order creation authority:
  [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:138)
- Online payment authority:
  [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:375) and [server.ts](f:\Manaintibojanam_final2\server.ts:1134)
- Customer/admin notification candidate:
  [server.ts](f:\Manaintibojanam_final2\server.ts:1677)
- Store settings authority candidate:
  `adminSettings/global` using `isStoreOpen` and `storeTiming`

## Highest-Risk Findings

1. Notification token schema drift exists across `deviceTokens`, `fcmTokens`, and singular `fcmToken`.
2. Order status vocabulary is fragmented across uppercase order states, lowercase notification mappings, and rules constraints.
3. Subscription checkout writes `status: ('active' as OrderStatus)` in [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:299), mixing subscription lifecycle state into the normal `orders.status` field.
4. Callable Razorpay Functions in [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1) should not be trusted as fallback infrastructure; the file references `functions.https.HttpsError` without importing `functions`, fails local lint under the current `functions/.eslintrc.js`, and instantiates Razorpay at module import time.
5. Webhook persistence for `razorpayWebhooks` is not confirmed by traced runtime code and the sampled collection was empty.
6. Some admin state changes bypass shared helpers, especially the scheduled prep path in [src/pages/AdminPanel.tsx](f:\Manaintibojanam_final2\src\pages\AdminPanel.tsx:156) and courier booking path in [src/components/admin/CourierBookingModal.tsx](f:\Manaintibojanam_final2\src\components\admin\CourierBookingModal.tsx:58).
7. The previously observed COD wording mismatch in live order tracking was fixed and verified on 2026-05-18; admin still shows `COD - PENDING`, while customer tracking now correctly shows `Total Amount` for COD.
8. Notification authority is still not fully proven live end-to-end, but traced production order schema now favors the backend fanout path over the Firestore-triggered Functions path.
   Source reachability is now clearer too: [src/App.tsx](f:\Manaintibojanam_final2\src\App.tsx:67) mounts [src/hooks/useFCMInitialization.ts](f:\Manaintibojanam_final2\src\hooks\useFCMInitialization.ts:9) for authenticated users, and [src/components/OrderTracking.tsx](f:\Manaintibojanam_final2\src\components\OrderTracking.tsx:220) prompts customers to grant permission, so token registration is reachable even though backend APIs still do not expose user-doc reads to prove stored tokens directly.
   Live status-change evidence is now slightly stronger but still incomplete: order `#936271` showed only the in-app toast on the customer side, which proves the local UI reaction path but not push, WhatsApp, or email fanout.
9. Checkout still assembles the order payload inline in [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:266), including subscription-only semantics like `status: ('active' as OrderStatus)` and `orderType: subscription_master`, so order-shape authority is still split before the shared `createOrder()` layer runs.
10. The production storefront now also has a documented Lighthouse performance problem from 2026-05-18: `LCP 10.6s`, `TTI 10.6s`, `TBT 808ms`, and `CLS 0.196`, with the largest contributors being oversized homepage images, heavy app/vendor JS, early Firebase/Auth bootstrap, and route chunks such as checkout/admin still showing up in the shipped profile.

## Do Not Simplify Yet

- Notification paths
- Payment-proof workflow
- Razorpay webhook assumptions
- Callable payment Functions
- Multi-backend duplication

These areas still show authority drift, so cleanup before live verification would be risky.

## Safe First Fixes

1. Explicitly de-scope [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1) from production assumptions unless it is repaired, linted, and proven in deployment logs.
2. Online payment tracing is now materially complete for one production success case: `#463577` on 2026-05-12. Remaining optional work is backend log correlation if we want proof of the exact create/verify HTTP exchange, not just the stored result.
3. Verify one real user document after notification opt-in to determine whether push tokens are stored at all, and in which field.
4. Test one admin status change and one scheduled prep alert path to confirm whether both follow the same notification and timeline behavior; one live test on order `#936271` produced only the in-app toast, so the backend candidate is still stronger in source but non-toast delivery remains unproven.
5. Confirm whether any real runtime path populates `razorpayWebhooks`, since the sampled collection was empty and no active persistence path was confirmed in source.
6. Treat the 2026-05-18 Lighthouse run as the current storefront baseline and prioritize image delivery, early auth/bootstrap cost, and bundle isolation before deeper polish work.

## Recommended Cleanup Order

1. Establish canonical runtime authority for orders, payments, notifications, and settings.
2. Normalize status vocabulary and token schema.
3. Verify or retire duplicate payment and notification paths.
4. Resolve subscription-order status contamination and helper bypasses in admin flows.
5. Address storefront performance bottlenecks that are already measured in production.
6. Only then start structural cleanup of duplicate codepaths.

## Decision

The audit is strong enough to guide safe sequencing, but not strong enough to support aggressive cleanup of payments or notifications yet.

Accepted verification gaps for sign-off:

- stored production push-token fields are still unproven directly
- live non-toast notification delivery is still unproven directly; order `#936271` confirmed only the in-app toast path
- deployed Firebase Functions notification authority is still unproven directly
- live `razorpayWebhooks` persistence is still unproven directly

These are accepted gaps, not reasons to stall all cleanup. The memo now supports a working sign-off position:

- proceed with documentation and low-risk cleanup sequencing
- de-scope or repair `functions/index.js` before treating it as real fallback infrastructure
- do not delete notification or webhook paths until one additional production verification pass closes the remaining delivery/persistence gaps

Use the working draft for evidence and this memo for prioritization.
