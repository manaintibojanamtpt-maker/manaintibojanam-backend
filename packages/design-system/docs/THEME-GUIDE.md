# Theme Guide

## Modes

| Mode | Description |
|------|-------------|
| `dark` | Default — Mana Inti reference (#070504 bg) |
| `light` | Daytime marketplace |
| `brand` | Bhojan corporate accent |
| `food` | Warm food-first variant |
| `system` | Follows OS preference |

## Setup

```tsx
<DesignSystemProvider theme="dark">
  {children}
</DesignSystemProvider>
```

Or granular:

```tsx
<ThemeProvider defaultMode="system">
  <MotionProvider>{children}</MotionProvider>
</ThemeProvider>
```

## Runtime API

```tsx
const { mode, resolved, setMode, toggle } = useBdsTheme();
setMode('light');
```

Theme persists to `localStorage` key `bds-theme-mode`.

## CSS Variables

`ThemeProvider` sets `--bds-color-*` on `document.documentElement`. Components use CSS classes referencing these vars.

## Data Attributes

- `data-bds-theme="dark|light|brand|food"`
- Classes: `bds-theme-dark`, `bds-theme-light`

## Custom Themes (Future)

Extend `getSemanticColors()` in `colors.ts` — do not fork component CSS.

## Testing Themes

Unit tests verify all theme keys expose required semantic roles.
