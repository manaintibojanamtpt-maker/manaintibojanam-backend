# M3 Architecture Compliance Report

**Milestone:** M3 — Marketplace Discovery Engine  
**Version:** `0.5.0-m3`

## Flow compliance

```
HomeExperiencePage
  └─ (FF_OB_DISCOVERY) DiscoveryHomeFeed
       └─ useDiscoveryHome → discoveryEngine → discoveryApiClient → Marketplace API
            └─ MSW / future backend
```

UI never calls Marketplace API directly for restaurant lists.

## API boundary

| Rule | Compliant |
|------|-----------|
| Consume only Marketplace APIs | ✓ |
| Never read restaurant Firestore | ✓ |
| Public DTO only (`RestaurantPublic`) | ✓ |
| No tenantId / branchId exposure | ✓ |

## Module ownership

| Layer | Path |
|-------|------|
| Domain | `features/discovery/domain/` |
| Engine | `features/discovery/engine/` |
| Infrastructure | `features/discovery/infrastructure/` |
| Hooks | `features/discovery/hooks/` |
| UI | `features/discovery/ui/` |

## Design system

All discovery UI uses `@bhojan/design-system` (Card, Rail, Badge, Chip, Button, Text). M1.6 visual language preserved via shared `ob-restaurant-tile` classes.

## State management

TanStack Query for server state; Zustand for filter UI state. Location changes invalidate via `DiscoveryProvider`.

## Feature flags

`FF_OB_DISCOVERY` defaults `false`. Mock M1.6 rails preserved when disabled.

## Future hooks

`rankCollectionRestaurants()` reserved for personalization / AI recommendations / campaign placement.

## Out of scope verification

No imports of menu, checkout, order, or tracking modules from discovery feature.
