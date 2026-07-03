# Event Security — BhojanOS M6 v1

**Version:** 1.0.0  
**Status:** Frozen  
**Effective:** 2026-06-26  
**ADR:** [ADR-019](../../adr/ADR-019-event-contract-freeze.md)

---

## 1. Purpose

Events are durable, replicated, and long-retained. Security classification and handling rules MUST be defined before publication.

---

## 2. PII Classification

Every event MUST declare PII classification in the ownership matrix:

| Class | Description | Example Fields | Event Payload |
|-------|-------------|----------------|---------------|
| **none** | No personal data | `orderId`, `totalAmount`, `status` | ✅ Allowed |
| **internal** | Business identifiers, non-public | `tenantId`, `branchId`, `internalRef` | ✅ Allowed with access control |
| **sensitive** | Personal data | `customerName`, `phone`, `email`, `address` | ⚠️ ARB approval required |
| **restricted** | Financial, health, credentials | `cardNumber`, `cvv`, `password`, `aadhaar` | ❌ Forbidden in events |

---

## 3. PII Handling Rules

1. **Forbidden:** Restricted-class data MUST NEVER appear in event payloads or metadata
2. **Sensitive data:** Requires ARB approval + encryption at rest + reduced retention
3. **Reference by ID:** Prefer `customerId` over embedding customer details
4. **Pseudonymization:** Hash or tokenize where full identity is not required
5. **Right to erasure:** Events containing sensitive PII MUST support tombstone/redaction events

### Approved Pattern

```json
// ✅ Correct — reference by ID
{ "orderId": "...", "customerId": "cust-123", "totalAmount": 500 }

// ❌ Forbidden — embedded PII
{ "orderId": "...", "customerPhone": "+91-9876543210", "customerEmail": "..." }
```

---

## 4. Sensitive Payloads

| Payload Type | Rule |
|--------------|------|
| Payment details | Emit `payment.captured.v1` with `paymentId` only — no card data |
| Location coordinates | Emit geohash or service area ID — not raw lat/lng unless necessary |
| Authentication | Never emit tokens, sessions, or credentials |
| Health/dietary | Restricted — requires legal review |

---

## 5. Encryption Guidance

| Layer | Requirement | Implementation |
|-------|-------------|----------------|
| **In transit** | TLS 1.2+ | Infrastructure adapter responsibility |
| **At rest (event store)** | Encrypt sensitive-class events | Firestore encryption (default) + field-level for sensitive |
| **At rest (checkpoints)** | No PII in checkpoints | Checkpoint contains eventId/sequence only |
| **In logs** | Never log sensitive payloads | Structured logging with field redaction |

Field-level encryption keys rotate per tenant where sensitive events are approved.

---

## 6. Audit Requirements

| Event | Audit Requirement |
|-------|-------------------|
| Business events (order, payment) | Immutable event store; 7-year retention |
| Security events | Tamper-evident log; SIEM integration |
| Replay operations | `projection.replayed.v1` audit event mandatory |
| Schema changes | Registry changelog with author + timestamp |
| Lifecycle transitions | ARB minutes + catalog update |

Audit logs MUST include: `who`, `what`, `when`, `correlationId`, `eventId`.

---

## 7. Retention Guidance

| Classification | Default Retention | Deletion |
|----------------|-------------------|----------|
| none | Per ownership matrix | Standard archival |
| internal | Per ownership matrix | Standard archival |
| sensitive | Minimum necessary (≤ 2 years) | Redaction event + purge |
| restricted | ❌ Must not exist in events | N/A |

Retention overrides require Legal + Security approval.

---

## 8. Deletion Policy

1. **Event immutability** — events are append-only; deletion is via redaction/tombstone events
2. **Tombstone event** — `customer.data.erased.v1` marks aggregate as redacted
3. **Projection purge** — Projections MUST honor tombstone events and remove PII from read models
4. **Right to erasure** — Process within 30 days of verified request
5. **Backup retention** — Backups containing erased data purged within 90 days

---

## 9. Access Control

| Resource | Read | Write |
|----------|------|-------|
| Event store | Platform owner + M6 | Producer domain only |
| Outbox | M6 infrastructure | Domain command handlers |
| Dead letter queue | Platform owner + on-call | EventSDK only |
| Schema registry | All platforms (read) | Owner platform (write) |
| Projection checkpoints | Projection owner | Projection worker only |
| Replay engine | ARB-approved operators | M6 team |

Presentation layer MUST NOT access any of the above (LAW 2).

---

## 10. Security Review Checklist

Before publishing events with sensitive classification:

- [ ] PII fields minimized to IDs/references
- [ ] Encryption at rest confirmed
- [ ] Retention period documented and approved
- [ ] Tombstone/redaction event defined
- [ ] Access control matrix updated
- [ ] Security team sign-off
- [ ] Legal review (if restricted-adjacent)

---

## 11. References

- [EVENT-OWNERSHIP-MATRIX.md](./EVENT-OWNERSHIP-MATRIX.md)
- [EVENT-OBSERVABILITY.md](./EVENT-OBSERVABILITY.md)
- [EVENT-GOVERNANCE-CHECKLIST.md](./EVENT-GOVERNANCE-CHECKLIST.md)

---

*Event Security v1.0.0 — frozen 2026-06-26.*
