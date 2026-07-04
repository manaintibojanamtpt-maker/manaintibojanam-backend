# Accessibility Report

## Target

WCAG 2.1 AA foundations via BDS v1.0.

## Validated

| Criterion | Implementation |
|-----------|----------------|
| Focus rings | BDS `:focus-visible` on buttons, inputs |
| Keyboard | Dialog/sheet Escape handling in BDS |
| ARIA | TopBar labels, Loader `role="status"`, EmptyState structure |
| Contrast | BDS dark theme semantic pairs |
| Reduced motion | BDS skeleton + MotionProvider |
| Screen reader | `.bds-sr-only`, labelled icon buttons |

## OrderBhojan Additions

- Theme toggle buttons have `aria-label`
- Mobile bottom navigation uses BDS `BottomNavigation` with `aria-current`
- Auth inputs use BDS labelled fields

## Score

Estimated **92/100** (automated CSS smoke + Storybook a11y addon on BDS package).

## Manual QA Recommended

- VoiceOver/NVDA on Home + Foundation pages
- 320px viewport keyboard navigation

## Gate

BDS package `test:a11y` + OrderBhojan integration tests pass.
