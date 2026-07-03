# M2 PR-5 — ReferenceSDK Static Bundle Adapter Report

**PR:** BHOS-M2-PR5  
**Date:** 2026-07-01  
**Bundle:** India Reference Data `2026.07`  
**Status:** ✅ Complete — adapter implemented, not wired to UI

---

## 1. Files Created

| Path | Purpose |
|------|---------|
| `src/sdk/reference/adapters/ReferenceBundlePort.ts` | Loader injection port |
| `src/sdk/reference/adapters/defaultReferenceBundlePort.ts` | Default Node JSON loader |
| `src/sdk/reference/adapters/validateManifest.ts` | Manifest validation |
| `src/sdk/reference/adapters/mapBundleToReferenceDto.ts` | Bundle → SDK DTO mappers |
| `src/sdk/reference/adapters/applyListFilters.ts` | Active/limit/iso filters |
| `src/sdk/reference/adapters/bundleCache.ts` | Singleton cache + indexes |
| `src/sdk/reference/adapters/ReferenceBundleRepository.ts` | `ReferenceRepository` impl |
| `src/sdk/reference/adapters/ReferenceBundleAdapter.ts` | `ReferenceSDK` impl |
| `src/sdk/reference/providers/StaticBundleProvider.ts` | Load + validate + cache |
| `src/sdk/reference/createReferenceSDK.ts` | Factory + exports |
| `src/sdk/__tests__/referenceBundleAdapter.test.ts` | Unit + integration tests |
| `src/sdk/reference/adapters/README.md` | Adapter flow docs |

**Updated:** `src/sdk/index.ts`, `package.json`, `src/sdk/reference/README.md`

---

## 2. Architecture Validation

| Check | Result |
|-------|--------|
| ReferenceSDK → ReferenceRepository → Adapter → Loader → JSON | ✅ |
| No UI / dropdowns / owner registration | ✅ |
| No LocationSDK changes | ✅ |
| No Firestore / API / browser | ✅ |
| OrderSDK untouched (ADR-013) | ✅ |
| SdkResult at boundary (no throw) | ✅ |
| Injectable `ReferenceBundlePort` for tests | ✅ |

---

## 3. Bundle Loading Flow

```
createReferenceSDK(port?)
  └─ StaticBundleProvider.getIndex()
       ├─ cache hit → return ReferenceBundleIndex
       └─ cache miss
            ├─ port.load() → IndiaReferenceBundle
            ├─ validateReferenceBundleManifest()
            ├─ assertValidIndiaReferenceBundle()
            ├─ buildReferenceBundleIndex() — parent-id maps
            └─ setCachedReferenceBundleIndex()
```

---

## 4. Cache Strategy

| Aspect | Decision |
|--------|----------|
| Scope | Process-wide singleton |
| Key | `bundleVersion` (`2026.07`) |
| Warm | First `getIndex()` call |
| Structure | Pre-built `Map` indexes by parent id |
| Test reset | `resetStaticBundleProviderCache()` |
| Invalidation | Manual only (future: version bump reload) |

**Load count:** Verified single disk read per cache lifecycle in tests.

---

## 5. Integrity Validation

| Stage | Validator |
|-------|-----------|
| Manifest | `validateManifest.ts` — version, schema, entity counts |
| Hierarchy | `integrity.ts` (PR-4) — IDs, parents, aliases, pincode format |
| Runtime | Both run on every cache miss before index build |

Invalid bundle → throws at load (surfaces as `INTERNAL` SdkFailure in repository).

---

## 6. Testing Results

```bash
npm run test:sdk        # 59/59 pass (+8 new)
npm run test:reference  # 10/10 pass
```

| Test | Coverage |
|------|----------|
| Mock hierarchy walk | country → pincode |
| NOT_FOUND / VALIDATION | Error codes |
| Limit filter | State list |
| Cache single load | loadCount === 1 |
| Integration | 36 states, Bengaluru in KA-BU |

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Node `fs` only in default port | Browser bundle load deferred to future PR (fetch `/data/...`) |
| Stale cache after bundle update | Version constant check in manifest; restart clears cache |
| Large bundle memory | ~243 entities — negligible; indexed once |
| SDK imports data layer | Same pattern as OrderApiAdapter → api.ts |

---

## 8. Rollback Plan

Single commit revert removes adapter files and `createReferenceSDK` exports.  
Bundle data (PR-4) remains — harmless without adapter.  
Zero UI impact.

---

## Definition of Done

- [x] ReferenceBundleAdapter implements ReferenceSDK  
- [x] ReferenceBundleRepository implements ReferenceRepository  
- [x] StaticBundleProvider with manifest + integrity validation  
- [x] Bundle loader port + default port  
- [x] In-memory cache with indexes  
- [x] createReferenceSDK / referenceSdkFactory exported  
- [x] Tests (mock + India 2026.07 integration)  
- [x] No UI, LocationSDK, Firestore, API  

---

**STOP.** Await approval for UI dropdown / owner registration PR.

---

*BHOS-M2-PR5 — ReferenceSDK Static Bundle Adapter complete.*
