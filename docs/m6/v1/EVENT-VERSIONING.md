# Event Versioning — BhojanOS M6 v1

**Version:** 1.0.0  
**Status:** Frozen  
**Effective:** 2026-06-26  
**ADR:** [ADR-021](../../adr/ADR-021-event-versioning-policy.md)

---

## 1. Three Independent Version Axes

BhojanOS maintains **three independent version dimensions**. They MUST NOT be conflated.

| Axis | Location | Format | Example | Governs |
|------|----------|--------|---------|---------|
| **Event name major** | Event type string | `.v<N>` suffix | `order.created.v1` | Breaking semantic or payload contract |
| **Schema semver** | `header.version` | Semver `MAJOR.MINOR.PATCH` | `1.2.0` | Payload field evolution within event major |
| **Projection version** | `ProjectionIdentity.projectionVersion` | Semver | `2.0.0` | Handler logic and read model shape |

---

## 2. Event Name Major Version

### When to bump

| Change | Bump Required |
|--------|---------------|
| Remove required payload field | `.v1` → `.v2` |
| Change field type incompatibly | `.v1` → `.v2` |
| Change event semantic meaning | `.v1` → `.v2` |
| Rename payload field (no alias) | `.v1` → `.v2` |
| Add optional field | Stay on `.v1` (schema minor) |
| Add required field | `.v1` → `.v2` |

### Rules

1. Event name major is **permanent** — `order.created.v1` never becomes `order.created.v2` on the same event; both coexist during migration
2. Producers MUST NOT emit deprecated majors after Retirement date
3. Consumers MUST declare which majors they support in ownership matrix

---

## 3. Schema Semver (`header.version`)

Follows [Semantic Versioning 2.0.0](https://semver.org/) applied to the **payload schema**.

### Major (X.0.0)

Breaking payload change within the same event name major — **discouraged**. Prefer new event name major instead.

If schema major bumps within same event name major, ARB must document exception.

### Minor (1.X.0)

Backward-compatible additive changes:

- New optional payload fields
- New optional metadata fields
- Wider enum values (consumers MUST ignore unknown values)

### Patch (1.0.X)

Non-functional changes:

- Documentation corrections
- Schema registry metadata updates
- Default value clarifications (no behavior change)

---

## 4. Projection Version

Projection versions follow semver independently of event versions.

```
Projection 1.0.0  →  initial handler
Projection 1.1.0  →  additive read model field (backward compatible)
Projection 2.0.0  →  breaking read model change (new consumer group or rebuild)
```

### Rules

1. Changing projection logic requires new `projectionVersion`
2. Same `projectionName` + `consumerGroup` + new `projectionVersion` = new identity (may run in parallel)
3. Checkpoint records include `projectionVersion` and `schemaVersion` separately
4. Rebuild requires `replaySupported: true` on identity

See [ADR-020](../../adr/ADR-020-projection-identity-freeze.md).

---

## 5. Version Matrix Example

| Artifact | order.created.v1 | order-summary projection |
|----------|------------------|--------------------------|
| Event name major | v1 | N/A |
| Schema version | 1.2.0 | N/A |
| Projection version | N/A | 2.1.0 |
| Consumer group | N/A | `order-read-model` |

A schema bump on `order.created.v1` from `1.1.0` to `1.2.0` does **not** require a projection version bump if the handler tolerates unknown fields.

A projection logic change from v1 to v2 **does not** require a new event name.

---

## 6. Version Constants

| Constant | Location | Frozen |
|----------|----------|--------|
| `EVENT_SDK_VERSION` | `src/sdk/events/version.ts` | No — tracks infrastructure PRs |
| Event name | Schema Registry | Yes — once Published |
| Schema semver | Schema Registry | Yes — per compatibility rules |
| `ProjectionIdentity.projectionVersion` | Projection Registry | Yes — once registered |

---

## 7. Governance

| Change Type | Approval Required |
|-------------|-------------------|
| New event name (Draft) | Platform owner + ARB |
| Schema minor bump | Platform owner |
| Schema major bump | ARB + compatibility review |
| Event name major bump | ARB + migration plan |
| Projection version bump | Platform owner + projection review checklist |
| Projection major bump | ARB if read model contract changes |

---

## 8. References

- [EVENT-COMPATIBILITY.md](./EVENT-COMPATIBILITY.md)
- [EVENT-SCHEMA-EVOLUTION.md](./EVENT-SCHEMA-EVOLUTION.md)
- [EVENT-REPLAY.md](./EVENT-REPLAY.md)
- [ADR-021](../../adr/ADR-021-event-versioning-policy.md)

---

*Event Versioning v1.0.0 — frozen 2026-06-26.*
