# BAEO Developer Guide

**Version:** 1.1.0 · **Status:** REFERENCE ONLY (Founder Beta freeze active)

## Founder Beta — read first

**Binding rules:** [.agents/AGENTS.md](../.agents/AGENTS.md)  
**Program status:** [docs/PROGRAM-STATUS.md](../docs/PROGRAM-STATUS.md)

During PMF validation (June 2026+):

- **Do not** activate BAEO milestone pipelines or declare `BAEO ACTIVE` for new features.
- **Do not** start OrderBhojan M7+ or other marketplace milestones.
- **Do** implement bug fixes, stability, onboarding friction reduction, and PMF metrics work on BhojanOS.

BAEO v1.1 artifacts (matrices, checklists, agents) remain for when the freeze lifts.

## Who This Is For

Human engineers and AI agents working in the Bhojan monorepo. When the freeze lifts, milestones run through **departments and agents**, not one general assistant.

**Reference:** [BAEO-v1.1-OPERATING-MODEL.md](BAEO-v1.1-OPERATING-MODEL.md) (suspended)

## Repository Layout

| Path | Product | Owner Agent |
|------|---------|-------------|
| `/` (root `src/`) | BhojanOS owner SaaS | **Primary focus during freeze** |
| `orderbhojan/` | OrderBhojan marketplace | M6.5 on `main`; **frozen** for new milestones |
| `packages/design-system/` | BDS v1.0 | Design System (04) |

**Canonical OrderBhojan milestones:** `orderbhojan/docs/` — not `docs/orderbhojan/` (archived ARB draft pack).

## How to Run a Milestone (when freeze lifts)

### 1. Activate Executive Board

```
Follow .cursor/agents/00-ceo.md — confirm milestone GO and STOP.
Follow .cursor/agents/01-product-manager.md — fill milestone template.
Follow .cursor/agents/02-architecture-review-board.md — architecture GO.
Follow .cursor/agents/03-design-review-board.md — design GO (UI only).
```

### 2. Activate Implementation Team (recipe-based)

Pick **one recipe** from [BAEO-v1.1-OPERATING-MODEL.md](BAEO-v1.1-OPERATING-MODEL.md):

- **UI:** DRB → 18 Experience Evolution → 05 OrderBhojan UI → 12 Motion
- **Backend:** ARB → 08 Marketplace API → 09 Firebase
- **Auth:** ARB → 06 Authentication → 09 Firebase

**Never activate all 20 agents.**

### 3. Activate Quality Engineering (QRB)

```
13 Testing → 10 Performance → 11 Accessibility → 16 Security (if auth/data)
```

### 4. Activate Platform Engineering

```
14 Documentation → 17 Release Manager → 15 DevOps (deploy)
```

### 5. UI milestones — add before release

```
19 Ecosystem Guardian — consistency scorecard
18 Experience Evolution — Mana Inti lineage score
```

### 6. Checklists

- [checklists/milestone-checklist.md](checklists/milestone-checklist.md)
- [checklists/pr-checklist.md](checklists/pr-checklist.md)
- [checklists/release-checklist.md](checklists/release-checklist.md)

## Prompt Template (when freeze lifts)

```
BAEO ACTIVE — Milestone M___

Executive: 00 CEO → 01 PM → 02 ARB → 03 DRB (if UI)
Implementation: [list agents]
Quality: 13 → 10 → 11 → [16 if auth]
Platform: 14 → 17
Optional: 18 Experience Evolution, 19 Ecosystem Guardian (UI)

Ownership: docs/ownership-matrix.md
Checklists: .cursor/checklists/milestone-checklist.md
STOP after gate pass — do not start next milestone.
```

## Quality Gates

| Product | Gate | Matrix |
|---------|------|--------|
| OrderBhojan | `npm run gate:m<N>` | [docs/milestone-quality-matrix.md](../docs/milestone-quality-matrix.md) |
| BDS | `npm run gate:bds` | [reviews/quality-gates.md](reviews/quality-gates.md) |

## Decision & Escalation

- Who approves what: [docs/decision-matrix.md](../docs/decision-matrix.md)
- Priority SLAs: [docs/escalation-matrix.md](../docs/escalation-matrix.md)
- RACI: [docs/raci-matrix.md](../docs/raci-matrix.md)

## What Not To Do

- Do not violate [.agents/AGENTS.md](../.agents/AGENTS.md) feature freeze
- Do not implement OrderBhojan milestones during Founder Beta without CEO waiver
- Do not treat `docs/orderbhojan/` as current milestone status
- Do not create custom Button/Card/Input — use BDS
- Do not skip STOP after milestone (when active)

## Support

Board definitions: [docs/review-boards.md](../docs/review-boards.md)
