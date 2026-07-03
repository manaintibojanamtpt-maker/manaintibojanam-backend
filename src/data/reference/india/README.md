# India Reference Data Bundle

**Bundle version:** `2026.07`  
**Schema version:** 1  
**Status:** M2 PR-4 — static data only (no ReferenceSDK adapter)

---

## Structure

```
src/data/reference/india/
├── bundle/
│   ├── manifest.json      # Version + entity counts
│   ├── country.json       # Single country (India)
│   ├── states.json        # 36 states / UTs
│   ├── districts.json     # 98 districts (full MH/KA/DL + major metros)
│   ├── cities.json        # 52 major cities
│   ├── localities.json    # 28 localities (Pune, Mumbai, Bengaluru, Delhi, …)
│   └── pincodes.json      # 28 pincodes
├── schema.ts              # Bundle TypeScript types
├── integrity.ts           # Hierarchy validation (pure)
├── loadBundle.ts          # Read-only loader (tests + future adapter)
└── __tests__/
    └── integrity.test.ts
```

---

## Hierarchy

```
Country (IN)
  └── State / UT (36)
        └── District (98)
              └── City (52)
                    └── Locality (28)
                          └── Pincode (28)
```

---

## Entity fields

Every entity includes:

- `id` — stable SDK identifier (`ref-state-in-mh`, …)
- `officialCode` — government / postal code
- `displayName` — UI label
- `parentId` — parent entity reference
- `active` — selectable flag
- `kind` — entity discriminator
- `aliases?` — optional display-name aliases

---

## Canonical aliases (examples)

| Entity | Display name | Aliases |
|--------|--------------|---------|
| Bengaluru | Bengaluru | Bangalore, Bangaluru |
| Mumbai | Mumbai | Bombay |
| Prayagraj | Prayagraj | Allahabad |
| Gurugram | Gurugram | Gurgaon |
| Kolkata | Kolkata | Calcutta |

---

## Validation

```bash
npm run test:reference
```

Checks: unique IDs, parent integrity, official code uniqueness (except pincodes), alias uniqueness, pincode format.

---

## Usage (future)

ReferenceSDK static adapter (not in PR-4) will load from `bundle/` via `loadIndiaReferenceBundle()`.

---

*Reference Bundle 2026.07 — data only, no UI.*
