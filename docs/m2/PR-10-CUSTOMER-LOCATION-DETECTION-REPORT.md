# M2 PR-10 — Customer Location Detection Report

**PR:** BHOS-M2-PR10  
**Date:** 2026-06-26  
**Version:** `LOCATION_SDK_VERSION = 1.0.0-browser-location`  
**Status:** ✅ Complete — customer detection wired behind feature flag (default OFF)

---

## 1. Repository Analysis

### Existing customer location (pre-PR-10)

| File | Behaviour | Gap |
|------|-----------|-----|
| `AutoLocationForm.tsx` | Direct `navigator.geolocation` + Nominatim `fetch` | No SDK, no session canonical model |
| `HeaderLocationDropdown.tsx` | Opens AutoLocationForm, saves to Firestore `users` | Coupled to legacy shape |
| `useDeliveryState.ts` | `localStorage` delivery address | No structured canonical / geohash |
| `Home.tsx` | Location prompt with raw geolocation | No reverse geocode or session store |

### Platform readiness (PR-6 → PR-9)

| Layer | Status |
|-------|--------|
| `LocationSDK.detectCurrentLocation` | Delegates to browser provider slot |
| `BrowserLocationProvider` | Stub only until PR-10 |
| `OpenGeocodingProvider` | `reverseGeocode` ready (PR-8) |
| `FF_LOCATION_CUSTOMER_DETECTION_ENABLED` | Defined, default OFF (PR-2) |

**Conclusion:** Presentation needed a facade + real browser provider; SDK geocoding was ready. No Firestore or checkout changes required.

---

## 2. Files Changed

| Path | Change |
|------|--------|
| `src/sdk/location/providers/browser/BrowserGeolocationPort.ts` | **New** — injectable geolocation port |
| `src/sdk/location/providers/browser/mapBrowserGeolocationErrors.ts` | **New** — GPS error → SdkError |
| `src/sdk/location/providers/browser/BrowserLocationProviderImpl.ts` | **New** — `kind: browser` provider |
| `src/sdk/location/providers/ProviderFactory.ts` | **Updated** — wire `browser` kind |
| `src/sdk/location/providers/types.ts` | **Updated** — `browserImpl` options |
| `src/sdk/location/version.ts` | **Updated** — `1.0.0-browser-location` |
| `src/lib/customerLocation/types.ts` | **New** — `CustomerCanonicalLocation` |
| `src/lib/customerLocation/mapGeocodedToCustomerCanonical.ts` | **New** — reverse geocode mapper |
| `src/lib/customerLocation/sessionStore.ts` | **New** — sessionStorage persistence |
| `src/lib/customerLocation/CustomerLocationFacade.ts` | **New** — detection facade |
| `src/components/AutoLocationForm.tsx` | **Updated** — flag-gated auto-detect |
| `src/pages/Home.tsx` | **Updated** — flag-gated location prompt |
| `src/sdk/__tests__/locationBrowserProvider.test.ts` | **New** — mocked GPS tests |
| `src/lib/__tests__/customerLocationFacade.test.ts` | **New** — mocked reverse geocode tests |
| `src/sdk/__tests__/locationProviderFramework.test.ts` | **Updated** — browser kind no longer throws |
| `src/sdk/__tests__/locationSdkFoundation.test.ts` | **Updated** — version assertion |
| `package.json` | **Updated** — test script |

**Out of scope (unchanged):** Checkout, delivery radius logic, MapLibre, nearby discovery, Firestore schema/rules.

---

## 3. Detection Flow

```
Customer UI (AutoLocationForm / Home prompt)
    ↓  [FF ON]
CustomerLocationFacade.detectCustomerLocation()
    ↓
LocationSDK.detectCurrentLocation()
    ↓
BrowserLocationProvider (injectable port)
    ↓
LocationSDK.reverseGeocode() → OpenGeocodingProvider
    ↓
mapGeocodedToCustomerCanonical()
    ↓
sessionStorage (bhos-customer-location-session)
    ↓
UI (formatted address + coordinates for existing delivery UX)
```

**Flag OFF:** Legacy `navigator.geolocation` + direct Nominatim fetch unchanged.

---

## 4. SDK Integration

| Component | Role |
|-----------|------|
| `BrowserGeolocationPort` | Testable boundary for `navigator.geolocation` |
| `BrowserLocationProviderImpl` | Implements `BrowserLocationProvider` contract |
| `createLocationSDK({ geocoding: 'nominatim', browser: 'browser' })` | Facade factory wiring |
| `CustomerLocationFacade` | ADR-011 presentation entry — components must not import SDK directly |

---

## 5. Error Handling

| Condition | SdkError | UI fallback |
|-----------|----------|-------------|
| Permission denied | `FORBIDDEN` | Toast + manual entry |
| GPS timeout | `UNAVAILABLE` (retryable) | Toast + manual entry |
| Position unavailable | `UNAVAILABLE` | Toast + manual entry |
| Geolocation unsupported | `UNAVAILABLE` | Manual entry |
| Reverse geocode failure | Propagated SDK error | Manual entry |
| Missing geohash | `VALIDATION` | Manual entry |

Default timeout: **10s** (matches legacy AutoLocationForm).

---

## 6. Privacy Considerations

| Topic | Decision |
|-------|----------|
| Storage | **sessionStorage** only — cleared when tab closes |
| Firestore | No automatic write from detection (user save flows unchanged) |
| Accuracy | `accuracyM` stored in canonical record for downstream use |
| Permission | Browser-native prompt; denial does not persist coordinates |
| Dev overrides | Flag override via localStorage limited to dev/preview (existing pattern) |

Coordinates are not sent to Firestore by this PR. Discovery/delivery/checkout consumers can read the session facade in future PRs.

---

## 7. Feature Flag

| Flag | Default | OFF | ON |
|------|---------|-----|-----|
| `FF_LOCATION_CUSTOMER_DETECTION_ENABLED` | **OFF** | Legacy manual / direct Nominatim | Facade + SDK detection |

**Env:** `VITE_FF_LOCATION_CUSTOMER_DETECTION_ENABLED`  
**Reader:** `isLocationCustomerDetectionEnabled()` in `src/lib/locationFeatureFlags.ts`

---

## 8. Testing Results

```bash
npm run test:sdk   # 112/112 pass (+11 new)
```

| Suite | Coverage |
|-------|----------|
| `locationBrowserProvider.test.ts` | Mocked port — success, permission denied, timeout, unsupported |
| `customerLocationFacade.test.ts` | Mocked LocationSDK — detect + reverse geocode + session persistence |
| `locationProviderFramework.test.ts` | `kind: browser` factory wiring |

No real browser APIs or network calls in unit tests.

---

## 9. Rollback Plan

1. Set `FF_LOCATION_CUSTOMER_DETECTION_ENABLED=false` — instant revert to legacy flow.
2. Full code rollback: revert PR-10 files; restore `ProviderFactory` browser case to throw; version `1.0.0-open-geocoding`.
3. Clear `sessionStorage` key `bhos-customer-location-session` if needed (optional).

No Firestore migration to undo.

---

## 10. Deployment Checklist

- [ ] Merge PR-10 branch
- [ ] Confirm flag **OFF** in production (`VITE_FF_LOCATION_CUSTOMER_DETECTION_ENABLED` unset or `false`)
- [ ] Deploy frontend (no server/rules changes)
- [ ] Smoke test flag OFF — AutoLocationForm auto-detect uses legacy path
- [ ] In staging: enable flag via env or `localStorage`
- [ ] Grant location → verify sessionStorage canonical record (lat/lng/geohash/formattedAddress)
- [ ] Deny permission → verify manual fallback
- [ ] Timeout / airplane mode → verify graceful fallback
- [ ] Home location prompt — verify facade path when flag ON
- [ ] Monitor Nominatim reverse-geocode volume for pilot

---

## Definition of Done

| Criterion | Status |
|-----------|--------|
| CustomerLocationFacade | ✅ |
| BrowserLocationProvider (`kind: browser`) | ✅ |
| Reverse geocode via LocationSDK | ✅ |
| CustomerCanonicalLocation + session store | ✅ |
| Feature flag OFF = legacy | ✅ |
| Permission / timeout / unavailable handling | ✅ |
| Mocked unit tests only | ✅ |
| No discovery / delivery radius / MapLibre / checkout / Firestore | ✅ |
| STOP — await approval before enabling flag | ✅ |

---

*Next approved milestones (not in this PR): nearby restaurant discovery, delivery radius integration, MapLibre, checkout consumption of canonical location.*
