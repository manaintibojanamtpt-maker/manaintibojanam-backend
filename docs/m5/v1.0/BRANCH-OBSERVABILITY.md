# Branch Observability v1.0

**Status:** Documented — M5 PR-15  
**Date:** 2026-06-26

---

## 1. Observability layers

```
User action (checkout / owner UI)
    │
    ├── CheckoutBranchTelemetry (checkout in-memory)
    │
    ├── OwnerBranchTelemetry (owner in-memory)
    │
    ├── BranchTelemetry (facade in-memory)
    │
    └── BranchSDK / OperationsSDK
            ├── BranchOperationsTelemetry
            ├── Assignment engine timing (tests + injectable)
            └── SdkResult metadata (error codes, correlationId)
```

No production Datadog dashboards configured in v1.0. Hooks are injectable for future wiring.

---

## 2. BranchFacade telemetry

**Module:** `src/lib/branch/BranchTelemetry.ts`

| Event | Trigger |
|-------|---------|
| Request start | Facade operation invoked |
| Success | SDK returned ok |
| Failure | SDK error mapped |
| Retry | User/system retry |

**Snapshot fields:** `operation`, `attemptId`, `totalMs`, `sdkMs`, `status`

**Hook:** `setBranchTelemetryHook(listener)` via facade deps

---

## 3. Checkout branch telemetry

**Module:** `src/lib/checkout/CheckoutBranchTelemetry.ts`

| Event | Trigger |
|-------|---------|
| Assignment request | `resolveCheckoutBranch` start |
| Success | Branch assigned |
| Failure | Assignment error |
| Retry | Retry invoked |
| Legacy | Flag OFF — legacy path taken |
| Cancel | Assignment cancelled |

---

## 4. Owner branch telemetry

**Module:** `src/lib/owner-branches/OwnerBranchTelemetry.ts`

| Event | Trigger |
|-------|---------|
| `OWNER_BRANCH_REQUEST` | Operation start |
| `OWNER_BRANCH_SUCCESS` | Operation ok |
| `OWNER_BRANCH_FAILURE` | Operation error |
| `OWNER_BRANCH_RETRY` | Retry |
| `OWNER_BRANCH_DISABLED` | Flag OFF |

**Hook:** `onTelemetry` in `OwnerBranchFacadeDeps`

---

## 5. Operations SDK telemetry

**Module:** `src/sdk/branch/operations-sdk/BranchOperationsTelemetry.ts`

| Event | Trigger |
|-------|---------|
| `BRANCH_OPERATIONS_REQUEST` | Pipeline start |
| `REPOSITORY_READ` | Snapshot loaded |
| `DOMAIN_EVALUATION` | Evaluator ran |
| `SUCCESS` / `FAILURE` | Outcome |

**Timing breakdown:** validation, repository, domain, total ms

---

## 6. Session observability

| Module | Session states |
|--------|----------------|
| `BranchSession` | idle · loading · success · empty · error · disabled · retry · cancelled |
| `CheckoutBranchSession` | idle · loading · assigned · legacy · error · disabled · retry · cancelled |
| `OwnerBranchSession` | idle · loading · success · empty · error · disabled · retry · cancelled |

Subscribe via `subscribeSession` / `subscribeOwnerBranchSession` / `subscribeCheckoutBranchSession`.

In-memory only — no Firestore session persistence in v1.0.

---

## 7. Error observability

| Layer | Error mapper |
|-------|--------------|
| BranchSDK | SdkError codes |
| BranchFacade | `BranchErrorMapper` → presentation errors |
| Checkout | `CheckoutBranchErrorMapper` |
| Owner | `OwnerBranchErrorMapper` |
| Operations SDK | `BranchOperationsErrorMapper` |

Stable codes: `NOT_CONFIGURED`, `VALIDATION`, `UNAVAILABLE`, `NOT_FOUND`, `FORBIDDEN`, `RATE_LIMITED`

---

## 8. Correlation

- Facade operations accept optional `correlationId` in queries
- Checkout and order persistence propagate assignment snapshot IDs
- Recommended: pass order draft ID as correlationId in checkout assignment

---

## 9. Production wiring (post-v1.0)

Recommended post-rollout:

1. Connect facade telemetry hooks to `TelemetryService`
2. Alert on `UNAVAILABLE` spike when repository flag ON
3. Dashboard: assignment success rate, p95 latency, retry count
4. Log `FF_BRANCH_*` flag state in deployment metadata

---

## References

- [BRANCH-PUBLIC-API-v1.md](./BRANCH-PUBLIC-API-v1.md)
- [BRANCH-PERFORMANCE-REPORT.md](./BRANCH-PERFORMANCE-REPORT.md)
