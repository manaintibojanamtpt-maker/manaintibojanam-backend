# BhojanOS Shared AI Platform — Phase 2

Status: **contracts implemented; gateway still OFF by default**

## Scope delivered

| Contract | Module |
| --- | --- |
| Intent taxonomy | `backend-lib/ai/intentTaxonomy.ts` |
| Structured output schema `2.0` | `backend-lib/ai/structuredOutput.ts` |
| Safety / guardrails | `backend-lib/ai/safetyGuardrails.ts` |
| Audit events | `backend-lib/ai/auditContracts.ts` |

## Explicitly not in Phase 2

- Consumer / marketing UI
- Cart or order mutations
- Checkout integration
- Enabling `AI_GATEWAY_ENABLED` or frontend flags

## Behavior when gateway is enabled (still default OFF)

`POST /api/ai/v1/assist`:

1. Calls OpenRouter (server-only)
2. Parses structured JSON (or heuristic wrap)
3. Runs safety evaluation (mode isolation, block `place_order`, strip executable flags, detect claimed mutations)
4. Emits audit events (`ai.assist.*`) with redacted message previews
5. Returns `schemaVersion: "2.0"` with `structured` + `sideEffects: []`

## Rollback

1. Keep / set `AI_GATEWAY_ENABLED=false`
2. Or revert `registerAiGatewayRoutes.ts` wiring; contracts are unused when disabled
3. No DB migrations; no frontend changes required

## Flags (unchanged, OFF)

- `AI_GATEWAY_ENABLED` — server
- `VITE_FF_OB_AI_ASSISTANT` — OrderBhojan
- `VITE_FF_AI_MARKETING_ASSISTANT` / `aiMarketingAssistant` — marketing

## Next

Phase 3: consumer read-only hooks/contracts — see `PHASE-3.md` (no UI mount).
