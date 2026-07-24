# BhojanOS Shared AI Platform — Phase 17

Status: **OrderBhojan post-order assistant UI — tracking / delivery / reorder shortcuts / issue triage; no payment·refund·cancel actions**

## Scope

| Deliverable | Location |
| --- | --- |
| Post-order branch in conversation | `useAssistantConversation.ts` → `usePostOrderAssist` |
| Track-route assistant mount | `MarketplaceLayout.tsx` when `FF_OB_AI_POST_ORDER` |
| Caller-owned tracking snapshot publish | `PostOrderBootstrapProvider` + `postOrderBootstrapStore` |
| Snapshot mapper (no fetch) | `mapTrackingToPostOrderContext.ts` |
| Post-order starters / copy | `ConsumerAssistantSheet.tsx` (`assistMode: post_order`) |
| Tracking page bootstrap | `OrderBhojanTrackingPage.tsx` |

## Dual flags

| Flag | Default | Role |
| --- | --- | --- |
| `FF_OB_AI_ASSISTANT` | OFF | Any assistant UI |
| `FF_OB_AI_POST_ORDER` | OFF | Post-order path + track-route mount |

## Supported UX

1. **Tracking help** — uses published snapshot / orderId; navigate hints to `/orders` or `/orders/:id/track`  
2. **Delivery-status help** — ETA / timeline facts from snapshot only (no invention)  
3. **Reorder shortcuts** — navigate-only guidance to the tracking page reorder button (never calls `useReorderFromTracking`)  
4. **Issue triage** — read-only guidance; no cancel / refund / payment execution  

## Safety invariants

- No auto-fetch of orders inside the assistant module  
- No auto-navigate on hints (user tap only)  
- No cart apply on post-order path  
- Payment / refund / cancellation remain **out of scope**  
- Voice still reuses `send()` (may hit post-order branch via heuristic)

## Explicitly out of scope

- Enabling flags by default  
- Refund / cancel / payment mutation actions  
- Auto-reorder into cart  
- Separate post-order product / FAB  

## Enable

```env
VITE_FF_OB_AI_ASSISTANT=true
VITE_FF_OB_AI_POST_ORDER=true
```

## Rollback

1. Keep `VITE_FF_OB_AI_POST_ORDER=false` (track mount + post-order path off)  
2. Or keep `VITE_FF_OB_AI_ASSISTANT=false`

## Next

Optional: production canary; payment/refund/cancel assist — **separate approval**.
