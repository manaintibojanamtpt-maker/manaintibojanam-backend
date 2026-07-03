# Event Compatibility — BhojanOS M6 v1

**Version:** 1.0.0  
**Status:** Frozen  
**Effective:** 2026-06-26  
**ADR:** [ADR-021](../../adr/ADR-021-event-versioning-policy.md)

---

## 1. Definitions

| Term | Definition |
|------|------------|
| **Backward compatible** | New consumers can process events produced by old producers |
| **Forward compatible** | Old consumers can process events produced by new producers (within same event major) |
| **Breaking change** | Any change that violates backward or forward compatibility |
| **Full compatible** | Both backward and forward compatible |

---

## 2. Compatibility Matrix

### Schema Changes (within same event major)

| Change | Backward | Forward | Action |
|--------|----------|---------|--------|
| Add optional field | ✅ | ✅ | Schema minor bump |
| Add required field | ❌ | ✅ | Event major bump OR staged rollout |
| Remove field | ❌ | ❌ | Event major bump |
| Rename field (no alias) | ❌ | ❌ | Event major bump |
| Rename field (with alias period) | ✅ during alias | ✅ | Schema minor + deprecation |
| Widen type (int → number) | ✅ | ⚠️ | Schema minor + consumer audit |
| Narrow type (number → int) | ❌ | ❌ | Event major bump |
| Change enum (remove value) | ❌ | ❌ | Event major bump |
| Change enum (add value) | ✅ | ✅ | Schema minor — consumers ignore unknown |
| Change semantic meaning | ❌ | ❌ | Event major bump |

### Event Name Changes

| Change | Compatible | Action |
|--------|------------|--------|
| Rename event | ❌ | New event major; deprecate old |
| New event major (v1 → v2) | ❌ with v1 | Dual-publish during migration |
| Same event, schema patch | ✅ | Patch bump only |

### Projection Changes

| Change | Compatible | Action |
|--------|------------|--------|
| Handler logic fix (same output) | ✅ | Patch projection version |
| Add read model field | ✅ | Minor projection version |
| Remove read model field | ❌ | Major projection version + rebuild |
| Change checkpoint strategy | ❌ | New projection identity |

---

## 3. Unknown Field Policy

**Consumers MUST ignore unknown payload fields** (Postel's Law / tolerant reader).

| Rule | Detail |
|------|--------|
| Unknown fields | Silently ignored — never fail processing |
| Unknown metadata fields | Silently ignored |
| Unknown enum values | Logged at debug; processing continues if field is optional |
| Required field missing | Fail processing → retry → dead-letter |

This policy enables **forward compatibility** for schema minor bumps.

---

## 4. Deprecated Field Policy

| Phase | Duration | Producer | Consumer |
|-------|----------|----------|----------|
| **Announced** | 0 days | Emit field + `deprecated` schema annotation | Continue reading |
| **Dual-write** | ≥ 30 days | Emit old + new field | Read either |
| **Old-only warning** | ≥ 30 days | Emit old field only; log deprecation | Must read new field |
| **Removed** | After Retirement | Stop emitting old field | Must use new field only |

Deprecated fields MUST be documented in schema registry with `deprecated: true` and `deprecationDate`.

---

## 5. Reserved Namespace Policy

- Platforms MUST NOT consume events outside their registered namespace without ARB approval
- Cross-platform consumption requires explicit entry in [EVENT-OWNERSHIP-MATRIX.md](./EVENT-OWNERSHIP-MATRIX.md)
- Infrastructure events (`event.*`, `projection.*`) are consumed by M6 only

---

## 6. Breaking Change Rules

A breaking change REQUIRES:

1. New event name major OR new projection major
2. ARB approval with documented migration plan
3. Dual-publish period (minimum 30 days for business events)
4. Updated [EVENT-CATALOG.md](./EVENT-CATALOG.md) entry
5. Compatibility review checklist signed off
6. Rollback plan per [EVENT-ROLLBACK.md](./EVENT-ROLLBACK.md)

**Breaking changes are forbidden without ARB approval.**

---

## 7. Payload Evolution Rules

1. Prefer additive changes (optional fields) over breaking changes
2. Never remove a field without deprecation period
3. Never change field type without alias period or new event major
4. Document every schema change in Schema Registry with changelog
5. Projection handlers MUST tolerate unknown fields (forward compatible)
6. Required fields MUST have defaults documented for replay scenarios

---

## 8. Version Negotiation

At dispatch time, ProjectionDispatcher validates:

```
envelope.header.version ↔ schemaRegistry.resolve(type).version
```

| Result | Action |
|--------|--------|
| Compatible | Process |
| Incompatible major | Reject → dead-letter |
| Unknown schema | Reject → dead-letter |
| Newer minor than consumer | Process (forward compatible) |

---

## 9. Certification Checklist Reference

Before publishing any event, complete the **Compatibility Review Checklist** in [EVENT-GOVERNANCE-CHECKLIST.md](./EVENT-GOVERNANCE-CHECKLIST.md).

---

## 10. References

- [EVENT-VERSIONING.md](./EVENT-VERSIONING.md)
- [EVENT-SCHEMA-EVOLUTION.md](./EVENT-SCHEMA-EVOLUTION.md)
- [EVENT-DEPRECATION.md](./EVENT-DEPRECATION.md)
- [ADR-021](../../adr/ADR-021-event-versioning-policy.md)
- [ADR-022](../../adr/ADR-022-schema-evolution-policy.md)

---

*Event Compatibility v1.0.0 — frozen 2026-06-26.*
