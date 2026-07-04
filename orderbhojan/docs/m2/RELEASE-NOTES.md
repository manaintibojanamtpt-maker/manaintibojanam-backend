# OrderBhojan v0.4.0-m2 — Location Intelligence Platform

**Release Date:** 2026-06-26  
**Gate:** `npm run gate:m2`

## Summary

M2 establishes the customer location platform: GPS permission flow, session location, saved India addresses (Firestore), Marketplace location API client with MSW mocks, and premium location selector UI integrated with the M1.6 shell.

## Added

- Location feature module (`features/location/`)
- Location chip in home header and compact layout (when flag ON)
- Bottom sheet location selector with GPS, recent, and saved addresses
- India address form with map pin confirmation
- MSW handlers: reverse geocode, pincode validation, serviceability, delivery zone, distance
- Feature flags: `FF_LOCATION_ENABLED`, `FF_LOCATION_GEOCODE_API`, `FF_LOCATION_MAP_ENABLED`

## Unchanged when flags OFF

- M1.6 premium experience shell and mock catalog

## Quality

| Gate | Result |
|------|--------|
| gate:m2 | PASS |
| M1.6 regression | PASS |

## STOP

**M3 Discovery is blocked** until CEO approval.
