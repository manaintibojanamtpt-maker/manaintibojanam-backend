# BAEO Onboarding Guide

**Version:** 1.1.0 · **Status:** REFERENCE ONLY (Founder Beta freeze active)

> **Start here for allowed work:** [.agents/AGENTS.md](../.agents/AGENTS.md) and [docs/PROGRAM-STATUS.md](../docs/PROGRAM-STATUS.md). BAEO agent activation is **suspended** until the freeze lifts.

## Welcome

You are joining the **Bhojan AI Engineering Organization** — an AI-native software company operating inside Cursor. BAEO v1.1 governance artifacts are on disk; **milestone agent activation is suspended** during Founder Beta PMF validation.

## Day 0 Checklist

- [ ] Read [.agents/AGENTS.md](../.agents/AGENTS.md) (feature freeze — binding)
- [ ] Read [docs/PROGRAM-STATUS.md](../docs/PROGRAM-STATUS.md) (milestone truth)
- [ ] Read [BAEO-v1.1-OPERATING-MODEL.md](BAEO-v1.1-OPERATING-MODEL.md) (reference when freeze lifts)
- [ ] Read [docs/ownership-matrix.md](../docs/ownership-matrix.md)
- [ ] Skim agents in [agents/](agents/) for your department

## Departments

| Department | You are… | Key agents |
|------------|----------|------------|
| Executive | Planning / approving | 00, 01, 02, 03 |
| Product Engineering | Building | 04–09, 12, 18, 19 |
| Quality Engineering | Reviewing | 10, 11, 13, 16 |
| Platform Engineering | Shipping | 14, 15, 17 |

## Day 1 — Product Context

| Product | Status (`main`) | Notes |
|---------|-----------------|-------|
| BhojanOS | **Active focus** — Founder Beta PMF | Owner SaaS; freeze allows bug fixes + onboarding friction only |
| OrderBhojan | M6.5 complete (`gate:m65`, `0.8.5-m65`) · **FROZEN** | Canonical docs: `orderbhojan/docs/` — no new milestones during freeze |
| BDS | v1.0 frozen | Shared system |
| Mana Inti Bojanam | Reference storefront | Agent 18 north star |

**Do not start M7+ checkout, payments, or production launch** without CEO waiver and freeze lift.

**Ignore stale status in `docs/orderbhojan/`** — that folder is an archived pre-implementation ARB draft (predates `orderbhojan/` scaffold).

## Day 2 — Pick Your Agent (when freeze lifts)

| If you work on… | Primary agent |
|-----------------|---------------|
| Milestones & priorities | `01-product-manager.md` |
| Architecture & ADRs | `02-architecture-review-board.md` |
| UX & visual polish | `03-design-review-board.md` |
| BDS components/tokens | `04-design-system.md` |
| OrderBhojan screens | `05-orderbhojan-ui.md` |
| Login / Firebase auth | `06-authentication.md` |
| GPS / addresses | `07-location-platform.md` |
| HTTP client / OpenAPI | `08-marketplace-api.md` |
| Firestore rules | `09-firebase.md` |
| Lighthouse / bundle size | `10-performance.md` |
| WCAG / keyboard / ARIA | `11-accessibility.md` |
| Animations / transitions | `12-motion.md` |
| Unit / gate / Playwright | `13-testing.md` |
| ADRs / release notes / guides | `14-documentation.md` |
| CI/CD / deploy / GitHub | `15-devops.md` |
| OWASP / secrets / auth hardening | `16-security.md` |
| Versioning / gates / tags | `17-release-manager.md` |
| Mana Inti UX / visual evolution | `18-experience-evolution.md` |
| Cross-product consistency | `19-ecosystem-guardian.md` |

## Day 3 — First Contribution (Founder Beta)

1. Confirm work is allowed under [.agents/AGENTS.md](../.agents/AGENTS.md)
2. Use [.cursor/playbooks/bug-fix.md](playbooks/bug-fix.md) or hotfix checklist for production fixes
3. Do **not** activate BAEO milestone pipeline without CEO waiver

## Success in Week 1

- [ ] Zero freeze violations
- [ ] PMF-aligned BhojanOS improvements only
- [ ] No contradictory milestone docs introduced

---

**Founder Beta freeze is binding.** BAEO resumes when [docs/PROGRAM-STATUS.md](../docs/PROGRAM-STATUS.md) says so.
