# BhojanOS Shared AI Platform — Phase 16

Status: **OrderBhojan consumer assistant voice UI — click-to-speak STT into existing ask → validate → confirm flow**

## Scope

| Deliverable | Location |
| --- | --- |
| Click-to-speak mic in assistant sheet | `ConsumerAssistantSheet.tsx` |
| STT → existing `send()` path | `useAssistantConversation.ts` (`sendFromVoice`) |
| Optional spoken reply | `speakVoiceConfirmation` when `FF_OB_AI_VOICE_TTS` |
| Dual flag gate | Assistant UI + `FF_OB_AI_VOICE` |

## Flow

1. User taps mic (only when `FF_OB_AI_ASSISTANT` + `FF_OB_AI_VOICE` + Speech API available)  
2. Capture **one** utterance (`continuous: false`) — no background listening  
3. Transcript → `send()` → assist → optional cart validate (Phase 15 resolution)  
4. Confirm remains **tap-only** on validated plans — voice never applies cart / checkout  

## Flags

| Flag | Default | Role |
| --- | --- | --- |
| `FF_OB_AI_ASSISTANT` | OFF | Sheet / FAB |
| `FF_OB_AI_VOICE` | OFF | Mic button + STT |
| `FF_OB_AI_VOICE_TTS` | OFF | Speak assistant reply after voice send |

## Explicitly out of scope

- Auto-apply / confirm-by-voice / checkout-by-voice  
- Background / continuous listening / wake word  
- Wiring `runVoiceOrderingTurn` into the sheet (would bypass validate UI)  
- Enabling flags by default  

## Rollback

1. Keep `VITE_FF_OB_AI_VOICE=false` (mic hidden)  
2. Or keep `VITE_FF_OB_AI_ASSISTANT=false` (entire UI off)

## Next

Optional: post-order UI; production canary — separate approval.
