# BHOS-M2 — Location Intelligence Platform

**Status:** ✅ Approved — Architecture & Design Only  
**Date:** 2026-06-26  
**Authority:** BHOS-000, BHOS-TDD-001, BHOS-PAF-001, FEB-001, ADR-011, ADR-013  
**Milestone:** M2 — Location Intelligence Platform  
**Implementation:** **NOT STARTED** — await approval

---

## Executive Summary

BhojanOS today treats location as **ad-hoc UI logic** embedded in checkout and owner settings. There is no LocationSDK, no geohash index, no India-standard address hierarchy, no map component, and no multi-branch model. Nominatim is called directly from the browser; distance and delivery fees are computed inline via Haversine in `src/lib/deliveryFee.ts`.

M2 proposes a **Location Intelligence Platform** — not map integration alone — with five bounded intelligences:

| Intelligence | Responsibility |
|--------------|----------------|
| **Address** | India hierarchy, validation, structured DTOs |
| **Map** | MapLibre GL + OSM tiles, pin placement, no Google/paid APIs |
| **Branch** | Multi-branch discovery, tenant↔branch separation |
| **Delivery** | Radius, fee tiers, serviceability, future routing |
| **Discovery** | Nearby restaurants, search ranking (architecture only) |

The platform follows ADR-011 strangler pattern: **LocationSDK contracts first**, adapters second, UI migration behind feature flags. OrderSDK v1.0.0 remains frozen. No Firestore migration in M2 design phase.

**Recommended path:** 10 independent PRs (PR-1 through PR-10), each deployable and rollback-safe.

---

## Document Index

| # | Deliverable | Document |
|---|-------------|----------|
| 1 | Repository Analysis | [PHASE-1-REPOSITORY-ANALYSIS.md](./PHASE-1-REPOSITORY-ANALYSIS.md) |
| 2 | Current Location Audit | *(included in Phase 1)* |
| 3 | Location Platform Architecture | [LOCATION-PLATFORM-ARCHITECTURE.md](./LOCATION-PLATFORM-ARCHITECTURE.md) |
| 4 | India Address Model | [INDIA-ADDRESS-MODEL.md](./INDIA-ADDRESS-MODEL.md) |
| 5 | LocationSDK Design | [LOCATION-SDK-DESIGN.md](./LOCATION-SDK-DESIGN.md) |
| 6 | Firestore Schema Proposal | [FIRESTORE-SCHEMA-PROPOSAL.md](./FIRESTORE-SCHEMA-PROPOSAL.md) |
| 7 | Branch Discovery Flow | [BRANCH-DISCOVERY-FLOW.md](./BRANCH-DISCOVERY-FLOW.md) |
| 8 | Delivery Intelligence Design | [DELIVERY-INTELLIGENCE-DESIGN.md](./DELIVERY-INTELLIGENCE-DESIGN.md) |
| 9 | Search Intelligence (architecture) | [SEARCH-INTELLIGENCE-ARCHITECTURE.md](./SEARCH-INTELLIGENCE-ARCHITECTURE.md) |
| 10 | Migration Roadmap & PR Breakdown | [MIGRATION-ROADMAP.md](./MIGRATION-ROADMAP.md) |
| 11 | Risk Assessment | [RISK-ASSESSMENT.md](./RISK-ASSESSMENT.md) |
| 12–13 | Definition of Ready / Done | [DEFINITION-OF-READY-DONE.md](./DEFINITION-OF-READY-DONE.md) |

---

## Architecture Snapshot

```
Presentation
    ↓
LocationSDK (contracts — M2 PR-2)
    ↓
LocationDomain (pure rules — geohash, distance, validation)
    ↓
LocationAdapter / LocationProvider / LocationRepository
    ↓
Nominatim (geocode) │ MapLibre (render) │ Firestore (persist — future)
```

**Future-ready (not implemented M2):** Redis geo cache, PostGIS, Valhalla routing.

---

## Platform Principles (Confirmed)

| Principle | Decision |
|-----------|----------|
| India First | Default country `IN`; official states/UTs; pincode validation |
| Open Standards | OSM, MapLibre GL, GeoJSON, Geohash |
| No Google Maps SDK | Remove unused `VITE_GOOGLE_MAPS_API_KEY` in future PR |
| No paid APIs | Self-hosted or public Nominatim with rate-limit proxy |
| Browser Geolocation | `navigator.geolocation` for customer detect |
| Clear boundaries | Five intelligences; SDK is sole presentation boundary |

---

## What M2 Does NOT Do

- Modify OrderSDK v1.0.0 (ADR-013 frozen)
- Migrate Checkout order writes
- Implement MenuSDK, InventorySDK, Branch writes
- Run Firestore data migration (schema design only)
- Implement Redis, PostGIS, Valhalla

---

## Next Step

**STOP.** Await Architecture Review Board approval of this design pack before M2 PR-1 (Repository Analysis sign-off) or M2 PR-2 (LocationSDK Foundation).

---

*BHOS-M2 Location Intelligence Platform — architecture first.*
