# M1 Authentication Report

**Milestone:** M1 — Authentication  
**Status:** Complete  
**Version:** `0.3.0-m1`  
**Date:** 2026-07-04

## Summary

OrderBhojan M1 delivers customer authentication for the **orderbhojan Firebase project only**: Google sign-in, phone OTP, guest login, session persistence, Firestore customer bootstrap, protected routes, and BDS v1 UI.

**No Marketplace API integration** in this milestone.

## Delivered

| Requirement | Status |
|-------------|--------|
| Google Sign-In | ✅ |
| Phone OTP | ✅ |
| Guest Login | ✅ |
| Session Persistence | ✅ Firebase `browserLocalPersistence` + Zustand guest flag |
| Firebase Auth (orderbhojan) | ✅ |
| Protected Routes | ✅ `RequireAuth` on profile, orders, favorites, notifications |
| Auth Context | ✅ `AuthProvider` / `useAuth` |
| User Profile Bootstrap | ✅ Firestore `customers/{uid}` |
| BDS v1 components only | ✅ |
| Mobile-first UX | ✅ Auth layout + segmented control |
| Loading / error / retry | ✅ Loader, ErrorState, Toast, query retry |
| WCAG AA foundations | ✅ Labels, aria, focus via BDS |
| Unit + integration tests | ✅ |
| MSW mocks | ✅ (M0 handlers retained; auth does not call API) |
| Feature flags OFF | ✅ |

## Post-Login Pipeline (M1)

1. Upsert `customers/{uid}` in orderbhojan Firestore  
2. Restore session on page reload via Firebase Auth listener  
3. Profile page reads Firestore customer document  

## Quality Gate

```bash
cd orderbhojan && npm run gate:m1
```

## STOP

M1 complete. **Do not begin M2 Location** until explicit DRB/ARB approval.
