# ADR-014: Search Platform v1.0 Freeze

**Status:** Proposed — pending Architecture Review Board  
**Date:** 2026-06-26  
**Deciders:** Architecture Review Board  
**Supersedes:** N/A (first stable Search Platform release)  
**Related:** ADR-011 (SDK Strangler), [Discovery Pipeline Contract](../m3/DISCOVERY-PIPELINE-CONTRACT.md), FEB-001, BHOS-M4

---

## Context

BhojanOS M4 (Search Intelligence Platform) delivered PR-1 through PR-9:

- SearchSDK with `search`, `suggest`, `autocomplete`
- SearchFacade presentation boundary
- Discovery-enriched search pipeline (Search consumes Discovery)
- Marketplace search UI, filters, analytics, autocomplete

All functionality ships behind `FF_SEARCH_*` feature flags defaulting **OFF**. M4 PR-10 certifies the platform for v1.0.0 without code changes.

External consumers (Marketplace UI, future npm package, server adapters) require a stable contract: method signatures, DTOs, pipeline stages, and error codes must not change without governance.

---

## Decision

1. **Freeze** Search Platform at version **1.0.0** effective upon ARB acceptance of this ADR.

2. **Frozen public surface — `SearchSDK`:**
   - `search(query: SearchQuery)`
   - `suggest(query: SearchQuery)`
   - `autocomplete(filter: AutocompleteFilter)`
   - `createSearchSDK(options?)`

3. **Frozen presentation surface — `SearchFacade`:**
   - `searchRestaurants`, `autocompleteSearch`, `suggestSearch`
   - `retrySearch`, `cancelSearch`
   - Session and telemetry exports documented in v1.0 API spec

4. **Frozen pipeline contract:** [SEARCH-PIPELINE-CONTRACT-v1.md](../m4/v1.0/SEARCH-PIPELINE-CONTRACT-v1.md)

5. **Frozen repository port:** `SearchRepository` interface — no method signature changes in v1.x

6. **Version constants (post-ARB implementation PR):**
   - `SEARCH_SDK_VERSION = '1.0.0'`
   - `SEARCH_SDK_FROZEN = true`
   - Git tag: `search-platform-v1.0`

7. **Explicit exclusions from v1.0:**
   - AI / semantic / embedding search
   - `searchFood` global food search
   - Discovery pipeline or repository modifications
   - Dedicated search index collection
   - Write operations

8. **No runtime behaviour changes in PR-10** — documentation, validation, and certification only.

---

## Consequences

### Positive

- Marketplace and future clients depend on stable search contracts.
- Breaking changes require ADR + major version bump.
- Clear rollback via feature flags and `StubSearchAdapter`.
- Discovery platform remains independently frozen.

### Negative / deferred

- Runtime version constant remains `0.1.0-foundation` until post-ADR metadata PR.
- Firestore scan repository not production-scaled — index ADR deferred.
- Production flag rollout requires staging soak (conditional certification).
- Food search, trending signals, and geo-specific suggestions deferred to v2+.

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Freeze at `0.1.0-foundation` | No clear consumer version signal |
| Merge Search into DiscoverySDK | Violates frozen Discovery contract |
| Enable flags on certification | Zero-impact default required for safe rollout |
| Implement search index before v1 | Scope creep; strangler flags sufficient for v1 |

---

## References

- `docs/m4/v1.0/` — full certification pack
- `docs/m4/PR-1` … `PR-9` — implementation reports
- `docs/m4/SEARCH-INTELLIGENCE-PLATFORM.md` — master architecture
- `src/sdk/search/contracts/SearchSDK.ts` — contract source
- Test verification: 301/301 `npm run test:sdk` (2026-06-26)

---

## Compliance

| Requirement | Status |
|-------------|--------|
| ADR-011 SDK strangler | ✅ |
| Discovery not modified | ✅ |
| Feature flags OFF default | ✅ |
| FEB-001 architecture freeze | ✅ Pending ARB signature |
| No implementation in freeze PR | ✅ PR-10 docs only |

---

## Approval

| Role | Name | Date | Decision |
|------|------|------|----------|
| Architecture Review Board | _pending_ | | |
| Founder | _pending_ | | |
