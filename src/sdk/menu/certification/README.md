# Menu Projection Read Switch Certification (M7 PR-13)

Menu projection read switch certification engine. **Evidence and decision packages only — no production activation.**

## Architecture

```
Operational Evidence → Certification Engine → Readiness Evaluation → Decision Package → STOP
```

## Feature Flag (default OFF)

- `FF_MENU_PROJECTION_CERTIFICATION_ENABLED`

## Decision Package

Every package includes:
- `legacyAuthoritative: true`
- `productionActivationProhibited: true`

## Usage

```typescript
import { createMenuCertificationInfrastructure } from '@/sdk/menu/certification/MenuCertificationFactory';

const cert = createMenuCertificationInfrastructure({ featureFlags });
const result = await cert.certification.certify('menu-cert-001');
```

**STOP.** Not wired into MenuSDK, adapter, or rollout. Await ARB approval before PR-14.
