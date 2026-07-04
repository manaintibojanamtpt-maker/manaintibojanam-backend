# M2 Migration Notes — Location Intelligence

**Version:** 0.4.0-m2

## Enable location features

Set in `.env.local`:

```bash
VITE_FF_LOCATION_ENABLED=true
VITE_FF_LOCATION_GEOCODE_API=true
VITE_MSW_ENABLED=true
```

All location flags default **OFF** in production until Release Manager approval.

## New module

- `src/features/location/` — customer location platform
- `src/styles/experience-location.css` — location UI layer

## Firestore

Uses existing `customers/{uid}/addresses/{addressId}` rules from M1.

## Marketplace API

Location endpoints are MSW-mocked only — no BhojanOS backend changes in M2.

## Regression

M1.6 experience shell unchanged when `FF_LOCATION_ENABLED=false`.

## Rollback

Set all `VITE_FF_LOCATION_*` to `false` and redeploy.
