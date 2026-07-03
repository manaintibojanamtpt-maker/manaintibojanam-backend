# Menu Projection Domain (M7 PR-6)

Pure domain types for menu projection infrastructure. **No read models. No business projections.**

## Modules

| File | Purpose |
|------|---------|
| `MenuProjectionMetadata.ts` | Identity constants and versions |
| `MenuProjectionCheckpoint.ts` | Cursor/checkpoint model |
| `MenuProjectionSnapshot.ts` | Snapshot metadata (no payloads) |
| `MenuProjectionExecution.ts` | Execution records and request/result |
| `MenuProjectionPlan.ts` | Execution plan builder |
| `MenuProjectionValidation.ts` | Pure validators |

**STOP.** Await ARB approval before M7 PR-7 (first menu shadow projection).
