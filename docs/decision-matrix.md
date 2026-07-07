# BAEO Decision Matrix

**Version:** 1.1.0  
**Rule:** If not listed here, default Accountable = **ARB** for technical, **CEO** for product strategy.

---

## Decision Authority

| Decision | Approves (Accountable) | Consulted | Informed |
|----------|------------------------|-----------|----------|
| **Architecture** — folder structure, module boundaries | **ARB** | Domain agents, Ecosystem Guardian | PM, Release Mgr |
| **Architecture** — new product module / repo split | **CEO** + **ARB** | DRB, DevOps | All dept leads |
| **Architecture** — BhojanOS `src/` modification | **CEO** | ARB, DRB | PM |
| **Design** — UX flows, visual intent | **DRB** | Experience Evolution, Ecosystem Guardian | OrderBhojan UI |
| **Design** — BDS token/component addition | **DRB** + **Design System** | ARB (API surface) | PM |
| **Design** — brand pivot / identity change | **CEO** | DRB, Experience Evolution | All |
| **Backend** — OpenAPI breaking change | **ARB** | Marketplace API, Testing | PM, OrderBhojan UI |
| **Backend** — new Marketplace endpoint | **ARB** | Marketplace API, Firebase | PM |
| **Frontend** — new OrderBhojan route/screen | **DRB** (UX) + **ARB** (structure) | OrderBhojan UI | PM |
| **Frontend** — custom UI primitive in app | **DRB** — **DENY** default; **Design System** if ADR | ARB | — |
| **Database** — Firestore collection/schema (OrderBhojan) | **ARB** | Firebase, Security, Auth | PM |
| **Database** — Firestore rules change | **Security** + **Firebase** | Auth, ARB | Release Mgr |
| **Database** — BhojanOS data model | **CEO** + **ARB** | — | PM |
| **Firebase** — new project or auth provider | **CEO** + **ARB** | Security, Auth, DevOps | PM |
| **Firebase** — rules/index deploy | **Security** (A) · **Firebase** (R) | Auth | Release Mgr |
| **Security** — waive npm audit finding | **Security** | ARB, Release Mgr | CEO if critical |
| **Security** — production secret rotation | **Security** | DevOps | CEO |
| **Releases** — milestone tag & deploy | **Release Manager** | QRB, DevOps | CEO, PM |
| **Releases** — skip regression gate | **CEO** + **Release Manager** | ARB, Testing | — |
| **Releases** — hotfix deploy P0 | **ERB** (Release Mgr + Security) | Domain agent, DevOps | CEO |
| **Releases** — version semver policy | **Release Manager** | PM | ARB |
| **Ownership** — agent boundary dispute | **ARB** | CEO if cross-product | Disputing agents |
| **Cross-product** — terminology/navigation | **Ecosystem Guardian** recommends · **DRB** approves | Experience Evolution | CEO if conflict |
| **Milestone** — start next milestone | **CEO** | PM, ARB, DRB | Release Mgr |
| **Milestone** — scope expansion mid-flight | **PM** proposes · **CEO** approves | ARB, DRB | Implementer |
| **Feature flags** — enable in production | **CEO** + **Release Manager** | ARB, Security | PM |
| **Dependencies** — new npm package | **ARB** | Performance, Security | Domain agent |
| **CI/CD** — workflow change | **DevOps** | Release Mgr, Testing | ARB |

---

## Deny by Default

| Request | Default Decision | Override |
|---------|------------------|----------|
| OrderBhojan reads BhojanOS Firestore | **DENY** | CEO + ARB ADR |
| Custom Button/Card in app | **DENY** | DRB + Design System ADR |
| Skip STOP after milestone | **DENY** | CEO explicit written approval |
| Shared file ownership (2 agents) | **DENY** | ARB assigns single owner |
| Activate all 20 agents at once | **DENY** | PM activation recipe only |

---

## Decision Flow (Quick Reference)

```
Architecture question  → ARB  → (CEO if BhojanOS / cross-product)
Design question        → DRB  → (CEO if brand pivot)
Security question      → Security → (ERB if P0)
Release question       → Release Manager → (CEO if major / gate skip)
Priority conflict      → CEO
Ownership conflict     → ARB
```

---

*BAEO v1.1 — When in doubt, escalate to the Accountable role; do not implement pending approval.*
