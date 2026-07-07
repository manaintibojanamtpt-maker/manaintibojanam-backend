# Hotfix Checklist

**BAEO v1.1** — P0/P1 only · Owner: Release Manager + ERB · See [hotfix playbook](../playbooks/hotfix.md)

---

## Declaration

- [ ] Priority confirmed: P0 / P1
- [ ] ERB session started (P0 mandatory)
- [ ] Incident ID assigned
- [ ] Non-essential merges frozen

## Scope Control

- [ ] Single domain agent assigned by ARB
- [ ] Minimal fix — no feature additions
- [ ] Ownership matrix respected
- [ ] CEO notified if customer-facing (P0)

## Security (Mandatory if auth/data/API)

- [ ] Security agent review before merge
- [ ] No secrets in fix
- [ ] Firestore rules validated if touched

## Verification

- [ ] Root cause identified
- [ ] Regression test added (if feasible)
- [ ] `npm run lint` PASS
- [ ] `npm run test` PASS
- [ ] `npm run build` PASS
- [ ] Latest regression gate PASS (`gate:m<latest>`)

## Deploy

- [ ] Branch: `hotfix/<id>-short-desc`
- [ ] Abbreviated PR review — Release Manager + Security
- [ ] [Rollback checklist](rollback-checklist.md) ready
- [ ] Deploy executed by DevOps
- [ ] 30-minute post-deploy monitoring

## Close

- [ ] Incident log complete
- [ ] Post-mortem scheduled (48h) — Documentation agent
- [ ] Forward fix backported to main if branch deploy
- [ ] Hotfix release notes entry

## ERB Sign-Off

| Role | GO/NO-GO | Time |
|------|----------|------|
| Release Manager | | |
| Security | | |
| Domain agent | | |
| DevOps | | |
