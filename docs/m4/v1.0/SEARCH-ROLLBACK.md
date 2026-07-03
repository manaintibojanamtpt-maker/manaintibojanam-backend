# Search Platform — Emergency Rollback v1.0

**Status:** Frozen — M4 PR-10  
**Date:** 2026-06-26  
**Severity levels:** L1 (instant) · L2 (deploy) · L3 (code)

---

## 1. Rollback decision tree

```
Search incident detected
        │
        ├── UI-only issue? ──► L1: disable presentation flags
        │
        ├── SDK errors spike? ──► L1: FF_SEARCH_ENABLED=false
        │
        ├── Repository latency? ──► L1: FF_SEARCH_REPOSITORY_ENABLED=false
        │
        ├── Discovery enrichment failure? ──► L2: FF_DISCOVERY_ENABLED=false (browse unaffected)
        │
        └── Adapter bug? ──► L3: redeploy prior build OR StubSearchAdapter path
```

---

## 2. L1 — Feature flag rollback (no deploy)

**Time to effect:** Immediate (page reload)

### Production

Set environment variables:

```env
VITE_FF_SEARCH_ENABLED=false
VITE_FF_SEARCH_REPOSITORY_ENABLED=false
VITE_FF_SEARCH_AUTOCOMPLETE_ENABLED=false
VITE_FF_SEARCH_SUGGESTIONS_ENABLED=false
```

Redeploy hosting config **or** use platform env override if supported.

### Preview / development

```javascript
localStorage.setItem('FF_SEARCH_ENABLED', 'false');
localStorage.setItem('FF_SEARCH_AUTOCOMPLETE_ENABLED', 'false');
localStorage.setItem('FF_SEARCH_SUGGESTIONS_ENABLED', 'false');
localStorage.setItem('FF_SEARCH_REPOSITORY_ENABLED', 'false');
// reload
```

Or: `setSearchFlagOverride(flag, false)` from `searchFeatureFlags.ts` (dev/preview only).

### Expected behaviour after L1

| Component | State |
|-----------|-------|
| `createSearchSDK()` | Returns `StubSearchAdapter` when master OFF |
| Marketplace search bar | Hidden (`isMarketplaceSearchEnabled()` false) |
| Autocomplete | Disabled |
| Marketplace browse | **Unaffected** — Discovery-only mode |
| Checkout / orders | **Unaffected** |

---

## 3. L2 — Partial rollback

| Disable | Effect |
|---------|--------|
| `FF_SEARCH_AUTOCOMPLETE_ENABLED` only | Full search works; no autocomplete dropdown |
| `FF_SEARCH_SUGGESTIONS_ENABLED` only | No focus suggestions; autocomplete may remain |
| `FF_SEARCH_REPOSITORY_ENABLED` only | Search returns `REPOSITORY_UNAVAILABLE` |
| `FF_DISCOVERY_ENABLED` only | Search falls back to repository placeholders |

---

## 4. L3 — Code rollback

1. Revert to commit before search flag enablement.
2. `StubSearchAdapter` is always available — no import changes required.
3. Run `npm run test:sdk` — expect 301 pass on v1.0 tag.

**Git tag reference:** `search-platform-v1.0` (post-ARB)

---

## 5. Session / state cleanup

| Store | Key | Action on rollback |
|-------|-----|-------------------|
| `sessionStorage` | `bhos_marketplace_recent_searches` | Optional clear |
| `sessionStorage` | Search filter prefs | Optional clear |
| In-memory | `SearchSession`, `SearchTelemetry` | `resetSearchSession()` / `resetSearchTelemetry()` |

No server-side search state exists in v1.0.

---

## 6. Monitoring rollback success

| Signal | Healthy after rollback |
|--------|------------------------|
| `SEARCH_*` analytics events | Stop or drop to zero |
| `NOT_CONFIGURED` errors | Expected if flags OFF |
| Marketplace page | Browse mode only |
| Error rate | Returns to pre-search baseline |

---

## 7. Rollback verification checklist

- [ ] `FF_SEARCH_ENABLED=false` confirmed in runtime env
- [ ] Marketplace loads without search bar
- [ ] Discovery browse still works (`FF_DISCOVERY_MARKETPLACE_ENABLED`)
- [ ] No Firestore search scans in network tab
- [ ] `npm run test:sdk` pass on rollback build

---

## 8. Recovery

1. Root-cause in staging with flags ON.
2. Fix forward (patch release) — **no contract changes without ADR**.
3. Re-enable flags incrementally: repository → search → autocomplete → suggestions.
4. 24h monitor analytics + `timingMs` before full production.
