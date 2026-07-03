# Event Rollback — BhojanOS M6 v1

**Version:** 1.0.0  
**Status:** Frozen  
**Effective:** 2026-06-26  
**ADR:** [ADR-019](../../adr/ADR-019-event-contract-freeze.md)

---

## 1. Purpose

Define rollback procedures for event platform changes. All M6 infrastructure is feature-flag gated (default OFF) enabling safe rollback without code revert.

---

## 2. Rollback Principles

1. **Feature flags first** — disable before reverting code
2. **No data destruction** — rollback stops processing; does not delete event store
3. **Checkpoint preservation** — never delete checkpoints during rollback
4. **Strangler safety** — legacy paths remain until parity proven (LAW 8)
5. **Independent deployability** — each PR rolls back independently (LAW 9)

---

## 3. Rollback Triggers

| Severity | Trigger | Response Time |
|----------|---------|---------------|
| **P0** | Data corruption in event store | Immediate flag OFF |
| **P0** | PII leak via event payload | Immediate flag OFF + security incident |
| **P1** | DLQ flood (> 5% failure rate) | Flag OFF within 1 hour |
| **P1** | Projection checkpoint corruption | Pause runner + flag OFF |
| **P2** | Schema validation failures | Disable affected consumer group |
| **P3** | Telemetry anomalies | Investigate; no flag change |

---

## 4. Feature Flag Rollback Matrix

| Flag | Disables | Safe When OFF |
|------|----------|---------------|
| `FF_EVENT_PLATFORM_ENABLED` | Entire EventSDK | ✅ Always — stubs return NOT_CONFIGURED |
| `FF_EVENT_OUTBOX_ENABLED` | Durable outbox path | ✅ Legacy writes continue |
| `FF_EVENT_SHADOW_PUBLISHING_ENABLED` | Firestore shadow publish | ✅ No production events affected |
| `FF_EVENT_PROJECTION_ENABLED` | Projection workers | ✅ Read models served by legacy |
| `FF_EVENT_REPLAY_ENABLED` | Replay engine | ✅ No replay in progress |

**Rollback order (most specific first):**

```
FF_EVENT_PROJECTION_ENABLED → OFF
FF_EVENT_SHADOW_PUBLISHING_ENABLED → OFF
FF_EVENT_OUTBOX_ENABLED → OFF
FF_EVENT_REPLAY_ENABLED → OFF
FF_EVENT_PLATFORM_ENABLED → OFF
```

---

## 5. PR-Level Rollback

| PR | Rollback Action | Data Impact |
|----|-----------------|-------------|
| PR-1 Foundation | Flag OFF | None |
| PR-2 Infrastructure | Flag OFF | In-memory only |
| PR-3 Persistence | Flag OFF | Firestore collections remain (dormant) |
| PR-4 Projection | Flag OFF | In-memory checkpoints discarded |
| PR-4.5 Governance | N/A | Documentation only |
| PR-5+ Business events | Flag OFF + stop shadow publish | Event store retains shadow events |

---

## 6. Schema Rollback

| Scenario | Action |
|----------|--------|
| Bad schema minor published | Revert schema registry to previous minor; consumers tolerate unknown fields |
| Bad schema major published | Deprecate new major immediately; resume old major emission |
| Schema registry corruption | Restore from registry backup; replay from last known good checkpoint |

Schema rollback NEVER deletes events already in the event store.

---

## 7. Projection Rollback

| Scenario | Action |
|----------|--------|
| Bad projection version deployed | Pause runner; revert to previous projectionVersion |
| Checkpoint corruption | Restore checkpoint from backup; replay from last good eventId |
| Rebuild failure | Cancel rebuild; resume from pre-rebuild checkpoint |

---

## 8. Post-Rollback Verification

- [ ] Feature flags confirmed OFF in target environment
- [ ] Legacy read paths serving correctly
- [ ] DLQ rate returned to baseline
- [ ] No new events emitted to shadow store (if shadow rollback)
- [ ] `npm run test:sdk` passes on rollback branch
- [ ] Incident post-mortem scheduled (P0/P1)

---

## 9. Rollback Prohibitions

| Action | Forbidden Because |
|--------|-------------------|
| Delete event store collections | Data loss; audit violation |
| Force-reset consumer checkpoints without replay | Read model corruption |
| Disable flags without notifying consumers | Silent data drift |
| Rollback M1–M5 frozen SDKs | LAW 7 violation |

---

## 10. References

- [EVENT-LIFECYCLE.md](./EVENT-LIFECYCLE.md)
- [EVENT-REPLAY.md](./EVENT-REPLAY.md)
- M6 PR-1 through PR-4 rollback sections

---

*Event Rollback v1.0.0 — frozen 2026-06-26.*
