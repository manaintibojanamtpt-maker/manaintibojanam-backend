# DiscoverySDK — Repository

Read-only discovery repository adapters (M3 PR-3 / PR-7).

## Paths

| Mode | Adapter | When |
|------|---------|------|
| Tenant scan | `TenantDiscoveryRepositoryAdapter` | Default / `FF_DISCOVERY_GEOINDEX_ENABLED` OFF |
| GeoIndex | `GeoIndexRepositoryAdapter` | `FF_DISCOVERY_GEOINDEX_ENABLED` ON + `geoIndexPort` |

## GeoIndex flow (PR-7)

```
DiscoveryQuery.customerPoint / customerGeohash
        ↓
GeoHashPrefixResolver (precision 6 default)
        ↓
GeoIndexPort.queryByPrefixes()
        ↓
GeoIndexMapper.extractTenantIds()
        ↓
TenantRepositoryPort.getTenantsByIds()
        ↓
DiscoveryCandidate[]
```

**Fallback:** unknown geohash, empty geoIndex, tenant fetch failure → `listActiveTenants()` tenant scan.

## Contract

- Returns `DiscoveryCandidate[]` only
- No ranking, eligibility, search, or UI
- Hidden behind `DiscoveryRepository` — pipeline unchanged

## Feature flag

`FF_DISCOVERY_GEOINDEX_ENABLED` — default **OFF**

## Telemetry

`GeoIndexRepositoryHooks.onTelemetry` exposes lookup/fetch timing and fallback usage.
