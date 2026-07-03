# Pricing Projection Domain — M8 PR-6

Pure domain models for pricing projection infrastructure. **No read models, no business payloads, no infrastructure imports.**

## Models

- **Checkpoint** — cursor metadata (`eventId`, `sequence`, `consumerGroup`)
- **Snapshot** — snapshot metadata with embedded checkpoint reference
- **Execution** — execution lifecycle record with optional errors
- **Plan** — execution plan from identity + execution id

## Version

`0.1.0-foundation`

**STOP — business projections require ARB approval.**
