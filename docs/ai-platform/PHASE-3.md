# BhojanOS Shared AI Platform — Phase 3

Status: **consumer read-only hooks/contracts only — UI not mounted; flags OFF**

## Scope

| Deliverable | Location |
| --- | --- |
| Narrow client contract `ConsumerAssistResult` schema `3.0` | `orderbhojan/src/features/assistant/types.ts` |
| Flag-gated `runConsumerAssist` / `useConsumerAssist` | `application/` + `hooks/` |
| Zero-retry HTTP client → `/api/ai/v1/assist` | `infrastructure/assistantApiClient.ts` |
| Client hint sanitizer (strip cart/order plans) | `domain/readOnlyPolicy.ts` |
| Server read-only consumer sanitize | `evaluateAssistSafety({ readOnlyConsumer: true })` |

## Explicitly out of scope

- Visible UI / MarketplaceLayout mount
- Cart mutations, checkout, order placement
- Auto-execution of `suggestedHints`
- Marketing assistant UI
- Enabling `FF_OB_AI_ASSISTANT` or `AI_GATEWAY_ENABLED` by default

## Client contract (stable)

```ts
{
  schemaVersion: '3.0',
  conversationId, channel, reply, intent,
  safetyBlocked,
  suggestedHints: [{ type: 'none' | 'navigate' | 'open_url', target?: string }],
  sideEffects: [],
  mutatedState: false
}
```

Callers must not wire hints to cart/checkout APIs.

## Flag / network behavior

| Condition | Behavior |
| --- | --- |
| `FF_OB_AI_ASSISTANT=false` (default) | `AI_FEATURE_DISABLED`; **no HTTP** |
| Gateway disabled | `AI_UNAVAILABLE` / 503 |
| HTTP 429 | `AI_RATE_LIMITED`, `retryable: true`, **no automatic retry loop** (`retryAttempts: 0`) |

## Rollback

1. Keep flags OFF (default)
2. Or delete/stop importing `features/assistant` — no layout references exist
3. Server read-only sanitize is additive and safe when gateway is off

## Next

Phase 4: safe cart **action planning** + validation (still no blind execution) — see [PHASE-4.md](./PHASE-4.md).
