# M2 — Search Intelligence Architecture

**Status:** Architecture only — no implementation  
**Scope:** Customer restaurant search pipeline design

---

## 1. Search Pipeline

```
Customer Search Query
        │
        ▼
┌───────────────┐
│ Geo Context   │  Current location OR selected area
└───────┬───────┘
        ▼
┌───────────────┐
│ Nearby Filter │  findNearbyRestaurants(radiusKm)
└───────┬───────┘
        ▼
┌───────────────┐
│ Cuisine Filter│  branch.cuisineTags ∩ query.tags
└───────┬───────┘
        ▼
┌───────────────┐
│  Area Filter  │  indiaAddress.areaCode match
└───────┬───────┘
        ▼
┌───────────────┐
│   Distance    │  Already computed in discovery
└───────┬───────┘
        ▼
┌───────────────┐
│    Rating     │  branch.ratingAggregate (min threshold)
└───────┬───────┘
        ▼
┌───────────────┐
│ Delivery Time │  estimateEta() per branch
└───────┬───────┘
        ▼
┌───────────────┐
│ Availability  │  storeOperations.isStoreOpen
└───────┬───────┘
        ▼
┌───────────────┐
│    Rank       │  Weighted score (see §2)
└───────┬───────┘
        ▼
    Render List
```

---

## 2. Ranking Weights (configurable — future admin)

| Signal | Default weight | Notes |
|--------|------------------|-------|
| Distance | 0.35 | Closer = higher |
| Rating | 0.25 | Normalized 0–5 |
| ETA | 0.20 | Lower mins = higher |
| Delivery fee | 0.10 | Lower fee = higher |
| Availability | 0.10 | Open now boost |

```typescript
score = w1×(1/distanceNorm) + w2×(rating/5) + w3×(1/etaNorm) + w4×(1/feeNorm) + w5×openBoost
```

**M2:** Weights hardcoded in domain; admin config in M3+.

---

## 3. Search Input Types

| Type | Example | Handler |
|------|---------|---------|
| Text | "biryani near me" | Parse cuisine + delegate nearby |
| Area | "Koregaon Park" | Area code lookup → geo center |
| Cuisine tag | "South Indian" | Filter `cuisineTags` |
| Near me | (implicit) | GPS → discovery |

---

## 4. Future Location AI (interface stub)

```typescript
interface DiscoveryRankerPort {
  rank(
    candidates: RestaurantDiscoveryResult[],
    context: { userId?: UserId; history?: string[]; timeOfDay?: number }
  ): RestaurantDiscoveryResult[];
}
```

**M2:** No ML implementation. Rule-based ranker only.

---

## 5. Caching Strategy (future)

| Cache | Key | TTL |
|-------|-----|-----|
| Nearby results | `geo:{geohash5}` | 5 min |
| Search text | `search:{normalized}` | 10 min |
| Branch metadata | `branch:{id}` | 1 hour |

Redis — design hook only.

---

*Search Intelligence — architecture only.*
