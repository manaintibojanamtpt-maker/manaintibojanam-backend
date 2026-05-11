# Safe Duplication Cleanup Plan

This document is for production-safe cleanup only.

It does not assume that duplicate code is unused. It separates:

- duplicate code that is definitely active
- duplicate code that is probably scaffolding
- duplicate code that must not be removed until verified

The app is live, so the goal is to reduce duplication without changing revenue-critical behavior.

## 1. Cleanup Rule

Do not delete or redirect a duplicate path until all 3 are true:

1. the live path is confirmed with production evidence
2. the fallback path is known and tested
3. rollback is one small revert, not a multi-file rescue

## 2. Highest Duplication Areas

### A. Order Creation

There are at least two order creation patterns:

- direct Firestore write from [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:1)
- backend order creation through [server.ts](f:\Manaintibojanam_final2\server.ts:1)

Risk:

- different field names
- different pricing logic
- different status defaults
- different timeline behavior

Safe first action:

- confirm which path real checkout uses in production
- freeze that as the canonical path
- mark the other path as `secondary` in documentation until verified

Do not remove yet.

### B. Order Status Logic

Status rules are duplicated across:

- [src/types.ts](f:\Manaintibojanam_final2\src\types.ts:1)
- [src/services/api.ts](f:\Manaintibojanam_final2\src\services\api.ts:1)
- [src/services/OrderStateService.ts](f:\Manaintibojanam_final2\src\services\OrderStateService.ts:1)
- [src/lib/orderDisplay.ts](f:\Manaintibojanam_final2\src\lib\orderDisplay.ts:1)
- [firestore.rules](f:\Manaintibojanam_final2\firestore.rules:1)

Risk:

- prod orders may hold mixed old/new statuses
- UI may normalize values that rules do not allow
- admin actions may allow transitions that rules reject

Safest cleanup:

- do not change status values first
- create one canonical status matrix from actual prod data
- then align one consumer at a time

Do not remove yet.

### C. Payment Handling

Payment logic exists in multiple places:

- Razorpay APIs in [server.ts](f:\Manaintibojanam_final2\server.ts:1)
- payment proof workflow in [src/services/PaymentVerificationService.ts](f:\Manaintibojanam_final2\src\services\PaymentVerificationService.ts:1)
- admin review UI in [src/components/admin/PaymentVerificationPanel.tsx](f:\Manaintibojanam_final2\src\components\admin\PaymentVerificationPanel.tsx:1)
- callable Functions in [functions/index.js](f:\Manaintibojanam_final2\functions\index.js:1)

Risk:

- different payment states can be written by different paths
- review UI may assume proof-based flow even if live payments bypass it
- Functions may exist but not be operationally authoritative

Safest cleanup:

- identify the real production payment authority first
- keep non-authoritative flows as read-only or dormant until proven unused

Do not remove yet.

### D. Notifications

Notifications are duplicated across:

- client FCM setup in [src/services/NotificationService.ts](f:\Manaintibojanam_final2\src\services\NotificationService.ts:1)
- hooks in [src/hooks/useAdminNotifications.ts](f:\Manaintibojanam_final2\src\hooks\useAdminNotifications.ts:1) and [src/hooks/useFCMInitialization.ts](f:\Manaintibojanam_final2\src\hooks\useFCMInitialization.ts:1)
- Firebase Functions notifications in [functions/src/notifications.ts](f:\Manaintibojanam_final2\functions\src\notifications.ts:1)

Risk:

- token registration field drift
- admin/customer notification assumptions may not match real user schema
- one path may be broken while another path is live

Safest cleanup:

- first verify that tokens are actually saved in prod
- first verify whether deployed Functions are active
- only then remove one unused notification path

Do not remove yet.

### E. User Profile Shape

User/profile assumptions differ across files:

- [src/context/AuthContext.tsx](f:\Manaintibojanam_final2\src\context\AuthContext.tsx:1)
- [src/services/NotificationService.ts](f:\Manaintibojanam_final2\src\services\NotificationService.ts:1)
- [src/hooks/useAdminNotifications.ts](f:\Manaintibojanam_final2\src\hooks\useAdminNotifications.ts:1)
- [src/types.ts](f:\Manaintibojanam_final2\src\types.ts:1)

Risk:

- `userId` vs `uid`
- `deviceTokens` vs `fcmTokens`
- role assumptions may differ

Safest cleanup:

- standardize documentation first
- then make one non-behavioral field normalization pass

Possible first cleanup candidate after audit.

## 3. What Is Safe To Clean First

These are the safest categories of cleanup, in order.

### 1. Documentation-Level Canonicalization

Safe because:

- no runtime changes
- no production blast radius
- reduces future accidental divergence

Examples:

- define canonical `orders` schema
- define canonical status vocabulary
- define canonical `users` token field

### 2. Read-Only Code Consolidation

Safe only if behavior does not change.

Examples:

- centralize status labels used only for display
- centralize field name constants
- replace duplicated display-only mappings with one import

Must be tested visually afterward.

### 3. Remove Proven-Unused Scaffolding

Safe only after audit evidence.

Examples:

- unused Firebase Functions payment path
- unused notification helper path
- stale schema helper not touched by live flow

Removal must be one subsystem at a time.

## 4. What Is Not Safe Yet

Do not do these first:

- rewrite Firestore rules before confirming live writes
- remove direct Firestore order writes before tracing checkout
- remove backend payment routes before verifying online payment path
- rename statuses globally
- merge notification systems before confirming token storage and deployed Functions behavior

## 5. Recommended First Real Cleanup After Audit

If audit confirms mixed schema usage, the safest first real cleanup is:

`Create and enforce one canonical order schema and status vocabulary, without changing checkout flow yet.`

That means:

1. document the real production `orders` fields
2. document the real production status values
3. align helper code to those values without rerouting order placement
4. update only non-authoritative display/validation consumers first

This is safer than deleting backend paths immediately.

## 6. Staged Removal Order

Use this order only after audit evidence supports it.

### Stage 1

- freeze canonical schema in docs
- freeze canonical status matrix in docs
- classify duplicate paths as `authoritative`, `fallback`, or `unknown`

### Stage 2

- consolidate display-only status logic
- consolidate field-name assumptions
- leave write paths unchanged

### Stage 3

- choose one authority for order writes
- deprecate the non-authoritative path
- test full checkout and admin flow

### Stage 4

- choose one authority for payment verification
- deprecate secondary payment paths
- test online payment end to end

### Stage 5

- choose one authority for notifications
- remove only proven-unused notification path

## 7. Current Recommendation

As of now, the safest production-safe duplication cleanup is:

- keep runtime code unchanged
- use [PROD_AUDIT_TEMPLATE.md](f:\Manaintibojanam_final2\PROD_AUDIT_TEMPLATE.md:1) to confirm live paths
- then make the first cleanup a schema/status canonicalization pass

If you want runtime cleanup next, do it only after one controlled COD order trace and one online order trace are fully documented.
