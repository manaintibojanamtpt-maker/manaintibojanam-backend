# Pricing Projection Read Switch Certification (M8 PR-13)

Standalone certification engine aggregating operational evidence into a read switch decision package.

**NOT wired into `createPricingSDK()`, Pricing Read Adapter, or Rollout Engine.**

## Architecture

```
Operational Evidence → Certification Engine → Readiness Evaluation → Decision Package → STOP
```

## Feature flag

- `FF_PRICING_PROJECTION_CERTIFICATION_ENABLED` (default OFF)
- Environment: `VITE_FF_PRICING_PROJECTION_CERTIFICATION_ENABLED`

## Evidence sources

Parity · Soak · Operational Validation · Rollout Metrics · Repository Health · Lag · Replay · Drift · Governance · Rollback Statistics

## Factory

```typescript
import { createPricingCertificationInfrastructure } from './PricingCertificationFactory';

const infra = createPricingCertificationInfrastructure({
  onTelemetry: (event) => console.log(event),
});

const decision = await infra.certification.certify('pricing-cert-001');
```

Every decision package includes `legacyAuthoritative: true` and `productionActivationProhibited: true`.

**STOP.** Await ARB approval before M8 PR-14 (Pricing Platform v1.0 Certification & Freeze).
