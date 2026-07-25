# Go Live Stage 2 — OrderBhojan consumer assist (5%)

**Status:** **Stage 2 live exposure enabled**  
**Approval source:** Human release owner · Stage target **2 (5%)** only · **No auto-promote** · **No consecutive promotions**  
**Verified live (UTC):** `2026-07-25T05:55:54Z`  
**Soak window start (UTC):** `2026-07-25T05:55:54Z` · **duration:** 12 hours minimum · **ends:** `2026-07-25T17:55:54Z`  
**Rollback owner:** engineering lead / release owner on duty  

### Post-apply reminders (do now)

1. Clear: `AI_CANARY_MANUAL_APPROVAL_GRANTED=false` (still `true` at verify time).  
2. Prefer updating soak clock: `AI_CANARY_ROLLOUT_STAGE_SET_AT=2026-07-25T05:55:54.000Z` (live still showed prior `2026-07-24T16:29:00Z`).

### Advisory notes at verify

- `healthOk=true`, halt/rollback not recommended.  
- Advisory promotion blockers remain: `SHADOW_SAMPLES_INSUFFICIENT`, `MIN_SOAK_NOT_MET` (expected until soak + shadow replay).  
- In-bucket probe reached assist path; one `AI_PROVIDER_ERROR` empty-completion observed (free model) — not a canary routing failure.

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
| Stage | `currentStage=2`, `percent=5`, `Pilot 5%` |
| Wired | `wiredIntoAssist=true`, canary enabled |
| Routing out-of-bucket | `403 AI_CANARY_EXCLUDED` |
| Routing in-bucket | Assist path reached (`502 AI_PROVIDER_ERROR` empty completion on one probe; not excluded) |
| UI scope | Assistant + canary headers ON; voice/TTS/post-order/personalization OFF |

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

1. `AI_CANARY_ROLLOUT_STAGE=1` (return to 1%) **or** `AI_CANARY_ROLLOUT_STAGE=0` / `AI_CANARY_ROLLOUT_ENABLED=false`  
2. Optionally `VITE_FF_OB_AI_ASSISTANT=false` + rebuild if client must go dark  
3. `AI_GATEWAY_ENABLED=false` only if full AI off required  

## Next

Hold Stage 2 until **`2026-07-25T17:55:54Z`** (12h), then open a **new** Stage 3 (25%) approval cycle. Do not widen further in this cycle.
