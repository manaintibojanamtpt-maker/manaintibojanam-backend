# Test strategy — native migration

## Levels
| Level | Scope | Owner |
|-------|-------|-------|
| Unit | TrackRepository DTO mapping, flag/cohort math | Android / iOS agents |
| Contract | Auth + guest tracking responses match hybrid fixtures | Backend/API agent |
| UI | Compose / SwiftUI status timeline states | Platform agents |
| Integration | Push → open track; deep link → track; flag OFF → hybrid | QA agent |
| Canary | Internal → % ramp with abort rules | QA / Coordinator |

## Track slice must-pass matrix
| Case | Native ON | Flag OFF |
|------|-----------|----------|
| Signed-in track poll | Native UI | Hybrid identical |
| Guest phone track | Native UI | Hybrid identical |
| Terminal status stops poll | Yes | Yes |
| Push open path | Native if cohort | Hybrid |
| API 401/404 | Error UI + analytics | Hybrid error |
| Network offline | Retry/error | Hybrid |

## Parity fixtures
- Capture live/staging tracking JSON from hybrid (`useOrderTracking` responses).
- Replay as golden files in Kotlin/Swift unit tests.
- Status transitions: PLACED → ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED (+ CANCELLED/REJECTED).

## Release gates
See `../rollout/rollout-checklist.md`. No prod pct > 0 without Internal dogfood 48h green.
