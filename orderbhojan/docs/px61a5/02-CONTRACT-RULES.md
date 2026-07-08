# 02 — Contract Rules

Layer boundaries and prohibitions for the public contract layer.

---

## Layer responsibilities

| Layer | Responsibility | Must NOT |
|---|---|---|
| **Domain** | Business invariants, aggregates, lifecycle | Expose public HTTP shapes |
| **Contracts** | Immutable versioned DTO specifications | Contain persistence or UI logic |
| **Firestore** | Persist domain state | Define consumer field names |
| **Marketplace API** | Transport, auth, geo compute, map domain → contracts | Redefine contract fields |
| **DTO Mapper** | Domain → Contract projection | Add computed consumer copy |
| **OrderBhojan** | Render contract fields | Invent or transform business values |

---

## Contract MUST contain

- `schemaVersion` on every DTO and nested DTO
- Opaque public IDs (`restaurantId`, `foodId`, `offerId`)
- Owner-authored display strings (`displayText`, `displayName`)
- Raw numeric/money values (`MoneyDTO.amount`)
- Enum status values (not English sentences derived locally)
- ISO 8601 timestamps in validity blocks
- `readonly` semantics (immutable at consumption)

---

## Contract MUST NOT contain

| Prohibition | Example of violation |
|---|---|
| React types | `ReactNode`, `JSX.Element` |
| Firestore paths | `tenants/abc/menu/xyz` |
| Internal BhojanOS IDs | raw `tenantId`, Firestore doc refs |
| UI formatting | `"₹249"`, `"25–35 min"`, `"17% OFF"` |
| Computed presentation strings | `formatOfferLabel()` output |
| Presentation logic | `isHighlighted`, `shouldShowBadge` |
| Mock / fixture data | Hardcoded Unsplash URLs in contract spec |
| HTML | `"<b>Spicy</b>"` in displayText |
| JSX | Any markup |
| Renderer decisions | `className`, `variant: 'primary'` |
| Checkout coupon codes | `SAVE50` in marketplace OfferDTO |
| Percentage display derived from price | Contract carries `type` for icon hints only; display is `displayText` |

---

## ID rules

| ID type | Format | Exposed? |
|---|---|---|
| Public restaurant ID | `obr_*` opaque string | Yes |
| Public food ID | `obf_*` opaque string | Yes |
| Public category ID | `obc_*` opaque string | Yes |
| Public offer ID | `obo_*` opaque string | Yes |
| Asset ID | `oba_*` opaque string | Yes |
| Firestore document path | — | **Never** |
| Domain internal UUID | — | **Never** |
| Slug | `[a-z0-9-]+` | Yes (URLs only) |

Mappers generate stable public IDs at first publish. IDs never expose storage keys.

---

## Money rules

- Always `MoneyDTO { amount, currency }` — never formatted strings
- `amount` is decimal major units (249.00), not paise — **mapper normalizes** at boundary
- Currency from owner restaurant config; default `"INR"` when single-market
- Renderer applies locale formatting — **not** contract responsibility

---

## Offer rules

1. Disabled offers **never appear** in contract output
2. `displayText` is mandatory when offer is present
3. `type` is informational (icon selection in renderer) — **not** a license to compute text
4. Multiple offers sorted by `priority` descending in arrays
5. `primaryOffer` = first enabled restaurant-scoped offer by priority

---

## Label rules

1. Labels are owner-selected; `displayText` is owner-editable
2. `kind` is stable enum for analytics — `displayText` is consumer-visible
3. Empty `labels[]` is valid — renderer shows no label badges
4. No boolean `bestSeller` in v1 contract — use `LabelDTO kind: BESTSELLER`

---

## Image rules

1. `url` must be HTTPS CDN URL from owner media pipeline
2. `blurHash` optional — generated at upload, not by renderer
3. No stock photography URLs in production contracts
4. Renderer builds srcset — contract supplies base `url` + dimensions

---

## Null vs omit

| Situation | Contract behavior |
|---|---|
| Optional field with no value | **Omit key** (preferred) or `null` per field spec |
| Empty arrays | Include `[]` — means explicitly none |
| Disabled offer | **Omit** `offer` key entirely |
| Hidden product | **Omit** from `FoodMenuDTO.items` |

---

## Mapper prohibitions

Mappers may:
- Resolve references (addon groups, offers)
- Compute geo-dependent snapshots (ETA, distance, fee) into numeric DTO fields
- Filter disabled/hidden entities
- Normalize money precision

Mappers may NOT:
- Invent marketing copy
- Compute `% OFF` strings
- Apply English labels to enums (except owner-configured `displayText`)
- Fall back to mock catalog data

---

## Renderer prohibitions

Renderers may:
- Format `MoneyDTO` → localized currency string
- Format `EtaRangeDTO` → `"25–35 min"` display
- Map `OperationalStatus` enum → localized status label via i18n catalog
- Apply motion, layout, accessibility

Renderers may NOT:
- Compute offer text from prices
- Map `bestSeller: true` → `"Bestseller"`
- Infer dietary from product name
- Substitute manifest/stock images when `ImageDTO.url` missing (show empty state)

---

## Cross-layer data flow (canonical)

```
Owner edits domain field
  → Firestore persists domain projection
  → Domain entity loaded
  → Mapper projects to Contract DTO
  → API serializes JSON
  → OrderBhojan deserializes + renders
```

No shortcuts. No `mockCatalog.ts` in production path.

---

## Certification grep gates (PX6.1G)

Contract compliance verified when production code has **zero**:

- `formatOfferLabel` with percentage math
- `"Bestseller"` / `"Chef recommended"` string literals in food components
- `placehold.co` / manifest URLs as business data in components
- `COMMON_ADDONS`
- Direct `mockCatalog` imports in experience features

---

*Contracts are the law. Implementation conforms to contracts — not the reverse.*
