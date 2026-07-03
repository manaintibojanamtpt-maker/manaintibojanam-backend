# M2 — Firestore Schema Proposal

**Status:** Design only — **no migration**  
**Requires:** Dedicated migration ADR before any write path changes

---

## 1. Design Principles

1. **Tenant remains root entity** — branches hang under tenant  
2. **Location is normalized** — reusable `locations/{id}` documents  
3. **GeoIndex enables discovery** — geohash prefix documents for query  
4. **Backward compatible** — existing `tenants.location` preserved until migration PR  
5. **DeliveryConfig can be branch-scoped** — overrides tenant default  

---

## 2. Entity Relationship

```
Tenant (existing)
  ├── primaryLocationId → Location
  ├── defaultDeliveryConfigId → DeliveryConfig
  └── branches[] (denormalized ids)

Branch (new)
  ├── tenantId
  ├── locationId → Location
  ├── deliveryConfigId → DeliveryConfig
  └── geoIndexKey

Location (new)
  ├── indiaAddress (structured)
  ├── coordinates
  ├── geohash
  └── geoJson

DeliveryConfig (new)
  ├── tenantId / branchId
  ├── radius rules
  └── future: polygon zones

GeoIndex (new)
  ├── geohashPrefix
  ├── branchId / tenantId
  └── point (denormalized)
```

---

## 3. Collection: `locations/{locationId}`

```typescript
interface LocationDocument {
  id: string;
  tenantId: string;
  branchId?: string;                    // null = tenant HQ

  address: {
    country: 'IN';
    stateCode: string;
    stateName: string;
    districtCode: string;
    districtName: string;
    cityCode: string;
    cityName: string;
    areaCode: string;
    areaName: string;
    pincode: string;
    street: string;
    landmark?: string;
    formattedAddress: string;
  };

  coordinates: {
    lat: number;
    lng: number;
    accuracyM?: number;
    source: 'map_pin' | 'gps' | 'geocode' | 'manual';
    capturedAt: Timestamp;
  };

  geohash: string;                       // precision 7
  geoJson: {
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { geohash: string };
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: 1;
}
```

**Indexes:** `tenantId`, `geohash`, `address.pincode`, `address.cityCode`

---

## 4. Collection: `branches/{branchId}`

```typescript
interface BranchDocument {
  id: string;
  tenantId: string;
  slug: string;                          // unique within tenant
  name: string;
  status: 'draft' | 'active' | 'closed' | 'suspended';

  locationId: string;                      // → locations/{id}
  deliveryConfigId: string;                // → deliveryConfigs/{id}

  isDefault: boolean;                      // primary branch for tenant
  contactPhone?: string;

  // Discovery metadata
  cuisineTags?: string[];
  ratingAggregate?: number;
  ratingCount?: number;

  geohash: string;                         // denormalized from location
  coordinates: { lat: number; lng: number }; // denormalized

  storeOperations?: {
    isStoreOpen?: boolean;
    businessHoursEnabled?: boolean;
    openTime?: string;
    closeTime?: string;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: 1;
}
```

**Indexes:** `tenantId + status`, `geohash`, `tenantId + isDefault`

---

## 5. Collection: `deliveryConfigs/{configId}`

```typescript
interface DeliveryConfigDocument {
  id: string;
  tenantId: string;
  branchId?: string;                     // null = tenant-wide default

  enabled: boolean;

  // Circle zones (M2 — matches existing model)
  freeRadiusKm: number;
  paidRadiusKm: number;
  maxRadiusKm: number;
  baseFee: number;
  perKmCharge: number;
  prepTimeMins: number;
  freeDeliveryMinOrder?: number;
  feesConfigured: boolean;

  // Future polygon zones (M2+ — schema reserved)
  zones?: Array<{
    id: string;
    type: 'circle' | 'polygon';
    geoJson: GeoJSON.Polygon | GeoJSON.Feature;
    feeOverride?: number;
    maxRadiusKm?: number;
  }>;

  // Future routing
  routingProfile?: 'haversine' | 'valhalla';
  etaModel?: 'heuristic' | 'routing';

  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: 1;
}
```

---

## 6. Collection: `geoIndex/{docId}`

Denormalized index for geohash prefix queries (Firestore lacks native geo queries).

```typescript
interface GeoIndexDocument {
  id: string;                              // `{geohashPrefix}_{branchId}`
  geohashPrefix: string;                   // 5 chars ≈ 4.9km
  geohash: string;                         // full precision 7
  branchId: string;
  tenantId: string;

  coordinates: { lat: number; lng: number };
  status: 'active' | 'closed';

  // Discovery denormalization
  name: string;
  slug: string;
  ratingAggregate?: number;

  updatedAt: Timestamp;
}
```

**Query pattern:**

```
geoIndex
  .where('geohashPrefix', '==', customerGeohash.substring(0, 5))
  .where('status', '==', 'active')
  .limit(50)
→ client-side distance filter + sort
```

**Future:** PostGIS replaces prefix hack; Redis GEOADD for hot cache.

---

## 7. Tenant Document Extensions (additive)

Existing `tenants/{id}` gains optional fields — **legacy fields retained**:

```typescript
interface TenantDocumentExtensions {
  primaryLocationId?: string;
  primaryBranchId?: string;
  defaultDeliveryConfigId?: string;
  branchIds?: string[];                  // denormalized list

  // Legacy — kept until migration complete
  location?: { address, city, state, pincode, lat, lng };
  deliveryConfig?: { ... existing ... };
}
```

---

## 8. User Saved Addresses (additive)

```typescript
// users/{uid}.savedAddresses[]
interface SavedAddressV2 {
  id: string;
  label: string;
  isDefault: boolean;
  schemaVersion: 2;
  locationId?: string;                     // optional link to locations/
  indiaAddress: IndiaAddress;              // embedded snapshot
  deliveryInstructions?: string;
  contactPhone?: string;
}
```

Strangler: v1 flat addresses coexist with v2.

---

## 9. Security Rules (design notes)

| Collection | Customer read | Owner write |
|--------------|---------------|-------------|
| `locations` | Own tenant storefront only | Owner of tenantId |
| `branches` | Active branches (public discovery) | Owner of tenantId |
| `deliveryConfigs` | Read via branch | Owner of tenantId |
| `geoIndex` | Public read (active only) | Server/admin write |

**Rule:** GeoIndex writes via Cloud Function on branch save — not client-direct (prevents index poisoning).

---

## 10. Migration Strategy (future ADR)

| Phase | Action |
|-------|--------|
| M2-PR-7 | Create collections empty divonly; dual-write optional |
| M2-PR-8 | Backfill script: `tenants.location` → `locations/` + `branches/` |
| M2-PR-9 | Switch reads behind flag |
| M2-PR-10 | Deprecate embedded `tenants.location` (major version) |

**Not in M2 design approval scope.**

---

*Firestore Schema Proposal — no migration until ADR approved.*
