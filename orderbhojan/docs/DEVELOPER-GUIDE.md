# OrderBhojan — Developer Guide

## Architecture

```
OrderBhojan React App
    → Marketplace API Client (/api/marketplace/*)
    → BhojanOS Render Backend (future handlers)
    → BhojanOS SDKs → Firestore (SSOT)
```

Customer Firebase (`orderbhojan`) stores only customer data.

## Folder guide

| Path | Purpose |
|------|---------|
| `src/app/` | Bootstrap, router, shell pages |
| `src/features/*/` | Vertical feature modules (stubs in M0) |
| `src/shared/` | Design system, layouts, providers |
| `src/marketplace-api/` | HTTP client, errors, MSW mocks |
| `src/firebase/` | Auth init only (M0) |
| `src/featureFlags/` | `FF_OB_*` flags |
| `src/telemetry/` | Logger, analytics, correlation ID |
| `src/config/` | Environment + validation |
| `openapi/` | Marketplace API contract |

## State management

- **Server state:** TanStack Query
- **Client state:** Zustand (M7+ for cart)
- **No Redux**

## API client

```typescript
import { getMarketplaceApiClient } from '@/marketplace-api';

const health = await getMarketplaceApiClient().health();
```

MSW intercepts requests in development when `VITE_MSW_ENABLED=true`.

## Feature flags

All `FF_OB_*` flags default OFF. Enable via `VITE_FF_OB_DISCOVERY=true` etc.

## Testing

```bash
npm run test:unit
npm run gate:m0
```

## Governance

M1 blocked until M0 ARB completion sign-off.
