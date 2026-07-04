# Developer Migration Guide (OrderBhojan)

## Import BDS

```tsx
import { Button, Card, DesignSystemProvider } from '@bhojan/design-system';
```

Styles are loaded globally in `main.tsx` via `globals.css` → `@import "@bhojan/design-system/styles.css"`.

## Providers

Do not add a local `ThemeProvider`. Use `useBdsTheme()` from BDS:

```tsx
const { mode, resolved, setMode, toggle } = useBdsTheme();
```

## Layouts

| Layout | Use |
|--------|-----|
| `MarketplaceLayout` | Default marketplace chrome |
| `AuthLayout` | Centered auth flows |
| `FullScreenLayout` | Immersive pages |

## Styling Rules

- Use `var(--bds-space-*)` and `var(--bds-color-*)` — no hex in components
- Use BDS `Text` variants instead of raw headings
- No new files in `shared/components/`

## Toast

```tsx
import { useBdsToast } from '@/shared/providers/BdsToastProvider';
const { showToast } = useBdsToast();
showToast('Saved', 'success');
```

## Quality

```bash
npm run gate:bds2   # Full BDS-2 gate
npm run test:bds    # Integration tests only
```

## M1+

New features must import UI from `@bhojan/design-system` only.
