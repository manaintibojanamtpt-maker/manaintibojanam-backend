# Bhojan Monorepo — Program Status

**Last updated:** 2026-07-07  
**Binding authority:** [.agents/AGENTS.md](../.agents/AGENTS.md) (Founder Beta feature freeze, effective June 2026)

---

## Current phase: Founder Beta PMF validation & Conditionally Lifted Freeze (August 2026)

The feature freeze in `.agents/AGENTS.md` is now **conditionally lifted** following a successful security audit and remediation of 24-hour blockers (SEC-1, SEC-2, SEC-3).

**Authorized during this phase:**
- Resumption of OrderBhojan milestones (M7+ and net-new marketplace scope)
- Resumption of BAEO agent workflows for implementation
- Continued stability, performance, and PMF validation improvements

CEO written waiver is no longer required for M7+ execution.

---

## BAEO (Bhojan AI Engineering Organization)

| Field | Status |
|-------|--------|
| Governance artifacts | Committed (v1.1 matrices, checklists, operating model) |
| Operational mode | **RESUMED** following conditional freeze lift |
| Rationale | BAEO agent activation is now permitted for new implementations |

Resume via [docs/baeo/ACTIVATION-RECORD.md](./baeo/ACTIVATION-RECORD.md) and [.cursor/workflows/agent-activation.md](../.cursor/workflows/agent-activation.md).

---

## OrderBhojan (marketplace customer app)

**Canonical milestone docs:** `orderbhojan/docs/` (implementation reports and gate evidence)

**Do not use** `docs/orderbhojan/` for current status — that folder is an **archived pre-implementation ARB planning pack** (July 2026 draft, written before `orderbhojan/` was scaffolded).

### Milestone truth ( `main` branch, git)

| Milestone | Status | Evidence |
|-----------|--------|----------|
| M0 Foundation | Complete | `orderbhojan/docs/M0-FOUNDATION-REPORT.md`, `gate:m0` |
| M0 ARB exit | Approved (implementation) | `orderbhojan/docs/M0-ARB-EXIT-REVIEW.md` |
| M1 Authentication | Complete | `orderbhojan/docs/m1/` |
| M1.5 / M1.6 Premium shell | Complete | `orderbhojan/docs/m15/`, `orderbhojan/docs/m16/` |
| M2 Location | Complete (flags default OFF) | `orderbhojan/docs/m2/` |
| M3 Discovery | Complete | `orderbhojan/docs/m3/` |
| M4 Search | Complete | `orderbhojan/docs/m4/` |
| M5 Restaurant | Complete | `orderbhojan/docs/m5/` |
| M6 Menu / cart shell | Complete | `orderbhojan/docs/m6/` |
| M6.5 Premium evolution | Complete | `orderbhojan/docs/m65/`, `gate:m65`, version `0.8.5-m65` |
| M7 (checkout, payments, prod launch) | Complete | Founder Beta is LIVE on v1.1.0-founder-beta |

Local uncommitted experiments (e.g. PX2, Sprint 19) are **not** production milestones until CEO waiver + freeze lift + ARB sign-off.

---

## BhojanOS (owner SaaS)

**Primary focus during Founder Beta.** Founder Beta is now **LIVE**. Production stability and PMF metrics take precedence over marketplace expansion.

---

## Document map (avoid contradictions)

| Question | Read this |
|----------|-----------|
| What work is allowed now? | `.agents/AGENTS.md` |
| Is BAEO active? | This file → SUSPENDED; artifacts in `docs/baeo/` |
| OrderBhojan milestone progress? | `orderbhojan/docs/` + this file |
| Pre-M0 architecture intent (historical)? | `docs/orderbhojan/` (archived draft) |
