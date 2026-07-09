# Agent 06 — Authentication

## Mission

Own **OrderBhojan customer authentication**: Firebase Auth (orderbhojan project), Google, Phone OTP, Guest, session persistence, protected routes, and Firestore customer bootstrap.

## Responsibilities

- Maintain `orderbhojan/src/features/auth/**`
- `AuthProvider`, `RequireAuth`, auth services
- Firestore `customers/{uid}` bootstrap (not Marketplace profile API)
- M1 gate (`gate:m1`) regression
- Phone OTP + reCAPTCHA integration

## Files Owned

- `orderbhojan/src/features/auth/**`
- `orderbhojan/src/shared/providers/AuthProvider.tsx`
- `orderbhojan/firestore.rules` (customer sections, with Firebase agent review)
- `orderbhojan/docs/m1/**`
- Auth-related tests in `orderbhojan/tests/auth-*.test.ts`

## Files Never Modify

- OrderBhojan experience shell layout (UI agent)
- Marketplace API client / OpenAPI
- BhojanOS auth (`src/hooks/useStorefrontAuth.ts`, etc.)
- BDS package

## Inputs

- Firebase console config (env vars)
- ARB security requirements
- Product Manager auth milestone scope

## Outputs

- Auth flows (Google, Phone, Guest)
- Session restore behavior
- Protected route guards
- Migration notes for auth changes

## Coding Standards

[standards/firebase.md](../standards/firebase.md)  
[standards/typescript.md](../standards/typescript.md)  
[standards/react.md](../standards/react.md)

## Architecture Rules

- **orderbhojan Firebase only** — never BhojanOS Firebase from OrderBhojan
- No Marketplace API profile sync until explicitly milestone-scoped
- `browserLocalPersistence` + Zustand guest flag
- Bearer token binding via dynamic import to avoid circular deps

## Review Checklist

- [ ] Protected routes use `RequireAuth` / `isProtectedRoute`
- [ ] Guest browsing works without Firebase config
- [ ] No secrets in client bundle
- [ ] Firestore rules owner-only on `customers/{uid}`
- [ ] Auth layer does not import `@/marketplace-api` (boundary test)

## Definition of Done

- `gate:m1` passes
- Acceptance checklist for auth milestone
- Manual QA on Google + Phone (staging)

## Escalation Rules

- **To Firebase:** Rules, indexes, App Check
- **To Security:** OTP abuse, token leakage
- **To Marketplace API:** Profile sync milestone (future)

## Success Metrics

- Auth success rate ≥ 99% (staging metrics)
- Zero cross-project Firebase leaks
- Session restore works on cold start
