# Offline AI golden eval harness (Phase 23)

Versioned, deterministic evaluation for assistant / validation / clarification / triage / personalization flows. **No live OpenRouter. No cart mutations.**

## Run

```bash
# From repo root
npm run test:ai:golden
# or
npx tsx backend-lib/ai/eval/runGoldenEval.ts
```

## Layout

- `fixtures/v1/*.json` — golden review set (`schemaVersion: 23.0`, `fixtureSetVersion: 1`)
- `runners/` — category dispatch to pure functions
- `runGoldenEval.ts` — loader + reporter

## Categories

| Category | What it covers |
| --- | --- |
| `intent` | Heuristic intent taxonomy |
| `structured-output` | Model JSON parse + heuristic wrap |
| `safety` | Claimed side effects, place_order block, read-only strip |
| `cart-plan-parse` | Validate-path parse without Firestore |
| `clarification` | Missing restaurant / empty actions questions |
| `triage` | Cancel/refund/payment-issue guidance (non-executing) |
| `personalization` | Reorder/favorites classify + non-executable plans |

## Adding a case

1. Append to the matching fixture file under `fixtures/v1/`.
2. Keep `id` stable; bump `fixtureSetVersion` only for breaking envelope changes.
3. Prefer `$includes` / partial expects over full reply goldens.
4. Re-run `npm run test:ai:golden` before raising canary stage.

## Optional CI gate flag

```env
AI_EVAL_HARNESS_ENABLED=true
```

The npm script always runs offline; the flag is for external orchestration docs only.
