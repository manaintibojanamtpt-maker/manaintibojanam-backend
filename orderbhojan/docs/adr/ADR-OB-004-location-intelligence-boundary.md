# ADR-OB-004 — OrderBhojan Location Intelligence Boundary

**Status:** Proposed — Accepted at M2 Planning  
**Date:** 2026-06-26  
**Authors:** ARB, Product Manager  
**Deciders:** ARB, DRB, Security consult

---

## Context

OrderBhojan M2 introduces customer location capture (GPS, India addresses, session context). BhojanOS already designs a Location SDK in `docs/m2/` for owner and backend use. OrderBhojan must consume location **services** without importing BhojanOS SDKs or querying BhojanOS Firestore. M1 established `customers/{uid}/addresses` in the **orderbhojan** Firebase project.

---

## Decision

1. OrderBhojan location logic lives exclusively in `orderbhojan/src/features/location/**` (Agent 07).
2. **Geocoding, pincode validation, and serviceability** are invoked only via **Marketplace API** location endpoints (proposed in `API-CONTRACTS-M2.md`) — never direct third-party geocoder calls from the browser.
3. **Saved addresses** persist only in `orderbhojan` Firestore `customers/{uid}/addresses/{id}` using the `IndiaAddress` DTO aligned with BhojanOS `docs/m2/INDIA-ADDRESS-MODEL.md`.
4. **Guest session location** uses localStorage with coordinates + display label only — no Firestore writes.
5. M2 **does not** call `GET /discover`, `GET /search`, quote, or checkout endpoints. It exposes `CustomerLocation` via `locationSessionStore` for M3+ consumers.
6. Map rendering uses **MapLibre + OSM** (lazy-loaded) — no Google Maps SDK. Paid geo APIs require separate CEO-approved ADR.
7. Feature flags `FF_LOCATION_*` default **OFF** until Release Manager production approval.

---

## Alternatives Considered

| Alternative | Rejected because |
|-------------|------------------|
| Client → Nominatim direct | CORS, ToS, rate limits (OB-R01) |
| Import BhojanOS LocationSDK in OrderBhojan | Violates ADR-OB-001 boundary |
| Store addresses in BhojanOS Firestore | Wrong Firebase project; security boundary |
| Skip map pin — GPS only | India addressing requires pin confirm (DRB) |
| Defer all API — client-only geohash | Insufficient UX label quality |

---

## Consequences

### Positive

- Clear separation: customer PII in orderbhojan; restaurant geo in BhojanOS backend
- M3 Discovery consumes stable session location interface
- MSW allows client progress before backend location routes ship

### Negative

- New Marketplace API surface to maintain
- Potential MSW/live contract drift until Phase 5 rollout

### Risks mitigated

| Risk | Mitigation |
|------|------------|
| Geocoder ToS violation | Server proxy only |
| SDK coupling | Marketplace API boundary |
| M3 scope creep in M2 | Explicit no-discover rule in gate:m2 |

---

## Compliance

- [x] ADR-OB-001 marketplace boundary preserved
- [x] No BhojanOS Firestore client access
- [x] No BhojanOS SDK import
- [x] Firestore rules pre-exist from M1
- [x] Feature flags OFF by default

**ARB sign-off:** ✓ 2026-06-26

---

*Filed: `orderbhojan/docs/adr/ADR-OB-004-location-intelligence-boundary.md`*
