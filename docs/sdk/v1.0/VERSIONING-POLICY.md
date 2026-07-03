# OrderSDK Read API — Versioning Policy

**Read API version:** `1.0.0` (`ORDER_SDK_READ_API_VERSION`)  
**Tag:** `orders-sdk-read-v1.0`  
**Authority:** ADR-013

---

## Scope

This policy applies **only** to the OrderSDK **read** public surface:

- `OrderSDK` interface (4 methods)  
- Read DTOs (`OrderReadModel`, filters, guest token types)  
- Branded IDs used by read methods  
- `SdkResult` / `SdkError` as consumed by read methods  

Whole-package `SDK_VERSION` (`0.1.0-scaffold`) remains a monorepo scaffold marker until M2 package split.

---

## Semantic versioning

| Bump | Allowed changes | Approval |
|------|-----------------|----------|
| **Patch** (1.0.x) | Bug fixes, mapper corrections, docs | SDK maintainer |
| **Minor** (1.x.0) | Additive only: new optional DTO fields, new error `details`, new optional filter params | SDK maintainer + changelog |
| **Major** (x.0.0) | Remove/rename methods, change required fields, change error codes, change result shape | **ADR + Architecture Review Board** |

---

## Version constants

```typescript
import { ORDER_SDK_READ_API_VERSION, ORDER_SDK_READ_API_FROZEN } from '@/sdk';
```

When `ORDER_SDK_READ_API_FROZEN === true`, breaking changes are prohibited without major bump.

---

## Release artifacts

Each read API release publishes:

1. API Reference (`docs/sdk/v1.0/API-REFERENCE.md`)  
2. Release notes (`docs/releases/orders-sdk-read-v1.0.md`)  
3. Certification report (for major/minor freeze milestones)  
4. Git tag: `orders-sdk-read-v{semver}`  

---

## Relationship to feature flags

UI strangler flags (`FF_SDK_ORDERTRACKING_ENABLED`, etc.) are **deployment controls**, not API version markers. Read API v1.0.0 is stable regardless of flag state.

---

*Effective 2026-06-26.*
