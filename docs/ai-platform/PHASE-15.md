# BhojanOS Shared AI Platform — Phase 15

Status: **Richer menu-item resolution for incomplete cart plans — clarification-first; canonical IDs; non-executable until confirm**

## Scope

| Deliverable | Location |
| --- | --- |
| Restaurant-scoped menu resolver | `backend-lib/marketplace/resolveMenuItemReference.ts` |
| Validate path uses resolver + payload enrichment | `backend-lib/ai/validateCartActionPlan.ts` |
| Plan payload fields (`foodId`, variants, restaurantId, price) | `backend-lib/ai/cartActionPlan.ts` |
| Ambiguous name fallback no longer silent-picks | `backend-lib/marketplace/projectCartValidation.ts` |
| Client schema `4.0 \| 5.0` + clarification UI | `cartPlanContract.ts`, `ConsumerAssistantSheet.tsx` |

## Resolution rules

1. **ID path** (`itemId` / `foodId` / `menuItemId`) → direct lookup  
2. **Exact normalized name** → 1 match resolves; N>1 clarifies with candidate ids  
3. **Fuzzy (restaurant-scoped)** → high confidence + gap resolves; ties/near-ties clarify  
4. **Multi-variant** without `variantId`/label → clarify; single variant auto-selects  
5. **Non-empty `modifiers[]`** → still clarification (no auto-infer)  
6. After resolve → `validateMarketplaceCart` and merge live `foodId` / `name` / `unitPrice` / `restaurantId` / variant into plan payload  

## Safety invariants

- `executable: false`, `requiresConfirmation: true`, `mutatedState: false` on every validate response  
- Confirm UI remains disabled unless `status === 'validated'`  
- Flags stay OFF by default (`FF_OB_AI_ASSISTANT`, `AI_GATEWAY_ENABLED`)

## Schema

- Cart plan validate `schemaVersion`: **5.0**  
- Gateway status `phase`: **15** (`menuItemResolution: true`)

## Explicitly out of scope

- Enabling AI flags by default  
- Auto-apply / blind cart mutation  
- Modifier auto-selection  
- Voice / post-order UI changes  

## Rollback

1. Keep gateway disabled, or  
2. Revert `validateCartActionPlan` / resolver wiring; clients still treat plans as non-executable  

## Next

Optional: voice UI, post-order UI, canary-assisted production rollout — separate approval.
