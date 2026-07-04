# M1.6 Responsive Report

## Breakpoints Covered

CSS media queries and fluid units target:

| Width | Treatment |
|-------|-----------|
| 320–412 | Mobile-first single column, safe-area padding |
| 768+ | Wider restaurant cards, increased hero height |
| 1024+ | Two-column home stack for secondary sections |
| 1280+ | Wider restaurant rail tiles |

## Safe Area

All shell chrome uses:

- `env(safe-area-inset-top)` — notch / Dynamic Island
- `env(safe-area-inset-bottom)` — gesture navigation
- `env(safe-area-inset-left/right)` — foldables, punch-hole margins

## Validation

```bash
npm run test:responsive
```

## No Horizontal Scroll

`overflow-x: hidden` on marketplace shell; rails use internal scroll only.
