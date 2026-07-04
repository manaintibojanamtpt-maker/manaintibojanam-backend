# M1 Architecture Report — Authentication

## Scope Boundary

```
┌─────────────────────────────────────────────────────────┐
│ OrderBhojan Client (M1)                                  │
│  ┌─────────────┐   ┌──────────────────┐                 │
│  │ Firebase    │   │ orderbhojan      │                 │
│  │ Auth        │──▶│ Firestore        │                 │
│  │ (orderbhojan│   │ customers/{uid}  │                 │
│  │  project)   │   └──────────────────┘                 │
│  └─────────────┘                                         │
│         │                                                │
│         ▼                                                │
│  ┌─────────────┐                                         │
│  │ Zustand     │  guestBrowsing, deviceId (local)       │
│  │ Session     │                                         │
│  └─────────────┘                                         │
│                                                          │
│  ✕ No Marketplace API calls in M1 auth flows           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ BhojanOS Render Backend — UNTOUCHED in M1               │
└─────────────────────────────────────────────────────────┘
```

## Layer Architecture

| Layer | Responsibility |
|-------|----------------|
| `domain/` | Auth types, Zod schemas, state machine, route guards |
| `application/` | `authService`, `profileBootstrapService` |
| `infrastructure/` | Firebase Auth, Firestore customer repository |
| `store/` | Guest session persistence (Zustand + localStorage) |
| `hooks/` | `useCustomerProfile` (Firestore read) |
| `ui/` | BDS auth screens, guards |
| `shared/providers/` | `AuthProvider` context, marketplace token binding (Bearer when not guest) |

## Auth Flows

### Google
`signInWithPopup` → `bootstrapCustomerSession` → Firestore upsert

### Phone OTP
`signInWithPhoneNumber` + invisible reCAPTCHA → OTP verify → Firestore upsert

### Guest
`guestBrowsing=true` in Zustand; optional Firebase anonymous session; **no Bearer token**

### Session Restore
Firebase `onAuthStateChanged` + `browserLocalPersistence`; re-bootstrap Firestore on authenticated restore

## Protected Routes

`RequireAuth` redirects to `/auth` with return path. Guest and unauthenticated users cannot access `/profile`, `/orders`, `/favorites`, `/notifications`.

## Data Model (Firestore)

```
customers/{uid}
  uid, displayName, email, phoneNumber, photoURL
  authProviders: ['google' | 'phone' | 'guest']
  preferences: { notifications, marketing }
  createdAt, updatedAt, lastLoginAt
```

Subcollections (addresses, favorites) reserved for M2+ — rules pre-defined in `firestore.rules`.

## Security

- Firestore rules: owner-only read/write on `customers/{uid}`
- No BhojanOS Firestore access from client
- No restaurant/menu/order data in orderbhojan Firestore

## Deferred to Later Milestones

- Marketplace profile sync (`GET/PATCH /api/marketplace/profile`)
- Device notification token registration
- Discovery, cart, checkout

## Dependencies Added (M1)

- `react-hook-form`, `@hookform/resolvers`, `zod`
- `firebase` Auth + Firestore modules

## Testing Strategy

| Type | Coverage |
|------|----------|
| Unit | Auth state machine, Zod schemas |
| Integration | No Marketplace API in auth layer (static boundary tests) |
| MSW | Existing M0 handlers; auth M1 does not consume profile API |
