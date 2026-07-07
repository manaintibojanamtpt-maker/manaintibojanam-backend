# OrderBhojan M0 — Foundation Report

**Milestone:** M0  
**Version:** 0.1.0-m0  
**Status:** Complete — see `M0-ARB-EXIT-REVIEW.md`  
**BhojanOS modified:** No

---

## Delivered

| Area | Status |
|------|--------|
| Repository scaffold | ✅ |
| Feature-first folder structure | ✅ |
| React Router + placeholders | ✅ |
| Design system foundation | ✅ |
| Theme (light/dark/system) | ✅ |
| Marketplace HTTP client | ✅ |
| OpenAPI specification | ✅ |
| MSW mock server (all endpoints) | ✅ |
| Firebase Auth init shell | ✅ |
| Feature flags (`FF_OB_*`) | ✅ |
| Telemetry + correlation ID | ✅ |
| Error boundaries + toast | ✅ |
| TanStack Query + Zustand ready | ✅ |
| Unit tests | ✅ |
| CI (GitHub Actions) | ✅ |
| `npm run gate:m0` | ✅ |

## Not delivered (by design)

- Discovery, search, menu, cart, checkout, payments, orders, tracking UI
- BhojanOS Marketplace API server handlers
- Firestore customer collections
- M1 authentication flows

## Architecture compliance

- ✅ BhojanOS SSOT preserved
- ✅ No BhojanOS / SDK / Firestore schema changes
- ✅ No restaurant Firestore reads from client
- ✅ Opaque `restaurantId` in mock DTOs (ADR-OB-002)
- ✅ Server quote pattern reserved for M8

## Verification

```bash
npm run gate:m0
```

## Next milestone

**M1 Authentication** — blocked until explicit ARB approval.
