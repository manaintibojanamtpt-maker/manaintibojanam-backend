# Release Process

## Owner

Release Manager (orchestrates); DevOps executes deploy.

## Release Types

| Type | When | Approval |
|------|------|----------|
| Milestone release | Feature milestone complete | Full gate + STOP |
| Patch release | Bug fix playbook | Testing + Security if auth |
| Hotfix | Production incident | Security + CEO if customer-facing |
| BAEO doc release | Org infrastructure only | CEO |

## Pre-Release Checklist

Run all applicable items from [reviews/quality-gates.md](../reviews/quality-gates.md).

### OrderBhojan Milestone Release

```bash
cd orderbhojan
npm run lint
npm run test
npm run build
npm run gate:m<N>    # e.g., gate:m16
```

### Version Bump

Update `orderbhojan/package.json`:

```json
"version": "0.3.6-m16"
```

Pattern: `{semver}-{milestone-id}`

### Documentation Pack

Required in `orderbhojan/docs/m<N>/`:

- [ ] MIGRATION-NOTES.md
- [ ] ACCEPTANCE-CHECKLIST.md
- [ ] ARCHITECTURE-REPORT.md (if structural)
- [ ] RELEASE-NOTES.md (from template)
- [ ] ROLLBACK-PLAN.md (if risky)

## Release Steps

### 1. Gate Verification

Release Manager confirms:

| Gate | Command / Check |
|------|-----------------|
| TypeScript | `tsc --noEmit` |
| ESLint | `npm run lint` |
| Unit tests | `npm run test` |
| Milestone gate | `npm run gate:m<N>` |
| Bundle size | performance-smoke |
| Accessibility | manual + automated checks |
| Visual review | DRB sign-off on branch |

### 2. Security Sign-Off

Required for auth, Firebase rules, dependency bumps:

- Security agent checklist complete
- No critical npm audit findings

### 3. PR Merge

Follow [pull-request-workflow.md](pull-request-workflow.md).

### 4. Tag

```bash
git tag -a orderbhojan-v0.3.6-m16 -m "M1.6 Premium Experience"
git push origin orderbhojan-v0.3.6-m16
```

(Human operation — agent documents tag name.)

### 5. Deploy

| Environment | Owner | Target |
|-------------|-------|--------|
| Staging | DevOps | Vercel preview / staging Firebase |
| Production | DevOps + Release Manager | Approved tag only |

### 6. Post-Release

1. Publish [release-notes.md](../templates/release-notes.md)
2. Notify stakeholders (Product Manager)
3. Update milestone status in docs
4. **STOP** — document next milestone as blocked pending approval

## Rollback

If release fails in production:

1. Release Manager activates ROLLBACK-PLAN.md
2. DevOps redeploys previous tag
3. Documentation agent records incident
4. Security reviews if data/auth involved

Target rollback time: **< 15 minutes**.

## Release Notes

Use [templates/release-notes.md](../templates/release-notes.md).

Include:

- Milestone ID and version
- User-visible changes
- Breaking changes / migrations
- Known issues
- STOP condition for next work

## No-Release Conditions

Release Manager blocks when:

- Any quality gate fails
- Documentation pack incomplete
- Security critical finding open
- DRB/ARB approval missing for scoped work
- Scope exceeded milestone template
