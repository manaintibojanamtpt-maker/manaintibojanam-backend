# Theme Validation Report

## Modes Verified

| Mode | Mechanism | Status |
|------|-----------|--------|
| Dark | BDS `ThemeProvider` default resolved | Pass |
| Light | TopBar toggle | Pass |
| System | TopBar System button → `setMode('system')` | Pass |
| Brand | Available via BDS tokens | Available |
| Food | Available via BDS tokens | Available |

## Token Sources

- Runtime: `--bds-color-*` injected by BDS `ThemeProvider`
- Static: `bds.css` semantic defaults
- PWA: `#ff7a00` theme, `#070504` background
- HTML meta theme-color: `#ff7a00`

## Typography

Plus Jakarta Sans + Outfit loaded via Google Fonts in `index.html`.

## Responsive Typography

BDS text variants scale via component classes; layout breakpoints use `useBreakpoint('md'|'lg')`.

## Tests

`tests/bds-theme.test.ts` validates frozen v1.0.0, theme-color, and no legacy Tailwind brand tokens in pages.
