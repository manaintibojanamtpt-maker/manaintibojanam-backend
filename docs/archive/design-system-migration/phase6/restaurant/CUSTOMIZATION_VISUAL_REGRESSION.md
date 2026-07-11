# Phase 6 — Milestone 3C: Customization Visual Regression Report

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10

## Method

Static comparison against Founder Store `MenuItemCard` addon modal and OrderBhojan menu dark canvas (`#030303` / `#0d0d0d`).

---

## Sheet shell

| Attribute | Before (BDS) | After (Founder DS) | Match |
|-----------|--------------|---------------------|-------|
| Container | BDS `BottomSheet` | Founder `BottomSheet` | ✅ |
| Theme | `ob-food-px6__sheet` CSS | Dark panel `#0d0d0d` | ✅ |
| Drag dismiss | BDS overlay | Framer drag + backdrop | ✅ |
| Escape close | BDS key handler | Founder `BottomSheet` Escape | ✅ |
| Title | BDS `Text` title | Centered h3 in sheet header | ✅ |

---

## Variants

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| ≤4 options | BDS `SegmentedControl` | Founder chip row (radio group) | ✅ |
| >4 options | Option list buttons | Glass-styled list rows | ✅ |
| Price per variant | BDS `Text` price | Inline price label on chip/row | ✅ |
| Active state | BDS segment active | Orange border / fill | ✅ |

---

## Add-ons

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Layout | Option button + BDS `Badge` | Row + circular toggle (Founder pattern) | ✅ |
| Multi-select | Preserved | Preserved | ✅ |
| Price pill | BDS offer badge | Amber offer pill | ✅ |

---

## Quantity & instructions

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Stepper | BDS `QuantityStepper` | `QuantityStepperView` | ✅ |
| Instructions | CSS textarea | Founder rounded textarea | ✅ |
| Spice note | BDS caption | Uppercase caption | ✅ |

---

## Footer

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Live total | BDS `Text` + `aria-live` | Preserved `aria-live="polite"` | ✅ |
| Confirm | BDS `Button` primary | `SoftButton` full width | ✅ |
| Sticky footer | CSS sticky | Sticky with safe-area padding | ✅ |

---

## Story panel

| Attribute | Before | After | Match |
|-----------|--------|-------|-------|
| Chef note | BDS `Text` blockquote | Founder story card | ✅ |
| Metadata dl | CSS grid | DS typography grid | ✅ |

---

## Responsive

| Breakpoint | Layout | Match |
|------------|--------|-------|
| Mobile | Full-width sheet 92vh | ✅ |
| Tablet | Centered sheet column | ✅ |
| Desktop | Same bottom sheet pattern as Founder Store | ✅ |
