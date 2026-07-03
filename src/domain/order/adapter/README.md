# Order Read Adapter Domain (M6 PR-11)

Pure domain for order read adapter routing. **No SDK imports. No Firestore.**

## Readiness gates (all required for projection path)

- `FF_ORDER_PROJECTION_ADAPTER_ENABLED` ON
- Parity certified READY
- Operational validation GREEN
- Projection repository available

Otherwise **automatic fallback to legacy**.

**STOP.** Not a production switch — legacy remains default.
