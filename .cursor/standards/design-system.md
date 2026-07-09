# Design System Standards

## Package

`@bhojan/design-system` (BDS) — **v1.0.0 frozen**.

Location: `packages/design-system/`

## Rules for Application Developers

1. **Import UI primitives from BDS only** — Button, Card, Input, Modal, etc.
2. **Use BDS tokens** — CSS variables `--bds-*` for color, spacing, radius, typography.
3. **Wrap with ThemeProvider** — BDS theme context required at app root.
4. **No forked components** — if BDS lacks a primitive, file ADR → Design System agent.

## Allowed in Apps

- Layout composition with BDS + Tailwind utilities
- Feature-specific CSS layers (e.g., `experience-premium.css`) that **consume** tokens
- Page-level orchestration components

## Not Allowed in Apps

```tsx
// ❌ Custom button
function MyButton() { return <button className="..."> }

// ✅ BDS button
import { Button } from '@bhojan/design-system';
```

## Extending BDS

1. DRB approves need
2. ARB approves API surface
3. Design System agent implements in `packages/design-system/`
4. Version bump + `gate:bds`
5. Apps upgrade dependency

## Theme

- Light and dark mode via BDS ThemeProvider
- Apps must not hardcode colors bypassing tokens

## React Dedupe

Monorepo apps must dedupe React in Vite config to avoid invalid hook calls:

```typescript
// orderbhojan/vite.config.ts
resolve: { alias: { react: ..., 'react-dom': ... }, dedupe: ['react', 'react-dom'] }
```

## Documentation

- BDS docs: `packages/design-system/docs/`
- Gate: `npm run gate:bds`

## Related

- Agent: [agents/04-design-system.md](../agents/04-design-system.md)
- Agent: [agents/03-design-review-board.md](../agents/03-design-review-board.md)
