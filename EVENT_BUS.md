# BhojanOS Event Bus

**Version:** 1.0  
**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [CAPABILITY_REGISTRY.md](./CAPABILITY_REGISTRY.md)

---

## Overview

BhojanOS uses a **server-side tenant domain event bus** for synchronizing tenant mutations to marketplace projections and related handlers. Events are persisted before handlers run (outbox-style durability within the same request).

| Property | Value |
|----------|-------|
| Bus module | `backend-lib/marketplace/tenantDomainEventBus.ts` |
| Persistence collection | `tenant_domain_events` |
| Event types | `backend-lib/domain/TenantDomainEventTypes.ts` |
| Subscriber registry | `backend-lib/marketplace/registerTenantDomainEvents.ts` |

---

## Architecture

```
Owner API mutation (menu, storefront, delivery, …)
        │
        ▼
publishTenantDomainEvent(db, fieldValue, { tenantId, type, source })
        │
        ├── persistDomainEvent → tenant_domain_events/{eventId}
        │
        └── handlersFor(event.type) + handlersFor('*')
                │
                ▼
        marketplaceSyncSubscriber → runTenantMarketplaceSync
                │
                ▼
        TenantSyncResult (discovery profile, projections, etc.)
```

This is a **server bus only**. The client does not subscribe to `tenant_domain_events`. Cross-widget updates on the owner dashboard currently use API polling (target: lightweight client emitter in Phase 7).

---

## Event Types

| Type | Typical trigger |
|------|-----------------|
| `StorefrontUpdated` | General storefront PUT |
| `MenuUpdated` | Menu item create/update/delete |
| `CategoryUpdated` | Category changes |
| `VariantUpdated` | Variant option changes |
| `OfferUpdated` | Offers / promotions |
| `GalleryUpdated` | Marketplace gallery |
| `ThemeUpdated` | Theme tokens |
| `DeliveryUpdated` | Delivery config |
| `StoreOperationsUpdated` | Hours, publish, operations |
| `InventoryUpdated` | Stock-level changes |

Version: `TENANT_DOMAIN_EVENT_VERSION = '1.0.0'`

---

## API

### Publish

```typescript
import { publishTenantDomainEvent } from './backend-lib/marketplace/tenantDomainEventBus.js';

await publishTenantDomainEvent(db, fieldValue, {
  tenantId: 'lucky-s-kitchen',
  type: 'MenuUpdated',
  source: 'owner_menu_update',
});
```

Steps:

1. `createTenantDomainEvent()` builds versioned payload
2. Event document written to `tenant_domain_events`
3. Registered handlers invoked synchronously
4. Returns `TenantSyncResult` from last handler with a result

### Subscribe

```typescript
import { subscribeTenantDomainEvent } from './backend-lib/marketplace/tenantDomainEventBus.js';

const unsubscribe = subscribeTenantDomainEvent('MenuUpdated', async (db, fieldValue, event) => {
  // handle event
});

// later: unsubscribe();
```

Wildcard `'*'` receives all event types.

---

## Subscriber Wiring

`registerTenantDomainEventSubscribers()` (called from `server.ts` at startup) registers:

- `registerMarketplaceSyncSubscriber` → `subscribers/marketplaceSyncSubscriber.ts`
- Runs `runTenantMarketplaceSync` for discovery / projection updates

Static wiring verified by: `backend-lib/marketplace/__tests__/tenantDomainEvents.test.ts`

---

## Legacy Source Mapping

Owner routes that predate explicit event types use inference helpers:

| Helper | Purpose |
|--------|---------|
| `inferTenantEventTypeFromLegacySource(source)` | Maps `owner_menu_update` → `MenuUpdated` |
| `inferStorefrontEventType(body)` | Inspects PUT body for gallery, delivery, theme |

---

## Event Document Schema

Stored at `tenant_domain_events/{eventId}`:

```json
{
  "eventId": "uuid",
  "type": "MenuUpdated",
  "version": "1.0.0",
  "occurredAt": "ISO-8601",
  "tenantId": "tenant-slug",
  "source": "owner_menu_update",
  "aggregateType": "tenant",
  "aggregateId": "tenant-slug",
  "payload": { "...": "..." },
  "createdAt": "<serverTimestamp>"
}
```

---

## Future Expansion (Phase 7)

Planned additions from [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md):

1. Explicit publishers for `OrderPlaced`, `InventoryChanged`, `RecipeUpdated` if not already emitted
2. Client-side lightweight emitter to replace poll-triggered UI refreshes
3. Optional async worker queue for long-running projection jobs

---

## Related Tests

```bash
npm run test:unit -- backend-lib/marketplace/__tests__/tenantDomainEvents.test.ts
npm run test:unit -- backend-lib/marketplace/__tests__/tenantSyncService.test.ts
```

---

*Maintainers: update when adding event types, subscribers, or moving to async delivery.*
