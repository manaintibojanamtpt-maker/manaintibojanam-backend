# M2 — Branch Discovery Flow

**Status:** Architecture design — no implementation  
**Constraints:** No Google Maps. No paid APIs. OpenStreetMap + MapLibre + Nominatim + Geohash.

---

## 1. Customer Discovery Pipeline

```
┌─────────────────┐
│    Customer     │
│  opens app /    │
│  marketplace    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Detect Current  │  LocationSDK.detectCurrentLocation()
│    Location     │  Browser Geolocation API
└────────┬────────┘
         │ GeoPoint + accuracy
         ▼
┌─────────────────┐
│ Reverse Geocode │  LocationSDK.reverseGeocode(point)
│  (Nominatim)    │  → city/area hints for UI
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Encode Geohash  │  LocationSDK.encodeGeohash(point, 7)
│   precision 7   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Nearby Branches │  LocationSDK.findNearbyBranches(point, filter)
│  GeoIndex query │  geohashPrefix pre-filter → distance refine
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Calculate     │  LocationSDK.calculateDistance(branch, customer)
│    Distance     │  Haversine × road factor (1.2)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Delivery Radius │  DeliveryDomain.isServiceable(point, branchConfig)
│     Check       │  maxRadiusKm gate
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Sort        │  distance ASC → rating → ETA → open status
│   & Filter      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Render       │  Branch cards / map markers (MapLibre)
│   Results       │  No Google Maps SDK
└─────────────────┘
```

---

## 2. Single-Storefront Mode (Current — Interim)

Today customers land on `/t/{slug}` — **no discovery needed**. M2 PR-6/7 adds detection for:

1. Confirm delivery serviceability within **current tenant's** branch  
2. Pre-fill address for checkout  

```
Customer on /t/mana-inti
  → detectCurrentLocation()
  → reverseGeocode()
  → calculateDistance(customer, tenant.location)
  → deliveryConfig.maxRadius check
  → update deliveryState
```

Feature flag: `FF_SDK_LOCATION_CUSTOMER_DETECT_ENABLED`

---

## 3. Multi-Branch Mode (Future)

One tenant, multiple branches:

```
Customer on /t/spice-kitchen
  → findNearbyBranches({ tenantId, radiusKm: 15 })
  → auto-select nearest serviceable branch
  → route to branch-specific menu/inventory (out of M2 scope)
```

---

## 4. Marketplace Mode (Future)

Platform-wide discovery:

```
Customer on bhojanos.com/discover
  → findNearbyRestaurants({ radiusKm: 10, sortBy: 'distance' })
  → render tenant cards with slug links
```

Requires `geoIndex` populated for all active branches.

---

## 5. Geohash Pre-Filter Algorithm

```typescript
// Pseudocode — LocationDomain
function findNearby(point: GeoPoint, branches: Branch[], radiusKm: number) {
  const customerHash = encodeGeohash(point, 7);
  const prefix = customerHash.substring(0, 5);

  const candidates = geoIndex.where('geohashPrefix', '==', prefix);

  return candidates
    .map(b => ({
      branch: b,
      distanceKm: calculateDistance(point, b.coordinates),
    }))
    .filter(r => r.distanceKm <= radiusKm)
    .filter(r => isServiceable(point, r.branch.deliveryConfig))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
```

**Neighbor prefixes:** If `< 8` results, expand to 8 adjacent geohash neighbors (standard geohash search pattern).

---

## 6. Map Rendering (MapLibre)

| Element | Source |
|---------|--------|
| Base tiles | OpenStreetMap (via free tile proxy or self-hosted) |
| Customer pin | GeoJSON layer — draggable |
| Branch markers | GeoJSON FeatureCollection from discovery results |
| Delivery radius | GeoJSON circle polygon (visual only) |

**No Google Maps SDK.** Remove unused `VITE_GOOGLE_MAPS_API_KEY` in PR-4 cleanup.

---

## 7. Fallback Paths

| Failure | Fallback |
|---------|----------|
| GPS denied | Manual search → `searchAddress()` |
| Nominatim timeout | Map pin only; structured form manual entry |
| No branches in radius | "No restaurants deliver here" + expand radius CTA |
| GeoIndex empty | Fall back to tenant.location (single-store mode) |

---

## 8. Performance Targets (design)

| Step | Target |
|------|--------|
| GPS detect | < 3s |
| Reverse geocode (cached) | < 500ms |
| GeoIndex query + filter | < 200ms |
| Total discovery | < 2s (warm) |

Future: Redis cache for geocode + geoIndex hot paths.

---

## 9. Integration Points

| Consumer | SDK methods |
|----------|-------------|
| HeaderLocationDropdown | detect, reverse, calculateDistance |
| AutoLocationForm (migrated) | search, reverse, validate, calculateDistance |
| Marketplace home (future) | findNearbyRestaurants |
| Checkout | validate, calculateDistance (fee via DeliveryDomain) |

**Checkout order writes unchanged** until explicit ADR.

---

*Branch Discovery Flow — architecture only.*
