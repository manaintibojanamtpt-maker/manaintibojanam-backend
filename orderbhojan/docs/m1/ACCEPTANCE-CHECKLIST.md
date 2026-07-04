# M1 Acceptance Checklist

- [x] Google Sign-In
- [x] Phone OTP (send + verify)
- [x] Guest login (with/without Firebase config)
- [x] Session persistence (Firebase + Zustand)
- [x] Firebase Authentication — orderbhojan project only
- [x] Protected routes (`RequireAuth`)
- [x] Auth context (`AuthProvider` / `useAuth`)
- [x] User profile bootstrap — Firestore `customers/{uid}`
- [x] BDS v1 components only
- [x] Mobile-first auth layout
- [x] Loading, error, retry states
- [x] WCAG AA foundations (BDS + aria labels)
- [x] Unit tests
- [x] Integration boundary tests
- [x] MSW mocks (M0 retained)
- [x] Feature flags OFF by default
- [x] **No Marketplace API integration in auth flows**
- [x] No discovery, restaurants, cart, checkout logic added
- [x] `npm run gate:m1` PASS

## Manual QA (Staging)

- [ ] Google sign-in with real Firebase project
- [ ] Phone OTP with reCAPTCHA
- [ ] Guest browse without sign-in
- [ ] `/profile` redirects when guest
- [ ] Session survives page refresh
- [ ] Firestore `customers/{uid}` document created on login
