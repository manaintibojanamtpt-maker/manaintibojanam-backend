# Projection Switch Certification (M6 PR-13)

Certification engine for projection read switch readiness. **Does not activate production routing.**

## Usage

```typescript
import { createProjectionCertificationInfrastructure } from '@/sdk/order/certification/ProjectionCertificationFactory';

const cert = createProjectionCertificationInfrastructure({ featureFlags });
const decision = await cert.certification.certify('cert-001');
```

**STOP.** Legacy remains authoritative until PR-14 production activation.
