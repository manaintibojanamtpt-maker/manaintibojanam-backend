# M2 — Risk Assessment

**Date:** 2026-06-26  
**Status:** Pre-implementation

---

## Risk Matrix

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R-01 | Nominatim rate limiting / ToS violation | **High** | **High** | Server-side proxy with caching; User-Agent; self-host Nominatim in prod |
| R-02 | Browser direct Nominatim blocked (CORS/policy) | Medium | High | Move geocode to `server.ts` adapter in PR-6 |
| R-03 | Invalid lat/lng (0,0) in production tenants | **High** | **High** | PR-5 validation gate; store setup requires coordinates |
| R-04 | Fee calculation regression | Medium | **High** | Golden parity tests PR-8; flag rollback |
| R-05 | MapLibre bundle size impact | Medium | Medium | Lazy load map component; code split PR-4 |
| R-06 | India reference data incomplete | **High** | Medium | Ship state-by-state; fallback free-text with warning |
| R-07 | Firestore geo query scale limits | Medium | High | Geohash prefix index; future PostGIS ADR |
| R-08 | Dual address models (KYC vs location) | Medium | Medium | Single `IndiaAddress` source of truth in PR-5 |
| R-09 | OrderSDK accidental modification | Low | **High** | PR review gate; ADR-013 compliance check |
| R-10 | Checkout write path touched | Medium | **High** | Explicit scope review; read/fee only until ADR |
| R-11 | OSM tile server reliability | Medium | Medium | Configurable tile URL; self-host fallback |
| R-12 | GPS accuracy in dense urban India | Medium | Low | Map pin confirmation step always shown |
| R-13 | Geohash neighbor edge cases | Low | Medium | Standard 8-neighbor expansion in discovery |
| R-14 | Strangler flag proliferation | Medium | Low | Master `FF_SDK_LOCATION_ENABLED` + per-surface flags |
| R-15 | Dead code confusion (ServiceabilityService) | Low | Low | Delete in PR-8 |

---

## Architectural Risks

### A-01: Premature multi-branch without migration

**Risk:** PR-7 discovery assumes `branches/` collection but data lives in `tenants.location`.

**Mitigation:** Phase 1 discovery uses tenant-as-branch adapter; full branch model after migration ADR.

### A-02: Architecture drift from FEB-001

**Risk:** Location logic stays in components despite SDK.

**Mitigation:** Extend `lint:presentation` to block direct Nominatim fetch; require `@/sdk` or facades.

### A-03: Paid API creep

**Risk:** Team proposes Google Maps under deadline pressure.

**Mitigation:** ADR required for any paid geo API; platform principles in BHOS-M2 charter.

---

## Operational Risks

| Risk | Mitigation |
|------|------------|
| Nominatim public instance downtime | Cache + queue; self-host path documented |
| Large reference JSON bundles | State-lazy loading; CDN for static data |
| Owner onboarding friction (more fields) | Smart defaults from map pin reverse geocode |

---

## Security Risks

| Risk | Mitigation |
|------|------------|
| GeoIndex poisoning via client writes | Cloud Function index updates only |
| Location PII in logs | No coordinate logging in production |
| Nominatim query injection | Sanitize + length limit on search |

---

## Rollback Strategy

Every PR ships with feature flag default **OFF**. Rollback = disable flag + redeploy. No data migration until PR-7+ with dual-write — rollback remains safe.

---

## Go / No-Go Criteria (before PR-2)

| Criterion | Required |
|-----------|----------|
| M2 design pack approved | ✅ This document set |
| OrderSDK v1.0 tagged | Recommended (`orders-sdk-read-v1.0`) |
| Nominatim proxy decision | Approve self-host vs public+proxy |
| India data sourcing plan | Approve reference data license/source |
| No architectural ADR conflicts | Verify against FEB-001 |

---

*Risk Assessment — review before implementation.*
