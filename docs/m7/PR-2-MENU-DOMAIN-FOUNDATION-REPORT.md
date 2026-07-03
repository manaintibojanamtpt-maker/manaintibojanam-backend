# M7 PR-2 — Menu Domain Foundation Report

**Program:** BHOS-M7  
**PR:** M7 PR-2 — Menu Domain Foundation  
**Date:** 2026-06-27  
**Version:** `MENU_DOMAIN_VERSION = 0.2.0-foundation`  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-2 establishes the **pure menu domain foundation** for the BhojanOS Catalog Kernel. Business rules live exclusively in `src/domain/menu/` — catalog, pricing, availability, modifiers, combos, and validation.

**Pure domain only.** No SDK changes, no Firestore, no repository implementations, no UI, no projections, no runtime wiring. Zero production impact.

---

## 2. Architecture

```
Presentation (future)
        ↓
MenuFacade (future)
        ↓
MenuSDK (frozen — M7 PR-1)
        ↓
Domain (M7 PR-2 — this PR)
        ↓
Repository (future — M7 PR-3+)
```

Business rules belong **only** inside `src/domain/menu/`.

---

## 3. Domain Model

| Model | Module | Description |
|-------|--------|-------------|
| `MenuCatalog` | `catalog/` | Root catalog aggregate |
| `MenuCategory` | `catalog/` | Category with item references |
| `MenuItem` | `catalog/` | Sellable menu item |
| `BranchOverride` | `catalog/` | Branch-scoped override placeholder |
| `PriceSnapshot` | `pricing/` | Immutable price reference |
| `EffectivePrice` | `pricing/` | Base + final price |
| `DiscountPolicy` | `pricing/` | Placeholder |
| `TaxReference` | `pricing/` | Placeholder |
| `MenuAvailability` | `availability/` | Item/combo availability |
| `AvailabilityState` | `availability/` | available, unavailable, temporarily_unavailable, out_of_stock, hidden |
| `ModifierGroup` | `modifiers/` | Selection group with rules |
| `Modifier` | `modifiers/` | Individual modifier |
| `Combo` | `combos/` | Bundle with components |

---

## 4. Validation Rules

### Catalog

| Function | Validates |
|----------|-----------|
| `validateCatalog()` | IDs, duplicates, orphan references, nested category/item rules |
| `validateCategory()` | Category ID, name, sort order |
| `validateMenuItem()` | Item ID, name, category, price, availability |

### Modifiers

| Function | Validates |
|----------|-----------|
| `validateModifierGroup()` | Range, required group, duplicate IDs |
| `validateModifier()` | Modifier ID, name, price |
| `validateModifierSelection()` | Min/max, duplicates, active modifiers |

### Combos

| Function | Validates |
|----------|-----------|
| `validateCombo()` | Components, quantities, required items, price, availability |

### Validators

`MenuDomainValidator`, `CategoryValidator`, `ItemValidator`, `ModifierValidator`, `ComboValidator`, `AvailabilityValidator`

---

## 5. Pricing Model

- `validatePriceSnapshot()` — non-negative finite amount, non-empty currency
- `validateEffectivePrice()` — validates base and final snapshots
- `createEffectivePrice()` — pure helper; no discount calculation infrastructure
- `DiscountPolicy`, `TaxReference` — placeholders for future PRs

---

## 6. Availability Model

| State | Sellable | Visible |
|-------|----------|---------|
| `available` | Yes | Yes |
| `unavailable` | No | Yes |
| `temporarily_unavailable` | No | Yes |
| `out_of_stock` | No | Yes |
| `hidden` | No | No |

`aggregateComboAvailability()` — pure aggregation from component states.

---

## 7. Modifier Rules

- Minimum / maximum selection counts enforced
- Required groups must have active modifiers
- Duplicate modifier IDs prevented in groups
- Duplicate selections prevented at order time
- Selection count validated against min/max

---

## 8. Combo Rules

- At least one component required
- At least one component must be `required: true`
- Positive integer quantities only
- Price and availability validation
- Availability aggregated from components

---

## 9. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Domain leaking into SDK | No SDK files modified |
| Infrastructure coupling | Zero imports from SDK/Firestore |
| Premature pricing logic | Validation only; placeholders for tax/discount |
| Breaking frozen MenuSDK contracts | DTOs and contracts untouched |

---

## 10. Rollback

1. Remove M7 PR-2 domain additions under `src/domain/menu/` (catalog, pricing, etc.)
2. Restore PR-1 placeholder files if needed
3. Revert tests and `docs/m7/PR-2-*`
4. No runtime impact

---

## 11. Definition of Ready

- [x] M7 PR-1 MenuSDK foundation complete
- [x] 796/796 baseline tests passing
- [x] MenuSDK contracts frozen
- [x] No M1–M6 modifications

---

## 12. Definition of Done

- [x] Domain foundation exists across catalog/pricing/availability/modifiers/combos
- [x] Pure business rules as functions and validators
- [x] 100% isolated — no infrastructure imports
- [x] Deterministic unit tests
- [x] No SDK, DTO, repository, or UI changes
- [x] Documentation complete
- [x] M7 PR-3 not started

---

## 13. Generated Files

### `src/domain/menu/`

| Path | Purpose |
|------|---------|
| `catalog/MenuCatalog.ts` | Catalog model |
| `catalog/MenuCategory.ts` | Category model |
| `catalog/MenuItem.ts` | Item model |
| `catalog/BranchOverride.ts` | Branch override placeholder |
| `catalog/catalogRules.ts` | Catalog validation rules |
| `pricing/PriceSnapshot.ts` | Pricing models |
| `pricing/pricingRules.ts` | Price validation |
| `availability/MenuAvailability.ts` | Availability models |
| `availability/availabilityRules.ts` | Availability validation + aggregation |
| `modifiers/ModifierGroup.ts` | Modifier models |
| `modifiers/modifierRules.ts` | Modifier validation + selection |
| `combos/Combo.ts` | Combo model |
| `combos/comboRules.ts` | Combo validation |
| `validation/*` | Validators and error types |
| `shared/*` | Constants, reason codes, result helpers |
| `README.md` | Domain documentation |

---

## STOP — PR-3 Prohibited

Do **not** begin M7 PR-3 (Menu Repository Foundation) until explicit Architecture Review Board approval.
