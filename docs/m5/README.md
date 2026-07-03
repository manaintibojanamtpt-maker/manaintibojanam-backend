# M5 — Multi-Branch Intelligence Platform

Architecture documentation for BhojanOS Multi-Branch Intelligence (M5).

**Status:** M5 **COMPLETE** — Branch Intelligence Platform v1.0 **CERTIFIED** (ARB approved 2026-06-26). Conditional Go for production flags pending 72h staging soak and ADR-017.

**Runtime version:** `BRANCH_SDK_VERSION = 1.0.0` · `BRANCH_SDK_FROZEN = true`

**Frozen platforms:** Order · Reference · Location · Discovery · Marketplace · Search · **Branch (v1.0)**

## v1.0 certification pack

| Document | Description |
|----------|-------------|
| [BRANCH-PLATFORM-CERTIFICATION.md](./v1.0/BRANCH-PLATFORM-CERTIFICATION.md) | **Certification report & Go/No-Go** |
| [BRANCH-PUBLIC-API-v1.md](./v1.0/BRANCH-PUBLIC-API-v1.md) | Frozen public API reference |
| [BRANCH-COMPATIBILITY-MATRIX.md](./v1.0/BRANCH-COMPATIBILITY-MATRIX.md) | Client & flag compatibility |
| [BRANCH-TEST-MATRIX.md](./v1.0/BRANCH-TEST-MATRIX.md) | Test coverage matrix |
| [BRANCH-PERFORMANCE-REPORT.md](./v1.0/BRANCH-PERFORMANCE-REPORT.md) | Performance posture |
| [BRANCH-OBSERVABILITY.md](./v1.0/BRANCH-OBSERVABILITY.md) | Telemetry & observability |
| [BRANCH-ROLLBACK.md](./v1.0/BRANCH-ROLLBACK.md) | Emergency rollback |
| [BRANCH-RELEASE-NOTES-v1.md](./v1.0/BRANCH-RELEASE-NOTES-v1.md) | v1.0 release notes |

## Architecture

| Document | Description |
|----------|-------------|
| [BRANCH-PLATFORM-LAW.md](./BRANCH-PLATFORM-LAW.md) | **Permanent architectural law** |
| [MULTI-BRANCH-INTELLIGENCE-PLATFORM.md](./MULTI-BRANCH-INTELLIGENCE-PLATFORM.md) | Master architecture (18 sections) |
| [BRANCH-SDK-DESIGN.md](./BRANCH-SDK-DESIGN.md) | BranchSDK public contracts |
| [FIRESTORE-BRANCH-DESIGN.md](./FIRESTORE-BRANCH-DESIGN.md) | Firestore ER + collections |
| [MIGRATION-ROADMAP.md](./MIGRATION-ROADMAP.md) | 15-PR rollout plan |

## Implementation reports

| Document | Description |
|----------|-------------|
| [PR-1-BRANCH-SDK-FOUNDATION-REPORT.md](./PR-1-BRANCH-SDK-FOUNDATION-REPORT.md) | M5 PR-1 completion report |
| [PR-2-BRANCH-DOMAIN-FOUNDATION-REPORT.md](./PR-2-BRANCH-DOMAIN-FOUNDATION-REPORT.md) | M5 PR-2 completion report |
| [PR-3-BRANCH-REPOSITORY-REPORT.md](./PR-3-BRANCH-REPOSITORY-REPORT.md) | M5 PR-3 completion report |
| [PR-4-BRANCH-SDK-ORCHESTRATION-REPORT.md](./PR-4-BRANCH-SDK-ORCHESTRATION-REPORT.md) | M5 PR-4 completion report |
| [PR-5-BRANCH-FACADE-REPORT.md](./PR-5-BRANCH-FACADE-REPORT.md) | M5 PR-5 completion report |
| [PR-6-DISCOVERY-MULTI-BRANCH-REPORT.md](./PR-6-DISCOVERY-MULTI-BRANCH-REPORT.md) | M5 PR-6 completion report |
| [PR-7-BRANCH-ASSIGNMENT-ENGINE-REPORT.md](./PR-7-BRANCH-ASSIGNMENT-ENGINE-REPORT.md) | M5 PR-7 completion report |
| [PR-8-CHECKOUT-BRANCH-INTEGRATION-REPORT.md](./PR-8-CHECKOUT-BRANCH-INTEGRATION-REPORT.md) | M5 PR-8 completion report |
| [PR-9-ORDER-BRANCH-PERSISTENCE-REPORT.md](./PR-9-ORDER-BRANCH-PERSISTENCE-REPORT.md) | M5 PR-9 completion report |
| [PR-10-BRANCH-OPERATIONS-INTELLIGENCE-REPORT.md](./PR-10-BRANCH-OPERATIONS-INTELLIGENCE-REPORT.md) | M5 PR-10 completion report |
| [PR-11-BRANCH-OPERATIONS-REPOSITORY-REPORT.md](./PR-11-BRANCH-OPERATIONS-REPOSITORY-REPORT.md) | M5 PR-11 completion report |
| [PR-12-BRANCH-OPERATIONS-SDK-INTEGRATION-REPORT.md](./PR-12-BRANCH-OPERATIONS-SDK-INTEGRATION-REPORT.md) | M5 PR-12 completion report |
| [PR-13-OWNER-BRANCH-MANAGEMENT-REPORT.md](./PR-13-OWNER-BRANCH-MANAGEMENT-REPORT.md) | M5 PR-13 completion report |
| [PR-14-OWNER-BRANCH-MANAGEMENT-UI-REPORT.md](./PR-14-OWNER-BRANCH-MANAGEMENT-UI-REPORT.md) | M5 PR-14 completion report |

## ADRs

| Document | Description |
|----------|-------------|
| [ADR-015 Branch Platform](../adr/ADR-015-branch-platform-architecture.md) | Architecture decision record (Accepted) |
| [ADR-016 Branch Platform v1 Freeze](../adr/ADR-016-branch-platform-v1-freeze.md) | v1.0 freeze (**Accepted** 2026-06-26) |
| [ADR-017 Firestore Branch Migration](../adr/ADR-017-firestore-branch-migration.md) | Firestore migration (Proposed) |

## Vision

One brand → one storefront (`/k/paradise`). Platform selects the best branch silently. Branches invisible unless override required.

## Governance

- **Tenant = Brand · Branch = Fulfillment Unit** — see [BRANCH-PLATFORM-LAW.md](./BRANCH-PLATFORM-LAW.md)
- Discovery owns restaurant **ranking** — not branch selection
- BranchSDK owns branch **selection** — not restaurant ranking
- Search finds brands — **never** selects branches
- All `FF_BRANCH_*` flags default **OFF**
- Firestore branch migration requires **ADR-017** (deferred)

## PR series

M5 PR-1 ✅ … PR-15 ✅ **v1.0 certification & freeze** · **M5 COMPLETE**

**Runtime version:** `BRANCH_SDK_VERSION = 1.0.0` · `BRANCH_SDK_FROZEN = true` (ADR-016)

**Remaining before production flags:** 72h staging soak · ADR-017 Firestore migration · git tag `branch-platform-v1.0`
