# Go Live Stage 5 — OrderBhojan consumer assist (100%)

**Status:** **Stage 5 live exposure enabled**  
**Approval source:** Human release owner · Stage target **5 (100%)** · **No auto-promote** · **Terminal stage on ladder**  
**Verified live (UTC):** `2026-07-25T08:44:41Z`  
**Soak / watch window start (UTC):** `2026-07-25T08:28:36.847Z` · **duration:** 24 hours recommended · **ends:** `2026-07-26T08:28:36.847Z`  
**Rollback owner:** engineering lead / release owner on duty  
**API build observed:** `03d663a`

### Post-apply

- `AI_CANARY_MANUAL_APPROVAL_GRANTED=false` confirmed at verify.  
- `AI_CANARY_ROLLOUT_STAGE_SET_AT=2026-07-25T08:28:36.847Z` confirmed.

### Critical follow-up (user-visible)

Browser assist from `orderbhojan.web.app` is **blocked by CORS** until Render deploys the allowlist fix for `x-ai-canary-key` (`backend-lib/shared/corsPolicy.ts`).  

Live OPTIONS preflight at verify still returned:

`Access-Control-Allow-Headers: Content-Type,Authorization,...,X-Requested-With`  
(**missing** `x-ai-canary-key`)

Code fix is in the working tree; **requires Render API deploy** (no client rebuild needed for CORS).

## Approved surface (unchanged)

- OrderBhojan consumer **read-only assist**
- **Validated cart-plan proposals** (confirm-to-apply only)

## Explicitly OFF (unchanged)

- Voice / TTS  
- Post-order UI  
- Personalization  
- Marketing assistant  
- High-risk triage UI  

## Live verify results

| Check | Result |
| --- | --- |
| Gateway ready | `ready=true`, `enabled=true` |
| Stage | `currentStage=5`, `percent=100`, `Full 100%` |
| Wired | `wiredIntoAssist=true`, canary enabled |
| Sample decision | bucket 14 → `IN_BUCKET` / allowed |
| UI scope | Assistant + canary headers ON; voice/TTS/post-order/personalization OFF |
| Approval latch | `manualApprovalGranted=false` |
| Browser CORS for canary header | **FAIL on live** until CORS fix deploy |

## Client flags — no change

```env
VITE_FF_OB_AI_ASSISTANT=true
VITE_FF_OB_AI_CANARY_HEADERS=true
VITE_FF_OB_AI_VOICE=false
VITE_FF_OB_AI_VOICE_TTS=false
VITE_FF_OB_AI_POST_ORDER=false
VITE_FF_OB_AI_PERSONALIZATION=false
```

## Rollback (flag-first)

1. `AI_CANARY_ROLLOUT_STAGE=4` (return to 50%) **or** lower / `AI_CANARY_ROLLOUT_ENABLED=false`  
2. Optionally darken client with `VITE_FF_OB_AI_ASSISTANT=false` + rebuild  
3. `AI_GATEWAY_ENABLED=false` only if full AI off required  

## Next

1. Deploy CORS fix to Render (required for browser assistant).  
2. Re-check OPTIONS includes `x-ai-canary-key`.  
3. Smoke assist from `orderbhojan.web.app`.  
4. Hold 24h watch; do **not** enable other AI surfaces without separate approval.
