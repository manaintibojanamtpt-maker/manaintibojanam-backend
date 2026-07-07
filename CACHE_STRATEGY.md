# BhojanOS Cache Strategy

**Version:** 1.0  
**Related:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md)

---

## Goals

1. Reduce duplicate Firestore reads and API polling load
2. Serve stale data safely during transient failures (offline / quota backoff)
3. Never fabricate tenant state from unvalidated cache entries

---

## Current Implementation

### Validated tenant cache (shipped)

**Module:** `src/lib/tenantPath.ts`  
**Storage:** `sessionStorage` key `tenant_{slug}`

```typescript
interface ValidatedTenantCacheEntry {
  tenant: TenantInfo;
  validatedAt: string;  // ISO timestamp — written only after Firestore success
}
```

Rules:

- `writeCachedTenant()` called only after a successful Firestore fetch in `TenantContext`
- `readValidatedCachedTenant()` returns data only when `validatedAt` is present
- Unvalidated legacy entries are ignored (no fabricated tenant on error)

This is the **reference pattern** for RepositoryCache: validate-then-cache, never cache-on-failure.

### API polling snapshots (implicit cache)

Owner reads (`ownerOrdersReads`, `useOwnerMenuCount`) hold in-memory snapshots refreshed on interval. These are not persisted but act as short-TTL caches per hook instance.

**Known issue:** Duplicate timers across `OrderAlertContext`, `OwnerDashboard`, and `OwnerOrders` inflate load. Target: single `DashboardRealtimeProvider` (Phase 4).

### Server-side health config cache

`GET /api/client-config` sets `Cache-Control: public, max-age=300` for Firebase web SDK bootstrap on Vercel.

### Geocoding cache (SDK)

`src/sdk/location/providers/open-geocoding/OpenGeocodingCache.ts` — in-memory TTL cache for geocode results (SDK-internal, not RepositoryCache).

---

## RepositoryCache (Planned — Phase 11)

Central client-side cache with TTL + stale-while-revalidate (SWR):

```
┌──────────────┐     miss / stale     ┌──────────────┐
│  Hook / UI   │ ──────────────────► │ RepositoryCache│
└──────────────┘                     └───────┬──────┘
       ▲                                     │
       │           fresh data                │ background revalidate
       └─────────────────────────────────────┤
                                             ▼
                                    API / Firestore read
```

### Proposed interface

```typescript
interface RepositoryCacheOptions<T> {
  key: string;
  ttlMs: number;
  staleWhileRevalidateMs?: number;
  fetcher: () => Promise<T>;
  validate?: (value: T) => boolean;
}

class RepositoryCache {
  get<T>(options: RepositoryCacheOptions<T>): Promise<T>;
  invalidate(key: string): void;
  invalidatePrefix(prefix: string): void;
}
```

### Target domains

| Domain | Key pattern | TTL (proposed) | Notes |
|--------|-------------|----------------|-------|
| Tenant doc | `tenant:{slug}` | 5 min | Extend validated sessionStorage pattern |
| Owner menu list | `menu:{tenantId}` | 30 s | Replace duplicate 8s polls |
| Owner orders snapshot | `orders:{tenantId}` | 5 s | Single provider vs triplicate polls |

### SWR behavior

1. **Fresh hit:** return cached value, no network
2. **Stale hit:** return cached value immediately, revalidate in background
3. **Miss:** await fetcher, store with `validatedAt`
4. **Fetch failure:** return stale if within SWR window; otherwise propagate error (no fabrication)

### Invalidation triggers

| Event | Action |
|-------|--------|
| Owner mutation success | `invalidatePrefix('menu:{tenantId}')` etc. |
| Tenant domain event (future client bus) | Targeted invalidation by type |
| Auth logout | Clear tenant-scoped keys |
| Manual refresh | Expose `invalidate()` on hooks |

---

## Firestore Quota Interaction

When `/api/health` reports `firestore.backedOff: true`:

- Extend effective TTL (serve stale longer)
- Disable background revalidation except on user-initiated retry
- Surface degraded state in UI (TenantContext error path — Phase 9)

Server already implements quota circuit breaker in `server.ts`. Client RepositoryCache should respect the same signal via health polling or error classification.

---

## Anti-Patterns

| Pattern | Why avoid |
|---------|-----------|
| Cache tenant on Firestore error | Wrong tenant shown to owner (audit finding) |
| Unbounded sessionStorage | Quota errors on mobile |
| Per-component fetch without shared cache | Duplicate polls (current owner dashboard issue) |
| Infinite stale serve | Must cap SWR window and show stale indicator |

---

## Verification

Today:

```bash
npm run test:unit -- src/lib/__tests__/tenantCheckoutConfig.test.ts
npm run lint:presentation   # ensures pages don't bypass lib/SDK cache layers
```

After RepositoryCache lands:

- Unit tests for TTL, SWR, invalidation, quota backoff
- Polling consolidation test (single timer assertion)

---

## Related Documents

- [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md) — Phase 4 (DashboardRealtimeProvider), Phase 11 (RepositoryCache)
- [CAPABILITY_REGISTRY.md](./CAPABILITY_REGISTRY.md) — Tenant capability cache notes

---

*Maintainers: update when RepositoryCache ships or cache keys/TTLs change.*
