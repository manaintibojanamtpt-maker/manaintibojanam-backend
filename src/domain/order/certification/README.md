# Projection Switch Certification Domain (M6 PR-13)

Pure domain rules for projection read switch certification. No SDK imports.

## Status

| Status | Meaning |
|--------|---------|
| `READY` | All gates pass; decision package recommends GO (activation still prohibited until PR-14) |
| `CONDITIONAL` | Borderline evidence; investigate before activation |
| `NOT_READY` | Critical gates failed; legacy remains authoritative |

## Evidence

Certification consumes parity, operational, rollout, rollback, health, lag, replay, soak, drift, and governance evidence.

**STOP.** Certification does not switch production routing.
