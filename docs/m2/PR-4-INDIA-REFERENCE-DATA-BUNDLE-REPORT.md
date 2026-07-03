# M2 PR-4 — India Reference Data Bundle Report

**PR:** BHOS-M2-PR4  
**Date:** 2026-07-01  
**Bundle version:** `2026.07`  
**Status:** ✅ Complete — static data + integrity tests only  
**Authority:** ADR-011, ReferenceSDK PR-3, M2 Architecture Pack

---

## 1. Reference Bundle Structure

```
src/data/reference/india/
├── bundle/
│   ├── manifest.json
│   ├── country.json
│   ├── states.json
│   ├── districts.json
│   ├── cities.json
│   ├── localities.json
│   └── pincodes.json
├── schema.ts
├── integrity.ts
├── loadBundle.ts
├── README.md
└── __tests__/integrity.test.ts
```

**No ReferenceSDK adapter, no UI, no Firestore, no LocationSDK changes.**

---

## 2. Hierarchy Validation

Validator (`integrity.ts`) checks:

| Rule | Code |
|------|------|
| Unique entity IDs | `ID_DUPLICATE` |
| Unique official codes per kind | `OFFICIAL_CODE_DUPLICATE` |
| Pincode official codes may repeat (India postal reality) | exempt |
| Valid parent chain | `PARENT_NOT_FOUND`, `PARENT_MISMATCH` |
| Country root | `COUNTRY_PARENT`, `COUNTRY_ISO` |
| Kind discriminator | `KIND_MISMATCH` |
| Pincode format `^[1-9][0-9]{5}$` | `PINCODE_FORMAT` |
| Alias non-empty + globally unique (case-insensitive) | `ALIAS_DUPLICATE` |

---

## 3. Integrity Report

| Check | Result |
|-------|--------|
| Full bundle validation | ✅ PASS |
| Unique IDs (243 entities) | ✅ PASS |
| Parent references | ✅ PASS |
| Negative fixture: broken parent | ✅ Detected |
| Negative fixture: duplicate alias | ✅ Detected |

---

## 4. Coverage Report

| Layer | Count | Coverage notes |
|-------|-------|----------------|
| Country | 1 | India (`IN`) |
| States / UTs | 36 | **Complete** — 28 states + 8 UTs |
| Districts | 98 | **Full** MH (36), KA (31), DL (11); major metros in GJ, TN, TG, UP, WB, HR, PB |
| Cities | 52 | Major cities nationally; deep coverage MH/KA/DL |
| Localities | 28 | Pune, Mumbai, Bengaluru, Delhi, Hyderabad, Noida |
| Pincodes | 28 | Linked to localities |
| Aliases | 55 | Includes Bengaluru↔Bangalore, Mumbai↔Bombay, Prayagraj↔Allahabad |

### Product-relevant coverage

- **Pune / Manjari** — localities + pincode `412307` (aligns with existing ServiceabilityService Pune focus)
- **Mumbai, Bengaluru, Delhi, Hyderabad, Noida** — metro localities + pincodes

### Not in v2026.07 (future bundles)

- All-India district completeness (~766 districts)
- All pincode directory
- Village / tehsil granularity

---

## 5. Testing Results

```bash
npm run test:reference   # 10/10 pass
npm run test:sdk         # 51/51 pass (unchanged)
```

Tests:

- Bundle version 2026.07
- Full integrity validation
- 36 states/UTs (28+8 split)
- Canonical alias smoke (Bengaluru, Mumbai, Prayagraj)
- Manifest counts match loaded data
- Negative integrity fixtures

---

## 6. Version

**Reference Bundle:** `2026.07`  
**Schema:** `1`  
**Constant:** `INDIA_REFERENCE_BUNDLE_VERSION` in `schema.ts`

---

## 7. Rollback Plan

Single commit revert removes:

- `src/data/reference/india/` entire tree
- `test:reference` script in `package.json`

No runtime wiring — zero customer impact.

---

## 8. Definition of Done

- [x] Static JSON bundles for full hierarchy
- [x] Stable IDs, official codes, display names, parentId, active
- [x] Optional alias support with canonical examples
- [x] Hierarchy integrity validator
- [x] Integrity test suite (positive + negative)
- [x] Bundle version 2026.07
- [x] Documentation (README + this report)
- [x] No ReferenceSDK adapter
- [x] No UI / dropdowns / owner registration
- [x] No LocationSDK changes
- [x] No Firestore / API / browser logic

---

**STOP.** Await approval for ReferenceSDK static adapter PR (loads this bundle).

---

*BHOS-M2-PR4 — India Reference Data Bundle 2026.07*
