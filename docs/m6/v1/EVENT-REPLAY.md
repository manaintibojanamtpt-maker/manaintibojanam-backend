# Event Replay — BhojanOS M6 v1

**Version:** 1.0.0  
**Status:** Frozen  
**Effective:** 2026-06-26  
**ADR:** [ADR-019](../../adr/ADR-019-event-contract-freeze.md)

---

## 1. Purpose

Replay re-processes historical events to rebuild read models or recover from projection failures. Replay is a **controlled, authorized operation** — never automatic in production without approval.

---

## 2. Who Can Replay

| Role | Permission | Scope |
|------|------------|-------|
| **Platform Owner** | Initiate replay for owned events | Own namespace only |
| **M6 Event Platform Team** | Initiate infrastructure replay | `event.*`, `projection.*` |
| **Architecture Review Board** | Approve cross-platform replay | Any namespace |
| **Automated systems** | ❌ Forbidden | No unattended replay |
| **Presentation layer** | ❌ Forbidden | LAW 2 |

---

## 3. When Replay Is Allowed

| Scenario | Allowed | Authorization |
|----------|---------|---------------|
| Projection rebuild after logic change | ✅ | Platform owner |
| Recovery from checkpoint corruption | ✅ | Platform owner + M6 |
| New projection version bootstrap | ✅ | Platform owner |
| Disaster recovery | ✅ | ARB + incident commander |
| Debugging in production | ⚠️ | Read-only shadow replay only |
| Backfill analytics | ✅ | Platform owner; dry-run first |
| Re-emit business events to external systems | ❌ | Forbidden — use integration adapter |

---

## 4. Replay Prerequisites

- [ ] `replaySupported: true` on `ProjectionIdentity`
- [ ] `FF_EVENT_REPLAY_ENABLED` flag ON (staging/prod requires ARB)
- [ ] Checkpoint baseline identified (`fromEventId` or `fromSequence`)
- [ ] Schema versions resolvable for entire replay range
- [ ] Target projection version registered
- [ ] Dry-run completed successfully
- [ ] Rollback plan documented

---

## 5. Checkpoint Validation

Before replay begins:

```typescript
interface ReplayCheckpointValidation {
  projectionName: string;
  projectionVersion: string;
  consumerGroup: string;
  fromEventId: string;
  fromSequence: number;
  schemaVersion: string;
  validatedAt: string;
}
```

| Check | Requirement |
|-------|-------------|
| Checkpoint exists | Load from CheckpointRepository |
| Event ID exists in event store | Verify `fromEventId` resolvable |
| Schema version compatible | All events in range must resolve in registry |
| No gap in sequence | Sequence monotonicity verified |
| Projection identity matches | Same owner platform |

---

## 6. Version Compatibility During Replay

| Condition | Action |
|-----------|--------|
| Event major supported by handler | Process |
| Event major not supported | Skip + log (configurable: fail) |
| Schema minor newer than handler | Process (forward compatible — ignore unknown fields) |
| Schema major incompatible | Fail replay; require handler upgrade |
| Multiple event majors in range | Handler MUST declare supported majors |

---

## 7. Replay Authorization Flow

```
1. Platform owner submits replay request (rebuildId, identity, fromEventId)
2. M6 validates prerequisites
3. Dry-run execute (eventsPlanned count, zero side effects)
4. ARB approval (required for production business events)
5. executeRebuild(rebuildId)
6. Monitor telemetry: rebuild_started → rebuild_completed
7. Validate read model parity
8. Switch traffic to new projection version
```

---

## 8. Replay Modes

| Mode | Description | Side Effects |
|------|-------------|--------------|
| **Dry-run** | Count events; no handler invocation | None |
| **Shadow** | Invoke handlers; write to shadow read model | Isolated |
| **Live rebuild** | Invoke handlers; overwrite read model | ⚠️ Requires approval |
| **Point-in-time** | Replay up to specific timestamp | Requires event store query |

Default mode: **Dry-run**.

---

## 9. Replay Limits

| Limit | Value | Override |
|-------|-------|----------|
| Max batch size | 1000 events | Platform owner |
| Max concurrent rebuilds | 1 per projection identity | M6 team |
| Max replay window | 90 days (business) | ARB |
| Rate limit | 100 events/second | M6 team |

---

## 10. Replay Prohibitions

- ❌ Replay that re-emits events to the outbox (creates duplicates)
- ❌ Replay across tenant boundaries without authorization
- ❌ Replay of Retired event majors
- ❌ Replay without checkpoint validation
- ❌ Unattended automated replay in production

---

## 11. Telemetry

Replay MUST emit:

- `rebuild_started` — with rebuildId
- `rebuild_completed` — with eventsProcessed count
- `projection.replayed.v1` — audit event on completion

---

## 12. References

- [EVENT-VERSIONING.md](./EVENT-VERSIONING.md)
- [EVENT-ROLLBACK.md](./EVENT-ROLLBACK.md)
- [ADR-020](../../adr/ADR-020-projection-identity-freeze.md)
- M6 PR-4 ProjectionRebuildEngine

---

*Event Replay v1.0.0 — frozen 2026-06-26.*
