# OrderBhojan Firebase Hosting

Production deploys use the **repository root** configuration:

```bash
# From repo root (recommended)
npm run deploy:orderbhojan

# From this directory
npm run deploy
```

- **Hosting project:** `orderbhojan` (hosting shell)
- **Hosting site:** `orderbhojan` → https://orderbhojan.web.app
- **Backend (Auth/Firestore):** `bhojanos-prod` via `orderbhojan/.env.production`

Do **not** run `firebase deploy --only hosting --project bhojanos-prod` for OrderBhojan.
