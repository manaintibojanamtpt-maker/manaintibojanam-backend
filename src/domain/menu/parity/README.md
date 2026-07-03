# Menu Projection Parity Domain (M7 PR-8)

Pure domain for **catalog-centric parity validation** between legacy menu reads and shadow projection read models.

## Canonical model

Compares catalog identity, tenant, version, status, and count fields only. Ignores projection metadata, telemetry, and checkpoint IDs.

## Outcomes

`MATCH` · `FIELD_MISMATCH` · `MISSING_IN_PROJECTION` · `MISSING_IN_LEGACY` · `VERSION_MISMATCH` · `UNSUPPORTED`

**STOP.** Await ARB approval before M7 PR-9 (Menu Projection Soak & Certification).
