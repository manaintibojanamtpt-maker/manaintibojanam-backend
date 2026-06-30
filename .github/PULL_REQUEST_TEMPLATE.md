## Summary

<!-- One objective. One feature. Conventional commit title in PR title. -->

**Milestone:** <!-- e.g. M0 -->
**PR:** <!-- e.g. PR-1 -->
**ADR:** <!-- e.g. ADR-012 or N/A -->

## Type

- [ ] Feature
- [ ] Security fix
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactor (requires separate approval — do not combine with feature/fix)

## Definition of Done

- [ ] `npm run lint` passes
- [ ] `npm run test:smoke` passes (if runtime code changed)
- [ ] `npm run test:security` passes (if M0 security PR)
- [ ] No `console.log` added
- [ ] No `any` added
- [ ] Feature flag documented (if applicable)
- [ ] Rollback steps documented
- [ ] `docs/api.md` updated (if API contract changed)
- [ ] Release notes updated (if user-visible)

## Security checklist (M0+)

- [ ] Authentication verified on new/changed API routes
- [ ] Authorization checks tenant/order ownership (no IDOR)
- [ ] Input validated server-side
- [ ] Rate limiting on sensitive endpoints
- [ ] No secrets in frontend bundle
- [ ] Firestore rules updated if client data access changed

## Rollback

<!-- How to revert in production in < 5 minutes -->

## Test plan

<!-- Steps reviewer can follow -->
