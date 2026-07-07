# BAEO RACI Matrix

**Version:** 1.1.0  
**Legend:** **R** = Responsible · **A** = Accountable · **C** = Consulted · **I** = Informed

---

## Executive & Planning

| Area | CEO | PM | ARB | DRB | Release Mgr |
|------|-----|-----|-----|-----|-------------|
| Vision & roadmap | **A/R** | C | C | I | I |
| Milestone prioritization | A | **R** | C | C | I |
| Acceptance criteria | I | **A/R** | C | C | I |
| Milestone GO/STOP | **A** | R | C | C | I |
| Cross-product conflicts | **A/R** | C | C | C | I |

---

## Architecture & Design

| Area | ARB | DRB | Exp Evolution | Ecosystem Guardian | Design System |
|------|-----|-----|---------------|-------------------|---------------|
| Folder structure | **A/R** | I | I | C | C |
| API boundaries | **A/R** | I | I | C | I |
| ADRs | **A/R** | C | I | C | C |
| UX intent | C | **A/R** | C | C | C |
| BDS compliance | C | **A** | C | R | **R** |
| Mana Inti lineage | I | C | **A/R** | C | C |
| Cross-product brand | C | A | C | **R** | C |
| Motion intent | I | **A** | C | I | C |

---

## Product Engineering

| Area | OrderBhojan UI | Auth | Location | Marketplace API | Firebase |
|------|----------------|------|----------|-----------------|----------|
| Screens & layouts | **A/R** | I | I | I | I |
| Experience CSS | **A/R** | I | I | I | I |
| Google/Phone/Guest auth | I | **A/R** | I | I | C |
| Protected routes | C | **A/R** | I | I | I |
| GPS/maps/zones | I | I | **A/R** | C | I |
| OpenAPI/MSW/client | I | I | I | **A/R** | I |
| Firestore rules | C | C | I | I | **A/R** |
| Customer profile | C | **A/R** | I | I | C |

---

## Quality Engineering

| Area | Testing | Performance | Accessibility | Security |
|------|---------|-------------|---------------|----------|
| Unit/integration tests | **A/R** | I | I | I |
| Gate scripts | **A/R** | C | I | I |
| Bundle/Lighthouse | C | **A/R** | I | I |
| WCAG AA | C | I | **A/R** | I |
| OWASP/npm audit | C | I | C | **A/R** |
| QRB sign-off | R | R | R | R — **Release Mgr Accountable** |

---

## Platform Engineering

| Area | DevOps | Documentation | Release Mgr | Motion |
|------|--------|---------------|-------------|--------|
| CI/CD pipelines | **A/R** | C | C | I |
| Deploy staging/prod | **R** | I | **A** | I |
| Milestone docs pack | C | **A/R** | C | I |
| Version/tags | C | C | **A/R** | I |
| Quality gate orchestration | C | I | **A/R** | I |
| Animations (UI milestones) | I | I | I | **A/R** |

---

## Milestone Lifecycle

| Phase | R | A | C | I |
|-------|---|---|---|---|
| Intake | PM | CEO | ARB, DRB | All dept leads |
| Architecture review | ARB | ARB | Domain agents | PM, Release Mgr |
| Design review | DRB | DRB | Exp Evolution, Guardian | PM |
| Implementation | Domain agent | ARB | DRB, Testing | PM, Release Mgr |
| QA gates | Testing, Perf, A11y, Sec | Release Mgr (QRB) | Domain agent | PM |
| Documentation | Documentation | Release Mgr | PM, ARB | CEO |
| Release | Release Mgr, DevOps | Release Mgr | QRB, Security | CEO, PM |
| Hotfix P0 | Domain agent | ERB (Release Mgr + Security) | ARB | CEO |

---

## Governance Documents

| Document | R | A | C | I |
|----------|---|---|---|---|
| ownership-matrix.md | ARB | ARB | Ecosystem Guardian | All agents |
| review-boards.md | Documentation | CEO | ARB, DRB, Release Mgr | All |
| milestone-quality-matrix.md | Release Mgr | Release Mgr | QRB members | PM |
| decision-matrix.md | ARB | CEO | DRB, Security | PM |

---

*One Accountable role per area. Responsible agents execute; they do not override Accountable board decisions.*
