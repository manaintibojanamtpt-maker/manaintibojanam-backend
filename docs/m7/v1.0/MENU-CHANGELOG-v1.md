# Menu Platform Changelog v1.0

**Version:** 1.0.0 (frozen)  
**Date:** 2026-06-27  
**Runtime:** `1.0.0` · `MENU_SDK_FROZEN = true`

---

## [1.0.0] — 2026-06-27 — Metadata Promotion (PR-15)

### Changed

- `MENU_SDK_VERSION` — `0.1.0-foundation` → `1.0.0`
- `MENU_SDK_FROZEN` — `false` → `true`
- `src/sdk/menu/README.md` — version, frozen status, compatibility
- `docs/m7/README.md` — PR-15 complete, v1.0 frozen
- `docs/m7/v1.0/MENU-PLATFORM-CERTIFICATION.md` — runtime metadata promoted
- `docs/adr/ADR-023-menu-platform-v1-freeze.md` — status Accepted
- `menuSdkFoundation.test.ts` — version assertion updates

### Added

- `docs/releases/menu-platform-v1.0.md` — release notes

### Unchanged (by design)

- MenuSDK 7-method contract
- All DTOs
- All 9 feature flags — remain OFF
- MenuSDK routing — legacy authoritative
- No adapter/rollout wiring
- No Firestore migration
- No production routing

---

## [1.0.0-doc] — 2026-06-27 — Documentation Freeze (PR-14)

### Added

- `docs/m7/v1.0/` — full v1.0 documentation pack (14 documents)
- `docs/adr/ADR-023-menu-platform-v1-freeze.md`
- Certification report with CONDITIONAL GO verdict
- Public API documentation for 7-method MenuSDK contract
- Compatibility matrix for 9 feature flags
- Test matrix (253 menu tests, 1033 full suite)
- Performance posture documentation
- Observability event catalog
- L1–L4 rollback procedures
- Governance and migration roadmap
- Quality gates verification (20/20 PASS)
- Risk assessment with mitigations

### Changed

- `docs/m7/README.md` — PR-14 complete, v1.0 pack linked
- `src/sdk/menu/README.md` — updated to v1.0 architecture status

### Unchanged (by design)

- All 9 feature flags — remain OFF
- MenuSDK routing — legacy authoritative
- No adapter/rollout wiring
- No Firestore migration
- No production routing

---

## [0.1.0-foundation] — M7 PR-1 through PR-13

### PR-1 — MenuSDK Foundation
- `MenuSDK` contract (7 methods)
- Domain catalog, pricing, validation
- Stub adapter, feature flags
- `createMenuSDK()` factory

### PR-2 — MenuRepository Foundation
- Provider-neutral read port

### PR-3 — Menu Domain Extensions
- Extended domain models

### PR-4 — SDK Orchestration
- Orchestrated adapter layer
- Request telemetry

### PR-5 — MenuFacade
- Presentation boundary

### PR-6 — Projection Foundation
- Coordinator, checkpoint, snapshot

### PR-7 — Shadow Catalog Projection
- Catalog metadata read model

### PR-8 — Parity Validation
- Legacy vs projection comparator

### PR-9 — Soak Certification
- Health monitoring and thresholds

### PR-10 — Operational Validation
- Lag, drift, replay evidence

### PR-11 — Read Adapter
- Legacy ↔ projection routing (standalone)

### PR-12 — Staged Rollout
- Percentage-based rollout policy (standalone)

### PR-13 — Switch Certification
- GO/NO-GO decision packages (standalone)

---

## Breaking changes

**None** in v1.0.

---

## Migration notes

No migration required. All flags default OFF. See [MENU-MIGRATION-ROADMAP.md](./MENU-MIGRATION-ROADMAP.md).
