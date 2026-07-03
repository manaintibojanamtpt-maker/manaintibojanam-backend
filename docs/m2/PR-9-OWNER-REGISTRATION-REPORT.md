# M2 PR-9 — Owner Registration / India Address Intelligence Report

**PR:** BHOS-M2-PR9  
**Date:** 2026-06-26  
**Version:** `LOCATION_SDK_VERSION = 1.0.0-open-geocoding` (unchanged — presentation consumer only)  
**Status:** ✅ Complete — first customer-facing Location Platform consumer (Owner Registration step 3)

---

## 1. Files Changed

| Path | Change |
|------|--------|
| `src/lib/ownerLocation/types.ts` | **New** — `OwnerAddressDraft`, `CanonicalLocation`, `ReferenceSelectOption` |
| `src/lib/ownerLocation/validateOwnerAddressDraft.ts` | **New** — draft validation + structured completion check |
| `src/lib/ownerLocation/tenantLocationMapper.ts` | **New** — `CanonicalLocation` ↔ `tenants.location` (legacy-compatible) |
| `src/lib/ownerLocationReads.ts` | **New** — presentation facade (ReferenceSDK + LocationSDK) |
| `src/components/owner/StructuredOwnerAddressForm.tsx` | **New** — cascading India address UI |
| `src/pages/owner/OnboardingWizard.tsx` | **Updated** — flag-gated step 3 (structured vs legacy) |
| `src/context/TenantContext.tsx` | **Updated** — additive structured location fields on `location` |
| `src/lib/storeSetupProgress.ts` | **Updated** — location step completion when flag ON |
| `src/lib/__tests__/ownerLocationReads.test.ts` | **New** — validation, mapper, mocked geocode tests |
| `package.json` | **Updated** — `test:sdk` includes PR-9 tests |

**Out of scope (unchanged):** OwnerSettings, customer pages, checkout, MapLibre, BrowserLocationProvider, delivery, marketplace, Firestore rules/migrations.

---

## 2. Address Flow

```
Country (IN, hidden)
    ↓
State          ← ReferenceSDK.getStates
    ↓
District       ← ReferenceSDK.getDistricts
    ↓
City           ← ReferenceSDK.getCities
    ↓
Locality       ← ReferenceSDK.getLocalities
    ↓
Pincode        ← ReferenceSDK.getPincodes
    ↓
Street         (manual, required)
    ↓
Landmark       (optional)
    ↓
Search Address ← LocationSDK.searchAddress (OpenGeocodingProvider / Nominatim)
    ↓
Resolve        ← LocationSDK.forwardGeocode → CanonicalLocation
    ↓
Latitude / Longitude / Geohash (auto)
    ↓
Save Draft     → POST /api/owner/onboarding/step → tenants.location
```

**No map rendering. No browser GPS. No customer location. No branch discovery.**

---

## 3. SDK Integration

| Layer | Role |
|-------|------|
| `StructuredOwnerAddressForm` | UI only — calls `ownerLocationReads`, never SDK directly |
| `ownerLocationReads.ts` | ADR-011 presentation facade |
| `ReferenceSDK` | India hierarchy dropdowns (state → pincode) |
| `LocationSDK` + `OpenGeocodingProvider` | `searchAddress`, `forwardGeocode`, geohash |
| `tenantLocationMapper.ts` | Maps to legacy `address`/`city`/`state`/`pincode`/`lat`/`lng` plus additive structured fields |

Factory wiring (unchanged from PR-8):

```typescript
createLocationSDK({ referenceSdk: reference, geocoding: 'nominatim' })
```

Save payload sets `addressModel: 'india_structured'` and preserves reference entity IDs for re-hydration on wizard reload.

---

## 4. Validation Rules

| Field | Rule |
|-------|------|
| Country | Fixed `IN` (hidden) |
| State | Required — id, code, name |
| District | Required — id, code, name |
| City | Required — id, code, name |
| Locality | Required — id, code, name |
| Pincode | Required — exactly 6 digits |
| Street | Required — min 3 characters |
| Landmark | Optional |
| Coordinates | Auto via forward geocode — non-zero lat/lng required |
| Geohash | Auto — required for step completion |

Step completion (`storeSetupProgress`) when flag ON requires `isStructuredTenantLocationComplete()` (structured model + geohash + non-zero coordinates).

---

## 5. Feature Flag

| Flag | Default | OFF behaviour | ON behaviour |
|------|---------|---------------|--------------|
| `FF_LOCATION_OWNER_REGISTRATION_ENABLED` | **OFF** | Legacy free-text address form in Onboarding Wizard step 3 | `StructuredOwnerAddressForm` |

**Env key:** `VITE_FF_LOCATION_OWNER_REGISTRATION_ENABLED`  
**Dev override:** `localStorage.setItem('FF_LOCATION_OWNER_REGISTRATION_ENABLED', 'true')` (dev/preview only)

Reader: `isLocationOwnerRegistrationEnabled()` in `src/lib/locationFeatureFlags.ts`

---

## 6. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Nominatim rate limits during owner onboarding | Existing OpenGeocoding rate limiter + cache (PR-8); resolve-on-demand not on every keystroke |
| Partial hierarchy selection | Cascading resets + validation before geocode |
| Firestore schema break | Additive fields only; legacy fields always populated; `addressModel` discriminates |
| Accidental scope creep (maps, GPS) | Explicitly excluded; no MapLibre / BrowserLocationProvider imports |
| Flag ON in production before QA | Default OFF; env + localStorage gated to dev/preview |
| Re-hydration after save | Reference entity IDs persisted (`referenceStateId`, etc.) |

---

## 7. Testing Results

```bash
npm run test:sdk   # 101/101 pass (+9 new PR-9 tests)
```

PR-9 tests (`ownerLocationReads.test.ts`):

- Draft validation (hierarchy, pincode)
- Structured location completion check
- Tenant location mapper (legacy + reference IDs)
- Hydrate / canonical from tenant
- Mocked `resolveOwnerCanonicalLocation` + `buildOwnerLocationSavePayload`
- Mocked `listOwnerRegistrationStates`

All geocoding tests use injected mock `LocationSDK` — no real network calls.

---

## 8. Rollback

1. Set `FF_LOCATION_OWNER_REGISTRATION_ENABLED=false` (or remove env override).
2. Legacy free-text form resumes immediately — no deploy required for instant rollback.
3. Full code rollback: revert PR-9 files listed in §1.
4. Existing tenants with `addressModel: 'india_structured'` remain readable; legacy path ignores structured fields.

No Firestore migration to undo. No SDK version change required.

---

## 9. Deployment Checklist

- [ ] Merge PR-9 branch
- [ ] Confirm `VITE_FF_LOCATION_OWNER_REGISTRATION_ENABLED` is **unset or `false`** in production
- [ ] Deploy frontend + server (no rules/index changes)
- [ ] Smoke test with flag OFF — legacy onboarding step 3 unchanged
- [ ] In staging/preview: enable flag via env or localStorage
- [ ] Verify cascading dropdowns load India hierarchy
- [ ] Complete address → Resolve Coordinates → verify lat/lng/geohash in tenant document
- [ ] Reload wizard — confirm draft re-hydrates from saved tenant
- [ ] Confirm store setup progress marks Location step complete only after structured save
- [ ] Monitor Nominatim error rates if flag enabled for pilot tenants

---

## Definition of Done

| Criterion | Status |
|-----------|--------|
| Owner Registration step 3 only | ✅ |
| ReferenceSDK hierarchy dropdowns | ✅ |
| OpenGeocodingProvider search + forward geocode | ✅ |
| Auto lat/lng/geohash | ✅ |
| Feature flag OFF = legacy | ✅ |
| No map / GPS / customer / discovery | ✅ |
| No Firestore schema migration | ✅ |
| Unit tests (mocked) | ✅ |
| STOP — await approval | ✅ |

---

*Next approved milestones (not in this PR): MapLibre, BrowserLocationProvider, customer detection, nearby discovery.*
