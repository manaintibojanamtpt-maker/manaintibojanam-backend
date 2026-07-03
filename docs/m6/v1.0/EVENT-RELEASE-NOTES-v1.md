# Event Platform Release Notes v1.0

**Version:** 1.0.0 (frozen)  
**Date:** 2026-06-27  
**PR range:** M6 PR-1 through PR-14  
**Runtime:** `EVENT_SDK_VERSION = 1.0.0` · `EVENT_SDK_FROZEN = true`  
**Tag:** `event-platform-v1.0`  
**Authority:** ADR-024

---

## Highlights

Event Platform v1.0 is **certified and frozen**. Metadata promotion (PR-14) completes the M6 OS Spine event layer program. Public contracts stable; all feature flags default **OFF**; legacy remains authoritative for Order reads.

---

## PR-14 — Metadata Promotion

| Change | Before | After |
|--------|--------|-------|
| `EVENT_SDK_VERSION` | `0.10.0-operational-validation` | `1.0.0` |
| `EVENT_SDK_FROZEN` | `false` | `true` |
| ADR-024 | — | Accepted |

**No behaviour changes.**

---

## What's included

- EventSDK (5 methods) + infrastructure factories
- EventEnvelope governance (ADR-019)
- Outbox persistence + shadow publishing
- Projection worker + runtime
- Order shadow events + read projection
- Parity → soak → operational evidence chain
- Order read adapter, rollout, certification (standalone)
- Full v1.0 documentation pack

---

## What's NOT included

- Production routing / Order read switch
- OrderSDK → adapter wiring
- Production flag enablement
- Firestore production migration
- UI / Presentation

---

## Version exports

```typescript
EVENT_SDK_VERSION  // '1.0.0'
EVENT_SDK_FROZEN   // true
```

---

## Pre-tag checklist

- [x] ADR-024 accepted
- [x] Version promoted
- [x] SDK tests pass (1033/1033)
- [ ] Git tag `event-platform-v1.0` applied
- [ ] 72h staging soak before production flags

---

**STOP.** Production activation prohibited until staging soak and explicit ARB approval.
