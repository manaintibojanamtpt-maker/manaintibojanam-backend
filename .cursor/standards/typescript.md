# TypeScript Standards

## Compiler

- Strict mode enabled (`strict: true`)
- No `@ts-ignore` without ARB waiver and comment explaining why
- Prefer `unknown` over `any`; narrow with type guards

## Types

```typescript
// Prefer interfaces for object shapes
interface CartItem {
  id: string;
  quantity: number;
}

// Use type for unions and utilities
type AuthState = 'guest' | 'authenticated' | 'loading';

// Explicit return types on exported functions
export function formatPrice(paise: number): string { ... }
```

## Enums

Prefer `as const` objects over TypeScript enums:

```typescript
export const OrderStatus = {
  Pending: 'pending',
  Confirmed: 'confirmed',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
```

## Null Safety

```typescript
// Use optional chaining and nullish coalescing
const name = user?.displayName ?? 'Guest';

// Avoid non-null assertion (!) unless invariant is documented
```

## Async

- Always handle promise rejections
- Use `async/await` over raw `.then()` chains in application code
- TanStack Query for server state — not manual `useEffect` fetch

## DTOs & API Types

- Generated or maintained DTOs live with Marketplace API agent ownership
- Do not duplicate API types in UI features — import from shared location
- Map API DTOs to view models in feature layer when shape differs

## Imports

```typescript
import type { User } from 'firebase/auth';  // type-only imports
```

## File Exports

- One primary component per file
- Barrel exports (`index.ts`) only at feature boundaries — avoid deep barrel chains

## Testing Types

- Test files may use relaxed typing for mocks
- `@testing-library` queries preferred over DOM typing hacks
