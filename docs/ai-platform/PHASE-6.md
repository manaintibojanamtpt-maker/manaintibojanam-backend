# BhojanOS Shared AI Platform — Phase 6

Status: **voice ordering turn hooks (STT → structured intent → optional TTS) — no UI; flags OFF**

## Scope delivered

| Step | Implementation |
| --- | --- |
| Speech-to-text | Existing `captureVoiceTranscript` (Web Speech API) |
| Transcript → structured intent | Gateway assist → `intent` + `reply` on `VoiceOrderingTurnResult` |
| Optional TTS confirmation | `speakVoiceConfirmation` when `FF_OB_AI_VOICE_TTS=true` |
| Orchestration | `runVoiceOrderingTurn` / `useVoiceOrderingTurn` |

## Explicitly out of scope

- Visible mic/chat UI / MarketplaceLayout
- Cart mutation, checkout, order placement, payments
- Blind execution of plans / hints
- Enabling AI flags by default

## Flags

| Flag | Default | Role |
| --- | --- | --- |
| `FF_OB_AI_ASSISTANT` | OFF | Assist network |
| `FF_OB_AI_VOICE` | OFF | Mic / STT |
| `FF_OB_AI_VOICE_TTS` | OFF | Speak reply confirmation |

## Contract (`schemaVersion: 6.0`)

```ts
{
  transcript, intent, reply, channel, conversationId,
  safetyBlocked, needsClarification, confirmationSpoken,
  sideEffects: [], mutatedState: false
}
```

## Rollback

1. Keep all three flags OFF  
2. Or stop exporting `useVoiceOrderingTurn` — no layout references  
3. Gateway unchanged for non-voice clients  

## Next

Phase 7: merchant_marketing read-only hooks/contracts for bhojanos.com — see [PHASE-7.md](./PHASE-7.md).
