# Pricing Projection Rollout Domain (M8 PR-12)

Pure domain policy for staged pricing projection rollout.

## Modules

- `RolloutStage` — stages 0–5 (0%, 1%, 5%, 25%, 50%, 100%)
- `RolloutPolicy` — promotion, rollback, and routing evaluation
- `RolloutDecision` — decision types
- `RolloutHealth` — health snapshot signals
- `RolloutThresholds` — parity, fallback, latency, telemetry thresholds
- `RolloutMetadata` — module identity and reason constants

Policy only. No SDK, Firestore, or runtime imports.

**STOP.** Await ARB approval before M8 PR-13.
