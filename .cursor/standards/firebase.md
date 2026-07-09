# Firebase Standards

## Projects

| Product | Firebase Project | Agent |
|---------|------------------|-------|
| OrderBhojan (customer) | `orderbhojan` | Firebase + Authentication |
| BhojanOS (restaurant) | Separate project | Firebase (BhojanOS scope) |

**Never** mix client SDK configs across products.

## Authentication

- Google Sign-In, Phone OTP, Guest mode (OrderBhojan M1)
- Auth state via Firebase Auth listeners
- Protected routes wrap authenticated-only pages
- Profile bootstrap on first login — Authentication agent owns

## Firestore

### OrderBhojan Client

- Customer profile collections only — per Authentication agent schema
- **Do not** read BhojanOS restaurant Firestore from OrderBhojan client
- Restaurant/menu data via Marketplace API

### Rules

- Least privilege — deny by default
- Rules changes require Firebase agent + Security review
- Test rules with Firebase emulator when available

### Indexes

- Document new composite indexes in milestone MIGRATION-NOTES
- Commit `firestore.indexes.json` when applicable

## Storage

- Public assets via CDN/hosting where possible
- User uploads: authenticated paths only, size limits enforced

## Cloud Functions

- Functions owned by Firebase agent
- Secrets via Firebase/ GCP secret manager — not in source
- Idempotent handlers for webhooks

## Client Initialization

```typescript
// Single firebase app instance — orderbhojan/src/firebase.ts
// Import from one module only
```

## Environment

```bash
# .env.example — placeholders only
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
```

## Security Checklist

- [ ] Rules reviewed for new collections
- [ ] No admin SDK keys in client
- [ ] Phone auth rate limits configured in console
- [ ] Auth tokens not logged

## Related

- Agent: [agents/09-firebase.md](../agents/09-firebase.md)
- Agent: [agents/06-authentication.md](../agents/06-authentication.md)
