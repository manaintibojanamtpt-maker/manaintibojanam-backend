# Changelog

All notable changes to BhojanOS are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [v1.0.0-m0] — 2026-06-30

### Security (M0 — Security Hardening)

#### Added

- Guest order view JWT library (`backend-lib/guestOrderToken.ts`, ADR-012)
- Order read access policy (`backend-lib/orderAccess.ts`)
- `POST /api/orders/:id/guest-view-token` with phone verification and rate limiting
- Firebase auth on `GET /api/orders/user/:userId` and `POST /api/orders/:id/notify-status`
- Order read/patch middleware with `FF_ORDER_AUTH_ENFORCE` shadow mode
- Razorpay draft ownership binding with `FF_RAZORPAY_DRAFT_BIND` shadow mode
- Security test suite: `npm run test:security`
- M0 specification, ADR-011, ADR-012, PR template

#### Changed

- Firestore rules: deny test collections; tighten `subscriptions`, `referrals`, `aiAnalytics`
- Guest order tracking uses API + sessionStorage JWT instead of open order GET
- `RazorpayProvider` sends `draftId` to create/verify endpoints
- Global API fetch attaches Firebase Bearer token when authenticated

#### Documentation

- `docs/specs/M0-security.md`, `docs/api.md`, `docs/release-notes/M0.md`

### Rollback

- Feature flags: `FF_ORDER_AUTH_ENFORCE`, `FF_RAZORPAY_DRAFT_BIND`
- Firestore rules redeploy from prior commit

---

## Prior releases

See git history before `v1.0.0-m0` for pre-M0 changes.
