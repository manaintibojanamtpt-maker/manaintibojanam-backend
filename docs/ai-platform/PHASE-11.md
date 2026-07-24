# BhojanOS Shared AI Platform — Phase 11

Status: **AI canary rollout policy/contracts — not wired into assist; default OFF / stage 0**

## Scope (this phase only)

| Deliverable | Location |
| --- | --- |
| Stages 0–5 (0/1/5/25/50/100%) | `backend-lib/ai/rollout/aiRolloutStages.ts` |
| Env config (`AI_CANARY_ROLLOUT_*`) | `backend-lib/ai/rollout/aiRolloutConfig.ts` |
| Bucket evaluation + health gates | `backend-lib/ai/rollout/aiRolloutPolicy.ts` |
| Snapshot `schemaVersion: 11.0` | `backend-lib/ai/rollout/aiRolloutContracts.ts` |
| Status exposure | `GET /api/ai/v1/status` → `rollout` |

## Explicitly out of scope

- Wiring canary into `POST /api/ai/v1/assist` (activation phase)
- Ops dashboard UI (`SystemHealth.tsx`)
- Enabling `AI_GATEWAY_ENABLED` or any `VITE_FF_*_AI_*` by default
- Client-side percentage flags
- Auto-promotion / Firestore persistence of stage
- Cart / order mutations

## Defaults (zero traffic change)

| Knob | Default |
| --- | --- |
| `AI_CANARY_ROLLOUT_ENABLED` | unset / `false` |
| `AI_CANARY_ROLLOUT_STAGE` | `0` (0%) |
| `wiredIntoAssist` | **always `false` in Phase 11** |

Even if someone sets canary env ON and stage > 0, assist remains ungated by canary until a later activation phase.

## Layer model

```
Client VITE_FF_* OFF  → no HTTP
AI_GATEWAY_ENABLED=false → 503
AI_CANARY_* (Phase 11) → policy/status only; not applied to assist yet
```

## Rollback

1. Keep `AI_CANARY_ROLLOUT_ENABLED` unset  
2. Or remove `rollout` from status — assist path unchanged  

## Next

Phase 12: read-only AI ops dashboard UI — see [PHASE-12.md](./PHASE-12.md).
