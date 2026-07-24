# BhojanOS Shared AI Platform — Phase 24

Status: **Shadow traffic validation — non-user-visible capture + offline golden-category compare**

## Scope

| Deliverable | Location |
| --- | --- |
| Config (OFF by default) | `aiShadowTrafficConfig.ts` (`AI_SHADOW_TRAFFIC_ENABLED`) |
| Capture hook | `emitAiAuditEvent` → `maybeCaptureAiShadowSample` |
| In-process buffer | `shadow/aiShadowTrafficStore.ts` |
| Offline compare | `shadow/compareShadowToGolden.ts` (Phase 23 runners) |
| Ops API | `GET/POST /api/ops/ai/shadow/samples\|replay` |
| Ops UI | `AiShadowTrafficPanel` on SystemHealth |

## Behavior

1. When `AI_SHADOW_TRAFFIC_ENABLED=true`, eligible assist/cart-plan audit events are copied into an in-process ring buffer (redacted `messagePreview` only).  
2. Superadmin can list samples and run **offline** replay compare against golden categories (intent / safety / triage / personalization / cart-plan-parse / clarification).  
3. No OpenRouter calls, no user-visible assistant responses, no cart/checkout mutations (`mutatedState: false`).  
4. Optional `includeGoldenBaseline: true` on replay also runs the Phase 23 fixture suite.

## Pre-canary workflow

```bash
npm run test:ai:golden
# then with shadow capture enabled in a staging process:
# AI_SHADOW_TRAFFIC_ENABLED=true
# SystemHealth → AI Shadow Traffic → Run shadow compare
```

## Explicitly out of scope

- Enabling shadow or canary by default  
- Durable shadow persistence (flag reserved, no-op)  
- Live LLM scoring  
- Changing confirm/discard / payment / refund / cancel execution  

## Rollback

Set `AI_SHADOW_TRAFFIC_ENABLED=false` (or unset). Buffer stops filling; UI remains read-only.

## Next

Phase 25 — advisory live canary rollout gates (promotion / halt / rollback) after shadow validation.
