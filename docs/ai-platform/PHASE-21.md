# BhojanOS Shared AI Platform — Phase 21

Status: **Durable AI audit persistence (Firestore) for request / validation / confirm-deny / canary / error review**

## Scope

| Deliverable | Location |
| --- | --- |
| Flag | `AI_AUDIT_PERSISTENCE_ENABLED` (OFF by default) |
| Config | `aiAuditPersistenceConfig.ts` |
| Repository | `aiAuditEventRepository.ts` → collection `ai_audit_events` |
| Emit hook | `emitAiAuditEvent` → fire-and-forget `schedulePersistAiAuditEvent` |
| Confirm/deny audit API | `POST /api/ai/v1/consumer/cart-plan/decision` |
| Client best-effort report | `reportCartPlanDecision` + `reportCartPlanDecisionQuietly` |
| Ops review | `GET /api/ops/ai/audit-events` (superadmin) |

## What is persisted

All events flowing through `emitAiAuditEvent`, including:

- Assist: request / response / blocked / provider_error / disabled  
- Cart validate: request / response / invalid / blocked / disabled  
- Canary denials (`AI_CANARY_*` on assist + validate)  
- Client decisions: `ai.cart_plan.confirmed` / `ai.cart_plan.discarded`  

Documents store the existing `AiAuditEvent` shape (schema `21.0`) plus `eventId` and `persistedAt`. User text remains `messagePreview` only (redacted).

## Behavior

1. In-process ring buffer + logs unchanged (`persistence: 'in_process'` for metrics)  
2. When flag ON + Firestore available: async write; gateway latency does not await Firestore  
3. Quota backoff → skip write (same pattern as incidents)  
4. Confirm/discard UI unchanged; audit is fire-and-forget and failures are swallowed  
5. Server decision route never mutates cart (`mutatedState: false`)

## Explicitly out of scope

- Enabling persistence by default  
- Changing confirm/discard UI copy or flow  
- Auto-applying cart plans  
- TTL job implementation (recommend Firestore TTL on `persistedAt` as infra)

## Enable

```env
AI_AUDIT_PERSISTENCE_ENABLED=true
```

Requires Firestore (`db` wired into `registerAiGatewayRoutes`).

## Rollback

Set `AI_AUDIT_PERSISTENCE_ENABLED=false` (or unset). In-process metrics continue; durable writes stop.

## Review

- Superadmin: `GET /api/ops/ai/audit-events?eventType=ai.assist.blocked&limit=50`  
- Status: `GET /api/ai/v1/status` → `auditPersistence.enabled`  
- Ops summary includes `auditPersistence` block  

## Next

Phase 22: admin audit review UI — see `PHASE-22.md`.
