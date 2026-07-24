# BhojanOS Shared AI Platform — Phase 22

Status: **Internal read-only AI audit review UI**

## Scope

| Deliverable | Location |
| --- | --- |
| Review panel | `src/components/ops/AiAuditReviewPanel.tsx` |
| SystemHealth mount | `src/pages/SystemHealth.tsx` |
| Client fetch | `fetchAiAuditEvents` in `opsHealthApi.ts` |
| List filters | `eventTypes`, `errorCode`, `canaryBucket`, `safetyBlocked` on `/api/ops/ai/audit-events` |

## Capabilities (read-only)

- Preset filters: all / blocked / confirm·discard / canary denials / safety / provider errors  
- Search by correlation ID, event type override, canary bucket  
- Table + detail inspector for durable `ai_audit_events`  
- In-process canary bucket + error-code slices from ops summary (last 1h)  
- Persistence hint from `auditPersistence` / API response  

## Explicit non-goals

- No enable/disable toggles for gateway or canary  
- No stage promotion controls  
- No assist / OpenRouter calls from the UI  
- No cart/order mutations  

## Access

Superadmin-only via existing `/admin/system-health` (`ProtectedRoute adminOnly`) and `requireSuperadmin` on `/api/ops/ai/audit-events`.

## Dependencies

- Durable rows require Phase 21 `AI_AUDIT_PERSISTENCE_ENABLED=true`  
- Slice chips still work from in-process metrics when durable store is empty  

## Rollback

Remove / hide `AiAuditReviewPanel` mount, or leave mounted (read-only; no traffic enablement).

## Next

Phase 23: offline eval harness + golden review set — see `PHASE-23.md`.
