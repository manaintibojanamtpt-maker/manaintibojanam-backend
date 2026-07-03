# Architecture Decision Records (ADR)

BhojanOS ADRs document significant technical decisions. Architecture is frozen per FEB-001; new ADRs require founder approval before implementation that changes contracts.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-011](./ADR-011-sdk-strangler.md) | SDK-first UI via strangler pattern | Accepted |
| [ADR-012](./ADR-012-guest-order-access.md) | Guest order access via stateless JWT | Accepted |
| [ADR-013](./ADR-013-order-sdk-read-v1-freeze.md) | OrderSDK Read API v1.0.0 freeze | Accepted |
| [ADR-014](./ADR-014-search-platform-v1-freeze.md) | Search Platform v1.0 freeze | Proposed |
| [ADR-015](./ADR-015-branch-platform-architecture.md) | Branch Intelligence Platform architecture | Accepted |
| [ADR-016](./ADR-016-branch-platform-v1-freeze.md) | Branch Platform v1.0 freeze | Accepted |
| [ADR-017](./ADR-017-firestore-branch-migration.md) | Firestore branch collection migration | Proposed |
| [ADR-018](./ADR-018-event-platform.md) | Event Platform Foundation (M6 PR-1) | Proposed |
| [ADR-019](./ADR-019-event-contract-freeze.md) | Event Contract Freeze (M6 PR-4.5) | Proposed |
| [ADR-020](./ADR-020-projection-identity-freeze.md) | Projection Identity Freeze (M6 PR-4.5) | Proposed |
| [ADR-021](./ADR-021-event-versioning-policy.md) | Event Versioning Policy (M6 PR-4.5) | Proposed |
| [ADR-022](./ADR-022-schema-evolution-policy.md) | Schema Evolution Policy (M6 PR-4.5) | Proposed |
| [ADR-023](./ADR-023-menu-platform-v1-freeze.md) | Menu & Catalog Platform v1.0 freeze | Accepted |
| [ADR-024](./ADR-024-event-platform-v1-freeze.md) | Event Platform v1.0 freeze | Accepted |
| [ADR-025](./ADR-025-pricing-platform-v1-freeze.md) | Pricing & Commerce Platform v1.0 freeze | Accepted |

ADRs 001–010 are defined in planning documents (BHOS-TDD-001, PAF-001) and are not duplicated in this repo until codified in a future docs PR.

## Template

New ADRs use filename `ADR-NNN-short-title.md` and include: Context, Decision, Consequences, Alternatives, References.
