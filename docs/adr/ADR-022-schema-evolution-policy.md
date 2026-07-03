# ADR-022: Schema Evolution Policy (M6 PR-4.5)

**Status:** Proposed  
**Date:** 2026-06-26  
**Deciders:** Architecture Review Board  
**Supersedes:** N/A  
**Related:** ADR-019 (Event Contract Freeze), ADR-021 (Event Versioning Policy)

---

## Context

Event payloads evolve as platforms add fields, rename concepts, and deprecate legacy data. Without a frozen schema evolution policy, producers and consumers will diverge, causing projection failures, dead-letter floods, and read model corruption.

The Schema Registry (M6 PR-2) provides runtime schema resolution. This ADR defines the **governance rules** for how schemas change over time.

---

## Decision

1. **All Published events MUST have a registered JSON Schema** in the Schema Registry.

2. **Preferred evolution strategy is additive** (Strategy A):
   - Add optional fields
   - Bump schema minor
   - No event major bump required

3. **Field alias strategy** (Strategy B) for renames:
   - Dual-write old + new field during alias period (≥ 30 days)
   - Bump schema minor during alias
   - Remove old field only with event major bump or schema major bump

4. **Breaking changes** (Strategy C) require new event major:
   - Remove required field
   - Change field type incompatibly
   - Change semantic meaning
   - Add required field (without default)

5. **Unknown field policy (mandatory):**
   - Consumers MUST silently ignore unknown payload fields
   - Consumers MUST silently ignore unknown metadata fields
   - Producers MUST NOT fail on unknown fields in replay

6. **Deprecated field policy:**
   - `deprecated: true` annotation in schema
   - `deprecationDate` required
   - Minimum 30-day alias period before removal
   - See [EVENT-DEPRECATION.md](../m6/v1/EVENT-DEPRECATION.md)

7. **Reserved namespace policy:**
   - Each platform owns its context namespace
   - Cross-namespace fields forbidden without ARB approval
   - See [EVENT-NAMING-STANDARD.md](../m6/v1/EVENT-NAMING-STANDARD.md)

8. **Anti-patterns forbidden:**
   - Untyped payloads
   - Inline schemas in handlers
   - Silent field removal
   - PII in unstructured metadata

9. **Changelog required** for every schema version increment.

10. **No code changes** in this ADR — governance only.

---

## Consequences

### Positive

- Producers and consumers have clear evolution rules
- Additive changes deploy without coordination windows
- Breaking changes require explicit ARB governance
- Forward compatibility enables rolling deployments

### Negative / deferred

- Schema Registry diff tooling deferred
- Automated compatibility checker in CI deferred
- Schema history at point-in-time (for replay) deferred to PR-6+

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Schema-less events (JSON blobs) | No validation; no compatibility guarantees |
| Avro/Protobuf binary schemas | Provider coupling; JSON chosen for v1 |
| Strict schema (reject unknown fields) | Breaks forward compatibility |
| Producer-only evolution | Consumers must tolerate unknown fields regardless |

---

## Compliance

- Schema changes require [Schema Review Checklist](../m6/v1/EVENT-GOVERNANCE-CHECKLIST.md)
- Breaking changes require [Compatibility Review Checklist](../m6/v1/EVENT-GOVERNANCE-CHECKLIST.md)
- See [EVENT-SCHEMA-EVOLUTION.md](../m6/v1/EVENT-SCHEMA-EVOLUTION.md) for full policy

---

## References

- [EVENT-SCHEMA-EVOLUTION.md](../m6/v1/EVENT-SCHEMA-EVOLUTION.md)
- [EVENT-COMPATIBILITY.md](../m6/v1/EVENT-COMPATIBILITY.md)
- [ADR-021](./ADR-021-event-versioning-policy.md)
- M6 PR-2 DefaultSchemaRegistry

---

*ADR-022 — Schema Evolution Policy v1.0.0.*
