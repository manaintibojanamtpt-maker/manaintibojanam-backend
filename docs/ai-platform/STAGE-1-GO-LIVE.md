# Go Live Stage 1 — OrderBhojan consumer assist (controlled)

**Status:** **Stage 1 live exposure enabled**  
**Approval source:** Release orchestrator session (human) · Stage target **1 (1%)** only · **No auto-promote**  
**Soak window start (UTC):** `2026-07-24T17:42:54.636Z` · **duration:** 24 hours · **ends:** `2026-07-25T17:42:54.636Z`  
**Rollback owner:** engineering lead / release owner on duty  
**Shadow evidence (UI OFF probes):** 20 AI events · 12 `AI_CANARY_EXCLUDED` · 2 provider empty-completion · ≥2 successful in-bucket assists (`search_menu`)  
**OrderBhojan UI:** redeployed with `FF_OB_AI_ASSISTANT` + `FF_OB_AI_CANARY_HEADERS` only  

### Post-enable reminder
Clear on Render after confirmation: `AI_CANARY_MANUAL_APPROVAL_GRANTED=false` 

## Approved surface

- OrderBhojan consumer **read-only assist**
- **Validated cart-plan proposals** (confirm-to-apply only; no blind execution)

## Explicitly OFF (Stage 1)

- Voice / TTS  
- Post-order UI  
- Personalization  
- Marketing assistant (bhojanos.com)  
- High-risk triage UI  

## Sequence (E)

1. **Human** sets Render vars (block below). UI remains OFF.  
2. **Shadow-capture soak** with gateway ON — generate/compare shadow samples (UI still OFF).  
3. **Rebuild + Firebase redeploy** OrderBhojan with assistant + canary headers only.  
4. Confirm Stage 1 · start 24h soak · watch health / errors / latency / drift.  

## Render env (set manually)

Use this exact block (update `AI_CANARY_ROLLOUT_STAGE_SET_AT` to the UTC time you apply):

```env
AI_GATEWAY_ENABLED=true
AI_CANARY_WIRED_INTO_ASSIST=true
AI_CANARY_ROLLOUT_ENABLED=true
AI_CANARY_ROLLOUT_STAGE=1
AI_CANARY_ROLLOUT_STAGE_SET_AT=REPLACE_WITH_UTC_ISO
AI_CANARY_LIVE_ROLLOUT_GATES_ENABLED=true
AI_CANARY_MANUAL_APPROVAL_GRANTED=true
AI_CANARY_GOLDEN_PRECHECK_PASSED=true
AI_AUDIT_PERSISTENCE_ENABLED=true
AI_SHADOW_TRAFFIC_ENABLED=true
```

After Stage 1 is confirmed live, clear:

```env
AI_CANARY_MANUAL_APPROVAL_GRANTED=false
```

## OrderBhojan build flags (after shadow evidence)

```env
VITE_FF_OB_AI_ASSISTANT=true
VITE_FF_OB_AI_CANARY_HEADERS=true
VITE_FF_OB_AI_VOICE=false
VITE_FF_OB_AI_VOICE_TTS=false
VITE_FF_OB_AI_POST_ORDER=false
VITE_FF_OB_AI_PERSONALIZATION=false
```

## Rollback (flag-first)

1. `VITE_FF_OB_AI_ASSISTANT=false` → rebuild/redeploy OrderBhojan **or**  
2. `AI_CANARY_ROLLOUT_STAGE=0` / `AI_CANARY_ROLLOUT_ENABLED=false`  
3. `AI_GATEWAY_ENABLED=false`  
4. Deploy rollback only if flag rollback insufficient  

## Verify

```bash
curl -s https://manaintibojanam-backend.onrender.com/api/ai/v1/status
# expect: enabled=true, ready=true, rollout.currentStage=1, wiredIntoAssist=true
node scripts/smoke-ops-health.mjs
```
