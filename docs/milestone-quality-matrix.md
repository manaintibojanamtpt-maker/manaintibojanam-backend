# Milestone Quality Matrix

**Version:** 1.1.0  
**Owner:** Release Manager (17)  
**Review Board:** QRB  
**Companion:** [.cursor/reviews/quality-gates.md](../.cursor/reviews/quality-gates.md)

---

## Matrix

| Gate | Owner Agent | Reviewer | Approval Board | Exit Criteria |
|------|-------------|----------|----------------|---------------|
| **Architecture** | 02 ARB | 00 CEO (cross-product) | ARB | ARCHITECTURE-REPORT.md approved; ownership matrix respected; ADR filed if required; no boundary violations |
| **Design** | 03 DRB | 18 Experience Evolution, 19 Ecosystem Guardian | DRB | DESIGN-REVIEW.md GO; BDS-only; mobile + dark mode; no custom primitives |
| **Performance** | 10 Performance | 13 Testing | QRB | `npm run build` pass; bundle ≤ budget (1500 KB OrderBhojan); performance-smoke pass; no CLS regression documented |
| **Accessibility** | 11 Accessibility | 03 DRB | QRB | WCAG AA checklist complete; keyboard nav; focus visible; reduced motion; ACCESSIBILITY-REPORT.md |
| **Security** | 16 Security | 09 Firebase (rules), 06 Authentication (auth) | QRB + ERB if P0 | No critical npm audit; auth flows reviewed; no secrets in diff; MSW off in prod |
| **Testing** | 13 Testing | Domain implementer | QRB | All unit tests pass; milestone `gate:m<N>` pass; prior regression gates pass; new behavior covered |
| **Documentation** | 14 Documentation | 01 Product Manager | Release Manager | MIGRATION-NOTES, ACCEPTANCE-CHECKLIST, RELEASE-NOTES; ARCHITECTURE/DESIGN reports if applicable |
| **Release** | 17 Release Manager | 15 DevOps | CEO (major) / Release Manager (minor) | All gates green; version bumped; tag documented; STOP communicated; rollback plan if risky |

---

## Gate Dependencies

```
Architecture ──┬──► Implementation ──► Testing ──┬──► Release
Design ────────┘         │              Performance ──┤
                         │              Accessibility ─┤
                         └──► Security (if applicable) ─┘
Documentation ◄───────────────────────────────────────────┘
```

- **Design** may run parallel to **Architecture** after PM intake; both must GO before implementation.
- **Security** mandatory for auth, Firebase, payments, dependency major bumps.
- **Ecosystem Guardian** consult on UI milestones before Design gate closes.

---

## Milestone Type — Required Gates

| Milestone Type | Arch | Design | Perf | A11y | Security | Test | Docs | Release |
|----------------|------|--------|------|------|----------|------|------|---------|
| UI (OrderBhojan) | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| UI + Auth | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Backend API | ✓ | — | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| Firebase rules | ✓ | — | — | — | ✓ | ✓ | ✓ | ✓ |
| BDS extension | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| BAEO org-only | ✓ | — | — | — | — | — | ✓ | ✓ |
| P0 Hotfix | Consult | — | ✓ | — | ✓ | ✓ | Post | ERB |

---

## Success Metrics (Milestone Closeout)

Release Manager records in [milestone-closeout-report](../.cursor/templates/milestone-closeout-report.md):

| Metric | Target | Measured By |
|--------|--------|-------------|
| Build | PASS | CI / local build |
| Tests | 100% pass | `npm run test` |
| Coverage | Report delta | Testing (optional %) |
| Performance score | ≥ 85 mobile LH | Performance agent |
| Accessibility | WCAG AA checklist PASS | Accessibility agent |
| Visual consistency | DRB approve | DRB + Experience Evolution |
| Bundle size | ≤ budget KB | performance-smoke.mjs |
| Design consistency | ≥ 95% BDS tokens | Ecosystem Guardian scorecard |
| Cross-product consistency | No P1 drift | Ecosystem Guardian |

---

## Failure Actions

| Failed Gate | Action | SLA |
|-------------|--------|-----|
| Architecture | Block merge; ARB lists remediation | 48h |
| Design | Block merge; return to UI agent | 48h |
| Performance | Performance agent + implementer optimize | 24h |
| Accessibility | Accessibility + UI agent fix | 24h |
| Security | Block release; Security leads fix | P0: 4h, P1: 24h |
| Testing | Testing + domain agent fix | 24h |
| Documentation | Block tag; Documentation agent | 24h |
| Release | No tag/deploy | Until all green |

---

*See [escalation-matrix.md](escalation-matrix.md) for priority SLAs.*
