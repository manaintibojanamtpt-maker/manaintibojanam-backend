# BhojanOS Architecture

**Version:** 1.0 · **Phase:** Production Modernization  
**Related:** [CAPABILITY_REGISTRY.md](./CAPABILITY_REGISTRY.md) · [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md)

---

## Layer Diagram

BhojanOS follows a strict top-down dependency flow. Presentation never imports Firestore directly; authoritative writes go through the Express API.

```
┌─────────────────────────────────────────────────────────────────┐
│  UI (Pages & Components)                                        │
│  src/pages/**  src/components/**                                │
└────────────────────────────┬────────────────────────────────────┘
                             │ imports facades / read helpers only
┌────────────────────────────▼────────────────────────────────────┐
│  Hooks & Context                                                │
│  src/hooks/**  src/context/**                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ orchestrates reads, polling, UI state
┌────────────────────────────▼────────────────────────────────────┐
│  SDK (Strangler Boundary)                                       │
│  src/sdk/**  src/lib/*Facade.ts  src/lib/*Reads.ts               │
└────────────────────────────┬────────────────────────────────────┘
                             │ contracts, adapters, feature flags
┌────────────────────────────▼────────────────────────────────────┐
│  Repository / API Clients                                       │
│  src/lib/owner*Api.ts  src/services/**  backend-lib/**           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP / server-side Firestore
┌────────────────────────────▼────────────────────────────────────┐
│  API (Express)                                                  │
│  server.ts  backend-lib/marketplace/*Routes.ts                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  Firestore (bhojanos-prod)                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

| Layer | Location | Role |
|-------|----------|------|
| **UI** | `src/pages/`, `src/components/` | Route-level screens, owner dashboards, storefront |
| **Hooks** | `src/hooks/`, `src/context/` | Polling, auth/tenant state, cart, order alerts |
| **SDK** | `src/sdk/`, `src/lib/*Facade.ts` | Domain contracts, projection adapters, certification |
| **Repository** | `src/lib/*Api.ts`, `backend-lib/` | HTTP clients, Firestore access, normalization |
| **API** | `server.ts`, `backend-lib/marketplace/*Routes.ts` | Auth, rate limits, authoritative writes |

---

## Production Topology

| Layer | Host | Notes |
|-------|------|-------|
| Frontend | Vercel → `www.bhojanos.com` | Vite + React PWA |
| API | Render → `manaintibojanam-backend.onrender.com` | Express (`dist/server.cjs`) |
| Database | Firebase Firestore `bhojanos-prod` | Rules in `firestore.rules` |

---

## Data Flow Patterns

### Owner flows (API-first)

Owner pages do **not** import `firebase/firestore`. Reads poll Express routes (e.g. `/api/owner/orders`, `/api/owner/menu`) via lib clients:

```
OwnerDashboard → subscribeOwnerOrders → ownerOrdersReads → /api/owner/orders
OwnerMenu      → ownerMenuApi         → /api/owner/menu
```

### Customer flows (strangler in progress)

Storefront and checkout still use a mix of Firestore reads and SDK facades behind feature flags (`FF_MENU_ENABLED`, `FF_SDK_*`). Target state: same layer diagram with SDK adapters as the only client entry.

### Server-side domain events

Tenant mutations publish to `tenant_domain_events` via `tenantDomainEventBus.ts`. See [EVENT_BUS.md](./EVENT_BUS.md).

### Observability

Incidents are written to `system_incidents` through `IncidentRepository`. Ops read APIs and AutoPilot share the same type-count path. See [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) and [PRODUCTION_OPERATIONS.md](./PRODUCTION_OPERATIONS.md).

---

## Import Rules

```typescript
// ✅ Presentation
import { subscribeOwnerOrders } from '@/lib/ownerOrdersReads';

// ✅ SDK via facade
import { MenuFacade } from '@/lib/menu/MenuFacade';

// ❌ Never in pages/components
import { getDoc } from 'firebase/firestore';
```

Enforced by: `npm run lint:presentation`

---

## Monorepo Layout

```
BhojanOS (root)
├── src/                    # Main Vite React app (customer + owner + admin)
├── backend-lib/            # Server-shared marketplace + observability logic
├── server.ts               # Production API monolith
├── orderbhojan/            # Marketplace experiment + e2e harness
└── packages/marketplace-contracts/
```

---

## Capability Ownership

Per-capability authoritative owners, SDK modules, and migration status are documented in [CAPABILITY_REGISTRY.md](./CAPABILITY_REGISTRY.md).

---

*Update this document when changing layer boundaries, deployment topology, or strangler cutover status.*
