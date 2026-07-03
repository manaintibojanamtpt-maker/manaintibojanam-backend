# BhojanOS Domain — Location (`src/domain/location`)

**Status:** M2 PR-2 — boundary folders only (no logic)

## Purpose

Future home for **pure location domain rules** independent of React, Firebase, and external APIs.

Per BHOS-PAF-001 and ADR-011:

- **Presentation** consumes **LocationSDK**
- **LocationSDK** orchestrates **Domain** and **Platform Services**
- **Domain** must not import React, Firestore, Nominatim, or MapLibre

## Modules (planned)

| Folder | Bounded context |
|--------|-----------------|
| `address/` | India address validation, normalization |
| `geohash/` | Encode/decode, neighbor expansion |
| `distance/` | Haversine, road factor |
| `delivery/` | Serviceability, fee tiers, ETA |

**No business logic in PR-2.** Implementations arrive in M2 PR-3+.
