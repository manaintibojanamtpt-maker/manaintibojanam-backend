# ADR-OB-001 — OrderBhojan Marketplace Boundary

**Status:** Proposed — M0 ARB Review  
**Date:** 2026-07-03  
**Deciders:** ARB, Principal Architect, Firebase Architect

---

## Context

OrderBhojan is a customer marketplace. BhojanOS is the production owner platform and system of record. GA-1, GA-2, GA-3, and frozen platforms M1–M8 must not be regressed.

---

## Decision

1. OrderBhojan is a **separate repository** (`orderbhojan`) deployed to Vercel with Firebase project `orderbhojan` for customer data only.
2. All restaurant commerce flows go through a **new Marketplace API layer** at `/api/marketplace/*` on the existing BhojanOS Render host.
3. The Marketplace API is an **additive router module** — it does not replace or expose legacy `/api/*` routes directly to OrderBhojan.
4. Marketplace API handlers **call frozen BhojanOS SDK orchestrators** internally; they do not bypass SDKs to raw Firestore except through existing repository adapters already used by SDKs.
5. OrderBhojan frontend **never** imports BhojanOS SDK packages or queries `tenants`, `menu`, or `orders` in `bhojanos-prod` Firestore.

---

## Consequences

### Positive

- Clear security boundary for customer app
- BhojanOS production storefront (`/k/{slug}`) unaffected
- Marketplace can evolve independently behind versioned API

### Negative

- New API surface must be maintained and versioned
- Some SDK capabilities are `NOT_CONFIGURED` today (branch assign, server quote) — Marketplace API backlog required

### Risks mitigated

| Risk | Mitigation |
|------|------------|
| Accidental Firestore coupling | ESLint import guard + architecture tests |
| Pricing drift (GA-3 regression) | Server quote mandatory; no client-side GST/delivery |
| Breaking frozen SDKs | Marketplace layer calls SDKs; SDKs unchanged |

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| OrderBhojan reads BhojanOS Firestore directly | Violates SSOT, leaks tenant paths, bypasses eligibility |
| Separate microservice for marketplace | Operational overhead; premature for v1 |
| Embed marketplace in BhojanOS monorepo UI | Blurs customer/owner concerns; wrong deploy cadence |
| Expose legacy API endpoints to OrderBhojan | Unstable contracts, exposes internal IDs and admin paths |

---

## Compliance

- [ ] Does not modify Firestore schema
- [ ] Does not modify frozen SDK DTOs
- [ ] Does not enable projection flags
- [ ] Additive server routes only

**ARB sign-off:** ☐ Pending M0
