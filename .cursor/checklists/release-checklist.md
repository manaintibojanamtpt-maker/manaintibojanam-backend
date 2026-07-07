# Release Checklist

**BAEO v1.1** — Owner: Release Manager (17) · See [release-process](../workflows/release-process.md)

---

## Pre-Release

- [ ] All [milestone checklist](milestone-checklist.md) items complete
- [ ] [Milestone quality matrix](../../docs/milestone-quality-matrix.md) all required gates PASS
- [ ] [Definition of done](../reviews/definition-of-done.md) satisfied
- [ ] QRB consolidated sign-off
- [ ] Security sign-off — *if applicable*
- [ ] CEO notified — *major releases*

## Version & Tag

- [ ] `package.json` version matches milestone (e.g., `0.3.6-m16`)
- [ ] Gate script expects same version
- [ ] Tag name documented: `orderbhojan-v____`
- [ ] CHANGELOG / RELEASE-NOTES finalized

## CI / Deploy

- [ ] CI green on merge commit
- [ ] DevOps staging deploy triggered
- [ ] MSW disabled in production build verified
- [ ] Environment variables documented in `.env.example`

## Post-Deploy Smoke

- [ ] App loads without console errors
- [ ] Auth flow (guest + login) — *if auth product*
- [ ] Home / primary route renders
- [ ] Dark mode toggle works — *UI releases*

## Closeout

- [ ] [Milestone closeout report](../templates/milestone-closeout-report.md) filed
- [ ] Milestone status → COMPLETE
- [ ] **STOP** communicated to stakeholders
- [ ] Next milestone marked BLOCKED pending CEO + ARB/DRB approval

## Release Manager Sign-Off

| Field | Value |
|-------|-------|
| Milestone | |
| Version | |
| Gate command | |
| Tag | |
| Date | |
| GO / NO-GO | |
