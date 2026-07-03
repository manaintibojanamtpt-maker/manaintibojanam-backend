# M3 PR-4 — Discovery Eligibility Engine Report

**PR:** BHOS-M3-PR4  
**Date:** 2026-06-26  
**Version:** `DISCOVERY_SDK_VERSION = 0.3.0-eligibility`  
**Status:** ✅ Complete — eligibility stage only, zero production impact (flag OFF)

---

## 1. Files Created

| Path | Purpose |
|------|---------|
| `src/sdk/discovery/dto/eligibleCandidate.ts` | `EligibleCandidate`, `EligibilityReason` DTOs |
| `src/domain/discovery/eligibility/DistanceCalculator.ts` | Haversine × 1.2 road factor |
| `src/domain/discovery/eligibility/RadiusValidator.ts` | Delivery config + radius checks |
| `src/domain/discovery/eligibility/DeliveryFeeEstimate.ts` | Tiered fee estimate (parity) |
| `src/domain/discovery/eligibility/EligibilityMapper.ts` | Rule evaluation + DTO mapping |
| `src/domain/discovery/eligibility/EligibilityEngine.ts` | Domain eligibility stage |
| `src/sdk/discovery/eligibility/EligibilityEnginePort.ts` | SDK port interface |
| `src/sdk/discovery/eligibility/DefaultEligibilityEngine.ts` | SDK adapter |
| `src/sdk/discovery/eligibility/createEligibilityEngine.ts` | Flag-gated factory |
| `src/sdk/__tests__/discoveryEligibility.test.ts` | Unit tests |

**Updated:** `DefaultDiscoveryAdapter.ts`, `createDiscoverySDK.ts`, `featureFlags.ts`, `options.ts`, `dto/index.ts`, `version.ts`, `.env.example`, `package.json`

**Not changed (per scope):** repository, facade, presentation, UI, checkout, payments, owner features.

---

## 2. Eligibility Diagram

```
DiscoveryRepository
      ↓
DiscoveryCandidate[]
      ↓
EligibilityEngine (domain)
      ├─ DistanceCalculator
      ├─ RadiusValidator
      └─ EligibilityMapper
      ↓
EligibleCandidate[]
      ↓
RankingEngine (future PR-5)
```

**SDK wiring (flag OFF by default):**

```
DefaultDiscoveryAdapter
      ├─ getDiscoveryCandidates() → repository (unchanged)
      ├─ calculateEligibility() → EligibilityEngine (when FF on)
      └─ calculateDistance() → DistanceCalculator (when FF on)
```

---

## 3. DTO Design

### `EligibilityReason`

| Field | Type | Purpose |
|-------|------|---------|
| `rule` | `EligibilityRuleId` | Which rule was evaluated |
| `passed` | `boolean` | Pass/fail |
| `message` | `string?` | Human-readable failure |

### `EligibleCandidate`

| Field | Type | Purpose |
|-------|------|---------|
| `candidate` | `DiscoveryCandidate` | Original candidate (unchanged) |
| `isEligible` | `boolean` | All rules passed |
| `distanceKm` | `number` | Road-adjusted distance |
| `eligibility` | `DeliveryEligibility` | Serviceability summary |
| `reasons` | `EligibilityReason[]` | Explainable rule outcomes |

### `EligibilityRuleId`

`valid_coordinates` · `branch_active` · `branch_live` · `kitchen_open` · `delivery_config_valid` · `inside_delivery_radius`

---

## 4. Distance Strategy

- **Formula:** Haversine great-circle distance × **1.2 road factor**
- **Parity:** Matches `calculateDeliveryDistanceKm` in `src/lib/deliveryFee.ts`
- **Scope:** Pure local computation — no LocationSDK provider calls, no Firestore
- **Invalid coords:** Distance not computed; `valid_coordinates` rule fails

---

## 5. Validation Rules

| Rule | Pass condition |
|------|----------------|
| Valid coordinates | Customer + branch lat/lng finite, in range, not (0,0) |
| Branch active | `status === 'active'` (case-insensitive) |
| Branch live | `isLive === true` |
| Kitchen open | `isOpen === true` |
| Delivery config valid | `maxRadiusKm > 0` and finite |
| Inside delivery radius | `distanceKm <= maxRadiusKm` |

**`DeliveryEligibility.status` mapping:**

| Status | Trigger |
|--------|---------|
| `serviceable` | All rules pass |
| `closed` | Kitchen not open |
| `out_of_radius` | Outside max radius |
| `unavailable` | Inactive, not live, bad coords, invalid config |

**Forbidden in this PR:** ranking, search, sorting, Firestore reads.

---

## 6. Testing

```bash
npm run test:sdk   # 147/147 pass (+12 PR-4)
```

| Scenario | Coverage |
|----------|----------|
| Inside radius | ✅ `serviceable`, distance < maxRadius |
| Outside radius | ✅ `out_of_radius` |
| Closed kitchen | ✅ `closed` |
| Inactive tenant | ✅ `unavailable` |
| Missing coordinates | ✅ `valid_coordinates` fails |
| Invalid delivery radius | ✅ `maxRadiusKm` 0 / undefined |
| Distance parity with `deliveryFee.ts` | ✅ |
| Flag OFF → NOT_CONFIGURED | ✅ |
| Flag ON → `calculateEligibility` works | ✅ |
| Batch evaluation preserves input order | ✅ (no sort) |

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Distance drift vs checkout fees | Same Haversine × 1.2 as `deliveryFee.ts`; dedicated parity test |
| Incomplete delivery config on candidate | Only `maxRadiusKm` available from repository mapper; fee estimate uses tiered defaults |
| Inactive tenants in candidate set | Repository filters most; eligibility re-checks `status` defensively |
| Premature production enablement | `FF_DISCOVERY_ELIGIBILITY_ENABLED` defaults OFF; facade unchanged |

---

## 8. Rollback Plan

1. Set `VITE_FF_DISCOVERY_ELIGIBILITY_ENABLED=false` (default).
2. `calculateEligibility` / `calculateDistance` return `NOT_CONFIGURED`.
3. No repository or UI behaviour changes — safe to revert code independently.

---

## 9. Definition of Done

| Criterion | Status |
|-----------|--------|
| `EligibilityEngine` implemented | ✅ |
| `EligibleCandidate` + `EligibilityReason` DTOs | ✅ |
| `DistanceCalculator` + `RadiusValidator` + `EligibilityMapper` | ✅ |
| `FF_DISCOVERY_ELIGIBILITY_ENABLED` OFF by default | ✅ |
| No Firestore in eligibility layer | ✅ |
| No ranking / search / sort | ✅ |
| No repository changes | ✅ |
| No presentation / UI changes | ✅ |
| Unit tests for all required scenarios | ✅ |
| SDK version `0.3.0-eligibility` | ✅ |

**Awaiting approval before enabling flag or wiring into `discoverNearby` pipeline (M3 PR-6).**
