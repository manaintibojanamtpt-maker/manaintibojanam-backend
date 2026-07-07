# Agent Activation Workflow

**BAEO v1.1** — How to invoke AI teams for a milestone

> **Suspended during Founder Beta freeze (June 2026).** Do not use this workflow for new feature work until [.agents/AGENTS.md](../../.agents/AGENTS.md) restrictions are lifted. Allowed now: bug fixes, stability, and PMF-focused BhojanOS work per [docs/PROGRAM-STATUS.md](../../docs/PROGRAM-STATUS.md).

---

## Step 0 — Verify freeze & CEO waiver (required when resuming)

Before `BAEO ACTIVE`:

1. Confirm [.agents/AGENTS.md](../../.agents/AGENTS.md) feature freeze does **not** block the milestone.
2. Obtain written CEO GO for any OrderBhojan milestone, new product module, or net-new agent workflow.
3. Read [docs/PROGRAM-STATUS.md](../../docs/PROGRAM-STATUS.md) for current milestone truth.

If freeze applies → **STOP**. Use [.cursor/playbooks/bug-fix.md](../playbooks/bug-fix.md) or hotfix checklist instead.

---

## Rule

**Never ask one AI to implement a full milestone.** Activate agents in sequence by department.

Full model: [BAEO-v1.1-OPERATING-MODEL.md](../BAEO-v1.1-OPERATING-MODEL.md)

---

## Step 1 — Declare BAEO Active

Every milestone prompt begins with:

```
BAEO ACTIVE — Milestone <ID> — <Title>
```

---

## Step 2 — Executive Board (always)

| Order | Agent | Output |
|-------|-------|--------|
| 1 | 00 CEO | GO/STOP, priority |
| 2 | 01 Product Manager | Milestone template, acceptance criteria |
| 3 | 02 ARB | Architecture GO, ownership confirm |
| 4 | 03 DRB | Design GO — **UI milestones only** |

---

## Step 3 — Implementation Team (pick one recipe)

### UI Milestone

| Order | Agent |
|-------|-------|
| 1 | 18 Experience Evolution (brief) |
| 2 | 04 Design System (consult if BDS gap) |
| 3 | 05 OrderBhojan UI |
| 4 | 12 Motion (if animated) |

### Backend Milestone

| Order | Agent |
|-------|-------|
| 1 | 08 Marketplace API |
| 2 | 09 Firebase (if data/auth infra) |

### Auth Milestone

| Order | Agent |
|-------|-------|
| 1 | 06 Authentication |
| 2 | 09 Firebase (rules) |

---

## Step 4 — Quality Engineering (QRB)

Run in parallel where possible:

| Agent | Gate |
|-------|------|
| 13 Testing | lint, test, gate:m<N> |
| 10 Performance | build, bundle smoke |
| 11 Accessibility | WCAG checklist |
| 16 Security | **if auth, Firebase, payments, deps** |

---

## Step 5 — Cross-Product (UI only)

| Agent | Output |
|-------|--------|
| 19 Ecosystem Guardian | CONSISTENCY-SCORECARD |
| 18 Experience Evolution | Mana Inti lineage score |

Before DRB final sign-off and release.

---

## Step 6 — Platform Engineering

| Order | Agent | Output |
|-------|-------|--------|
| 1 | 14 Documentation | Doc pack |
| 2 | 17 Release Manager | Gate sign-off, version, STOP |
| 3 | 15 DevOps | Deploy (if applicable) |

---

## Step 7 — Checklists

- [milestone-checklist.md](../checklists/milestone-checklist.md)
- [pr-checklist.md](../checklists/pr-checklist.md)
- [release-checklist.md](../checklists/release-checklist.md)

Hotfix: [hotfix-checklist.md](../checklists/hotfix-checklist.md) + ERB

---

## STOP

Release Manager declares COMPLETE. **Do not activate next milestone** until CEO + boards approve.

---

## Anti-Patterns

| Do not | Do instead |
|--------|------------|
| "Build M2 location" to one AI | Activate recipe agents explicitly |
| Activate agents 00–19 | Use recipe subset |
| Skip ARB for "small" changes | ARB consult minimum |
| Skip Guardian on UI release | Scorecard required |
