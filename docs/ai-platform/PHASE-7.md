# BhojanOS Shared AI Platform — Phase 7

Status: **merchant marketing read-only hooks/contracts only — UI not mounted; flag OFF**

## Scope

| Deliverable | Location |
| --- | --- |
| Narrow client contract `MarketingAssistResult` schema `7.0` | `src/features/assistant/types.ts` |
| Flag-gated `runMarketingAssist` / `useMarketingAssist` | `application/` + `hooks/` |
| Zero-retry HTTP client → `/api/ai/v1/assist` (`merchant_marketing`) | `infrastructure/assistantApiClient.ts` |
| Client hint sanitizer (allow signup/demo/contact; strip cart/order) | `domain/readOnlyPolicy.ts` |
| Channel lock `bhojanos_marketing` | `domain/resolveMarketingAssistChannel.ts` |

## Explicitly out of scope

- Visible chat/mic UI in `MarketingApp.tsx` or marketing pages
- Auto-execution of `suggestedHints` (signup forms, CRM, navigation)
- Replacing legacy storefront `AIAssistant.tsx` (`/api/ai/chat`)
- Cart / checkout / owner portal mutations
- Enabling `VITE_FF_AI_MARKETING_ASSISTANT` or `AI_GATEWAY_ENABLED` by default

## Client contract (stable)

```ts
{
  schemaVersion: '7.0',
  conversationId, channel: 'bhojanos_marketing',
  reply, intent, safetyBlocked,
  suggestedHints: [{
    type: 'none' | 'navigate' | 'open_url' | 'suggest_signup' | 'suggest_demo' | 'suggest_contact',
    target?: string
  }],
  sideEffects: [],
  mutatedState: false
}
```

Callers must not wire hints to signup APIs, payments, or owner mutations.

## Flag / network behavior

| Condition | Behavior |
| --- | --- |
| `aiMarketingAssistant=false` / `VITE_FF_AI_MARKETING_ASSISTANT` unset (default) | `AI_FEATURE_DISABLED`; **no HTTP** |
| Gateway disabled | `AI_UNAVAILABLE` / 503 |
| HTTP 429 | `AI_RATE_LIMITED`, `retryable: true`, **no automatic retry loop** |

## Rollback

1. Keep `VITE_FF_AI_MARKETING_ASSISTANT=false` (default)
2. Or stop importing `src/features/assistant` — no MarketingApp references exist
3. Gateway marketing mode remains available for later UI phases

## Next

Phase 8: marketing assistant UI (flag-gated) — see [PHASE-8.md](./PHASE-8.md).
