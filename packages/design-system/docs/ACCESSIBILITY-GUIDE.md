# Accessibility Guide

## Target

**WCAG 2.1 AA** for all BDS components.

## Built-in Support

### Focus

All interactive elements use `:focus-visible` with `--bds-color-focus-ring` (primary orange).

### Screen Readers

- `Loader` — `role="status"`, `aria-live="polite"`
- `Dialog` / `BottomSheet` — `role="dialog"`, `aria-modal`, labelled titles
- `Tabs` — `role="tablist"`, `aria-selected`
- `QuantityStepper` — `aria-label` on increment/decrement
- `.bds-sr-only` — visually hidden labels

### Motion

`@media (prefers-reduced-motion: reduce)` disables skeleton animation.

### Color Contrast

Dark theme text `#FFFAF3` on `#070504` exceeds AA. Semantic badges use token pairs validated for legibility.

## Checklist for Consumers

- [ ] Provide alt text for food/restaurant images
- [ ] Don't rely on color alone for veg/non-veg — use Badge text
- [ ] Test keyboard navigation for modals (Escape closes)
- [ ] Run Storybook a11y addon on new stories

## Testing

```bash
npm run test:a11y
```

Validates CSS includes focus, reduced-motion, and core selectors.

## Storybook

`@storybook/addon-a11y` enabled in dev mode.
