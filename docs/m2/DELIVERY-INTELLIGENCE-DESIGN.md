# M2 — Delivery Intelligence Design

**Status:** Architecture design — no implementation  
**Migrates from:** `src/lib/deliveryFee.ts` (canonical), deprecates duplicates

---

## 1. Scope

Delivery Intelligence owns **serviceability**, **fee calculation**, **ETA estimation**, and **zone geometry** — separate from Address and Map intelligences.

```
LocationSDK.calculateDistance()     → raw distance
DeliveryDomain.checkServiceability() → in/out + reason
DeliveryDomain.computeFee()          → ₹ fee
DeliveryDomain.estimateEta()         → minutes
```

---

## 2. Zone Models

### 2.1 Circle zones (M2 — implements existing model)

| Zone | Field | Meaning |
|------|-------|---------|
| Free | `freeRadiusKm` | ₹0 delivery |
| Paid base | `paidRadiusKm` | Flat `baseFee` |
| Maximum | `maxRadiusKm` | Beyond = not serviceable |

Visual:

```
        ┌─────────────────────────────┐
        │         maxRadius           │
        │   ┌───────────────────┐     │
        │   │    paidRadius     │     │
        │   │  ┌─────────────┐  │     │
        │   │  │ freeRadius  │  │     │
        │   │  │   🏪 Branch │  │     │
        │   │  └─────────────┘  │     │
        │   └───────────────────┘     │
        └─────────────────────────────┘
```

### 2.2 Polygon zones (M2 design — M2+ implementation)

```typescript
interface DeliveryZone {
  id: string;
  type: 'circle' | 'polygon';
  geoJson: GeoJSON.Feature;
  feeOverride?: number;
  priority: number;                      // higher wins on overlap
}
```

**Algorithm:** Point-in-polygon (ray casting) — pure domain, no external lib required for M2.

### 2.3 Geohash serviceability pre-check

Before precise distance:

```
customerGeohashPrefix → branch maxRadius bounding box check
```

Cheap reject for obviously out-of-range pairs.

---

## 3. Fee Calculation (preserves current behavior)

Port from `computeDeliveryFee()` — **no behavior change** in first adapter PR:

| Condition | Fee |
|-----------|-----|
| `distance > maxRadius` | `-1` (unserviceable) |
| `distance ≤ freeRadius` | `0` |
| Owner configured base/perKm | Tiered per existing logic |
| Owner zones but zero fees | Platform defaults (₹30 + ₹10/km) |
| No config | Legacy tier table (2/5/8 km brackets) |

```typescript
interface ServiceabilityResult {
  readonly isServiceable: boolean;
  readonly distanceKm: number;
  readonly deliveryFee: number;          // -1 if not serviceable
  readonly reason?: 'OUT_OF_RADIUS' | 'PINCODE_BLOCKED' | 'STORE_CLOSED';
  readonly zoneMatched?: string;
}

interface EtaEstimate {
  readonly prepTimeMins: number;
  readonly travelTimeMins: number;
  readonly totalMins: number;
  readonly display: string;              // "30-45 mins"
}
```

---

## 4. ETA Model

### 4.1 Heuristic (M2)

Matches current Checkout behavior:

```
totalMins = prepTimeMins + ceil(distanceKm × 4)
```

Peak hour adjustment (optional — from ServiceabilityService pattern):

| Time window | Multiplier |
|-------------|------------|
| 12:00–14:00, 19:00–21:00 | ×1.25 |
| Default | ×1.0 |

### 4.2 Future routing (Valhalla — interface only)

```typescript
interface RoutingPort {
  getRoute(from: GeoPoint, to: GeoPoint, profile: 'driving' | 'two_wheeler'): Promise<RouteResult>;
}

interface RouteResult {
  distanceKm: number;
  durationMins: number;
  geometry: GeoJSON.LineString;
}
```

**M2:** Type stub in `src/domain/location/routing/` — no implementation.

---

## 5. Pincode Rules

Replace hardcoded `ServiceabilityService.ALLOWED_PINCODES` with:

1. **Branch-level** optional pincode allowlist  
2. **Area-level** pincode from India Address reference data  
3. **Fallback:** radius-only if no pincode list configured  

```typescript
interface PincodePolicy {
  mode: 'allowlist' | 'denylist' | 'none';
  pincodes?: string[];
}
```

---

## 6. Delivery Intelligence API (Domain — not SDK public)

```typescript
// src/domain/location/delivery/
function checkServiceability(
  customerPoint: GeoPoint,
  branchPoint: GeoPoint,
  config: DeliveryConfigReadModel,
  options?: { pincode?: string; pincodePolicy?: PincodePolicy }
): ServiceabilityResult;

function computeDeliveryFee(distanceKm: number, config: DeliveryConfigReadModel): number;

function estimateEta(distanceKm: number, config: DeliveryConfigReadModel, now?: Date): EtaEstimate;

function isPointInZone(point: GeoPoint, zone: DeliveryZone): boolean;
```

LocationSDK may expose thin wrappers that delegate to DeliveryDomain.

---

## 7. Owner Configuration UX (PR-5/8)

Owner sets via structured form:

- Circle radii (existing OwnerSettings fields)  
- Future: draw polygon on MapLibre → GeoJSON stored in `deliveryConfigs.zones`  

**Validation:**

- `freeRadius ≤ paidRadius ≤ maxRadius`  
- All radii > 0 when delivery enabled  
- Coordinates required (not 0,0)

---

## 8. Integration with Checkout (future PR — flagged)

```
Checkout (flag ON):
  deliveryState.selectedAddress.coordinates
    → LocationSDK.calculateDistance(customer, branch)
    → DeliveryDomain.computeFee()
    → state.deliveryFee (unchanged shape)
```

**Order document fields unchanged** — fee/distance snapshot at order time preserved.

---

## 9. Testing Strategy (PR-9)

| Test | Source |
|------|--------|
| Fee parity | Golden tests from current `deliveryFee.ts` |
| Serviceability edge cases | maxRadius boundary ±0.1km |
| Polygon point-in | Synthetic GeoJSON fixtures |
| ETA heuristic | Peak vs off-peak |

---

*Delivery Intelligence Design — no implementation.*
