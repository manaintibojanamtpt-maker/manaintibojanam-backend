# Developer Guide

## Repository Location

```
packages/design-system/
├── src/
│   ├── tokens/
│   ├── components/
│   ├── providers/
│   ├── hooks/
│   ├── styles/bds.css
│   └── index.ts
├── docs/
├── tests/
├── scripts/gate-bds.mjs
└── .storybook/
```

## Local Development

```bash
cd packages/design-system
npm install
npm run dev          # Storybook :6006
npm run lint
npm run test:unit
npm run gate:bds     # Full milestone gate
```

## Adding a Component

1. Create `src/components/MyComponent/MyComponent.tsx`
2. Use `cn()` + `bds-*` CSS classes only
3. Export from `src/components/MyComponent/index.ts`
4. Add to `src/components/index.ts`
5. Add Storybook story
6. Update `docs/COMPONENT-GUIDE.md`

## Peer Dependencies

React 18 or 19.

## Build Output

- `dist/index.js` + `.d.ts`
- `dist/styles/bds.css`

## CI Integration (Future)

Run `npm run gate:bds` in monorepo pipeline when BDS changes.

## Rules

- No business logic
- No hardcoded colors/spacing
- No product-specific copy in components
