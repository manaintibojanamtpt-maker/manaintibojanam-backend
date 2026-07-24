# BhojanOS Shared AI Platform — Phase 5

Status: **Android channel parity + voice hooks (no UI) — flags OFF by default**

## Scope delivered

| Item | Detail |
| --- | --- |
| Android channel parity | `resolveConsumerAssistChannel()` → `orderbhojan_android` on Capacitor native |
| Same consumer contracts as web | assist + cart-plan validate clients unchanged in behavior |
| Voice hooks | Web Speech API capture → transcript → `runConsumerAssist` |
| Flags | `FF_OB_AI_ASSISTANT`, `FF_OB_AI_VOICE` both default **false** |

## Explicitly out of scope

- Visible chat / mic UI / MarketplaceLayout mount
- Cart mutation, checkout, order placement, payments
- Blind execution of proposed actions
- TTS playback UI (Phase 6+)
- Enabling any AI flags by default

## Voice flow (hooks only)

```
useVoiceConsumerAssist / runVoiceConsumerAssist
  → require FF_OB_AI_ASSISTANT + FF_OB_AI_VOICE
  → captureVoiceTranscript (Web Speech API; injectable for tests)
  → POST /api/ai/v1/assist (existing gateway; channel web|android)
  → ConsumerAssistResult (sideEffects: [], mutatedState: false)
```

If SpeechRecognition is unavailable → `AI_VOICE_UNSUPPORTED` (no fake transcript).

## Flags

| Flag | Default | Effect |
| --- | --- | --- |
| `VITE_FF_OB_AI_ASSISTANT` | `false` | Gates all assist / cart-plan validate network |
| `VITE_FF_OB_AI_VOICE` | `false` | Gates mic capture; no recognition start when OFF |

## Rollback

1. Keep both flags OFF (default)
2. Or remove `voiceSpeechCapture` / `runVoiceConsumerAssist` exports — no layout references
3. Gateway remains usable without voice

## Verification notes

- Flag OFF ⇒ no mic factory call, no assist HTTP
- Android channel unit-tested via injectable `isNative`
- No cart/checkout imports in Phase 5 assistant sources

## Next

Phase 6: voice ordering turn (STT → intent → optional TTS) — see `PHASE-6.md`.
