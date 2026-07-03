# ReferenceSDK (`src/sdk/reference`)

**Version:** `1.0.0-foundation` (`REFERENCE_SDK_VERSION`)  
**Frozen:** `false` (`REFERENCE_SDK_FROZEN`)  
**Status:** M2 PR-5 — static bundle adapter implemented (not wired to UI)  
**Authority:** ADR-011, M2 Architecture Pack, Bundle `2026.07`

---

## Purpose

ReferenceSDK is the **canonical administrative dataset boundary** for BhojanOS. It provides stable, hierarchical reference data for India (extensible to other countries):

```
Country → State → District → City → Locality → Pincode
```

Used by LocationSDK address validation, owner registration dropdowns, and pincode rules — **via contracts only until data bundle PRs**.

---

## Entity Model

Every entity includes:

| Field | Description |
|-------|-------------|
| `id` | Stable branded ID |
| `officialCode` | Government / postal code |
| `displayName` | UI label |
| `parentId` | Parent entity (`null` for country) |
| `active` | Selectable in dropdowns |

---

## Public API

| Method | Returns |
|--------|---------|
| `getCountries()` | `ReferenceCountry[]` |
| `getStates(countryId)` | `ReferenceState[]` |
| `getDistricts(stateId)` | `ReferenceDistrict[]` |
| `getCities(districtId)` | `ReferenceCity[]` |
| `getLocalities(cityId)` | `ReferenceLocality[]` |
| `getPincodes(localityId)` | `ReferencePincode[]` |

## Usage

```typescript
import { createReferenceSDK } from '@/sdk';
import type { CountryId } from '@/sdk';

const reference = createReferenceSDK();
const result = await reference.getStates('ref-country-in' as CountryId);
```

**Not wired to UI** in PR-5.

---

## Structure

| Path | Role |
|------|------|
| `contracts/` | `ReferenceSDK` public interface |
| `adapters/` | `ReferenceBundleAdapter`, repository, mappers, cache |
| `providers/` | `StaticBundleProvider` |
| `dto/` | Entity DTOs and list filters |
| `repository/` | `ReferenceRepository` persistence port |
| `types/` | Branded IDs and barrel exports |
| `createReferenceSDK.ts` | Factory |

---

## Relationship to LocationSDK

LocationSDK `ReferenceProvider` (PR-2) is a **legacy companion contract** for address dropdowns. ReferenceSDK is the **canonical platform module**. Future PRs will align LocationSDK to consume ReferenceSDK — not in PR-3.

---

## Rules

1. Bundle data lives in `src/data/reference/india/` — loaded via `StaticBundleProvider`.
2. No UI dropdown components in SDK.
3. OrderSDK v1.0.0 (ADR-013) must not be modified.
4. Breaking changes require ADR when `REFERENCE_SDK_FROZEN === true`.

---

## References

- [M2 India Address Model](../../../docs/m2/INDIA-ADDRESS-MODEL.md)
- [M2 PR-3 Report](../../../docs/m2/PR-3-REFERENCE-DATA-PLATFORM-REPORT.md)

---

*M2 PR-3 — ReferenceSDK foundation. No data loading.*
