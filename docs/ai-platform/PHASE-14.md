# BhojanOS Shared AI Platform — Phase 14

Status: **OrderBhojan consumer assistant UI — flag-gated; explicit cart confirmation; no blind execution**

## Scope

| Deliverable | Location |
| --- | --- |
| Flag-gated entry (`null` when OFF) | `orderbhojan/src/features/assistant/ui/ConsumerAssistantEntry.tsx` |
| FAB + sheet chat | `ConsumerAssistantFab.tsx`, `ConsumerAssistantSheet.tsx` |
| Conversation + validate + confirm | `useAssistantConversation.ts` |
| Explicit cart apply helper | `orderbhojan/src/features/cart/domain/applyConfirmedCartPlan.ts` |
| Layout mount (chrome routes only) | `MarketplaceLayout.tsx` |
| Assist exposes non-executable `proposedCartActions` | `ConsumerAssistResult` + API client mapping |

## Explicitly out of scope

- Enabling `FF_OB_AI_ASSISTANT` by default
- Auto-apply on assist/validate response
- Voice / post-order UI in this shell
- Checkout / payment actions
- Marketing site UI changes

## Confirmation UX

1. User asks → read-only reply (+ optional plan list)  
2. If restaurant context exists → `validate()` (still no cart write)  
3. Confirm enabled **only** when `status === 'validated'`  
4. `applyConfirmedCartPlan({ userConfirmed: true, ... })` runs only on Confirm tap  
5. Discard clears pending plan with zero cart mutation  

## Flag / DOM

| Condition | Behavior |
| --- | --- |
| `FF_OB_AI_ASSISTANT=false` (default) | Entry → `null` — zero FAB/sheet DOM |
| Flag ON | FAB + sheet; network via existing hooks |
| Focus routes (`/cart`, `/checkout*`, `*/track*`) | Assistant not mounted (`showChrome`) |

## Rollback

1. Keep `VITE_FF_OB_AI_ASSISTANT=false`  
2. Or remove `<ConsumerAssistantEntry />` from `MarketplaceLayout.tsx`

## Next

Optional: richer menu-item resolution for incomplete plan payloads; voice UI; post-order UI — separate approval.
