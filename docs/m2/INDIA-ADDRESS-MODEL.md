# M2 — India Address Model

**Status:** Schema design — no implementation  
**Default country:** India (`IN`) — hidden in UI

---

## 1. Hierarchy

```
Country (IN — default, hidden)
  └── State / UT (dropdown — 36 official)
        └── District (dropdown — filtered by state)
              └── City (dropdown — filtered by district)
                    └── Area / Locality (dropdown — filtered by city)
                          └── Pincode (validated — 6 digits)
                                └── Street (free text — required)
                                      └── Landmark (free text — optional)
                                            └── Map Pin (required)
                                                  └── Coordinates (auto)
                                                        └── Geohash (auto — precision 7)
```

---

## 2. Core DTO: `IndiaAddress`

```typescript
/** ISO 3166-1 alpha-2 — always 'IN' for M2 */
type CountryCode = 'IN';

interface IndiaAddress {
  readonly country: CountryCode;           // default 'IN', hidden in forms

  readonly stateCode: string;              // e.g. 'MH' — official ISO-like code
  readonly stateName: string;              // e.g. 'Maharashtra'

  readonly districtCode: string;           // e.g. 'MH-PUN'
  readonly districtName: string;           // e.g. 'Pune'

  readonly cityCode: string;              // stable slug within district
  readonly cityName: string;               // e.g. 'Pune'

  readonly areaCode: string;               // locality slug
  readonly areaName: string;               // e.g. 'Koregaon Park'

  readonly pincode: string;                // 6-digit, validated

  readonly street: string;                 // required — house/shop/street
  readonly landmark?: string;              // optional — "Near XYZ Mall"

  readonly coordinates: GeoCoordinates;    // required — from map pin
  readonly geohash: string;                // auto — precision 7 (~153m)

  /** Computed display line for UI / orders */
  readonly formattedAddress?: string;
}

interface GeoCoordinates {
  readonly lat: number;   // WGS84
  readonly lng: number;   // WGS84
  readonly accuracyM?: number;  // from GPS when available
  readonly source: 'map_pin' | 'gps' | 'geocode' | 'manual';
  readonly capturedAt: IsoDateTime;
}
```

---

## 3. Reference Data Model

Static JSON bundles (no paid API):

```
src/data/india/
├── states.json           # 28 states + 8 UTs
├── districts/{state}.json
├── cities/{district}.json
├── areas/{city}.json
└── pincodes/
    ├── index.json        # pincode → area mapping
    └── validation-rules.json
```

### 3.1 State entry

```json
{
  "code": "MH",
  "name": "Maharashtra",
  "type": "state"
}
```

### 3.2 District entry

```json
{
  "code": "MH-PUN",
  "name": "Pune",
  "stateCode": "MH"
}
```

### 3.3 Area entry

```json
{
  "code": "pune-koregaon-park",
  "name": "Koregaon Park",
  "cityCode": "pune-city",
  "pincodes": ["411001", "411036"]
}
```

---

## 4. Field Rules

| Field | UI control | Required | Validation |
|-------|------------|----------|------------|
| Country | Hidden | Yes | Fixed `IN` |
| State | Dropdown | Yes | Must exist in `states.json` |
| District | Dropdown | Yes | `district.stateCode === state.code` |
| City | Dropdown | Yes | `city.districtCode === district.code` |
| Area | Dropdown | Yes | `area.cityCode === city.code` |
| Pincode | Input (6 digit) | Yes | Regex `^[1-9][0-9]{5}$`; should match area pincodes |
| Street | Textarea | Yes | Min 5 chars |
| Landmark | Text | No | Max 120 chars |
| Map pin | MapLibre | Yes | lat ∈ [6.5, 37.5], lng ∈ [68.0, 97.5] (India bbox) |
| Coordinates | Auto | Yes | Derived from pin |
| Geohash | Auto | Yes | Precision 7 default; encode on save |

---

## 5. Dependent Dropdown Behavior

```
onStateChange(state)     → reset district, city, area, pincode
onDistrictChange(dist)   → reset city, area, pincode
onCityChange(city)       → reset area, pincode
onAreaChange(area)       → auto-fill pincode (first match if multiple)
onPincodeChange(pin)     → suggest area if unique match
onMapPinMove(lat, lng)   → update coordinates; optional reverse geocode hint
```

**Owner registration:** Map centers on selected city/area centroid; pin draggable.

**Customer flow:** Map centers on GPS or search result; pin confirms exact delivery point.

---

## 6. Validation Rules (`validateAddress`)

| Rule ID | Check | Error code |
|---------|-------|------------|
| V-01 | `country === 'IN'` | `VALIDATION` |
| V-02 | State in reference data | `VALIDATION` |
| V-03 | District belongs to state | `VALIDATION` |
| V-04 | City belongs to district | `VALIDATION` |
| V-05 | Area belongs to city | `VALIDATION` |
| V-06 | Pincode format + area match | `VALIDATION` |
| V-07 | Street non-empty | `VALIDATION` |
| V-08 | Coordinates within India bbox | `VALIDATION` |
| V-09 | Geohash matches coordinates | `VALIDATION` |
| V-10 | Map pin required (not 0,0) | `VALIDATION` |

---

## 7. Migration from AS-IS

| AS-IS field | Target field | Strategy |
|-------------|--------------|----------|
| `location.address` | `street` + `formattedAddress` | Parse best-effort; owner re-confirms on PR-5 |
| `location.city` | `cityName` | Fuzzy match to reference |
| `location.state` | `stateName` | Fuzzy match |
| `location.pincode` | `pincode` | Direct |
| `location.lat/lng` | `coordinates` | Direct if non-zero |
| — | `district`, `area` | Owner selects on re-registration |
| — | `geohash` | Compute on save |

**Migration ADR required** before Firestore backfill (not in M2 design phase).

---

## 8. GeoJSON Representation

```typescript
interface LocationGeoJson {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];  // [lng, lat] per GeoJSON spec
  };
  properties: {
    geohash: string;
    formattedAddress: string;
  };
}
```

Stored alongside `IndiaAddress` for future PostGIS / polygon queries.

---

## 9. Customer Saved Address Extension

```typescript
interface SavedIndiaAddress extends IndiaAddress {
  readonly id: string;
  readonly label: string;           // 'Home', 'Work'
  readonly isDefault: boolean;
  readonly deliveryInstructions?: string;
  readonly contactPhone?: string;
}
```

Replaces flat `SavedAddress` over time (strangler — both shapes during migration).

---

*India Address Model — schema design only.*
