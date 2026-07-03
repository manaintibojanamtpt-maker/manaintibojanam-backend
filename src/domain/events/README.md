# Event Domain Layer

**Version:** `0.1.0-foundation` (`EVENT_DOMAIN_VERSION`)  
**Status:** M6 PR-1 — pure domain logic  
**Governance:** [ADR-018](../../docs/adr/ADR-018-event-platform.md)

---

## Architectural Law

- **No platform may publish raw JSON** — everything MUST use `EventEnvelope<T>`
- **Commands → Domain → Events (Outbox) → Projection → Read Models → Frozen SDKs → Presentation**
- **Event Platform owns envelope, routing, outbox, schema registry** — not business aggregates
- **M1–M5 frozen SDKs remain consumers only**

---

## Module Layout

| Path | Purpose |
|------|---------|
| `outbox/` | Outbox record builder, retry policy |
| `registry/` | In-memory type registry (pure) |
| `publisher/` | Publish intent builder |
| `subscriber/` | Subscription matching |
| `replay/` | Replay planning and filtering |
| `schema/` | Version resolver, schema validation |
| `validation/` | Domain event input validation |
| `shared/` | Types, constants |

---

## Constraints (M6 PR-1)

- **Pure domain** — no SDK, Firestore, React, network
- **Deterministic** — same inputs → same outputs
- **No persistence** — builders and policies only
- **No messaging adapters** — arrives in SDK PR-2+

---

## Documentation

- [`docs/m6/PR-1-EVENT-PLATFORM-FOUNDATION-REPORT.md`](../../docs/m6/PR-1-EVENT-PLATFORM-FOUNDATION-REPORT.md)
- [`docs/adr/ADR-018-event-platform.md`](../../docs/adr/ADR-018-event-platform.md)

---

**STOP.** Await ARB approval before M6 PR-2.
