# M1 Migration Notes

## From BDS-2 (0.2.0-bds2) → M1 (0.3.0-m1)

### New Dependencies

```bash
npm install react-hook-form @hookform/resolvers zod
```

### New Environment Variables

Configure **orderbhojan** Firebase project in `.env`:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=orderbhojan
VITE_FIREBASE_APP_ID=
VITE_RECAPTCHA_SITE_KEY=   # Phone OTP
```

### Firebase Console Setup

1. Create/use project `orderbhojan`
2. Enable **Google** and **Phone** authentication providers
3. Deploy `firestore.rules` from repo root
4. Add authorized domains for dev (`localhost`) and production

### Code Changes Summary

| Area | Change |
|------|--------|
| `src/features/auth/` | Full auth module added |
| `src/shared/providers/AuthProvider.tsx` | Extended with sign-in/out actions |
| `src/firebase/init.ts` | Firestore + session persistence |
| `src/app/routes/AppRouter.tsx` | Protected routes via `RequireAuth` |
| Removed | No custom UI components (BDS only) |

### Breaking Changes

None for M0 consumers. Auth shell at `/auth` is now functional.

### What NOT to Enable Yet

- Marketplace profile API sync (M10+)
- Discovery, search, cart routes remain placeholders

### Verification

```bash
cd orderbhojan
npm run gate:m1
npm run dev   # http://localhost:5174/auth
```

### Rollback

Revert to tag `0.2.0-bds2` or disable Firebase auth providers. Guest mode continues to work via Zustand session flag.
