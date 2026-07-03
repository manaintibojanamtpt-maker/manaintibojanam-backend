# EventSDK — Event Platform (OS Spine)

**Version:** `1.0.0` · **Frozen:** `true`  
**Certification:** v1.0 frozen — ADR-024 accepted  
**Documentation:** [docs/m6/v1.0/](../../../docs/m6/v1.0/EVENT-PLATFORM-CERTIFICATION.md) · [ADR-024](../../../docs/adr/ADR-024-event-platform-v1-freeze.md) · [Release](../../../docs/releases/event-platform-v1.0.md)  
**Governance:** [docs/m6/v1/](../../../docs/m6/v1/EVENT-CONTRACT.md) (ADR-019–022)

Platform Zero for BhojanOS — the durable event nervous system (M6 PR-1 through PR-14).

---

## Architectural Law

```
Commands → Domain → Events (Outbox) → Projection → Read Models → Frozen SDKs → Presentation
```

- No platform publishes raw JSON — `EventEnvelope<T>` only
- Read SDKs (M1–M5) remain consumers only
- Provider-neutral — no Kafka, Pub/Sub, or RabbitMQ in foundation
- Legacy remains authoritative for Order reads until explicit rollout approval

---

## Public API (frozen v1.0)

| Method | Description |
|--------|-------------|
| `publish` | Publish `EventEnvelope<T>` |
| `subscribe` | Register consumer subscription |
| `registerSchema` | Register versioned event schema |
| `resolveSchema` | Resolve schema by type + version |
| `replay` | Admin replay for consumer group |

Factory: `createEventSDK(options?)`

See [EVENT-PUBLIC-API-v1.md](../../../docs/m6/v1.0/EVENT-PUBLIC-API-v1.md).

---

## Version & compatibility

```typescript
EVENT_SDK_VERSION  // '1.0.0'
EVENT_SDK_FROZEN   // true
```

- Breaking changes require ADR + major version bump
- 14 feature flags default **OFF**
- OrderSDK read API (ADR-013) unchanged
- Adapter/rollout not wired into OrderSDK

See [EVENT-COMPATIBILITY-MATRIX.md](../../../docs/m6/v1.0/EVENT-COMPATIBILITY-MATRIX.md).

---

## Feature flags (all default OFF)

### Core EventSDK (11)

| Flag | Purpose |
|------|---------|
| `FF_EVENT_PLATFORM_ENABLED` | Master SDK gate |
| `FF_EVENT_OUTBOX_ENABLED` | Durable outbox |
| `FF_EVENT_REPLAY_ENABLED` | Replay engine |
| `FF_EVENT_SHADOW_PUBLISHING_ENABLED` | Firestore shadow publish |
| `FF_EVENT_PROJECTION_ENABLED` | Projection worker |
| `FF_ORDER_SHADOW_EVENTS_ENABLED` | Order business events |
| `FF_EVENT_PROJECTION_RUNTIME_ENABLED` | Projection runtime |
| `FF_ORDER_READ_PROJECTION_ENABLED` | Order read projection |
| `FF_ORDER_PROJECTION_PARITY_ENABLED` | Parity validation |
| `FF_ORDER_PROJECTION_SOAK_ENABLED` | Soak certification |
| `FF_EVENT_OPERATIONAL_VALIDATION_ENABLED` | Operational validation |

### Order infrastructure (standalone — 3)

| Flag | Purpose |
|------|---------|
| `FF_ORDER_PROJECTION_ADAPTER_ENABLED` | Read adapter routing |
| `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` | Staged rollout |
| `FF_ORDER_PROJECTION_CERTIFICATION_ENABLED` | Switch certification |

---

## Module layout

| Path | PR | Wired to OrderSDK? |
|------|-----|-------------------|
| `contracts/` | PR-1 | ✅ Public API |
| `dto/` | PR-1 | ✅ Public API |
| `adapters/` | PR-2 | ✅ Infrastructure |
| `persistence/` | PR-3 | ✅ Outbox |
| `projection/` | PR-4 | ❌ Standalone worker |
| `projection/runtime/` | PR-6 | ❌ Standalone |
| `business/orders/` | PR-5 | ❌ Shadow events |
| `projections/order/` | PR-7 | ❌ Shadow projection |
| `parity/` | PR-8 | ❌ Standalone |
| `operations/` | PR-10 | ❌ Standalone |
| `src/sdk/order/adapter/` | PR-11 | ❌ Standalone |
| `src/sdk/order/rollout/` | PR-12 | ❌ Standalone |
| `src/sdk/order/certification/` | PR-13 | ❌ Standalone |

---

## Testing

- **Event-focused:** ~280 tests
- **Full platform:** 1033 / 1033 passing

```bash
npm run test:sdk
```

See [EVENT-TEST-MATRIX.md](../../../docs/m6/v1.0/EVENT-TEST-MATRIX.md).

---

## Governance

- EventEnvelope frozen per ADR-019
- No production routing in v1.0
- No adapter wiring in OrderSDK
- Breaking changes require ADR + major version bump

See [EVENT-GOVERNANCE.md](../../../docs/m6/v1.0/EVENT-GOVERNANCE.md).

---

**STOP.** M6 PR-14 complete. Await ARB before production activation or adapter wiring milestones.
