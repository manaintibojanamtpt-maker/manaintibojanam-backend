# Playbook — New Feature

## When to Use

New milestone or feature scoped by Product Manager and approved by CEO.

## Prerequisites

- [ ] CEO milestone priority confirmed
- [ ] [milestone-template.md](../templates/milestone-template.md) completed
- [ ] ARB architecture review GO
- [ ] DRB design review GO (if UI)

## Steps

### 1. Plan (Product Manager)

- Define acceptance criteria
- Assign primary implementation agent
- Set version target and gate script name
- Document STOP condition

### 2. Design (DRB + Experience Evolution)

- UX intent approved
- BDS components identified
- Mock vs live API decision documented

### 3. Implement (Domain Agent)

- Create feature branch: `feat/m<N>-short-name`
- Modify **Files Owned** only
- Feature flag OFF by default
- Add/update tests with Testing agent patterns

### 4. Verify (Testing + Performance + Accessibility)

```bash
cd orderbhojan   # or relevant product
npm run lint
npm run test
npm run build
npm run gate:m<N>
```

### 5. Document (Documentation Agent)

- MIGRATION-NOTES.md
- ACCEPTANCE-CHECKLIST.md
- ARCHITECTURE-REPORT.md (if structural)
- RELEASE-NOTES.md

### 6. Release (Release Manager)

Follow [workflows/release-process.md](../workflows/release-process.md).

### 7. STOP

Do not begin next milestone until explicit approval.

## Artifacts Checklist

- [ ] Milestone template
- [ ] Architecture report
- [ ] Design review (UI milestones)
- [ ] Tests + gate script
- [ ] Release notes
- [ ] PR with quality gate checklist

## Common Mistakes

- Starting implementation before ARB review
- Custom UI components instead of BDS
- Modifying BhojanOS during OrderBhojan work
- Skipping regression gates (m15, m1, m0)
