# M2 — Migration Roadmap & PR Breakdown

**Status:** Plan only — no implementation  
**Pattern:** ADR-011 strangler — independent, deployable, rollback-safe PRs

---

## 1. Migration Principles

| Principle | Application |
|-----------|-------------|
| Architecture first | PR-1/2 are docs + contracts before UI |
| No OrderSDK changes | ADR-013 frozen |
| No Checkout writes | Read/fee paths only until explicit ADR |
| No Firestore migration | Until dedicated migration ADR post PR-7 |
| Feature flags | Every UI PR behind `FF_SDK_LOCATION_*` |
| Parity tests | Golden tests from `deliveryFee.ts` before cutover |

---

## 2. PR Breakdown

### PR-1: Repository Analysis ✅

| Item | Detail |
|------|--------|
| **Scope** | Audit current location usage, document debt |
| **Deliverable** | `docs/m2/PHASE-1-REPOSITORY-ANALYSIS.md` |
| **Code changes** | None |
| **Flag** | N/A |
| **Rollback** | N/A |
| **Status** | Complete (this design pack) |

---

### PR-2: LocationSDK Foundation

| Item | Detail |
|------|--------|
| **Scope** | `src/sdk/location/` interfaces, types, version, factory stub |
| **Deliverable** | LocationSDK contract, SdkResult types, unit test scaffolds |
| **Code changes** | SDK files only — no adapters, no UI |
| **Flag** | N/A (not wired) |
| **Rollback** | Delete folder |
| **Depends on** | M2 design approval |
| **Tests** | `npm run test:sdk` extended |

---

### PR-3: India Address Model

| Item | Detail |
|------|--------|
| **Scope** | Reference data JSON (states), `IndiaAddress` types, validation in domain |
| **Deliverable** | `src/domain/location/address/`, `src/data/india/states.json` |
| **Code changes** | Domain + static data — no UI |
| **Flag** | N/A |
| **Rollback** | Remove domain module |
| **Depends on** | PR-2 |
| **Note** | District/city/area data can ship incrementally per state |

---

### PR-4: MapLibre Integration

| Item | Detail |
|------|--------|
| **Scope** | `MapPinPicker` presentation component, OSM tiles, GeoJSON pin layer |
| **Deliverable** | `src/components/location/MapPinPicker.tsx` |
| **Dependencies** | `maplibre-gl` npm package |
| **Flag** | `FF_LOCATION_MAP_ENABLED` |
| **Rollback** | Flag OFF — component not rendered |
| **Depends on** | PR-2 |
| **Note** | Remove unused `VITE_GOOGLE_MAPS_API_KEY` from `.env.example` |

---

### PR-5: Owner Registration

| Item | Detail |
|------|--------|
| **Scope** | Replace OwnerSettings/Onboarding location tab with India Address form + MapPinPicker |
| **Deliverable** | Structured address save (still to legacy `tenants.location` until migration) |
| **Flag** | `FF_LOCATION_OWNER_REGISTRATION_ENABLED` |
| **Rollback** | Flag OFF — existing free-text form |
| **Depends on** | PR-3, PR-4 |
| **Writes** | Updates `tenants.location` with enriched fields (additive) |
| **Validation** | Require non-zero coordinates + geohash computed client-side |

---

### PR-6: Customer Detection

| Item | Detail |
|------|--------|
| **Scope** | Migrate `AutoLocationForm` geocode/distance to LocationSDK facade |
| **Deliverable** | `src/lib/locationReads.ts`, Nominatim adapter |
| **Flag** | `FF_SDK_LOCATION_CUSTOMER_DETECT_ENABLED` |
| **Rollback** | Flag OFF — legacy AutoLocationForm direct fetch |
| **Depends on** | PR-2, PR-4 (optional map in form) |
| **Server** | Optional: Nominatim proxy route in `server.ts` (rate limit) |
| **No change** | Checkout order write shape |

---

### PR-7: Nearby Discovery

| Item | Detail |
|------|--------|
| **Scope** | `findNearbyBranches`, geoIndex read adapter, discovery UI scaffold |
| **Deliverable** | Single-tenant serviceability + multi-branch read path |
| **Flag** | `FF_SDK_LOCATION_DISCOVERY_ENABLED` |
| **Rollback** | Flag OFF |
| **Depends on** | PR-2, Firestore schema (read-only collections) |
| **Note** | Can operate on `tenants.location` before full branch migration |

---

### PR-8: Delivery Intelligence

| Item | Detail |
|------|--------|
| **Scope** | Port `deliveryFee.ts` → `DeliveryDomain`, wire via LocationSDK |
| **Deliverable** | Fee/serviceability parity tests, deprecate `ServiceabilityService` |
| **Flag** | `FF_SDK_LOCATION_DELIVERY_ENABLED` |
| **Rollback** | Flag OFF — `deliveryFee.ts` direct |
| **Depends on** | PR-2, PR-6 |
| **Critical** | Golden test parity with existing fee tiers |

---

### PR-9: Testing

| Item | Detail |
|------|--------|
| **Scope** | SDK tests, domain tests, facade parity, E2E location smoke |
| **Deliverable** | `npm run test:location`, CI gate |
| **Flag** | N/A |
| **Target** | ≥90% domain coverage, 100% fee parity |

---

### PR-10: Documentation

| Item | Detail |
|------|--------|
| **Scope** | LocationSDK API reference, ADR-014 (Location Platform), release notes |
| **Deliverable** | `docs/sdk/location/`, ADR, migration guide |
| **Flag** | N/A |
| **Depends on** | PR-2 through PR-8 complete |

---

## 3. Feature Flag Matrix

| Flag | Env var | Default | PR |
|------|---------|---------|-----|
| `FF_LOCATION_MAP_ENABLED` | `VITE_FF_LOCATION_MAP_ENABLED` | OFF | PR-4 |
| `FF_LOCATION_OWNER_REGISTRATION_ENABLED` | `VITE_FF_LOCATION_OWNER_REGISTRATION_ENABLED` | OFF | PR-5 |
| `FF_SDK_LOCATION_CUSTOMER_DETECT_ENABLED` | `VITE_FF_SDK_LOCATION_CUSTOMER_DETECT_ENABLED` | OFF | PR-6 |
| `FF_SDK_LOCATION_DISCOVERY_ENABLED` | `VITE_FF_SDK_LOCATION_DISCOVERY_ENABLED` | OFF | PR-7 |
| `FF_SDK_LOCATION_DELIVERY_ENABLED` | `VITE_FF_SDK_LOCATION_DELIVERY_ENABLED` | OFF | PR-8 |

Master gate (optional): `FF_SDK_LOCATION_ENABLED`

---

## 4. Timeline Estimate (engineering)

| PR | Effort | Cumulative |
|----|--------|------------|
| PR-1 | 1d | 1d |
| PR-2 | 2d | 3d |
| PR-3 | 3d | 6d |
| PR-4 | 3d | 9d |
| PR-5 | 4d | 13d |
| PR-6 | 4d | 17d |
| PR-7 | 5d | 22d |
| PR-8 | 3d | 25d |
| PR-9 | 3d | 28d |
| PR-10 | 2d | 30d |

**~6 weeks** at 1 engineer, excluding staging soak and migration ADR.

---

## 5. Firestore Migration (Post-M2)

Separate milestone after PR-7/8 soak:

1. ADR-014 or ADR-015 for data migration  
2. Dual-write period (legacy + new collections)  
3. Backfill script  
4. Read cutover  
5. Legacy field deprecation  

**Not included in M2 PR-1 through PR-10.**

---

## 6. Dependencies on Other Milestones

| Milestone | Relationship |
|-----------|--------------|
| OrderSDK v1.0 | Frozen — no changes |
| M1 flags soak | Independent — can parallel |
| MenuSDK | None in M2 |
| Branch writes | Deferred post-M2 |
| Marketplace UI | Consumer of PR-7 discovery |

---

*Migration Roadmap — await approval before PR-2.*
