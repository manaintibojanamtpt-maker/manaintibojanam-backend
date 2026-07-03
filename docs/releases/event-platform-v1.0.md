# Release Notes — Event Platform v1.0.0

**Tag:** `event-platform-v1.0`  
**Date:** 2026-06-27  
**Authority:** ADR-024  
**Program:** M6 PR-1 through PR-14

---

## Summary

First **stable, frozen** release of the Event Platform (OS Spine). Public contracts are frozen for platform consumption. PR-14 promotes version metadata only — no new features, no behaviour changes.

---

## What's included

### Public API (frozen)

| Method | Description |
|--------|-------------|
| `publish` | Publish `EventEnvelope<T>` |
| `subscribe` | Register consumer |
| `registerSchema` | Versioned schema registration |
| `resolveSchema` | Schema lookup |
| `replay` | Admin replay |

### Types (frozen)

- `EventEnvelope`, `EventMetadata`, `OutboxRecord`, `Subscription`
- `PublishResult`, `SubscribeResult`, `ReplayRequest`, `ReplayResult`
- Branded: `EventTypeName`, `EventVersion`, `SchemaVersion`, etc.

### Version exports

```typescript
EVENT_SDK_VERSION  // '1.0.0'
EVENT_SDK_FROZEN   // true
```

### Infrastructure (delivered, flags OFF)

- Outbox persistence + shadow publishing
- Projection worker + runtime
- Order shadow events + read projection
- Parity → soak → operational evidence chain
- Order adapter, rollout, certification (standalone)

---

## What's NOT included

- Production routing / Order read switch  
- OrderSDK → adapter wiring  
- Production feature-flag rollout (flags default OFF)  
- Firestore production migration  
- UI / Presentation  
- M7 Menu Platform changes  

---

## Documentation

| Document | Path |
|----------|------|
| Certification | `docs/m6/v1.0/EVENT-PLATFORM-CERTIFICATION.md` |
| Public API | `docs/m6/v1.0/EVENT-PUBLIC-API-v1.md` |
| Governance | `docs/m6/v1/` (ADR-019–022) |
| Rollback | `docs/m6/v1.0/EVENT-ROLLBACK.md` |
| ADR | `docs/adr/ADR-024-event-platform-v1-freeze.md` |

---

## Pre-tag checklist

- [x] Public methods documented  
- [x] EventEnvelope documented (ADR-019)  
- [x] ADR-024 accepted  
- [x] Version constant promoted to `1.0.0`  
- [x] `EVENT_SDK_FROZEN = true`  
- [x] SDK tests pass (`npm run test:sdk`)  
- [ ] Git tag `event-platform-v1.0` applied  
- [ ] **72h staging soak** before production flag enablement  

---

## Upgrade notes

No breaking changes from `0.10.0-operational-validation` — behaviour is identical. Consumers should pin to `event-platform-v1.0` and assert `EVENT_SDK_VERSION === '1.0.0'`.

---

## Rollback (metadata only)

```bash
git revert <PR-14-commit-sha>
# Restore EVENT_SDK_VERSION = '0.10.0-operational-validation'
# Restore EVENT_SDK_FROZEN = false
git tag -d event-platform-v1.0
git push origin :refs/tags/event-platform-v1.0  # if pushed
```

No runtime rollback required.

---

## Known limitations

1. Adapter/rollout not wired into OrderSDK.  
2. All 14 flags default OFF.  
3. No production soak recorded.  
4. Order projection is shadow-only until explicit activation.  

---

*v1.0.0 — Event Platform freeze. Metadata promotion only. No runtime changes.*
