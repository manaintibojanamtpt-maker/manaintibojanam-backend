# M2 PR-7 — Location Provider Framework Report

**PR:** BHOS-M2-PR7  
**Date:** 2026-06-26  
**Version:** `LOCATION_SDK_VERSION = 1.0.0-providers`  
**Status:** ✅ Complete — framework wired, stubs only, not wired to UI

---

## 1. Files Created

| Path | Purpose |
|------|---------|
| `src/sdk/location/providers/GeocodingProvider.ts` | Geocoding contract |
| `src/sdk/location/providers/BrowserLocationProvider.ts` | Browser location contract |
| `src/sdk/location/providers/MapProvider.ts` | Map intelligence contract |
| `src/sdk/location/providers/types.ts` | Registry + factory option types |
| `src/sdk/location/providers/ProviderRegistry.ts` | DI registry with `register()` |
| `src/sdk/location/providers/ProviderFactory.ts` | Factory + default kinds |
| `src/sdk/location/providers/CompositeLocationProvider.ts` | Registry → legacy `LocationProvider` |
| `src/sdk/location/providers/stubs/StubGeocodingProvider.ts` | NOT_CONFIGURED geocoding |
| `src/sdk/location/providers/stubs/StubBrowserLocationProvider.ts` | NOT_CONFIGURED browser |
| `src/sdk/location/providers/stubs/StubMapProvider.ts` | Default viewport stub |
| `src/sdk/location/dto/map.ts` | Map DTOs |
| `src/sdk/location/providers/README.md` | Provider docs |
| `src/sdk/__tests__/locationProviderFramework.test.ts` | 11 tests |

**Updated:** `createLocationSDK.ts`, `DefaultLocationAdapter.ts`, `LocationPorts.ts`, `StubLocationProvider.ts`, `types/branded.ts`, `types/index.ts`, `sdk/index.ts`, `version.ts`, `package.json`, `location/README.md`

---

## 2. Provider Architecture

| Layer | Role |
|-------|------|
| `ProviderFactory` | Creates stub providers; rejects unimplemented kinds |
| `LocationProviderRegistry` | Holds geocoding / browser / map slots |
| `CompositeLocationProvider` | Adapts registry to PR-2 `LocationProvider` |
| `DefaultLocationAdapter` | Routes SDK methods via registry when injected |

---

## 3. Dependency Diagram

```
LocationSDK
    │
    ▼
DefaultLocationAdapter
    │
    ├── providerRegistry.getGeocoding() ──► StubGeocodingProvider
    ├── providerRegistry.getBrowser()  ──► StubBrowserLocationProvider
    └── providerRegistry.getMap()      ──► StubMapProvider (future map methods)

createLocationProviderFramework()
    │
    ├─ createDefaultLocationProviderRegistry()
    └─ createCompositeLocationProvider(registry)
```

---

## 4. Testing Results

```bash
npm run test:sdk   # 80/80 pass (+11 new)
```

| Test | Coverage |
|------|----------|
| Default stub kinds | All three slots |
| Registry register | Geocoding injection |
| Stub NOT_CONFIGURED | Geocoding + browser |
| Map default viewport | India center, zoom 5 |
| Unsupported kinds throw | nominatim, browser, maplibre |
| SDK registry DI | forwardGeocode via injected geocoding |

---

## 5. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Duplicate routing (composite vs registry) | Adapter prefers registry when present |
| Premature Nominatim wiring | Factory throws for `nominatim` kind |
| Map provider confused with UI | Contract is viewport/validation only — no render |

---

## 6. Rollback Plan

1. Remove `providers/GeocodingProvider.ts`, `BrowserLocationProvider.ts`, `MapProvider.ts`, `ProviderFactory.ts`, `ProviderRegistry.ts`, `CompositeLocationProvider.ts`, `stubs/`, `types.ts`, `dto/map.ts`.
2. Revert `createLocationSDK.ts`, `DefaultLocationAdapter.ts`, `LocationPorts.ts`, `StubLocationProvider.ts` to PR-6 state.
3. Restore `LOCATION_SDK_VERSION` to `1.0.0-adapter`.
4. Remove `locationProviderFramework.test.ts` from `test:sdk`.

No production wiring. No feature flags enabled.

---

## 7. Definition of Done

| Criterion | Status |
|-----------|--------|
| GeocodingProvider interface | ✅ |
| BrowserLocationProvider interface | ✅ |
| MapProvider interface | ✅ |
| ProviderFactory | ✅ |
| Provider registry + DI | ✅ |
| Stub implementations | ✅ |
| Version exports | ✅ `1.0.0-providers` |
| Documentation | ✅ |
| SDK tests pass | ✅ |
| No HTTP / Nominatim / browser / MapLibre / UI | ✅ |
| STOP — await external provider approval | ✅ |

---

*M2 PR-7 — Location Provider Framework. External providers deferred.*
