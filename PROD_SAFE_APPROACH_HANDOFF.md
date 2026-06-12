# Production Safe Approach Handoff

Last updated: 2026-05-19

Primary evidence sources:
- [PROD_AUDIT_TEMPLATE.md](f:\Manaintibojanam_final2\PROD_AUDIT_TEMPLATE.md:1)
- [PROD_AUDIT_DECISION_MEMO.md](f:\Manaintibojanam_final2\PROD_AUDIT_DECISION_MEMO.md:1)

## Safe Position

The audit is strong enough to support careful sequencing and low-risk cleanup.

The audit is not strong enough to support aggressive deletion of duplicate payment, notification, or webhook paths.

## What Is Safe To Trust Now

- frontend order creation via [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:138)
- backend Razorpay HTTP flow via [server.ts](f:\Manaintibojanam_final2\server.ts:1134)
- backend notification candidate via [server.ts](f:\Manaintibojanam_final2\server.ts:1677)
- live COD wording fix is already deployed and verified
- successful online payment `#463577` on 2026-05-12 is traced strongly enough for audit purposes

## What Must Be Treated Carefully

- [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1) is not production-ready in its current form
- notification delivery is only partially proven; order `#936271` confirmed the in-app toast path only
- token storage authority is still unclear across `deviceTokens`, `fcmTokens`, and `fcmToken`
- `razorpayWebhooks` persistence is still unproven
- some admin status changes bypass shared helpers
- checkout still builds order payloads inline, including subscription-only status semantics in the main `orders` payload
- the storefront has a measured production Lighthouse problem from 2026-05-18, especially around homepage image weight, early Firebase/Auth work, and large shipped JS

## Safe Next Actions

1. De-scope [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1) from production assumptions unless it is repaired and separately validated.
2. Document backend `POST /api/orders/:id/notify-status` as the strongest current notification candidate, without deleting the alternate paths yet.
3. Normalize status vocabulary and token-field naming in planning documents before touching runtime behavior.
4. Isolate subscription-order status contamination and checkout payload-builder drift in [src/pages/Checkout.tsx](f:\Manaintibojanam_final2\src\pages\Checkout.tsx:266) as targeted cleanup items.
5. Review admin flows that bypass shared helpers, including prep alerts and courier booking, before attempting broader order-flow simplification.
6. Use the 2026-05-18 Lighthouse run as the baseline for storefront performance work, with first attention on oversized homepage images, early auth/bootstrap cost, and keeping admin/checkout bundles off the critical landing path.

## Do Not Do Yet

- do not remove notification codepaths just because they look duplicated
- do not remove webhook-related codepaths just because the sampled collection was empty
- do not trust callable Razorpay Functions as fallback infrastructure
- do not perform large structural cleanup across payments and notifications in one pass

## Accepted Gaps

These gaps are acceptable for now, but they should stay visible:

- direct proof of stored push tokens in a real opted-in production user doc
- direct proof of browser push, WhatsApp, or email delivery in production
- direct proof that deployed Firebase Functions notification triggers are authoritative
- direct proof that live webhook events populate `razorpayWebhooks`

## Recommended Order

1. Freeze assumptions and document runtime authority.
2. De-scope unsafe duplicate infrastructure.
3. Normalize schema and status vocabulary.
4. Clean up small isolated issues.
5. Re-verify production before any large deletion pass.

## Bottom Line

The safe approach is to prefer clarification, containment, and small isolated fixes over deletion.

Treat this project as one where runtime authority is mostly known, but not yet clean enough for aggressive simplification.

## Resume Here

If work resumes later, start with one of these:

1. Verify a real opted-in user document to confirm whether production tokens are stored in `deviceTokens`, `fcmTokens`, `fcmToken`, or not at all.
2. Run one notification verification pass that distinguishes backend fanout behavior from Firestore-triggered Functions behavior.

Those two checks are the remaining inputs most likely to change cleanup risk.
