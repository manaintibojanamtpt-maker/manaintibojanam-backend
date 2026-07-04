# M1 Developer Guide — Authentication

## Environment

Copy `.env.example` and configure Firebase `orderbhojan` project keys. Enable Google and Phone providers in Firebase Console.

## Auth API (React)

```tsx
import { useAuth } from '@/shared/providers/AuthProvider';

const {
  status,
  isAuthenticated,
  isGuest,
  signInWithGoogle,
  continueAsGuest,
  startPhoneSignIn,
  completePhoneSignIn,
  signOut,
} = useAuth();
```

## Route Protection

```tsx
import { RequireAuth } from '@/features/auth';

<Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
```

## Firestore

Deploy `firestore.rules` to the **orderbhojan** Firebase project only. Never write restaurant/order data from the client.

## MSW

Protected marketplace endpoints return `401` without `Authorization: Bearer` header.

## Commands

```bash
npm run dev
npm run test:unit
npm run gate:m1
```
