# BhojanOS Shared AI Platform

Approved architecture for OrderBhojan + bhojanos.com, served by a single Render gateway under `backend-lib/ai/`.

## Status

Phases **1–25** are implemented. Features stay **dark by default**. Live Stage 1 exposure (ops) is documented in [STAGE-1-GO-LIVE.md](./STAGE-1-GO-LIVE.md) and is separate from this code adoption gate.

## Invariants

- No frontend OpenRouter; all LLM traffic via `/api/ai/v1/*`
- `AI_GATEWAY_ENABLED=true` required explicitly (API key alone is insufficient)
- All `VITE_FF_OB_AI_*` / marketing AI flags default **OFF**
- No blind cart/checkout/payment/refund/cancel execution
- Canary never auto-promotes; human approval + manual env stage change only
- Legacy `POST /api/ai/chat` intentionally retained (not replaced by this platform)

## Phase index

| Phase | Doc | Focus |
| --- | --- | --- |
| 1 | [PHASE-1.md](./PHASE-1.md) | Gateway scaffold |
| 2 | [PHASE-2.md](./PHASE-2.md) | Contracts, safety, audit |
| 3 | [PHASE-3.md](./PHASE-3.md) | Consumer client hooks |
| 4 | [PHASE-4.md](./PHASE-4.md) | Cart-plan validate |
| 5–6 | [PHASE-5.md](./PHASE-5.md), [PHASE-6.md](./PHASE-6.md) | Android / voice turns |
| 7–8 | [PHASE-7.md](./PHASE-7.md), [PHASE-8.md](./PHASE-8.md) | Marketing assistant |
| 9 | [PHASE-9.md](./PHASE-9.md) | Observability |
| 10 | [PHASE-10.md](./PHASE-10.md) | Post-order hooks |
| 11–13 | [PHASE-11.md](./PHASE-11.md)–[PHASE-13.md](./PHASE-13.md) | Canary policy + assist gate |
| 12 / 22 | [PHASE-12.md](./PHASE-12.md), [PHASE-22.md](./PHASE-22.md) | Ops / audit UI (read-only) |
| 14–19 | [PHASE-14.md](./PHASE-14.md)–[PHASE-19.md](./PHASE-19.md) | Consumer UI surfaces |
| 20 | [PHASE-20.md](./PHASE-20.md) | Client canary headers |
| 21 | [PHASE-21.md](./PHASE-21.md) | Durable audit persistence |
| 23–24 | [PHASE-23.md](./PHASE-23.md), [PHASE-24.md](./PHASE-24.md) | Golden eval + shadow |
| 25 | [PHASE-25.md](./PHASE-25.md) | Advisory live canary gates |

## Validation

```bash
npm run gate:ai-platform
```

This runs default/safety verification, AI-scoped typecheck, AI unit suites (root + OrderBhojan), server build, and OrderBhojan assistant eslint/tsc. It does **not** deploy or widen canary.
