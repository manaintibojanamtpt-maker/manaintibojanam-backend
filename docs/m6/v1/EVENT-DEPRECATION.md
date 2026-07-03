# Event Deprecation — BhojanOS M6 v1

**Version:** 1.0.0  
**Status:** Frozen  
**Effective:** 2026-06-26  
**ADR:** [ADR-019](../../adr/ADR-019-event-contract-freeze.md)

---

## 1. Purpose

Deprecation is the controlled transition from an active event or schema to its successor. Deprecation protects consumers from sudden breaking changes.

---

## 2. Deprecation Triggers

| Trigger | Example |
|---------|---------|
| New event major published | `order.created.v1` → `order.created.v2` |
| Schema field superseded | `clientId` → `customerId` |
| Platform decommission | Legacy checkout events |
| Security reclassification | PII field removal |
| Regulatory requirement | Data minimization |

---

## 3. Deprecation Timeline

### Business Events (order, payment, branch)

| Phase | Minimum Duration | Actions |
|-------|------------------|---------|
| **Announcement** | Day 0 | Catalog → Deprecated; notify consumers |
| **Dual-publish** | 90 days | Emit old + new event majors |
| **Consumer migration** | 90 days | All consumers migrate to new major |
| **Old-major freeze** | Day 180 | Stop emitting deprecated major |
| **Retirement** | Day 210 | Catalog → Retired; archive schema |

### Infrastructure Events

| Phase | Minimum Duration |
|-------|------------------|
| Dual-publish | 30 days |
| Retirement | 60 days total |

---

## 4. Deprecation Requirements

Before marking an event Deprecated:

- [ ] Successor identified and Approved/Published
- [ ] All registered consumers notified in writing (Slack + email)
- [ ] Migration guide published
- [ ] Dual-publish plan tested in staging
- [ ] Rollback plan documented
- [ ] ARB approval for business events

---

## 5. Field-Level Deprecation

Schema fields deprecate independently of event majors:

```json
{
  "customerId": { "type": "string" },
  "clientId": {
    "type": "string",
    "deprecated": true,
    "deprecationDate": "2026-09-01",
    "description": "Use customerId. Removed in schema 2.0.0."
  }
}
```

| Phase | Producer | Consumer |
|-------|----------|----------|
| Announced | Emit both fields | Read either |
| Warning (30d+) | Emit both; log warning on old | Prefer new |
| Removed | New event major or schema major | New only |

---

## 6. Projection Deprecation

| Action | Requirement |
|--------|-------------|
| Deprecate projection version | New version handles all traffic |
| Unregister handler | Zero events routed to old identity |
| Archive checkpoint | Retain per retention policy |
| Retire identity | Remove from Projection Registry |

Parallel projection versions MAY run during migration:

```
order-summary@1.0.0@read-model  (deprecated)
order-summary@2.0.0@read-model  (active)
```

---

## 7. Consumer Obligations

During deprecation period, consumers MUST:

1. Acknowledge deprecation notice within 14 days
2. Provide migration completion date
3. Test against new event major in staging
4. Complete migration before Retirement date

Failure to migrate does not extend Retirement date.

---

## 8. Monitoring Deprecation Health

| Metric | Threshold |
|--------|-----------|
| Deprecated event emission rate | Must decrease weekly |
| Deprecated event consumption rate | Must reach zero before Retirement |
| DLQ rate on deprecated events | Alert if > 0.1% |
| Consumer migration completion | 100% before Retirement |

---

## 9. References

- [EVENT-LIFECYCLE.md](./EVENT-LIFECYCLE.md)
- [EVENT-COMPATIBILITY.md](./EVENT-COMPATIBILITY.md)
- [EVENT-ROLLBACK.md](./EVENT-ROLLBACK.md)
- [EVENT-CATALOG.md](./EVENT-CATALOG.md)

---

*Event Deprecation v1.0.0 — frozen 2026-06-26.*
