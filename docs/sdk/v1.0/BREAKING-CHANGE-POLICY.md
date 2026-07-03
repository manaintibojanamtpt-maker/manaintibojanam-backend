# OrderSDK Read API — Breaking Change Policy

**Authority:** ADR-013, FEB-001 (architecture freeze)

---

## Definition of breaking change

A change is **breaking** if it could cause existing consumer code to fail at compile time or change runtime behavior without code changes:

- Removing or renaming a public method on `OrderSDK`  
- Changing method parameter types (required → optional is OK; optional → required is breaking)  
- Removing or renaming required DTO fields  
- Changing `SdkErrorCode` string literals  
- Changing `SdkResult` union shape (`ok` / `value` / `error`)  
- Changing normalized `OrderStatus` mapping in a way that alters UI-visible states  

---

## Process for breaking changes

1. **Proposal** — Document motivation, migration path, and affected consumers.  
2. **ADR** — New ADR (e.g. ADR-0XX) with Architecture Review Board review.  
3. **Version bump** — Major increment: `2.0.0` → tag `orders-sdk-read-v2.0`.  
4. **Migration guide** — Required before release.  
5. **Deprecation period** — Minimum one minor release with `@deprecated` JSDoc on old symbols (when feasible).  
6. **Certification** — New certification report before tag.  

---

## Prohibited without ADR

- Adding write methods to `OrderSDK` read freeze scope  
- Merging Checkout into OrderSDK  
- Changing guest token contract (ADR-012) without cross-ADR review  

---

## Non-breaking (no ADR required)

- Patch: mapper bug fixes, error message text, internal adapter refactors  
- Minor: new optional DTO fields, new `details` keys, documentation  

---

## Emergency fixes

Security patches may ship as patch releases even if they tighten validation, provided:

- Error **codes** unchanged  
- Method signatures unchanged  
- Documented in release notes  

---

*Breaking change policy effective with v1.0.0 freeze.*
