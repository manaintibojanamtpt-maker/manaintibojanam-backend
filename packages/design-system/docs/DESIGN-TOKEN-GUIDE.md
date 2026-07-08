# Design Token Guide

## Principles

1. **Semantic only** — use `primary`, `textSecondary`, not `#FF7A00`
2. **CSS variables at runtime** — `ThemeProvider` injects `--bds-color-*`
3. **TypeScript tokens for logic** — import from `@bhojan/design-system`

## Color

```ts
import { getSemanticColors, semanticColorsToCssVars } from '@bhojan/design-system';

const dark = getSemanticColors('dark');
// dark.primary, dark.veg, dark.offer, ...
```

Semantic roles: primary, secondary, success, warning, danger, info, background, surface, card, divider, border, textPrimary, textSecondary, textDisabled, offer, veg, nonVeg, delivery, rating, discount, analytics, focusRing.

## Typography

Variants: `displayXl`, `display`, `heading`, `title`, `subtitle`, `bodyLg`, `body`, `bodySm`, `caption`, `label`, `button`, `price`, `discount`, `rating`.

Use `<Text variant="title">` or CSS class `bds-text-title`.

## Spacing

4px base grid: `spacing[1]` = 0.25rem through `spacing[24]`.

CSS: `var(--bds-space-4)`.

## Radius, Shadow, Elevation

Import from tokens; apply via CSS variables `--bds-radius-*`, `--bds-shadow-*`.

## Breakpoints

```ts
import { mediaQueries } from '@bhojan/design-system';
import { useBreakpoint } from '@bhojan/design-system';

const isDesktop = useBreakpoint('lg');
```

## Do Not

- Hardcode hex in components
- Use Tailwind color literals for BDS surfaces
- Duplicate token values in product repos
