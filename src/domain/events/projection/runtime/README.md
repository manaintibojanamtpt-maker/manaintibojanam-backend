# Projection Runtime Domain (M6 PR-6)

Pure domain types for generic projection runtime persistence. **No SDK imports. No Firestore.**

## Modules

| Module | Purpose |
|--------|---------|
| `ProjectionSnapshot.ts` | Snapshot metadata builders |
| `ProjectionExecutionRecord.ts` | Runtime execution lifecycle |
| `ProjectionExecutionPolicy.ts` | When to persist snapshot/history |
| `ProjectionRecovery.ts` | Recovery plan from failed execution |
| `ProjectionStatistics.ts` | Aggregate counters |
| `ProjectionRuntimeValidation.ts` | Checkpoint, execution, snapshot validation |

**STOP.** No business read models in PR-6.
