# BhojanOS Shared AI Platform — Phase 13

Status: **canary assist gate wired — inactive by default (zero traffic change)**

## Scope

| Deliverable | Location |
| --- | --- |
| `AI_CANARY_WIRED_INTO_ASSIST` config | `backend-lib/ai/rollout/aiRolloutConfig.ts` |
| `evaluateAiCanaryAssistGate` (safe defaults) | `backend-lib/ai/rollout/aiRolloutPolicy.ts` |
| Gate on `/assist` + cart-plan validate | `registerAiGatewayRoutes.ts` |
| Status `phase: 13` + `aiCanaryAssistGate` | `GET /api/ai/v1/status` |

## Safe gate semantics

| Condition | Assist result |
| --- | --- |
| `AI_CANARY_WIRED_INTO_ASSIST` ≠ true (default) | **Allow** (no filter) |
| Wired, but canary flag OFF or stage 0 | **Allow** (canary inactive) |
| Wired + enabled + stage > 0 + in bucket + healthy | **Allow** |
| Wired + enabled + stage > 0 + outside bucket | **403 `AI_CANARY_EXCLUDED`** |
| Wired + enabled + stage > 0 + health gate | **403 `AI_CANARY_HEALTH_GATE`** |

Routing key: `body.routingKey` or `x-ai-canary-key` → else `conversationId` → else `x-correlation-id`.

## Explicitly out of scope

- Enabling wired/canary/gateway flags by default
- Auto stage promotion
- Client UI to change canary stage
- Order/cart mutations

## Rollback

1. Unset `AI_CANARY_WIRED_INTO_ASSIST` (or set false) — assist ungated again  
2. Or unset `AI_CANARY_ROLLOUT_ENABLED` / set stage `0`

## Activation checklist (manual)

1. Gateway soak with Phase 12 ops panel green  
2. Set `AI_CANARY_WIRED_INTO_ASSIST=true` (still inactive until step 3)  
3. Set `AI_CANARY_ROLLOUT_ENABLED=true` and `AI_CANARY_ROLLOUT_STAGE=1`  
4. Watch `/api/ops/ai/summary` failure/safety/latency  
5. Promote stage only with explicit approval  

## Next

Phase 14: OrderBhojan consumer assistant UI — see [PHASE-14.md](./PHASE-14.md).
