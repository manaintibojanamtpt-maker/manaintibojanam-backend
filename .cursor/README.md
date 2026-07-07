# Bhojan AI Engineering Organization (BAEO)

**Version:** 1.1.0  
**Status:** ARTIFACTS COMPLETE · **OPERATIONS SUSPENDED** (Founder Beta freeze)  
**Owner:** Executive AI Operating Board

> **Work allowed now:** [.agents/AGENTS.md](../.agents/AGENTS.md) — bug fixes, stability, merchant PMF only.  
> **Program status:** [docs/PROGRAM-STATUS.md](../docs/PROGRAM-STATUS.md)

---

## Purpose

BAEO treats **Cursor as an AI Software Company** responsible for building and maintaining the Bhojan ecosystem for the next decade. Agents operate in **departments** with clear ownership — not as a single general assistant.

**Operating model (reference — suspended):** [.cursor/BAEO-v1.1-OPERATING-MODEL.md](BAEO-v1.1-OPERATING-MODEL.md)

## Departments

| Department | Agents | Mission |
|------------|--------|---------|
| **Executive Board** | 00 CEO, 01 PM, 02 ARB, 03 DRB | Strategy, approve milestones — never implement |
| **Product Engineering** | 04–09, 12, 18–19 | Build features within ownership |
| **Quality Engineering** | 10–11, 13, 16 (QRB) | Review before release |
| **Platform Engineering** | 14–15, 17 | Deploy, document, release |

## Vision

- **One responsibility** per agent
- **One ownership boundary** per folder
- **One review board** per concern
- **Activate only required agents** per milestone (when freeze lifts)

## Governance Artifacts

| Document | Location |
|----------|----------|
| Ownership matrix | [docs/ownership-matrix.md](../docs/ownership-matrix.md) |
| Review boards (ARB, DRB, QRB, ERB) | [docs/review-boards.md](../docs/review-boards.md) |
| Quality matrix | [docs/milestone-quality-matrix.md](../docs/milestone-quality-matrix.md) |
| RACI | [docs/raci-matrix.md](../docs/raci-matrix.md) |
| Decision matrix | [docs/decision-matrix.md](../docs/decision-matrix.md) |
| Escalation | [docs/escalation-matrix.md](../docs/escalation-matrix.md) |

## Directory Map

```
.cursor/
├── BAEO-v1.1-OPERATING-MODEL.md   ← Reference (suspended)
├── README.md
├── DEVELOPER-GUIDE.md
├── ONBOARDING-GUIDE.md
├── agents/          (20 agents: 00–19)
├── workflows/
├── standards/
├── playbooks/
├── templates/
├── checklists/      ← v1.1 operational checklists
└── reviews/
```

## Milestone Pipeline (when freeze lifts)

```
Executive Board → Implementation Team (recipe-based) → Quality Engineering
  → Documentation → Release Manager → GitHub → STOP
```

## Agent Activation (when freeze lifts)

Future work **must** activate agents explicitly:

```
BAEO ACTIVE — Milestone M___
Executive: 00 CEO → 01 PM → 02 ARB → 03 DRB (if UI)
Implementation: [agents from recipe in operating model]
Quality: 13 → 10 → 11 → 16 (if auth)
Platform: 14 → 17
Checklists: .cursor/checklists/
```

Do not ask one AI to implement everything.

## Agent Index

| ID | Agent | Dept |
|----|-------|------|
| 00 | CEO | Executive |
| 01 | Product Manager | Executive |
| 02 | Architecture Review Board | Executive |
| 03 | Design Review Board | Executive |
| 04 | Design System | Product |
| 05 | OrderBhojan UI | Product |
| 06 | Authentication | Product |
| 07 | Location Platform | Product |
| 08 | Marketplace API | Product |
| 09 | Firebase | Product |
| 10 | Performance | Quality |
| 11 | Accessibility | Quality |
| 12 | Motion | Product |
| 13 | Testing | Quality |
| 14 | Documentation | Platform |
| 15 | DevOps | Platform |
| 16 | Security | Quality |
| 17 | Release Manager | Platform |
| 18 | Experience Evolution | Product |
| 19 | Ecosystem Guardian | Product |

## Governance Principles

1. **BhojanOS is source of truth** for restaurant operations data.
2. **OrderBhojan** consumes Marketplace API + orderbhojan Firebase.
3. **BDS v1.0 frozen** — extend via ADR.
4. **One milestone at a time** — STOP after each until approval.
5. **Mana Inti Bojanam** is the canonical customer experience (Agent 18).
6. **Founder Beta freeze** overrides BAEO activation until CEO lifts it.

---

*BAEO v1.1 artifacts on disk — operational activation suspended during Founder Beta.*
