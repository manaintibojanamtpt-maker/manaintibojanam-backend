# Projection Read Rollout Domain (M6 PR-12)

Pure domain for controlled projection read rollout policy. **No SDK imports. No Firestore.**

## Stages

0 (Legacy) → 1% → 5% → 25% → 50% → 100%

Manual promotion only. Automatic rollback on health breach.

**STOP.** Infrastructure only — not wired to OrderSDK or adapter.
