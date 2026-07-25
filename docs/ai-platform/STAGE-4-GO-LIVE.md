# Go Live Stage 4 — OrderBhojan consumer assist (50%)

**Status:** **Stage 4 live exposure enabled**  
**Approval source:** Human release owner · Stage target **4 (50%)** only · **No auto-promote** · **No further consecutive promotions in this cycle**  
**Verified live (UTC):** `2026-07-25T06:47:26Z`  
**Soak window start (UTC):** `2026-07-25T06:13:11.384Z` · **duration:** 12 hours minimum · **ends:** `2026-07-25T18:13:11.384Z`  
**Rollback owner:** engineering lead / release owner on duty  

### Post-apply

- `AI_CANARY_MANUAL_APPROVAL_GRANTED=false` confirmed at verify.  
- `AI_CANARY_ROLLOUT_STAGE_SET_AT=2026-07-25T06:13:11.384Z` confirmed.

### Advisory notes at verify

- `healthOk=true`, halt/rollback not recommended.  
- Advisory promotion blockers remain: `MANUAL_APPROVAL_REQUIRED`, `SHADOW_SAMPLES_INSUFFICIENT`, `MIN_SOAK_NOT_MET`.  
- Multiple in-path probes hit free-model `AI_PROVIDER_ERROR` empty-completions — not canary exclusion failures; watch provider reliability during soak.

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
| Stage | `currentStage=4`, `percent=50`, `Majority 50%` |
| Wired | `wiredIntoAssist=true`, canary enabled |
| Sample decision | bucket 14 → `IN_BUCKET` / allowed (expected at 50%) |
| Routing in-path | Assist path reached for in-bucket keys (provider `502` empty completion on probes) |
| UI scope | Assistant + canary headers ON; voice/TTS/post-order/personalization OFF |
| Approval latch | `manualApprovalGranted=false` |

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

1. `AI_CANARY_ROLLOUT_STAGE=3` (return to 25%) **or** lower / `AI_CANARY_ROLLOUT_ENABLED=false`  
2. Optionally darken client with `VITE_FF_OB_AI_ASSISTANT=false` + rebuild  
3. `AI_GATEWAY_ENABLED=false` only if full AI off required  

## Next

Hold Stage 4 until **`2026-07-25T18:13:11.384Z`** (12h), then open a **new** Stage 5 (100%) approval cycle. Do not widen further in this cycle.
