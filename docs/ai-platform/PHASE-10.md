# BhojanOS Shared AI Platform — Phase 10

Status: **post-order read-only assist hooks/contracts — UI not mounted; flags OFF**

## Scope

| Deliverable | Location |
| --- | --- |
| Server context parse + prompt addon | `backend-lib/ai/postOrderAssistContracts.ts` |
| Gateway uses optional `context` on `/assist` | `registerAiGatewayRoutes.ts` |
| Client contract `PostOrderAssistResult` `10.0` | `orderbhojan/.../domain/postOrderAssistContract.ts` |
| Flag-gated `runPostOrderAssist` / `usePostOrderAssist` | `application/` + `hooks/` |
| Hint policy (orders paths only) | `domain/postOrderPolicy.ts` |
| Flag `FF_OB_AI_POST_ORDER` (default OFF) | `orderbhojan/src/featureFlags/flags.ts` |

## Explicitly out of scope

- Visible UI / MarketplaceLayout mount
- Auto-navigation on hints
- Auto-fetch of orders inside assistant module
- Server-side order lookups / Firestore reads for assist
- Cancel / reorder / refund / payment mutations
- Enabling AI flags by default
- Canary rollout / ops dashboard UI

## Flag / network behavior

| Condition | Behavior |
| --- | --- |
| `FF_OB_AI_ASSISTANT=false` OR `FF_OB_AI_POST_ORDER=false` (default) | `AI_FEATURE_DISABLED`; **no HTTP** |
| Both ON | `POST /api/ai/v1/assist` with optional `context.orderContext` |
| Hints | Informational navigate to `/orders` or `/orders/:id/track` only |

## Client contract (`schemaVersion: 10.0`)

```ts
{
  conversationId, channel, reply, intent,
  orderContextUsed, safetyBlocked,
  suggestedHints: [{ type: 'none' | 'navigate' | 'open_url', target? }],
  sideEffects: [], mutatedState: false
}
```

## Rollback

1. Keep both flags OFF  
2. Or stop exporting `usePostOrderAssist` — no layout references  
3. Gateway context parsing is additive and safe when unused  

## Next

Phase 11: AI canary rollout policy (not wired) — see [PHASE-11.md](./PHASE-11.md).
