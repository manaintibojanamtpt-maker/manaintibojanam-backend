# Menu Catalog Shadow Projection Domain (M7 PR-7)

Pure domain for the **catalog-centric** menu shadow projection. The catalog aggregate is the projection root — categories, items, modifiers, combos, and future branch overrides hang off a single immutable catalog version.

## Supported events (schema definitions only)

- `menu.catalog.created.v1`
- `menu.catalog.updated.v1`
- `menu.catalog.deleted.v1`

No publishers. No Event Platform wiring.

## Read model

Metadata and counts only — no pricing, inventory, search index, or branch overrides.

**STOP.** Await ARB approval before M7 PR-8 (Menu Projection Parity Validation).
