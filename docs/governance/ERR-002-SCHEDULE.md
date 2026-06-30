# BHOS-ERR-002 — Post-M0 Readiness Review Schedule

**Status:** Scheduled (pending M0 24h production soak)  
**Prerequisite:** M0 Release `v1.0.0-m0` deployed and monitored  
**Gate for M1:** Composite readiness target ≥ **70%** (per ADR-011)

---

## Purpose

ERR-001 issued **Conditional Go** for M0 only (composite readiness ~41%). ERR-002 re-evaluates platform readiness before M1 feature work (SDK strangler S1, order FSM).

---

## Scheduled review window

| Milestone | Target date | Owner |
|-----------|-------------|-------|
| M0 production deploy complete | 2026-06-30 | Engineering |
| 24h production monitoring ends | 2026-07-01 | Engineering / Founder |
| **ERR-002 readiness review** | **2026-07-02** | Architecture Review Board |
| M1 Go/No-Go decision | 2026-07-02 | Founder + ARB |

---

## ERR-002 agenda

1. Confirm CB-1 closed (`FF_ORDER_AUTH_ENFORCE=true` in production; guest JWT validated)
2. Firestore rules deploy stable (no permission-denied regression)
3. Payment flows: Razorpay + COD success rate baseline
4. `npm run test:security` green in CI
5. Technical debt triage: `order_drafts` rules/client alignment, referral server API
6. Score composite readiness (target ≥ 70%)
7. Approve or defer M1-PR-1 (SDK scaffold)

---

## Participants

- Founder
- Architecture Review Board
- Engineering lead

---

## Outcomes

| Result | Action |
|--------|--------|
| **Go** | Approve M1; start M1-PR-1 (SDK package scaffold + order read models) |
| **Conditional Go** | Remediation PRs; re-review within 7 days |
| **No-Go** | Extend M0 stabilization; no M1 code |

---

## References

- ADR-011 — SDK strangler phases require ERR-002 ≥ 70%
- `docs/specs/M0-security.md` §13 — schedule ERR-002 before M1
- `docs/release-notes/M0-DEPLOYMENT.md` — monitoring window
