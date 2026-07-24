# BhojanOS Shared AI Platform — Phase 12

Status: **read-only AI ops dashboard panel on SystemHealth — no canary wiring into assist**

## Scope (this phase only)

| Deliverable | Location |
| --- | --- |
| Ops summary includes gateway + rollout | `GET /api/ops/ai/summary` → schema `12.0` |
| Client types + `aiSummary` in dashboard snapshot | `src/lib/opsHealthApi.ts` |
| Read-only panel | `src/components/ops/AiOpsPanel.tsx` |
| Mount in admin SystemHealth | `src/pages/SystemHealth.tsx` |

## Explicitly out of scope

- Wiring canary into `POST /api/ai/v1/assist`
- UI controls to enable gateway / canary / client AI flags
- Stage promotion / rollback buttons
- Enabling any AI flags by default
- Cart / order mutations

## Behavior

- Superadmin SystemHealth refresh loads `/api/ops/ai/summary`
- Panel shows: gateway ON/OFF/ready, canary stage label, process/1h/24h event + latency stats
- Zero traffic: viewing the panel does not call assist or OpenRouter

## Rollback

1. Remove `<AiOpsPanel />` from `SystemHealth.tsx`
2. Or stop including `aiSummary` in `loadOpsDashboardSnapshot`

## Next

Phase 13: canary assist gate (default unwired) — see [PHASE-13.md](./PHASE-13.md).
