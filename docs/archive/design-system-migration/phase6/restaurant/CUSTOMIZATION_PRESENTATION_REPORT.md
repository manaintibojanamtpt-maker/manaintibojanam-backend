# Phase 6 — Milestone 3C: Customization Presentation Report

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10  
**Status:** ✅ COMPLETE — validation gate passed

---

## Executive summary

Food customization (`FoodCustomizeSheet`) now renders through Founder `src/design-system`. Variants, add-ons, quantity, special instructions, price summary, and confirm CTA use `BottomSheet`, `FoodCustomizationPanelView`, `FoodCustomizationStoryView`, and `QuantityStepperView`. All selection, pricing, and cart logic preserved in the OrderBhojan presentation adapter.

---

## Architecture

```
useFoodPreviewStore (unchanged → cartStore bridge)
        ↓
OrderBhojanFoodCustomizeSheet
        ↓
BottomSheet + FoodCustomizationPanelView
        ↓
QuantityStepperView | SectionHeader | SoftButton
```

---

## New design-system modules

| File | Purpose |
|------|---------|
| `food/FoodCustomizationPanelView.tsx` | Variants, add-ons, qty, instructions, footer |
| `food/FoodCustomizationStoryView.tsx` | Chef note, ingredients, pairing |
| `primitives/QuantityStepperView.tsx` | Founder quantity control + toggle button |
| `layout/BottomSheet.tsx` | `panelClassName`, Escape close, ARIA dialog |

---

## Presentation adapters

| File | Role |
|------|------|
| `OrderBhojanFoodCustomizeSheet.tsx` | State, pricing, cart confirm |
| `OrderBhojanFoodStoryPanel.tsx` | Food → story view model |
| `mapFoodToCustomizationStory.ts` | Story mapper |

---

## Shim policy

- `FoodCustomizeSheet.tsx` → re-exports `OrderBhojanFoodCustomizeSheet`
- `FoodStoryPanel.tsx` → re-exports `OrderBhojanFoodStoryPanel`

Public API unchanged: `{ food, open, onClose }`.

---

## Unchanged (verified)

| Layer | Detail |
|-------|--------|
| Variant default | First variant when none selected |
| Add-on multi-select | Toggle logic preserved |
| Price calc | `basePrice + addonTotal × quantity` |
| Cart write | `useFoodPreviewStore.addItem` |
| Photo | `resolveFoodItemPhoto` |
| Formatters | `formatFoodPrice`, `spiceLabel` |
| Menu host | `OrderBhojanFoodExperience` API unchanged |

---

## Validation

| Check | Result |
|-------|--------|
| `npm run build` | ✅ PASS |
| `validate-architecture.mjs` | ✅ PASS |
| `validate-design-system.mjs` | ✅ PASS |
| `tests/m6-food.test.ts` | ✅ PASS (17/17) |

---

## STOP condition

**Milestone 3C complete. Do not begin Restaurant UX (3D).**

Await Chief Architect approval.
