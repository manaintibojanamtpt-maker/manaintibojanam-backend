# BhojanOS Shared AI Platform — Phase 4

Status: **cart action planning + backend validation only — no cart mutation, no checkout**

## Scope delivered

| Contract | Module |
| --- | --- |
| Cart plan DTO parse/normalize | `backend-lib/ai/cartActionPlan.ts` |
| Firestore validation (read-only) | `backend-lib/ai/validateCartActionPlan.ts` |
| Cart-plan safety guardrails | `evaluateCartPlanRequestSafety` in `safetyGuardrails.ts` |
| Audit events `ai.cart_plan.*` | `auditContracts.ts` |
| Validate endpoint | `POST /api/ai/v1/consumer/cart-plan/validate` |

## Explicitly not in Phase 4

- Cart mutations or order placement
- Coupon / address / payment changes
- Checkout integration
- Visible UI / MarketplaceLayout mount / applying plans to cart
- Phase 5 work
- Enabling `AI_GATEWAY_ENABLED` or `FF_OB_AI_ASSISTANT` by default

## Endpoint

`POST /api/ai/v1/consumer/cart-plan/validate`

Requires `AI_GATEWAY_ENABLED=true` (same gate as assist). Requires Firestore `db` passed to `registerAiGatewayRoutes(app, { log, db })`.

### Request (schema `4.0`)

```json
{
  "mode": "consumer_ordering",
  "channel": "orderbhojan_web",
  "restaurantId": "tenant_1",
  "orderType": "pickup",
  "contextToken": "optional",
  "conversationId": "optional",
  "proposedActions": [
    {
      "type": "cart_add_plan",
      "requiresConfirmation": true,
      "executable": false,
      "payload": { "itemId": "menu_item_id", "quantity": 1 }
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "schemaVersion": "4.0",
  "status": "validated",
  "plans": [{ "type": "cart_add_plan", "executable": false, "requiresConfirmation": true }],
  "sideEffects": [],
  "mutatedState": false
}
```

Status values:

| Status | Meaning |
| --- | --- |
| `validated` | Plans reference live menu items; quote checks passed where applicable |
| `needs_clarification` | Missing/ambiguous restaurant, item, quantity, or modifiers — server never guesses |
| `invalid` | Hard failures (`place_order`, restaurant not found, item NOT_FOUND / UNAVAILABLE) |

`place_order` is always rejected.

## No-mutation guarantee

1. **Read-only Firestore access** — uses `validateMarketplaceCart` for quote/menu checks only; no cart or order writes.
2. **Plans stay non-executable** — all returned plans have `executable: false` and `requiresConfirmation: true`.
3. **Response contract** — `sideEffects: []` and `mutatedState: false` on every response.
4. **Safety guardrails** — `place_order` blocked; `executable: true` rejected; mode/channel policy enforced.
5. **No checkout imports** — validation module does not call place-order or cart-update APIs.

## Audit events

| Event | When |
| --- | --- |
| `ai.cart_plan.request` | Validate request received |
| `ai.cart_plan.response` | Validated or needs clarification |
| `ai.cart_plan.invalid` | Invalid plan set |
| `ai.cart_plan.blocked` | Safety guardrail block |
| `ai.cart_plan.disabled` | Gateway disabled |

All events include `mutatedState: false` and `phase: 4`.

## Server wiring

```ts
registerAiGatewayRoutes(app, { log: logger, db }); // lazy Firestore proxy
```

## OrderBhojan client (hooks/contracts only)

| Piece | Path |
| --- | --- |
| Contract | `orderbhojan/src/features/assistant/domain/cartPlanContract.ts` |
| Flag gate | `application/runValidateCartPlan.ts` |
| HTTP (`retryAttempts: 0`) | `infrastructure/assistantApiClient.ts` → `validateCartPlan()` |
| Hook | `hooks/useValidateCartPlan.ts` |

When `FF_OB_AI_ASSISTANT=false`: `AI_FEATURE_DISABLED`, **no HTTP**.  
Client never imports cart/checkout and never applies `proposedActions`.

## Rollback

1. Keep `AI_GATEWAY_ENABLED=false` and `VITE_FF_OB_AI_ASSISTANT=false` (defaults)
2. Or remove the cart-plan route handler from `registerAiGatewayRoutes.ts`
3. No DB migrations; no layout/UI wiring to undo

## Next

Phase 5: Android channel parity + voice hooks — see `PHASE-5.md`.
