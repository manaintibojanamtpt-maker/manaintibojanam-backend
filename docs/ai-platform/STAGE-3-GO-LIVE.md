# Go Live Stage 3 — OrderBhojan consumer assist (25%)

**Status:** **Stage 3 live exposure enabled**  
**Approval source:** Human release owner · Stage target **3 (25%)** only · **No auto-promote** · **No further consecutive promotions in this cycle**  
**Verified live (UTC):** `2026-07-25T06:09:25Z`  
**Soak window start (UTC):** `2026-07-25T06:04:12.596Z` · **duration:** 12 hours minimum · **ends:** `2026-07-25T18:04:12.596Z`  
**Rollback owner:** engineering lead / release owner on duty  

### Post-apply

- `AI_CANARY_MANUAL_APPROVAL_GRANTED=false` confirmed at verify.  
- `AI_CANARY_ROLLOUT_STAGE_SET_AT=2026-07-25T06:04:12.596Z` confirmed.

### Advisory notes at verify

- `healthOk=true`, halt/rollback not recommended.  
- Advisory promotion blockers remain: `MANUAL_APPROVAL_REQUIRED`, `SHADOW_SAMPLES_INSUFFICIENT`, `MIN_SOAK_NOT_MET` (expected until soak + next human approval + shadow replay).  
- In-bucket probes reached assist path; free-model `AI_PROVIDER_ERROR` empty-completions observed — not canary routing failures.

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
| Stage | `currentStage=3`, `percent=25`, `Expanded 25%` |
| Wired | `wiredIntoAssist=true`, canary enabled |
| Sample decision | bucket 14 → `IN_BUCKET` / allowed (expected at 25%) |
| Routing out-of-bucket | `403 AI_CANARY_EXCLUDED` |
| Routing in-bucket | Assist path reached (provider empty-completion `502` on probes) |
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

1. `AI_CANARY_ROLLOUT_STAGE=2` (return to 5%) **or** `1` / `0` / `AI_CANARY_ROLLOUT_ENABLED=false`  
2. Optionally darken client with `VITE_FF_OB_AI_ASSISTANT=false` + rebuild  
3. `AI_GATEWAY_ENABLED=false` only if full AI off required  

## Next

Hold Stage 3 until **`2026-07-25T18:04:12.596Z`** (12h), then open a **new** Stage 4 (50%) approval cycle. Do not widen further in this cycle.
