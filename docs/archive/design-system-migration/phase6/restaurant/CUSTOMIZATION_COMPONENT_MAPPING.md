# Customization Component Mapping — Phase 6 / Milestone 3C

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10  
**Status:** ✅ Mapping complete — Milestone 3C implementation complete

---

## Customize sheet (`FoodCustomizeSheet`)

| Current OB Component | File | Founder DS Replacement | Presentation Wire | Migration Status |
| -------------------- | ---- | ---------------------- | ----------------- | ---------------- |
| Sheet shell | BDS `BottomSheet` | `BottomSheet` (`src/design-system/layout`) | `OrderBhojanFoodCustomizeSheet` | ✅ Complete |
| Sheet body orchestration | `FoodCustomizeSheetBody` | Presentation adapter (logic retained) | `OrderBhojanFoodCustomizeSheet` | ✅ Complete |
| Hero blur | `ob-food-px6__sheet-hero` | Inline blur in panel view | `FoodCustomizationPanelView` | ✅ Complete |
| Story / chef note | `FoodStoryPanel` | `FoodCustomizationStoryView` | `OrderBhojanFoodCustomizationStory` | ✅ Complete |
| Variant cards (≤4) | BDS `SegmentedControl` | Founder chip row | `FoodCustomizationPanelView` | ✅ Complete |
| Variant cards (>4) | `ob-food-sheet__option` buttons | Glass-styled list rows | `FoodCustomizationPanelView` | ✅ Complete |
| Add-on cards | BDS `Badge` + option buttons | Toggle option rows + offer pills | `FoodCustomizationPanelView` | ✅ Complete |
| Quantity stepper | BDS `QuantityStepper` | `QuantityStepperView` | `FoodCustomizationPanelView` | ✅ Complete |
| Special instructions | `ob-food-sheet__textarea` | Founder form textarea styling | `FoodCustomizationPanelView` | ✅ Complete |
| Price summary | BDS `Text` price row | Footer price block | `FoodCustomizationPanelView` | ✅ Complete |
| Confirm CTA | BDS `Button` primary | `SoftButton` primary | `FoodCustomizationPanelView` | ✅ Complete |
| Section headings | BDS `Text` subtitle | `SectionHeader` | `FoodCustomizationPanelView` | ✅ Complete |
| Spice caption | BDS `Text` caption | Inline caption in panel view | `FoodCustomizationPanelView` | ✅ Complete |

---

## Business logic (unchanged)

| Concern | Location | Action |
| ------- | -------- | ------ |
| Variant selection state | Presentation adapter | **Copy verbatim** from `FoodCustomizeSheetBody` |
| Add-on toggle logic | Presentation adapter | **Unchanged** |
| Price calculation | Presentation adapter | **Unchanged** (`basePrice + addonTotal × quantity`) |
| Cart sync | `useFoodPreviewStore` → `useCartStore` | **Unchanged** |
| Photo resolve | `resolveFoodItemPhoto` | **Unchanged** |
| Formatters | `formatFoodPrice`, `spiceLabel` | **Unchanged** |
| Validation rules | Implicit (first variant default) | **Unchanged** |
| Inventory / availability | Parent passes `food` | **Unchanged** |

---

## Route / integration (unchanged)

| Consumer | File | Action |
| -------- | ---- | ------ |
| Menu page host | `OrderBhojanFoodExperience.tsx` | Import shim `FoodCustomizeSheet` (unchanged API) |
| Featured card trigger | `OrderBhojanFoodFeaturedCard` | **Unchanged** — `onCustomize(food)` |
| List card trigger | `OrderBhojanFoodCardItem` | **Unchanged** — `onCustomize(food)` |

---

## CSS / BDS (retain until Phase 7)

| Asset | Action |
| ----- | ------ |
| `experience-food.css` | Keep loaded; sheet hot-path rules orphaned |
| `ob-food-px6__*` sheet classes | Replaced by DS panel view |
| BDS `BottomSheet`, `SegmentedControl`, `QuantityStepper` | Removed from hot path |

---

## Founder DS components used (3C)

| DS Component | Usage |
| ------------ | ----- |
| `BottomSheet` | Modal shell, scroll lock, drag dismiss |
| `FoodCustomizationPanelView` | Variants, add-ons, qty, instructions, footer |
| `FoodCustomizationStoryView` | Chef note, ingredients, pairing |
| `QuantityStepperView` | Minus / plus quantity control |
| `Section` / `SectionHeader` | Section grouping |
| `GlassCard` | Variant / add-on option rows (>4 variants) |
| `SoftButton` | Confirm CTA |
| `TrustBadge` | Add-on price pills (optional / offer tone) |

---

## Behaviour preservation matrix

| Behaviour | Preserved via |
| --------- | ------------- |
| Default first variant | `variant ?? food.variants[0]` |
| Multi-select add-ons | `toggleAddon` logic |
| Live price update | `aria-live="polite"` on total |
| Confirm → cart | `useFoodPreviewStore.addItem` |
| Sheet reset on food change | `key={food.foodId}` on body |
| Escape close | `BottomSheet` keyboard handler |
| Focus trap / scroll lock | `BottomSheet` body overflow lock |

---

## Implementation order

1. `src/design-system/food/types.ts` — customization view models
2. `src/design-system/food/FoodCustomizationStoryView.tsx`
3. `src/design-system/food/FoodCustomizationPanelView.tsx`
4. `src/design-system/primitives/QuantityStepperView.tsx`
5. `src/design-system/layout/BottomSheet.tsx` — `panelClassName`, Escape
6. `presentation/food/OrderBhojanFoodCustomizeSheet.tsx`
7. Shims: `FoodCustomizeSheet.tsx`, `FoodStoryPanel.tsx`
8. Validation + deliverables + scorecard + release dashboard

---

## Checkpoint

**Mapping complete.** Implementation may proceed.

**STOP after 3C validation — do not begin Restaurant UX (3D).**
