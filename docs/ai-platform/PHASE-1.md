# BhojanOS Shared AI Platform — Phase 1

Status: **scaffolding complete, disabled by default**

## Goal

One shared backend AI platform for:

| Surface | Mode | Phase 1 |
| --- | --- | --- |
| orderbhojan.web.app | `consumer_ordering` | Gateway ready; UI flag OFF |
| Android APK (same OrderBhojan bundle) | `consumer_ordering` | Gateway ready; UI flag OFF |
| bhojanos.com | `merchant_marketing` | Gateway ready; UI flag OFF |

Frontends must **never** call OpenRouter. All traffic goes through Render:

- `GET /api/ai/v1/status`
- `POST /api/ai/v1/assist`

Legacy `POST /api/ai/chat` (Ollama / rule router) is **unchanged**.

## Server env (Render)

| Variable | Default | Notes |
| --- | --- | --- |
| `AI_GATEWAY_ENABLED` | unset/`false` | Must be `true` to accept assist traffic |
| `OPENROUTER_API_KEY` | unset | Server secret only |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | Matches your Render config |
| `OPENROUTER_MODEL` | `openai/gpt-oss-20b:free` | Matches your Render config |
| `AI_GATEWAY_TIMEOUT_MS` | `15000` | |
| `AI_GATEWAY_MAX_TOKENS` | `1024` | |
| `AI_GATEWAY_RATE_LIMIT_MAX` | `60` | Per IP / 15 min on `/api/ai/v1/assist` |

Having OpenRouter secrets configured does **not** enable the gateway until `AI_GATEWAY_ENABLED=true`.

## Frontend flags (OFF)

| Flag | Surface | Default |
| --- | --- | --- |
| `VITE_FF_OB_AI_ASSISTANT` | OrderBhojan web + Android | `false` |
| `VITE_FF_AI_MARKETING_ASSISTANT` | bhojanos.com | `false` |

No assistant UI is wired in Phase 1.

## Mode policy

- `consumer_ordering` channels: `orderbhojan_web`, `orderbhojan_android`
- `merchant_marketing` channel: `bhojanos_marketing`
- Cross-mode channel use → `403 AI_MODE_FORBIDDEN`
- `sideEffects: []` always — AI cannot mutate cart/orders in Phase 1

## Rollback

1. Set `AI_GATEWAY_ENABLED=false` (or unset) on Render
2. Keep frontend flags false
3. Legacy `/api/ai/chat` continues to work independently

## Module layout

```
backend-lib/ai/
  aiGatewayConfig.ts
  openRouterClient.ts
  assistantModeRouter.ts
  registerAiGatewayRoutes.ts
  types.ts
  __tests__/aiGatewayPhase1.test.ts
```

## Next phases

- Phase 2: structured outputs, intent taxonomy, guardrails, audit contracts — see `PHASE-2.md`
- Phase 3+: consumer UI, cart planning, voice, marketing UI, observability, rollout
