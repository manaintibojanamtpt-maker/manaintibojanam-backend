# ADR-020: Projection Identity Freeze (M6 PR-4.5)

**Status:** Proposed  
**Date:** 2026-06-26  
**Deciders:** Architecture Review Board  
**Supersedes:** N/A  
**Related:** ADR-019 (Event Contract Freeze), M6 PR-4 (Projection Worker Foundation)

---

## Context

M6 PR-4 delivered generic projection worker infrastructure including `ProjectionIdentity` — an immutable identity tuple for every projection worker:

```typescript
interface ProjectionIdentity {
  projectionName: string;
  projectionVersion: string;
  consumerGroup: string;
  ownerPlatform: string;
  replaySupported: boolean;
  checkpointStrategy: 'event_id' | 'sequence';
}
```

PR-4 established that duplicate identity registration MUST fail. Before business projections are implemented (PR-5+), the identity model and version policy must be frozen as an enterprise contract.

Projection versions are **independent** of event versions — a critical architectural invariant that must be documented and enforced.

---

## Decision

1. **Freeze** `ProjectionIdentity` contract at **v1.0.0** effective 2026-06-26.

2. **Identity key** is permanently: `projectionName@projectionVersion@consumerGroup`.

3. **Duplicate registration MUST fail** — no exceptions.

4. **Projection version policy:**
   - `1.0.0` → initial handler
   - `1.X.0` → additive read model change (backward compatible)
   - `2.0.0` → breaking read model change (requires rebuild or new consumer group)

5. **Checkpoint compatibility:**
   - Checkpoints include `projectionVersion` and `schemaVersion` separately
   - Checkpoint from projection v1 is NOT automatically valid for projection v2
   - Rebuild required when checkpoint strategy changes

6. **Rebuild rules:**
   - Requires `replaySupported: true`
   - Dry-run default
   - ARB approval for production business projection rebuilds
   - See [EVENT-REPLAY.md](../m6/v1/EVENT-REPLAY.md)

7. **Parallel versions allowed** during migration:
   ```
   order-summary@1.0.0@read-model  (deprecated)
   order-summary@2.0.0@read-model  (active)
   ```

8. **No code changes** in this ADR — governance documentation only.

---

## Consequences

### Positive

- Business projections (PR-5+) have clear identity registration rules
- Version independence from events prevents coupling bugs
- Rebuild policy defined before production projections
- Checkpoint corruption recovery path documented

### Negative / deferred

- Firestore checkpoint adapter not yet implemented (PR-6+)
- Distributed lease for projection workers deferred (PR-6+)
- Automated identity lint in CI deferred (PR-6+)

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Single projection version per projectionName | Cannot migrate without downtime |
| Event version as projection version | Couples handler logic to payload schema |
| No duplicate rejection | Silent overwrite causes data corruption |
| Auto-migrate checkpoints on version bump | Unsafe without explicit rebuild |

---

## Compliance

- New projection identities require [Projection Review Checklist](../m6/v1/EVENT-GOVERNANCE-CHECKLIST.md)
- Breaking projection version bump requires ARB approval
- Retired identities MUST be unregistered from Projection Registry

---

## References

- M6 PR-4 Projection Worker Foundation Report
- `src/domain/events/projection/shared/ProjectionIdentityTypes.ts`
- `src/domain/events/projection/ProjectionIdentity.ts`
- [EVENT-REPLAY.md](../m6/v1/EVENT-REPLAY.md)

---

*ADR-020 — Projection Identity Freeze v1.0.0.*
