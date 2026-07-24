# BhojanOS Shared AI Platform — Phase 9

Status: **AI observability contracts + in-process status metrics — no dashboard UI; flags unchanged**

## Scope (this phase only)

| Deliverable | Location |
| --- | --- |
| Metrics / snapshot contracts `schemaVersion: 9.0` | `backend-lib/ai/aiObservabilityContracts.ts` |
| In-process ring-buffer collector + `emitAiAuditEvent` | `backend-lib/ai/aiMetricsCollector.ts` |
| Gateway status includes `observability` block | `GET /api/ai/v1/status` |
| Superadmin ops summary | `GET /api/ops/ai/summary` |
| Ops client helper (no UI) | `src/lib/opsHealthApi.ts` → `fetchAiOpsSummary` |

## Explicitly out of scope

- Observability dashboard UI (`SystemHealth.tsx`)
- Post-order assist hooks
- Canary / percentage AI rollout flags
- Persisting audit events to Firestore
- Enabling `AI_GATEWAY_ENABLED` or any `VITE_FF_*_AI_*` by default
- Cart / order mutations

## Snapshot shape

```ts
{
  schemaVersion: '9.0',
  mutatedState: false,
  persistence: 'in_process',
  process / last1h / last24h: {
    totalEvents, successCount, failureCount, safetyBlockedCount,
    byEventType, byPlatform, byMode,
    latency: { count, avgMs, p50Ms, p95Ms }
  }
}
```

Metrics are derived from existing audit events (PII already redacted in previews). Process restart clears the buffer.

## Rollback

1. Remove `observability` from status + `/api/ops/ai/summary` (audit Winston logs remain)
2. Or stop calling `emitAiAuditEvent` and revert to direct `buildAiAuditEvent` logging

## Next

Phase 10: post-order read-only assist hooks — see [PHASE-10.md](./PHASE-10.md).  
Phase 11+: AI canary rollout; ops dashboard UI.
