# ADR-023: Menu & Catalog Platform v1.0 Freeze

**Status:** Accepted  
**Date:** 2026-06-27  
**Accepted:** 2026-06-27 (ARB)  
**Deciders:** Architecture Review Board  
**Supersedes:** N/A (first stable Menu Platform release)  
**Related:** ADR-011 (SDK Strangler), FEB-001, BHOS-M7

---

## Context

BhojanOS M7 (Menu & Catalog Platform / Catalog Kernel) delivered PR-1 through PR-14:

- **MenuSDK** with 7 public methods and `createMenuSDK()` factory
- **MenuRepository** provider-neutral read port
- **Menu domain** — catalog, pricing, validation, projection, parity, soak, operations, adapter, rollout, certification
- **MenuFacade** presentation boundary
- **SDK orchestration** with feature flag gating
- **Projection foundation** — coordinator, checkpoint, snapshot
- **Shadow catalog projection** — metadata read model
- **Parity validation** — legacy vs projection comparison
- **Soak certification** — health monitoring
- **Operational validation** — lag, drift, replay evidence
- **Read adapter** — legacy ↔ projection routing (standalone)
- **Staged rollout** — percentage-based policy (standalone)
- **Switch certification** — GO/NO-GO decision packages (standalone)

All functionality ships behind 9 `FF_MENU_*` feature flags defaulting **OFF**. Legacy remains the authoritative read source. Adapter, rollout, and certification are **not wired** into `createMenuSDK()`.

M7 PR-14 certifies the platform for v1.0.0 documentation freeze without runtime code changes. Version constant promotion is deferred to M7 PR-15.

External consumers (Presentation via MenuFacade, future npm package, server adapters) require a stable contract: method signatures, DTOs, repository ports, and error codes must not change without governance.

**Test evidence:** 1033 / 1033 passing (`npm run test:sdk`).

---

## Decision

1. **Freeze** Menu & Catalog Platform at version **1.0.0** effective upon ARB acceptance of this ADR.

2. **Frozen public surface — `MenuSDK`:**
   - `getMenu(query: MenuQuery)`
   - `getMenuItem(query: MenuItemQuery)`
   - `listCategories(query: MenuCategoryQuery)`
   - `searchMenu(query: MenuSearchQuery)`
   - `getModifierGroups(query: ModifierGroupQuery)`
   - `getCombo(query: ComboQuery)`
   - `validateMenu(input: MenuValidationInput)`
   - `createMenuSDK(options?)`

3. **Frozen repository port:**
   - `MenuRepository` — `src/sdk/menu/repository/`

4. **Frozen presentation surface:**
   - `MenuFacade` — `src/lib/menu/MenuFacade.ts`

5. **Frozen DTOs:**
   - All types in `src/sdk/menu/dto/`

6. **Frozen feature flags (names and defaults):**
   - `FF_MENU_ENABLED` — default OFF
   - `FF_MENU_SEARCH_ENABLED` — default OFF
   - `FF_MENU_PROJECTION_ENABLED` — default OFF
   - `FF_MENU_PROJECTION_PARITY_ENABLED` — default OFF
   - `FF_MENU_PROJECTION_SOAK_ENABLED` — default OFF
   - `FF_MENU_OPERATIONAL_VALIDATION_ENABLED` — default OFF
   - `FF_MENU_PROJECTION_ADAPTER_ENABLED` — default OFF
   - `FF_MENU_PROJECTION_ROLLOUT_ENABLED` — default OFF
   - `FF_MENU_PROJECTION_CERTIFICATION_ENABLED` — default OFF

7. **Version constants (M7 PR-15 — promoted 2026-06-27):**
   - `MENU_SDK_VERSION = '1.0.0'` ✅
   - `MENU_SDK_FROZEN = true` ✅
   - Git tag: `menu-platform-v1.0` (pending — see release commands)

8. **Explicit exclusions from v1.0:**
   - MenuSDK → adapter wiring
   - MenuSDK → rollout wiring
   - Production routing / read switch
   - Firestore menu collection migration
   - Full item projection (catalog metadata only in PR-7)
   - Production feature flag enablement
   - Performance benchmarks and prod dashboards
   - UI / React presentation components

9. **No runtime behaviour changes in PR-14** — documentation, validation, and certification only.

10. **Certification verdict:** CONDITIONAL GO
    - **GO** for documentation freeze and ARB acceptance
    - **NO GO** for production activation until PR-15, staging soak, and explicit rollout approval

---

## Consequences

### Positive

- Stable MenuSDK contract for Presentation and server consumers
- Complete evidence chain for future projection read switch
- Rollback procedures documented (L1–L4)
- Full test coverage (253 menu-focused, 1033 platform suite)
- No impact on frozen platforms (M1–M6)

### Negative / trade-offs

- ~~Version constants remain at `0.1.0-foundation` until PR-15~~ **Resolved:** `1.0.0` promoted in PR-15.
- Adapter/rollout infrastructure exists but is not usable via MenuSDK
- No production soak evidence yet
- Catalog-metadata projection only — items require legacy reads

### Governance

- Breaking changes to frozen surface require new ADR + major version bump
- Wiring adapter into MenuSDK requires separate ADR + ARB approval
- Production activation requires PR-13 certification `READY` or `CONDITIONAL`

---

## Alternatives considered

1. **Promote version constants in PR-14** — Rejected. Metadata promotion is a separate governed step (PR-15) after ARB approval, consistent with Branch Platform (ADR-016).

2. **Wire adapter into MenuSDK in PR-14** — Rejected. Violates incremental rollout strategy; requires staging soak first.

3. **NO GO — defer freeze until production soak** — Rejected. Architecture is complete; documentation freeze enables ARB review while staging soak proceeds in parallel.

4. **Full item projection in v1.0** — Rejected. Scope creep; catalog metadata sufficient for shadow evidence chain.

---

## References

- [MENU-PLATFORM-CERTIFICATION.md](../m7/v1.0/MENU-PLATFORM-CERTIFICATION.md)
- [MENU-PUBLIC-API-v1.md](../m7/v1.0/MENU-PUBLIC-API-v1.md)
- [MENU-ARCHITECTURE.md](../m7/v1.0/MENU-ARCHITECTURE.md)
- [MENU-QUALITY-GATES.md](../m7/v1.0/MENU-QUALITY-GATES.md)
- [MENU-RISK-ASSESSMENT.md](../m7/v1.0/MENU-RISK-ASSESSMENT.md)
- [MENU-MIGRATION-ROADMAP.md](../m7/v1.0/MENU-MIGRATION-ROADMAP.md)
- [docs/m7/README.md](../m7/README.md)
- ADR-016 (Branch Platform v1.0 freeze — template)

---

**M7 PR-15 complete.** Metadata promoted. Production activation remains prohibited until staging soak and explicit rollout approval.
