# Firebase Authentication — Authorized Domains

All customer and operator apps use **one Auth tenant**: Firebase project **`bhojanos-prod`**.

Configure in [Firebase Console → Authentication → Settings → Authorized domains](https://console.firebase.google.com/project/bhojanos-prod/authentication/settings).

## Required domains

| Domain | App | Hosting |
|--------|-----|---------|
| `localhost` | Local development | — |
| `orderbhojan.web.app` | OrderBhojan marketplace | Firebase project `orderbhojan` |
| `orderbhojan.firebaseapp.com` | OrderBhojan (alternate) | Firebase project `orderbhojan` |
| `orderbhojan.com` | OrderBhojan production | Custom domain on `orderbhojan` site |
| `www.orderbhojan.com` | OrderBhojan production | Custom domain on `orderbhojan` site |
| `manaintibojanam.web.app` | Founder storefront | `bhojanos-prod` site `manaintibojanam` |
| `manaintibojanam.firebaseapp.com` | Founder (alternate) | `bhojanos-prod` |
| `bhojanos-owner.web.app` | Owner portal | `bhojanos-prod` site `bhojanos-owner` |
| `bhojanos-admin.web.app` | Admin portal | `bhojanos-prod` site `bhojanos-admin` |

## Notes

- **`owner.web.app` / `admin.web.app`** are globally reserved by other Firebase projects and cannot be created on `bhojanos-prod`. Use `bhojanos-owner.web.app` / `bhojanos-admin.web.app`, or attach custom domains (e.g. `owner.bhojanos.com`) in Hosting settings.
- **Vercel** deployments (`*.vercel.app`, `www.bhojanos.com`) should remain authorized if the root BhojanOS SPA is still served from Vercel.
- **No backend env changes** — `VITE_FIREBASE_PROJECT_ID=bhojanos-prod` stays the same for OrderBhojan; only hosting URLs change.

## Verification

After adding domains, test Google and Phone sign-in from:

1. https://orderbhojan.web.app
2. https://manaintibojanam.web.app
3. https://bhojanos-owner.web.app/owner/login
4. https://bhojanos-admin.web.app/admin/login

If sign-in fails with `auth/unauthorized-domain`, the domain is missing from the list above.
