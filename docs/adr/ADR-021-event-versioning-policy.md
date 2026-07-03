# ADR-021: Event Versioning Policy (M6 PR-4.5)

**Status:** Proposed  
**Date:** 2026-06-26  
**Deciders:** Architecture Review Board  
**Supersedes:** N/A  
**Related:** ADR-019 (Event Contract Freeze), ADR-022 (Schema Evolution Policy)

---

## Context

BhojanOS events carry three independent version dimensions:

1. **Event name major** — `.v1`, `.v2` in the event type string
2. **Schema semver** — `header.version` (e.g. `1.2.0`)
3. **Projection version** — `ProjectionIdentity.projectionVersion`

Without a frozen versioning policy, platforms may conflate these axes, causing breaking changes to propagate silently through the event spine.

---

## Decision

1. **Adopt Semantic Versioning 2.0.0** for schema versions (`header.version`).

2. **Event name major versioning:**
   - Integer suffix only: `.v1`, `.v2`
   - Increment on breaking payload or semantic change
   - Old and new majors coexist during migration
   - Old major deprecated per [EVENT-DEPRECATION.md](../m6/v1/EVENT-DEPRECATION.md)

3. **Schema semver rules:**

   | Bump | When | Example |
   |------|------|---------|
   | **Major** (X.0.0) | Breaking payload within same event major (discouraged — prefer event major bump) | 1.0.0 → 2.0.0 |
   | **Minor** (1.X.0) | Additive optional fields, new enum values | 1.0.0 → 1.1.0 |
   | **Patch** (1.0.X) | Documentation, metadata only | 1.0.0 → 1.0.1 |

4. **Projection version rules:**
   - Independent semver per ADR-020
   - NOT derived from event version
   - Bumped when handler logic or read model shape changes

5. **Compatibility defaults:**
   - Schema minors MUST be backward and forward compatible
   - Consumers MUST ignore unknown fields
   - Producers MUST NOT remove fields without deprecation period

6. **Version negotiation:**
   - ProjectionDispatcher validates `header.version` against Schema Registry
   - Incompatible major → dead-letter
   - Newer minor → process (forward compatible)

7. **Governance:**
   - Schema minor: platform owner approval
   - Schema major or event major: ARB approval
   - All bumps logged in Schema Registry changelog

---

## Consequences

### Positive

- Clear rules prevent accidental breaking changes
- Forward compatibility enables gradual consumer migration
- Three-axis model documented and frozen before first business event

### Negative / deferred

- Schema Registry version history UI deferred
- Automated semver lint in CI deferred
- Cross-major consumer declaration not yet enforced in code

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Single version for event + schema | Cannot evolve payload without renaming event |
| Calendar versioning | Not compatible with semver tooling |
| No schema version in header | Cannot detect incompatible payloads at dispatch |
| Automatic major bump on any change | Too disruptive; prevents additive evolution |

---

## Compliance

- All version bumps documented in [EVENT-CATALOG.md](../m6/v1/EVENT-CATALOG.md)
- Breaking changes require [Compatibility Review Checklist](../m6/v1/EVENT-GOVERNANCE-CHECKLIST.md)
- See [EVENT-VERSIONING.md](../m6/v1/EVENT-VERSIONING.md) for full policy

---

## References

- [EVENT-VERSIONING.md](../m6/v1/EVENT-VERSIONING.md)
- [EVENT-COMPATIBILITY.md](../m6/v1/EVENT-COMPATIBILITY.md)
- [ADR-020](./ADR-020-projection-identity-freeze.md)
- [ADR-022](./ADR-022-schema-evolution-policy.md)

---

*ADR-021 — Event Versioning Policy v1.0.0.*
