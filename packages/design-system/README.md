# @bhojan/design-system

Official **Bhojan Design System (BDS)** — the permanent visual language for BhojanOS, OrderBhojan, and future Bhojan products.

## BDS-1 Scope

Foundation milestone only: tokens, providers, reusable components, motion presets, Storybook, tests, and quality gate. **Not integrated** into production apps until DRB/ARB approval.

## Install

```bash
cd packages/design-system
npm install
```

## Usage (post-approval)

```tsx
import '@bhojan/design-system/styles.css';
import { DesignSystemProvider, Button, Card } from '@bhojan/design-system';

export function App() {
  return (
    <DesignSystemProvider theme="dark">
      <Card>
        <Button variant="primary">Order Now</Button>
      </Card>
    </DesignSystemProvider>
  );
}
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Storybook on port 6006 |
| `npm run build` | TypeScript + CSS dist |
| `npm run lint` | ESLint + typecheck |
| `npm run test:unit` | Token & utility tests |
| `npm run test:a11y` | CSS a11y smoke |
| `npm run gate:bds` | **BDS-1 quality gate** |

## Reference

Visual language abstracted from **Mana Inti Bojanam** storefront (`#FF7A00` primary, dark food-first surfaces, Plus Jakarta Sans / Outfit).

## Governance

Stop after BDS-1. Do not migrate OrderBhojan or BhojanOS until explicit DRB exit approval.
