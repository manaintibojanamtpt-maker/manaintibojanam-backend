# M5 Architecture Compliance Report

**Milestone:** M5 — Restaurant Experience Platform  
**Version:** `0.7.0-m5`

## Flow compliance

```
RestaurantRoutePage
  └─ (FF_OB_RESTAURANT) RestaurantExperiencePage
       └─ useRestaurantExperience → restaurantExperienceLayer → restaurantApiClient
```

## Public DTO boundary

| Field | Exposed | Internal (never UI) |
|-------|---------|---------------------|
| restaurantId, slug, displayName | ✓ | tenantId, branchId |
| cover, logo, rating, ETA | ✓ | Firestore IDs |
| gallery, offers, description | ✓ | contextToken |
| openStatus, badges | ✓ | BhojanOS IDs |

## M0–M4 preservation

Discovery, Search, Location modules unchanged in architecture. Discovery cards optionally link to restaurant when M5 flag enabled.

## Extensibility hooks

- `enrichWithAiSummary()` — AI restaurant summary
- `enrichWithLoyalty()` — loyalty badges
- Disabled Call / Direction / Open Menu — M6+ reservation, dine-in, menu

## Design

BDS-only. M1.6 premium motion via collapsing header, glass overlays, blur-up hero, safe-area sticky bar.

## Feature flag

`FF_OB_RESTAURANT` defaults `false`. Placeholder page preserved when disabled.
