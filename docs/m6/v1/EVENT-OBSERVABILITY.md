# Event Observability — BhojanOS M6 v1

**Version:** 1.0.0  
**Status:** Frozen  
**Effective:** 2026-06-26  
**ADR:** [ADR-019](../../adr/ADR-019-event-contract-freeze.md)

---

## 1. Purpose

Every event on the BhojanOS spine MUST be traceable from command to read model. Observability is a contract obligation — not optional instrumentation.

---

## 2. Required Identifiers

| ID | Location | Required | Purpose |
|----|----------|----------|---------|
| **eventId** | `header.eventId` | ✅ Always | Unique event identity; idempotency key |
| **correlationId** | `metadata.correlationId` | ✅ Always | End-to-end request/workflow trace |
| **causationId** | `metadata.causationId` | ⚠️ Recommended | Links derived events to trigger event |
| **traceId** | `metadata.traceId` | ⚠️ Recommended | Distributed trace span correlation |
| **aggregateId** | `header.aggregateId` | ✅ Always | Domain aggregate reference |
| **tenantId** | `metadata.tenantId` | Context-dependent | Multi-tenant isolation |
| **idempotencyKey** | `metadata.idempotencyKey` | Command events | Duplicate command prevention |

---

## 3. Correlation ID Rules

1. **Originates at command boundary** — first event in a workflow owns the correlationId
2. **Propagates unchanged** — all derived events MUST carry the same correlationId
3. **Format** — UUID v4 or ULID; never reuse across unrelated workflows
4. **Presentation → Domain** — Facades generate correlationId before command dispatch
5. **Never empty** — validation rejects envelopes without correlationId

```
Customer Order Flow:
  correlationId: "corr-abc-123"
    ├── order.created.v1        (causationId: null)
    ├── branch.assignment.completed.v1  (causationId: order.created eventId)
    ├── inventory.reserved.v1   (causationId: order.created eventId)
    └── order.accepted.v1       (causationId: branch.assignment eventId)
```

---

## 4. Causation ID Rules

1. Set to the `eventId` of the event that directly caused this event
2. Root events (no prior cause) omit causationId
3. Enables causal chain reconstruction in event store
4. Required for audit and replay validation

---

## 5. Trace ID Rules

1. Aligns with OpenTelemetry trace context where available
2. Propagated through EventSDK enrichment (`enrichEventEnvelope`)
3. Links event processing spans in projection workers
4. Optional in v1; mandatory when distributed tracing is wired (PR-6+)

---

## 6. Telemetry Requirements

### EventSDK Infrastructure Telemetry

| Event | When |
|-------|------|
| `publish_started` / `publish_completed` | Outbox publish |
| `subscribe_received` | Subscriber receives envelope |
| `schema_validated` | Schema registry lookup |
| `deadletter_recorded` | DLQ append |

### Projection Telemetry (M6 PR-4)

| Event | When |
|-------|------|
| `projection_started` | Worker begins processing |
| `projection_completed` | Worker succeeds |
| `projection_failed` | Worker fails |
| `handler_invoked` / `handler_failed` | Dispatcher routes to handler |
| `checkpoint_saved` / `checkpoint_loaded` | Checkpoint I/O |
| `lease_acquired` / `lease_renewed` / `lease_released` | Lease lifecycle |
| `rebuild_started` / `rebuild_completed` | Replay rebuild |

---

## 7. Logging Standards

| Level | Usage |
|-------|-------|
| **ERROR** | DLQ append, schema validation failure, lease loss |
| **WARN** | Retry attempt, deprecated field access, unknown enum value |
| **INFO** | Event published, projection completed, checkpoint saved |
| **DEBUG** | Handler invocation, schema resolution, unknown field ignored |

### Required Log Fields

Every event-related log entry MUST include:

```
correlationId, eventId, eventType, aggregateId, consumerGroup (if projection)
```

### Prohibited in Logs

- Full payload containing PII
- Payment card numbers, tokens
- Authentication credentials
- Unmasked phone numbers or email addresses

---

## 8. Metrics (Future — PR-6+)

| Metric | Type | Labels |
|--------|------|--------|
| `events_published_total` | Counter | type, platform |
| `events_processed_total` | Counter | type, consumer_group, status |
| `projection_lag_seconds` | Gauge | projection_name, consumer_group |
| `dlq_depth` | Gauge | consumer_group |
| `replay_events_total` | Counter | rebuild_id, status |

---

## 9. Alerting Thresholds

| Condition | Severity | Action |
|-----------|----------|--------|
| DLQ rate > 1% for 5 min | P1 | Page on-call |
| Projection lag > 60s | P2 | Investigate |
| Schema validation failure spike | P1 | Flag OFF + investigate |
| Lease acquisition failure | P2 | Check runner health |
| Replay failure | P1 | Cancel rebuild |

---

## 10. References

- [EVENT-CONTRACT.md](./EVENT-CONTRACT.md)
- [EVENT-SECURITY.md](./EVENT-SECURITY.md)
- M6 PR-2 EventInfrastructureTelemetry
- M6 PR-4 ProjectionTelemetry

---

*Event Observability v1.0.0 — frozen 2026-06-26.*
