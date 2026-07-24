# BhojanOS Shared AI Platform — Phase 25

Status: **Approved — advisory live canary rollout gates (no auto-promote)**

## Scope

| Deliverable | Location |
| --- | --- |
| Stages (0/1/5/25/50/100%) | `rollout/aiRolloutStages.ts` |
| Live gate thresholds | `rollout/aiRolloutThresholds.ts` |
| Golden / shadow prechecks | `rollout/aiRolloutPrechecks.ts` |
| Promotion / halt / rollback | `rollout/aiRolloutPolicy.ts` |
| Snapshot schema `25.0` | `rollout/aiRolloutContracts.ts` |
| Last shadow/golden memory | `shadow/lastShadowCompareStore.ts`, `eval/lastGoldenEvalStore.ts` |
| Ops UI (read-only) | `AiOpsPanel` live-gates subsection |

## Stages

| Stage | Percent | Label |
| --- | --- | --- |
| 0 | 0% | Off |
| 1 | 1% | Canary |
| 2 | 5% | Pilot |
| 3 | 25% | Expanded |
| 4 | 50% | Majority |
| 5 | 100% | Full |

## Approval condition (safety boundary)

Rollout gates are **advisory by default**. Actual stage advancement always requires:

1. Explicit human approval (`AI_CANARY_MANUAL_APPROVAL_GRANTED=true` for the gate check)
2. Manual env/config change of `AI_CANARY_ROLLOUT_STAGE` (and `AI_CANARY_ROLLOUT_STAGE_SET_AT`)
3. Auditability via snapshot `advancement` (`autoPromote: false`, `method: 'manual_env'`, approval + soak timestamp) plus your deployment/config change history

Gates **never** mutate stage. Ops UI has no promote controls.

## Promotion criteria (all required; advisory only)

1. `AI_CANARY_LIVE_ROLLOUT_GATES_ENABLED=true`
2. `AI_CANARY_ROLLOUT_ENABLED=true` and `AI_CANARY_WIRED_INTO_ASSIST=true`
3. `AI_CANARY_MANUAL_APPROVAL_GRANTED=true`
4. Gateway ready (`AI_GATEWAY_ENABLED` + API key)
5. Routing health OK (Phase 13 gates)
6. Halt not recommended; rollback not required
7. Golden precheck pass (`AI_CANARY_GOLDEN_PRECHECK_PASSED=true` or last golden report)
8. Shadow compare pass (last replay report; min samples / max drift)
9. Soak met when stage > 0 (`AI_CANARY_ROLLOUT_STAGE_SET_AT` + `AI_CANARY_ROLLOUT_MIN_SOAK_HOURS`)

When `promotion.allowed` is true, a human still must apply the stage env change.

## Halt conditions

Recommend freeze (do not widen) when halt-threshold health fails or canary error-code rate exceeds max.

## Rollback triggers

Recommend lower stage (or stage 0 on health breach) when rollback-threshold health fails or shadow drift exceeds max. Human applies the lower stage manually.

## Defaults (safe)

```env
# AI_CANARY_LIVE_ROLLOUT_GATES_ENABLED=false
# AI_CANARY_MANUAL_APPROVAL_GRANTED=false
# AI_CANARY_ROLLOUT_ENABLED=false
# AI_CANARY_ROLLOUT_STAGE=0
# AI_CANARY_WIRED_INTO_ASSIST=false
```

## Workflow (shadow → live)

```bash
npm run test:ai:golden
# staging: AI_SHADOW_TRAFFIC_ENABLED=true → capture → SystemHealth shadow replay
# optional: AI_CANARY_GOLDEN_PRECHECK_PASSED=true after CI
# AI_CANARY_LIVE_ROLLOUT_GATES_ENABLED=true → inspect status/ops promotion.allowed
# human approval → set AI_CANARY_MANUAL_APPROVAL_GRANTED=true
# manually set AI_CANARY_ROLLOUT_STAGE (+ STAGE_SET_AT); record change in deploy notes
# clear AI_CANARY_MANUAL_APPROVAL_GRANTED after the stage change
```

## Explicitly out of scope

- Auto-promote / auto-rollback mutating env or stage stores
- Changing Phase 13 assist-gate semantics when live gates flag is OFF
- Enabling canary/shadow/gateway by default
- Blind cart/checkout or refund/cancel execution
- Durable stage-change audit collection (optional follow-on)

## Verification

```bash
npm run test:ai:canary-gates
npm run test:ai:golden
npm run test:ai:shadow
```

## Rollback of this phase

Unset `AI_CANARY_LIVE_ROLLOUT_GATES_ENABLED` (or set `false`). Advisory UI/snapshot fields idle; assist gating unchanged.

## Next

Stop for approval before any live exposure expansion (raising stage above 0 / wiring assist canary in production).
