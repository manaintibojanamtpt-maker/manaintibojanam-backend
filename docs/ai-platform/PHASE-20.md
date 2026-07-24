# BhojanOS Shared AI Platform — Phase 20

Status: **Client canary cohort headers + rollout slice observability**

## Scope

| Deliverable | Location |
| --- | --- |
| Deterministic cohort key | `orderbhojan/.../resolveAiCanaryCohortKey.ts` |
| Flag-gated request attachment | `buildAiCanaryRequestAttachment.ts` → `assistantApiClient.ts` |
| Feature flag | `FF_OB_AI_CANARY_HEADERS` (OFF by default) |
| Audit canary fields | `backend-lib/ai/auditContracts.ts` |
| Slice metrics (`byCanaryBucket`, `byErrorCode`) | `aiObservabilityContracts.ts` (schema `20.0`) |
| Gateway emit annotation | `registerAiGatewayRoutes.ts` assist + cart-plan |

## Dual / layered controls

| Control | Default | Role |
| --- | --- | --- |
| `FF_OB_AI_CANARY_HEADERS` | OFF | OrderBhojan sends `x-ai-canary-key` + `routingKey` |
| `AI_CANARY_WIRED_INTO_ASSIST` | false | Server applies percentage/health gate |
| `AI_CANARY_ROLLOUT_ENABLED` + stage | OFF / 0 | Active canary filtering |

With headers ON and server unwired → traffic still allowed; audits gain cohort buckets for monitoring.

## Behavior

1. When flag ON, cohort = `ob-cohort-` + FNV-1a hash of deviceId (± userId)  
2. Client sends header + body `routingKey` on assist / post-order / cart-plan validate (and header on status)  
3. Gateway records `canaryBucket`, `canaryGateApplied`, `errorCode` on audit events  
4. Observability windows expose per-bucket success/failure/safety/latency + `byErrorCode`  
5. No UI change; no auto cart/checkout; rollback = turn flag OFF (and/or unwire server)

## Safety invariants

- Flag OFF by default — no headers, no UX change  
- Cohort key is hashed (no raw device/user id in header)  
- Server gate semantics unchanged (unwired → allow)  
- Ops panel remains read-only (no stage mutation controls)

## Explicitly out of scope

- Enabling canary filtering in production by default  
- UI for cohort membership  
- Changing health-gate thresholds  

## Enable (manual, staged)

```env
# OrderBhojan
VITE_FF_OB_AI_CANARY_HEADERS=true

# Server (only when ready to filter)
AI_CANARY_WIRED_INTO_ASSIST=true
AI_CANARY_ROLLOUT_ENABLED=true
AI_CANARY_ROLLOUT_STAGE=1
```

## Rollback

1. Set `VITE_FF_OB_AI_CANARY_HEADERS=false` (stop segmented keys)  
2. And/or `AI_CANARY_WIRED_INTO_ASSIST=false` / stage `0` (stop filtering)  

## Next

Phase 21: durable AI audit persistence — see `PHASE-21.md`.
