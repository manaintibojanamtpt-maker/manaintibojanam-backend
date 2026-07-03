# Event Platform Changelog v1.0

**Version:** 1.0.0 (frozen)  
**Date:** 2026-06-27

---

## [1.0.0] — 2026-06-27 — Metadata Promotion (PR-14)

### Changed

- `EVENT_SDK_VERSION` — `0.10.0-operational-validation` → `1.0.0`
- `EVENT_SDK_FROZEN` — `false` → `true`
- `src/sdk/events/README.md` — v1.0 frozen status
- `docs/m6/README.md` — PR-14 complete
- Version assertions in 9 event SDK test files

### Added

- `docs/m6/v1.0/` — full v1.0 documentation pack (14 documents)
- `docs/adr/ADR-024-event-platform-v1-freeze.md` (Accepted)
- `docs/releases/event-platform-v1.0.md`

### Unchanged (by design)

- EventSDK 5-method contract
- EventEnvelope and DTOs
- All 14 feature flags — remain OFF
- OrderSDK read API
- No adapter/rollout wiring
- No production routing
- M7 Menu Platform

---

## [0.10.0-operational-validation] — M6 PR-10

- Operational validation layer
- SDK version bump to operational-validation scaffold

---

## [0.1.0-foundation] through [0.9.x] — M6 PR-1 through PR-9

See individual PR reports in `docs/m6/PR-*-REPORT.md`.

| PR | Milestone |
|----|-----------|
| PR-1 | EventSDK foundation |
| PR-2 | Infrastructure |
| PR-3 | Outbox persistence |
| PR-4 | Projection worker |
| PR-4.5 | Governance (ADR-019–022) |
| PR-5 | Order shadow events |
| PR-6 | Projection runtime |
| PR-7 | Order read projection |
| PR-8 | Parity validation |
| PR-9 | Soak certification |
| PR-10 | Operational validation |
| PR-11 | Order read adapter |
| PR-12 | Staged rollout |
| PR-13 | Switch certification |

---

## Breaking changes

**None** in v1.0.

---

## Migration notes

No migration required. All flags default OFF. See [EVENT-MIGRATION-ROADMAP.md](./EVENT-MIGRATION-ROADMAP.md).
