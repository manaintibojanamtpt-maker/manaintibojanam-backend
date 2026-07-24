# BhojanOS Shared AI Platform — Phase 23

Status: **Offline eval harness + versioned golden review set**

## Scope

| Deliverable | Location |
| --- | --- |
| Config | `backend-lib/ai/aiEvalConfig.ts` |
| Harness | `backend-lib/ai/eval/runGoldenEval.ts` |
| Runners | `backend-lib/ai/eval/runners/*` |
| Golden set v1 | `backend-lib/ai/eval/fixtures/v1/*.json` |
| Docs | `backend-lib/ai/eval/README.md`, this file |

## Categories covered

- **assistant** — intent + structured-output + safety  
- **validation** — cart-plan-parse (offline, no Firestore)  
- **clarification** — missing restaurant / empty actions questions  
- **triage** — cancel / refund / payment-issue guidance (non-executing)  
- **personalization** — reorder/favorites classify + non-executable cart plans  

## Behavior

1. Deterministic fixtures (`schemaVersion: 23.0`, `fixtureSetVersion: 1`)  
2. No OpenRouter / no live LLM scoring  
3. No cart or order mutations (`mutatedState: false` on reports)  
4. npm script always runnable; optional `AI_EVAL_HARNESS_ENABLED` for external CI gating  

## Run (pre-canary)

```bash
npm run test:ai:golden
```

Run before raising `AI_CANARY_ROLLOUT_STAGE` or wiring canary assist.

## Explicitly out of scope

- Live model quality scoring  
- Enabling gateway / canary / client AI flags by default  
- UX changes  
- Auto-promoting canary from eval scores  

## Rollback

Leave harness unused; remove npm script or ignore CI job. Fixtures are read-only.

## Next

Phase 24: shadow traffic validation — see `PHASE-24.md`.
