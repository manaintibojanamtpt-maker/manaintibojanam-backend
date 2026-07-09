# React Standards

## Version

React 18+ with functional components only. No class components.

## Component Structure

```tsx
// 1. Imports
// 2. Types
// 3. Component
// 4. Subcomponents (if tiny and private)

interface Props {
  title: string;
  onAction?: () => void;
}

export function FeatureCard({ title, onAction }: Props) {
  // hooks first
  // derived state
  // handlers
  // render
}
```

## Hooks Rules

- Hooks at top level only — no conditionals
- Custom hooks in `hooks/` or `features/<domain>/hooks/`
- Extract logic to hooks when component exceeds ~150 lines

## State Management

| State Type | Tool |
|------------|------|
| Server / API | TanStack Query |
| Auth session | Auth context / Firebase |
| UI-local | `useState` |
| Cross-feature UI | Zustand or context (ARB-approved) |
| Form | Controlled components or react-hook-form |

## Routing

- React Router v6+
- Protected routes via `RequireAuth` wrapper (Authentication agent)
- Lazy load route components for code splitting

## Styling

- **BDS components** for UI primitives
- Tailwind utility classes for layout
- Feature CSS layers in `src/styles/` for complex visual systems (e.g., experience-premium.css)
- Do not `@import` feature CSS from `globals.css` — import from `main.tsx`

## Performance

- `React.memo` only when profiling shows benefit
- Stable callback refs with `useCallback` when passed to memoized children
- Virtualize long lists (Performance agent)
- Images: lazy load, blur-up pattern where implemented

## Accessibility

- Semantic HTML first
- `aria-*` only when semantic HTML insufficient
- See [accessibility.md](accessibility.md)

## Testing

- React Testing Library for component tests
- Query by role/label — not test IDs unless necessary
- See [testing.md](testing.md)

## Anti-Patterns

- No duplicate React in bundle — Vite dedupe configured in `orderbhojan/vite.config.ts`
- No fetching in render
- No prop drilling > 3 levels without context
- No custom Button/Card/Input — use BDS
