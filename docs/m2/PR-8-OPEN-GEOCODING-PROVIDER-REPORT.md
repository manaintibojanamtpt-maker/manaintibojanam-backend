# M2 PR-8 — Open Geocoding Provider Report

**PR:** BHOS-M2-PR8  
**Date:** 2026-06-26  
**Version:** `LOCATION_SDK_VERSION = 1.0.0-open-geocoding`  
**Status:** ✅ Complete — provider implemented, not wired to UI

---

## 1. Files Created

| Path | Purpose |
|------|---------|
| `providers/open-geocoding/OpenGeocodingProvider.ts` | Vendor-neutral `GeocodingProvider` |
| `providers/open-geocoding/NominatimProvider.ts` | Nominatim backend |
| `providers/open-geocoding/OpenGeocodingPorts.ts` | Backend, HTTP, cache, rate-limit ports |
| `providers/open-geocoding/OpenGeocodingConfig.ts` | User-Agent, timeout, retry defaults |
| `providers/open-geocoding/OpenGeocodingCache.ts` | In-memory cache hook |
| `providers/open-geocoding/OpenGeocodingRateLimiter.ts` | Interval rate limiter hook |
| `providers/open-geocoding/mapOpenGeocodingResults.ts` | SDK DTO mapping + geohash |
| `providers/open-geocoding/mapOpenGeocodingErrors.ts` | HTTP → SdkError |
| `providers/open-geocoding/defaultOpenGeocodingHttpPort.ts` | Fetch transport (runtime) |
| `providers/open-geocoding/nominatim/*` | URL builders + response mappers |
| `__tests__/locationOpenGeocodingProvider.test.ts` | Mocked HTTP tests |

**Updated:** `ProviderFactory.ts`, `types.ts`, exports, `version.ts`, `package.json`

---

## 2. Provider Architecture

| Layer | Responsibility |
|-------|----------------|
| `OpenGeocodingProvider` | Cache, rate limit, retry, `GeocodingProvider` surface |
| `NominatimProvider` | Nominatim `/search` + `/reverse` via HTTP port |
| `OpenGeocodingHttpPort` | Injectable transport (mock in tests) |

Naming: **OpenGeocodingProvider** (vendor-neutral) → **NominatimProvider** (current backend).

---

## 3. Request/Response Mapping

| SDK method | Backend | Nominatim endpoint |
|------------|---------|-------------------|
| `searchAddress` | `backend.search` | `GET /search` |
| `forwardGeocode` | `backend.search` (limit 1) | `GET /search` |
| `reverseGeocode` | `backend.reverse` | `GET /reverse` |

Response mapping:

- `display_name` → `displayName` / `formattedAddress`
- `lat`/`lon` → `GeoPoint`
- `address.postcode` → `pincode`
- `importance` → `confidence`
- Local `encodeGeohashPoint` → `geohash` on geocoded results

---

## 4. Error Handling Strategy

| Condition | SdkError code |
|-----------|---------------|
| HTTP 429 | `RATE_LIMITED` (retryable) |
| HTTP 404 / empty results | `NOT_FOUND` |
| HTTP 4xx | `VALIDATION` |
| HTTP 5xx / network / timeout | `UNAVAILABLE` (retryable) |
| Invalid JSON | `INTERNAL` |
| Empty query | `VALIDATION` |

Retries: up to 2 on retryable codes with backoff (default 1.1s steps).

---

## 5. Cache Strategy

| Aspect | Decision |
|--------|----------|
| Port | `OpenGeocodingCachePort` |
| Default | `InMemoryOpenGeocodingCache` |
| TTL | 15 minutes |
| Key | `open-geocoding:{method}:{normalized payload}` |
| Bypass | Inject `NoOpOpenGeocodingCache` |

---

## 6. Rate Limiting Strategy

| Aspect | Decision |
|--------|----------|
| Port | `OpenGeocodingRateLimiterPort` |
| Default | `IntervalOpenGeocodingRateLimiter` at 1100ms |
| Policy | Aligns with Nominatim public 1 req/s guidance |
| Tests | `NoOpOpenGeocodingRateLimiter` to avoid delays |

---

## 7. Test Results

```bash
npm run test:sdk   # 92/92 pass (+12 new)
```

All tests use mocked `OpenGeocodingHttpPort` — no real network calls.

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Nominatim rate limits in production | Interval limiter + cache + retries |
| Vendor lock-in | `OpenGeocodingBackend` port swappable |
| Accidental UI wiring | Factory exported; default remains `stub` |
| MapLibre scope creep | Explicitly out of scope per approval |

---

## 9. Rollback Plan

1. Remove `providers/open-geocoding/` directory.
2. Revert `ProviderFactory.ts` `nominatim` case to throw.
3. Restore version to `1.0.0-providers`.
4. Remove test file from `test:sdk` script.

No UI or Firestore changes to revert.

---

## 10. Definition of Done

| Criterion | Status |
|-----------|--------|
| `searchAddress` / `forwardGeocode` / `reverseGeocode` | ✅ |
| OpenGeocodingProvider + NominatimProvider | ✅ |
| Provider registration (`kind: nominatim`) | ✅ |
| Cache + rate limit hooks | ✅ |
| User-Agent + timeout + retry | ✅ |
| Mocked unit tests only | ✅ |
| No UI / browser / MapLibre / Firestore | ✅ |
| SDK contracts unchanged | ✅ |
| STOP — await approval | ✅ |

---

*Next approved milestone: Owner Registration → Select Address → Auto Coordinates → Geohash (no MapLibre yet).*
