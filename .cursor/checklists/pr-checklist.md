# Pull Request Checklist

**BAEO v1.1** — Required on every milestone PR · Owner: Implementing agent

---

## Header

- [ ] Title format: `[M<N>] Short description`
- [ ] Milestone ID in description
- [ ] Primary agent(s) listed
- [ ] STOP condition restated

## Scope

- [ ] Matches approved milestone template
- [ ] No out-of-scope changes
- [ ] [Ownership matrix](../../docs/ownership-matrix.md) verified — files touched ⊆ Files Owned
- [ ] No BhojanOS `src/` changes (unless waiver linked)

## Code Quality

- [ ] TypeScript PASS
- [ ] ESLint PASS
- [ ] Tests PASS (count: ___)
- [ ] Build PASS
- [ ] No secrets in diff
- [ ] No commented-out dead code

## UI PRs (if applicable)

- [ ] BDS components only
- [ ] Dark mode checked
- [ ] Responsive 375 / 768 / 1024 checked
- [ ] DRB design review linked
- [ ] Ecosystem Guardian scorecard linked

## Backend PRs (if applicable)

- [ ] OpenAPI updated (Marketplace API agent)
- [ ] MSW handlers match OpenAPI
- [ ] ARB architecture report linked

## Auth / Firebase PRs (if applicable)

- [ ] Security agent review
- [ ] Firestore rules reviewed
- [ ] No tokens logged

## Reviewers Routed

- [ ] ARB — structure/API changes
- [ ] DRB — UI changes
- [ ] Testing — gate script changes
- [ ] Security — auth/data
- [ ] Release Manager — all milestone PRs

## Docs

- [ ] Migration notes updated
- [ ] Acceptance checklist updated
- [ ] Release notes draft attached

## Merge Blockers

Do not merge if any:

- [ ] Gate failure
- [ ] Missing board sign-off
- [ ] Ownership violation
- [ ] QRB item open
