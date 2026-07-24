# BhojanOS Shared AI Platform — Phase 19

Status: **Personalized reorder / favorites guidance — reviewable cart plans with availability checks, substitutions, and explicit confirmation**

## Scope

| Deliverable | Location |
| --- | --- |
| Intent detection | `isPersonalizationUserMessage.ts` |
| Client cart plans from reorder DTO | `buildPersonalizationCartPlans.ts` |
| Favorites / missing-data guidance | `buildPersonalizationGuidance.ts` |
| Caller-owned bootstrap + cache sync | `personalizationBootstrapStore.ts`, `PersonalizationBootstrapSync.tsx` |
| Tracking reorder publish | `OrderBhojanTrackingPage.tsx` |
| Conversation wiring | `useAssistantConversation.ts` (before post-order path) |
| Restaurant context before apply | `ensureRestaurantContextForCartPlan.ts` |

## Dual flags

| Flag | Default | Role |
| --- | --- | --- |
| `FF_OB_AI_ASSISTANT` | OFF | Assistant UI |
| `FF_OB_AI_PERSONALIZATION` | OFF | Reorder / usuals / favorites guidance |

## Flow

1. Detect reorder / usual / favorites intent  
2. If tracking published real reorder items → build `cart_add_plan` actions (non-executable)  
3. Validate via existing cart-plan path (Phase 15 availability + clarification)  
4. User reviews confirm bar → Confirm applies; Discard mutates nothing  
5. Favorites without dish data → navigate-only guidance (no invented items)  

## Safety invariants

- No auto-apply; no blind cart fill like tracking “Reorder” button  
- No dish inventing when favorites/orders lack line items  
- Substitutions / multi-variant → `needs_clarification`  
- Payment / cancel / refund remain out of scope  

## Explicitly out of scope

- Favorite dishes API  
- Replacing the human tracking reorder button  
- Enabling flags by default  

## Enable

```env
VITE_FF_OB_AI_ASSISTANT=true
VITE_FF_OB_AI_PERSONALIZATION=true
```

## Rollback

Keep `VITE_FF_OB_AI_PERSONALIZATION=false`.

## Next

Phase 20: client canary headers + slice observability — see `PHASE-20.md`.
