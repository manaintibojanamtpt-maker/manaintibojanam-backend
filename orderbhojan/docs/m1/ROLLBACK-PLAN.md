# M1 Rollback Plan

## Immediate Rollback

1. Disable Google / Phone providers in Firebase Console  
2. Revert OrderBhojan deploy to `0.2.0-bds2` tag  
3. Guest mode continues to work without auth providers

## Partial Rollback

| Feature | Action |
|---------|--------|
| Phone OTP | Disable Phone provider in Firebase |
| Google | Disable Google provider in Firebase |
| Profile sync | Feature-flag off profile API calls (future) |

## Data

- Firestore `customers/{uid}` documents are safe to retain  
- No BhojanOS data modified by M1 client

## Verification After Rollback

```bash
npm run gate:m0
```

App loads in guest mode; protected routes redirect to auth shell.
