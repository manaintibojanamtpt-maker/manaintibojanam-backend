# OrderSDK Read API v1.0.0 — Documentation Index

**Status:** Frozen  
**Version:** `1.0.0`  
**Tag:** `orders-sdk-read-v1.0`  
**ADR:** [ADR-013](../adr/ADR-013-order-sdk-read-v1-freeze.md)

---

## Specification

| # | Document | Description |
|---|----------|-------------|
| 1 | [API Reference](./v1.0/API-REFERENCE.md) | Methods, parameters, examples |
| 2 | [Public Interfaces](./v1.0/PUBLIC-INTERFACES.md) | Frozen exports and types |
| 3 | [DTO Reference](./v1.0/DTO-REFERENCE.md) | Read models and enums |
| 4 | [Error Catalogue](./v1.0/ERROR-CATALOGUE.md) | Error codes and handling |
| 5 | [Result Types](./v1.0/RESULT-TYPES.md) | SdkResult patterns |
| 6 | [Versioning Policy](./v1.0/VERSIONING-POLICY.md) | Semver rules |
| 7 | [Compatibility Rules](./v1.0/COMPATIBILITY-RULES.md) | Consumer matrix |
| 8 | [Breaking Change Policy](./v1.0/BREAKING-CHANGE-POLICY.md) | Governance |
| 9 | [Migration Guide](./v1.0/MIGRATION-GUIDE.md) | Strangler migration steps |

---

## Release & certification

- [Release Notes](../releases/orders-sdk-read-v1.0.md)  
- [Certification Report](./ORDER-SDK-READ-v1.0-CERTIFICATION.md)  

---

## Code entry points

```typescript
import {
  createOrderSDK,
  ORDER_SDK_READ_API_VERSION,
  ORDER_SDK_READ_API_FROZEN,
} from '@/sdk';
```

---

*OrderSDK Read API v1.0.0 — first stable read contract.*
