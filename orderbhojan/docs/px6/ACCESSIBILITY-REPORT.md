# PX6 Accessibility Report

| Check | Status |
|---|---|
| BDS CSS a11y smoke | PASSED |
| WCAG AA focus rings | BDS buttons / segmented control / food row press targets |
| Touch targets | 48px min on back, add buttons, quantity stepper |
| Screen reader | Section `aria-labelledby`; preview `aria-live="polite"`; dish poster `aria-label` |
| Reduced motion | Enter, add-fly, preview pulse, sheet price transitions disabled under `prefers-reduced-motion` |
| Safe areas | `env(safe-area-inset-*)` on identity strip, floating preview, sheet footer |
| Semantic structure | `<header>` identity; category sections `h2`; storytelling `dl`/`blockquote` |
| Keyboard | Food rows as buttons when customizable; native stepper and sheet controls |

## Keyboard

- Back: labeled compact button
- Category rail: BDS sticky chips (button elements)
- Add / quantity: BDS `FoodRowAddButton`, `QuantityStepper`
- Customize sheet: `SegmentedControl`, option buttons, textarea

## Command

```
npm run test:a11y --prefix ../packages/design-system
```
