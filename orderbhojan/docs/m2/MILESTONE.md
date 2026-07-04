# Milestone M2 — Location Intelligence Platform

**Status:** PLANNING — ARB Review  
**Mode:** Planning only · No implementation code  
**Version target:** `0.4.0-m2`  
**Gate command (future):** `npm run gate:m2`  
**Date:** 2026-06-26

---

## Milestone ID

`M2` — Location Intelligence Platform (OrderBhojan client)

## Owner Agents (Implementation — future)

| Role | Agent |
|------|-------|
| Product | 01 Product Manager |
| Architecture | 02 ARB |
| Design | 03 DRB |
| Implementation | 07 Location Platform |
| API (backend contract) | 08 Marketplace API |
| Firebase (rules/index) | 09 Firebase |
| UX lineage | 18 Experience Evolution |
| Cross-product | 19 Ecosystem Guardian |
| Testing | 13 Testing |
| Release | 17 Release Manager |

## Problem Statement

OrderBhojan M1.6 delivers a premium marketplace shell with **mock data**. Customers cannot set a delivery location, save addresses, or enable location-aware discovery. Without a canonical location layer, M3 Discovery, M5 Restaurant context, M8 Quote/Checkout, and M11 Tracking cannot function.

M2 establishes the **client-side Location Intelligence Platform**: permission-aware GPS, India address capture, saved addresses in `orderbhojan` Firestore, session location context, and Marketplace API contracts for geocoding/serviceability — without implementing discovery, cart, or checkout.

## Scope

### In Scope

- Location feature module architecture (`orderbhojan/src/features/location/`)
- Domain model: `CustomerLocation`, `SavedAddress`, `IndiaAddress` (aligned with BhojanOS `docs/m2/INDIA-ADDRESS-MODEL.md`)
- Browser geolocation permission UX (grant / deny / unavailable)
- Address capture flow: hierarchy dropdowns + map pin (MapLibre lazy-loaded)
- Reverse geocode and pincode validation via **Marketplace API** (proposed endpoints — server proxy)
- Persist saved addresses: `customers/{uid}/addresses/{addressId}`
- Guest session location in local storage (coordinates + label only — no Firestore)
- Active location context store (Zustand) consumed by experience shell header
- MSW mocks for proposed location API endpoints
- Feature flag `FF_LOCATION_ENABLED` default **OFF**
- `gate:m2` definition (file presence, no API in wrong modules, tests)
- Full planning doc pack (this folder)

### Out of Scope

- M3 Discovery rails / live `GET /discover` integration
- M4 Search geo integration
- M5 Restaurant detail + `contextToken` flow
- M7 Cart / M8 Checkout / quote address binding
- M11 Order tracking map
- BhojanOS `src/` or `server.ts` modifications
- OpenAPI YAML implementation (Marketplace API agent — post-approval)
- Direct Nominatim / Google Maps from client
- Branch CRUD or admin tools
- International addresses (India only)

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| M1 Auth | Complete | Guest + authenticated; address subcollection rules exist |
| M1.6 Premium UX | Complete | Location chrome integrates with experience shell |
| BDS v1.0 | Complete | `AddressInput`, forms, sheets |
| BhojanOS M2 Location SDK | Design complete | Backend reference: `docs/m2/` — OrderBhojan consumes via Marketplace API only |
| Marketplace API v1.0 | Partial | `lat`/`lng` on discover/search — location endpoints **proposed in M2** |

## Acceptance Criteria (Planning — testable at implementation)

- [ ] AC-1: User can grant/deny GPS; all three states have designed UX (granted, denied, unavailable)
- [ ] AC-2: Authenticated user can save, list, edit, delete, and set default address in Firestore
- [ ] AC-3: Guest can set session location locally; prompted to sign in to save
- [ ] AC-4: Address form validates India pincode (6 digit) and requires map pin coordinates
- [ ] AC-5: Reverse geocode flows through Marketplace API contract — no direct geocoder from client
- [ ] AC-6: Active location appears in marketplace header / location chip (BDS + M1.6 chrome)
- [ ] AC-7: `FF_LOCATION_ENABLED` OFF → no location API calls; legacy M1.6 behavior preserved
- [ ] AC-8: `gate:m2` passes including M1, M1.5, M1.6 regression
- [ ] AC-9: WCAG AA for address form and permission dialogs
- [ ] AC-10: No Marketplace discover/search/cart/checkout calls from location module

## Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `FF_LOCATION_ENABLED` | OFF | Master location module |
| `FF_LOCATION_MAP_ENABLED` | OFF | MapLibre map pin UI |
| `FF_LOCATION_GEOCODE_API` | OFF | Call Marketplace geocode endpoints (MSW until backend live) |

## Quality Gates (Planning)

See [QUALITY-GATES.md](./QUALITY-GATES.md) and [docs/milestone-quality-matrix.md](../../../docs/milestone-quality-matrix.md).

## Documentation Deliverables (Planning Phase)

- [x] MILESTONE.md (this file)
- [x] ARCHITECTURE-REPORT.md
- [x] DESIGN-REVIEW.md
- [x] DOMAIN-MODEL.md
- [x] API-CONTRACTS-M2.md
- [x] RISK-ASSESSMENT.md
- [x] ROLLOUT-STRATEGY.md
- [x] ACCEPTANCE-CHECKLIST.md
- [x] QUALITY-GATES.md
- [x] ARB-APPROVAL-PACKAGE.md

## STOP Condition

**Planning STOP:** After ARB approval package is signed, do **not** activate Location Platform or other engineering agents until explicit implementation approval from CEO + ARB + DRB.

**Implementation STOP (future):** After `gate:m2` passes, do not start M3 Discovery until approved.

## Risks

See [RISK-ASSESSMENT.md](./RISK-ASSESSMENT.md).

## Sign-Off (Planning Phase)

| Role | Agent | Date | GO/NO-GO |
|------|-------|------|----------|
| CEO | 00 | 2026-06-26 | GO — planning authorized |
| Product Manager | 01 | 2026-06-26 | GO — spec complete |
| ARB | 02 | 2026-06-26 | **GO — approval package complete** |
| DRB | 03 | 2026-06-26 | GO — UX flow approved (planning) |
| Release Manager | 17 | — | Pending implementation |

---

*Executive Board — M2 Planning Only*
