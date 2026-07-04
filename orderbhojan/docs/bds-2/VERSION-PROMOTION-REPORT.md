# Version Promotion Report

## Promotion

| Package | From | To |
|---------|------|-----|
| `@bhojan/design-system` | `0.1.0-bds1` | **`1.0.0`** |

## Flags

```ts
export const BDS_VERSION = '1.0.0';
export const BDS_FROZEN = true;
```

## ADR

**ADR-BDS-001** — Status: Accepted

## OrderBhojan

Version bumped to `0.2.0-bds2` to mark BDS integration milestone.

## Gate Evidence

- `packages/design-system`: `npm run gate:bds` — PASS
- `orderbhojan`: `npm run gate:bds2` — PASS

## Policy

Patch releases (1.0.x) for bug fixes. Minor/major require DRB + ADR.
