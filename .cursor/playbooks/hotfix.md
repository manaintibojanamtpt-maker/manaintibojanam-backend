# Playbook — Hotfix

## When to Use

**P0 production incident** — customer impact, security breach, or data integrity risk.

## Response Time Target

- Triage: < 30 minutes
- Fix + deploy: < 4 hours (aspirational)

## Required Approvers

- Release Manager
- Security (if auth, data, or secrets involved)
- CEO (if customer-facing communication required)

## Steps

### 1. Incident Declaration

Release Manager declares hotfix mode:

- Freeze non-essential merges
- Create branch: `hotfix/<issue-id>-short-desc`

### 2. Diagnose

- Identify blast radius
- Assign single domain agent — no parallel conflicting fixes
- Document in incident log (milestone docs or `docs/incidents/`)

### 3. Minimal Fix

- Smallest change that restores safe operation
- No feature additions
- Regression test if feasible under time pressure

### 4. Abbreviated Review

| Check | Required |
|-------|----------|
| Security review | Yes (auth/data) |
| Full gate | Yes — `gate:m<latest>` |
| DRB visual review | Only if UI changed |
| ARB | Only if architecture changed |

### 5. Deploy

- DevOps deploys from hotfix branch or fast-track merge to main
- Tag: `hotfix-v<version>`
- Monitor for 30 minutes post-deploy

### 6. Rollback Ready

Release Manager confirms previous tag deployable — see ROLLBACK-PLAN.

### 7. Post-Mortem

Within 48 hours:

- Root cause document
- Prevention tasks → Product Manager backlog
- Documentation agent archives incident report

## Communication

- P0 customer-facing: CEO approves messaging
- Internal: Release Manager notifies stakeholders

## Do Not

- Skip Security review on auth/Firebase changes
- Force push main without Release Manager approval
- Leave hotfix branch unmerged — backport to main immediately after deploy
