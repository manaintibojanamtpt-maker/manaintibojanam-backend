# Pricing Projection Parity Domain (M8 PR-8)

Pure domain for **catalog-centric parity validation** between legacy pricing reads and shadow projection read models.

## Canonical model

Compares price list identity, tenant, version, status, and count fields only. Ignores projection metadata, telemetry, checkpoint IDs, price values, GST, and payloads.

## Outcomes

`MATCH` · `FIELD_MISMATCH` · `MISSING_IN_PROJECTION` · `MISSING_IN_LEGACY` · `VERSION_MISMATCH` · `UNSUPPORTED`

**STOP.** Await ARB approval before M8 PR-9 (Pricing Projection Soak & Certification).
